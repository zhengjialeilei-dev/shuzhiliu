import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.s3Region,
      endpoint: config.s3Endpoint || undefined,
      forcePathStyle: config.s3ForcePathStyle,
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
    });
  }

  return s3Client;
}

export function sanitizeFilename(name) {
  const ext = path.extname(name || '').toLowerCase();
  const stem = path
    .basename(name || 'file', ext)
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';
  return `${Date.now()}-${randomUUID().slice(0, 8)}-${stem}${ext}`;
}

async function ensureLocalDirectory(key) {
  const fullPath = path.join(config.uploadDir, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

function localUrlForKey(key) {
  return `/uploads/${key.replace(/\\/g, '/')}`;
}

function s3UrlForKey(key) {
  const base = config.s3PublicBaseUrl || config.publicAssetBaseUrl || '';
  if (base) {
    return `${base.replace(/\/$/, '')}/${key}`;
  }

  if (!config.s3Endpoint) {
    throw new Error('S3 public URL is not configured');
  }

  return `${config.s3Endpoint.replace(/\/$/, '')}/${config.s3Bucket}/${key}`;
}

export async function uploadObject({ key, body, contentType }) {
  if (config.storageDriver === 's3') {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
      })
    );

    return s3UrlForKey(key);
  }

  const fullPath = await ensureLocalDirectory(key);
  await fs.writeFile(fullPath, body);
  return localUrlForKey(key);
}

function keyFromLocalUrl(url) {
  const normalized = url.replace(/^\/+/, '');
  if (!normalized.startsWith('uploads/')) return null;
  return normalized.replace(/^uploads\//, '');
}

function keyFromS3Url(url) {
  const bases = [config.s3PublicBaseUrl, config.publicAssetBaseUrl, config.s3Endpoint]
    .filter(Boolean)
    .map((item) => item.replace(/\/$/, ''));

  for (const base of bases) {
    if (!url.startsWith(base)) continue;
    const suffix = url.slice(base.length).replace(/^\/+/, '');
    if (suffix.startsWith(`${config.s3Bucket}/`)) {
      return suffix.slice(config.s3Bucket.length + 1);
    }
    return suffix;
  }

  return null;
}

export function getObjectKeyFromUrl(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/')) return keyFromLocalUrl(url);

  try {
    const parsed = new URL(url);
    return config.storageDriver === 's3'
      ? keyFromS3Url(parsed.toString())
      : keyFromLocalUrl(parsed.pathname);
  } catch {
    return config.storageDriver === 's3' ? keyFromS3Url(url) : keyFromLocalUrl(url);
  }
}

export async function deleteObjectByUrl(url) {
  const key = getObjectKeyFromUrl(url);
  if (!key) return;

  if (config.storageDriver === 's3') {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
      })
    );
    return;
  }

  const fullPath = path.join(config.uploadDir, key);
  await fs.rm(fullPath, { force: true });
}
