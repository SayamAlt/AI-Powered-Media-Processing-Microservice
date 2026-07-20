const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { downloadFile } = require('../services/storage');
const { getCaption } = require('../services/captioning');
const { getLabels } = require('../services/labelDetection');
const { checkSafety } = require('../services/safetyCheck');

async function processMedia(jobData) {
  const { jobId, storagePath, userId } = jobData;
  const job = await Job.findById(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await Job.findByIdAndUpdate(jobId, { status: 'processing', $inc: { attempts: 1 } });
  const imageBuffer = await downloadFile(storagePath, jobId);
  const caption = await getCaption(imageBuffer);
  const labels = await getLabels(imageBuffer);
  const { safetyResult, flagged, flaggedCategories } = await checkSafety(imageBuffer);
  await Job.findByIdAndUpdate(jobId, {
    status: 'completed',
    caption,
    labels,
    safetyResult,
    flagged,
    flaggedCategories,
  });
  if (flagged) {
    const category = flaggedCategories[0] || 'unknown';
    await Notification.create({
      userId,
      jobId,
      message: `Your upload was flagged for ${category} content`,
    });
  }
}

module.exports = { processMedia };