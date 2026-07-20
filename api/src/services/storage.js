const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const MIME_MAP = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

function createClient() {
  const proto = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  return new S3Client({
    endpoint: `${proto}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

const s3 = createClient();

async function uploadFile(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${uuidv4()}${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: MIME_MAP[ext] || 'application/octet-stream',
  }));
  return key;
}

function getImageUrl(storagePath) {
  return `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${storagePath}`;
}

module.exports = { uploadFile, getImageUrl };