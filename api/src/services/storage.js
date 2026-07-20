const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const MIME_MAP = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads');

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

async function uploadFile(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${uuidv4()}${ext}`;
  const key = `uploads/${filename}`;

  if (s3 && process.env.MINIO_BUCKET) {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: MIME_MAP[ext] || 'application/octet-stream',
    }));
  } else {
    if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
      fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
    }
    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
    await fs.promises.writeFile(localPath, buffer);
  }
  return key;
}

function getImageUrl(storagePath) {
  if (process.env.MINIO_PUBLIC_URL && process.env.MINIO_BUCKET) {
    return `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${storagePath}`;
  }
  return `/api/uploads/${path.basename(storagePath)}`;
}

module.exports = { uploadFile, getImageUrl };