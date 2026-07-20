require('dotenv').config();
const { Worker } = require('bullmq');
const { Redis } = require('ioredis');
const { connectDB } = require('./config/db');
const { processMedia } = require('./processors/mediaProcessor');
const Job = require('./models/Job');

function createRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
  if (url.startsWith('rediss://')) {
    opts.tls = { rejectUnauthorized: false };
  }
  return new Redis(url, opts);
}

const connection = createRedisConnection();

async function start() {
  await connectDB();
  const worker = new Worker('media-processing', async bullJob => {
    await processMedia(bullJob.data);
  }, { connection, concurrency: 2 });

  worker.on('failed', async (bullJob, err) => {
    console.error(`Attempt ${bullJob?.attemptsMade} failed for job ${bullJob?.id}: ${err.message}`);
    if (bullJob && bullJob.attemptsMade >= (bullJob.opts.attempts || 3)) {
      await Job.findByIdAndUpdate(bullJob.data.jobId, {
        status: 'failed',
        error: err.message,
      });
    }
  });

  worker.on('completed', bullJob => {
    console.log(`Job ${bullJob.id} completed successfully`);
  });

  worker.on('error', err => {
    console.error('Worker error:', err);
  });

  console.log('Worker started, listening for jobs...');
}

start().catch(err => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});