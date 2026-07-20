const { Queue } = require('bullmq');
const { Redis } = require('ioredis');

function createRedisConnection() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    family: 0,
  };
  if (url.startsWith('rediss://')) {
    opts.tls = { rejectUnauthorized: false };
  }
  return new Redis(url, opts);
}

const connection = createRedisConnection();

const mediaQueue = new Queue('media-processing', { connection });

async function enqueueJob(jobId, storagePath, userId) {
  await mediaQueue.add('process', { jobId, storagePath, userId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  });
}

module.exports = { enqueueJob };