import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env.js';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2Client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function getFromR2(key: string): Promise<Buffer | null> {
  try {
    const response = await r2Client.send(new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }));
    if (response.Body) {
      return Buffer.from(await response.Body.transformToByteArray());
    }
    return null;
  } catch {
    return null;
  }
}

export async function existsInR2(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}
