const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { enqueueJob } = require('../services/queue');
const { getImageUrl } = require('../services/storage');
const Job = require('../models/Job');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      Job.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Job.countDocuments({ userId: req.user.id }),
    ]);
    const enriched = jobs.map(j => ({ ...j, imageUrl: getImageUrl(j.storagePath) }));
    res.json({ jobs: enriched, total, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ ...job, imageUrl: getImageUrl(job.storagePath) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/retry', authenticate, async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.user.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'failed') return res.status(400).json({ error: 'Only failed jobs can be retried' });
    await Job.findByIdAndUpdate(job._id, {
      status: 'pending',
      error: undefined,
      attempts: 0,
      caption: undefined,
      labels: [],
      safetyResult: undefined,
      flagged: false,
      flaggedCategories: [],
    });
    await enqueueJob(job._id.toString(), job.storagePath, req.user.id);
    res.json({ jobId: job._id, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;