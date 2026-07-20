require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const jobRoutes = require('./routes/jobs');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.replace(/\/$/, '') : 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (cleanOrigin === allowedOrigin || allowedOrigin === '*' || cleanOrigin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Job = require('./models/Job');

app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/uploads/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const filename = path.basename(fileId);
    const localPath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    const isObjectId = mongoose.Types.ObjectId.isValid(fileId);
    const query = isObjectId ? { _id: fileId } : { storagePath: `uploads/${filename}` };
    const jobDoc = await Job.findOne(query).select('+imageBuffer');
    if (jobDoc && jobDoc.imageBuffer) {
      res.setHeader('Content-Type', jobDoc.mimeType || 'image/jpeg');
      return res.send(jobDoc.imageBuffer);
    }
    res.status(404).send('Image not found');
  } catch {
    res.status(404).send('Image not found');
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`));
}

if (require.main === module) {
  start().catch(err => {
    console.error('Failed to start API', err);
    process.exit(1);
  });
}

module.exports = app;