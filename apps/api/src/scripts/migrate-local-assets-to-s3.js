import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { pool, query } from '../db.js';
import { getObjectKeyFromUrl, uploadObject } from '../storage.js';
import { inferContentType } from '../utils/serializers.js';

const dryRun = process.env.DRY_RUN !== 'false';

function assertS3Mode() {
  if (config.storageDriver !== 's3') {
    throw new Error('Set STORAGE_DRIVER=s3 before running the migration.');
  }
}

function getLocalFilePathFromUrl(url) {
  const key = getObjectKeyFromUrl(url);
  if (!key) return null;
  return path.join(config.uploadDir, key);
}

function getDryRunUrl(key) {
  const publicBase = config.s3PublicBaseUrl || config.publicAssetBaseUrl;
  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/${key}`;
  }

  return `${config.s3Endpoint.replace(/\/$/, '')}/${config.s3Bucket}/${key}`;
}

async function migrateAsset(url) {
  const key = getObjectKeyFromUrl(url);
  if (!key) {
    return { status: 'skipped', reason: 'Not a local upload URL', nextUrl: url };
  }

  const fullPath = getLocalFilePathFromUrl(url);
  if (!fullPath) {
    return { status: 'skipped', reason: 'Could not resolve local file path', nextUrl: url };
  }

  try {
    await fs.access(fullPath);
  } catch {
    return { status: 'missing', reason: `Local file not found: ${fullPath}`, nextUrl: url };
  }

  if (dryRun) {
    return {
      status: 'dry-run',
      reason: `Would migrate ${url} -> ${key}`,
      nextUrl: getDryRunUrl(key),
    };
  }

  const body = await fs.readFile(fullPath);
  const nextUrl = await uploadObject({
    key,
    body,
    contentType: inferContentType(fullPath),
  });

  return { status: 'migrated', nextUrl };
}

async function migrateResources() {
  const result = await query(
    `SELECT id, image_url, file_path
     FROM resources
     WHERE image_url LIKE '/uploads/%' OR file_path LIKE '/uploads/%'`
  );

  let updated = 0;

  for (const row of result.rows) {
    let nextImageUrl = row.image_url;
    let nextFilePath = row.file_path;

    if (row.image_url?.startsWith('/uploads/')) {
      const migrated = await migrateAsset(row.image_url);
      console.log(`[resources:${row.id}:image_url] ${migrated.status} ${migrated.reason || migrated.nextUrl}`);
      if (migrated.status === 'migrated' || migrated.status === 'dry-run') {
        nextImageUrl = migrated.nextUrl;
      }
    }

    if (row.file_path?.startsWith('/uploads/')) {
      const migrated = await migrateAsset(row.file_path);
      console.log(`[resources:${row.id}:file_path] ${migrated.status} ${migrated.reason || migrated.nextUrl}`);
      if (migrated.status === 'migrated' || migrated.status === 'dry-run') {
        nextFilePath = migrated.nextUrl;
      }
    }

    if (!dryRun && (nextImageUrl !== row.image_url || nextFilePath !== row.file_path)) {
      await query('UPDATE resources SET image_url = $1, file_path = $2 WHERE id = $3', [
        nextImageUrl,
        nextFilePath,
        row.id,
      ]);
      updated += 1;
    }
  }

  return { scanned: result.rowCount, updated };
}

async function migrateTeachingResources() {
  const result = await query(
    `SELECT id, file_url
     FROM teaching_resources
     WHERE file_url LIKE '/uploads/%'`
  );

  let updated = 0;

  for (const row of result.rows) {
    const migrated = await migrateAsset(row.file_url);
    console.log(`[teaching_resources:${row.id}:file_url] ${migrated.status} ${migrated.reason || migrated.nextUrl}`);

    if (!dryRun && migrated.status === 'migrated') {
      await query('UPDATE teaching_resources SET file_url = $1 WHERE id = $2', [migrated.nextUrl, row.id]);
      updated += 1;
    }
  }

  return { scanned: result.rowCount, updated };
}

async function main() {
  assertS3Mode();

  console.log(`Starting local asset migration. dryRun=${dryRun}`);

  const resources = await migrateResources();
  const teaching = await migrateTeachingResources();

  console.log(
    JSON.stringify(
      {
        dryRun,
        resources,
        teaching,
      },
      null,
      2
    )
  );
}

try {
  await main();
} finally {
  await pool.end();
}
