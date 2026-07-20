const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadFile } = require('../services/storage');
const { enqueueJob } = require('../services/queue');
const Job = require('../models/Job');

router.post('/', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const storagePath = await uploadFile(req.file.buffer, req.file.originalname);
    const job = await Job.create({
      userId: req.user.id,
      originalName: req.file.originalname,
      storagePath,
      status: 'pending',
    });
    await enqueueJob(job._id.toString(), storagePath, req.user.id);
    res.status(201).json({ jobId: job._id, status: 'pending' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;