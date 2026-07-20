const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

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

async function downloadFile(key) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.MINIO_BUCKET,
    Key: key,
  }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = { downloadFile };