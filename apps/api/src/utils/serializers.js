import path from 'node:path';
import { config } from '../config.js';
import { query } from '../db.js';
import { checkStorageConnection, isSafeUploadPath } from '../storage.js';

export function normalizeResource(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    grade: row.grade,
    image_url: row.image_url,
    description: row.description,
    file_path: row.file_path,
    route_path: row.route_path,
    resource_type: row.resource_type,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    version: row.version || 1,
  };
}

export function normalizeTeachingResource(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    zone: row.zone,
    file_url: row.file_url,
    file_type: row.file_type,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at || null,
    version: row.version || 1,
  };
}

export function inferContentType(filename, fallback = 'application/octet-stream') {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.html' || ext === '.htm') return 'text/html; charset=utf-8';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (ext === '.ppt') return 'application/vnd.ms-powerpoint';
  if (ext === '.pptx') {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.wasm') return 'application/wasm';
  if (ext === '.woff2') return 'font/woff2';
  return fallback;
}

export function buildHtmlProxyAllowlist() {
  const hosts = new Set(config.htmlProxyAllowlist);

  for (const value of [config.apiBaseUrl, config.publicAssetBaseUrl, config.s3PublicBaseUrl]) {
    if (!value) continue;
    try {
      hosts.add(new URL(value).host);
    } catch {
      continue;
    }
  }

  return hosts;
}

export function isAllowedProxyUrl(rawUrl, allowHosts) {
  if (isSafeUploadPath(rawUrl)) return true;

  try {
    const target = new URL(rawUrl);

    if (allowHosts.size === 0) return config.nodeEnv !== 'production';

    return allowHosts.has(target.host);
  } catch {
    return false;
  }
}

export async function fetchHealth() {
  const result = {
    api: {
      status: 'success',
      message: 'API server is running',
      storageDriver: config.storageDriver,
    },
    auth: {
      status: config.adminPassword ? 'success' : 'error',
      message: config.adminPassword ? 'ADMIN_PASSWORD configured' : 'ADMIN_PASSWORD missing',
    },
    database: {
      status: 'loading',
      message: 'Checking database...',
    },
    storage: {
      status: 'loading',
      message: 'Checking storage...',
    },
  };

  try {
    const resources = await query('SELECT COUNT(*)::int AS count FROM resources');
    const teaching = await query('SELECT COUNT(*)::int AS count FROM teaching_resources');
    result.database = {
      status: 'success',
      message: 'PostgreSQL connection is healthy',
      resourcesCount: resources.rows[0]?.count ?? 0,
      teachingCount: teaching.rows[0]?.count ?? 0,
    };
  } catch (error) {
    result.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database check failed',
    };
  }

  try {
    result.storage = {
      status: 'success',
      message: await checkStorageConnection(),
    };
  } catch (error) {
    result.storage = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Storage check failed',
    };
  }

  return result;
}
