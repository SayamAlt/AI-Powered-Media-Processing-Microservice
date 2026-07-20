const { Queue } = require('bullmq');
const { Redis } = require('ioredis');

const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

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