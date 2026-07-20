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
    lazyConnect: true,
    family: 0,
  };
  if (url.startsWith('rediss://')) {
    opts.tls = { rejectUnauthorized: false };
  }
  return new Redis(url, opts);
}

function startBullMQWorker(connection) {
  try {
    const worker = new Worker('media-processing', async bullJob => {
      await processMedia(bullJob.data);
    }, { connection, concurrency: 2 });

    worker.on('failed', async (bullJob, err) => {
      console.error(`BullMQ attempt ${bullJob?.attemptsMade} failed for ${bullJob?.id}: ${err.message}`);
      if (bullJob && bullJob.attemptsMade >= (bullJob.opts.attempts || 3)) {
        await Job.findByIdAndUpdate(bullJob.data.jobId, {
          status: 'failed',
          error: err.message,
        }).catch(e => console.error('Failed to update job status:', e.message));
      }
    });

    worker.on('completed', bullJob => {
      console.log(`BullMQ job ${bullJob.id} completed`);
    });

    worker.on('error', err => {
      console.error('BullMQ worker error:', err.message);
    });

    console.log('BullMQ worker started');
    return worker;
  } catch (err) {
    console.error('Failed to start BullMQ worker (Redis may be unavailable):', err.message);
    console.log('Continuing with sweeper-only mode');
    return null;
  }
}

function startSweeper() {
  // Process pending jobs that BullMQ may have missed
  setInterval(async () => {
    try {
      const pendingJobs = await Job.find({ status: 'pending' }).limit(5);
      for (const job of pendingJobs) {
        console.log(`Sweeper picking up job ${job._id}...`);
        try {
          await processMedia({
            jobId: job._id.toString(),
            storagePath: job.storagePath,
            userId: job.userId.toString(),
          });
          console.log(`Sweeper completed job ${job._id}`);
        } catch (err) {
          console.error(`Sweeper failed for job ${job._id}: ${err.message}`);
          // Fetch current attempts count after processMedia may have incremented it
          const current = await Job.findById(job._id).lean().catch(() => null);
          const attempts = current?.attempts || 1;
          if (attempts >= 3) {
            await Job.findByIdAndUpdate(job._id, {
              status: 'failed',
              error: err.message,
            }).catch(e => console.error('Status update failed:', e.message));
          } else {
            // Reset to pending so next sweep can retry
            await Job.findByIdAndUpdate(job._id, { status: 'pending' })
              .catch(e => console.error('Status reset failed:', e.message));
          }
        }
      }
    } catch (err) {
      console.error('Sweeper outer error:', err.message);
    }
  }, 5000);

  // Recovery: reset jobs stuck in 'processing' > 5 min back to 'pending'
  setInterval(async () => {
    try {
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      const result = await Job.updateMany(
        { status: 'processing', updatedAt: { $lt: staleThreshold } },
        { status: 'pending' }
      );
      if (result.modifiedCount > 0) {
        console.log(`Recovery: reset ${result.modifiedCount} stale processing job(s) to pending`);
      }
    } catch (err) {
      console.error('Recovery sweep error:', err.message);
    }
  }, 60000);

  console.log('Sweeper started');
}

async function start() {
  await connectDB();
  console.log('Worker started, listening for jobs...');

  const connection = createRedisConnection();
  startBullMQWorker(connection);
  startSweeper();
}

start().catch(err => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
