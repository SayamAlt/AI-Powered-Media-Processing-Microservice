const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const Job = require('../models/Job');

function getS3Client() {
  if (!process.env.MINIO_ENDPOINT) return null;
  const proto = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  const portStr = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
  const endpoint = `${proto}://${process.env.MINIO_ENDPOINT}${portStr}`;
  return new S3Client({
    endpoint,
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  });
}

const s3 = getS3Client();

async function downloadFile(key, jobId) {
  if (s3 && process.env.MINIO_BUCKET) {
    try {
      const response = await s3.send(new GetObjectCommand({
        Bucket: process.env.MINIO_BUCKET,
        Key: key,
      }));
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (s3Err) {
      console.warn('S3 download failed, falling back to MongoDB/Local:', s3Err.message);
    }
  }

  const filename = path.basename(key);
  const possiblePaths = [
    path.join(process.cwd(), 'uploads', filename),
    path.join(process.cwd(), '..', 'api', 'uploads', filename),
    path.join(process.cwd(), '..', 'uploads', filename),
    path.join('/tmp', 'uploads', filename),
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return await fs.promises.readFile(filePath);
    }
  }

  if (jobId) {
    const jobDoc = await Job.findById(jobId).select('+imageBuffer');
    if (jobDoc && jobDoc.imageBuffer) {
      return jobDoc.imageBuffer;
    }
  }

  throw new Error(`File not found for key: ${key}`);
}

module.exports = { downloadFile };