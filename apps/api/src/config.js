import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envFilePath = path.join(rootDir, '.env');

if (fs.existsSync(envFilePath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envFilePath, override: false });
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalInt(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function optionalBoolean(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return value === 'true';
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  rootDir,
  port: optionalInt('PORT', 3001),
  host: process.env.HOST || '0.0.0.0',
  trustProxy: optionalBoolean('TRUST_PROXY', process.env.NODE_ENV === 'production'),
  apiBaseUrl: process.env.API_BASE_URL || '',
  cookieSecure: optionalBoolean('COOKIE_SECURE', process.env.NODE_ENV === 'production'),
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || '',
  databaseUrl: process.env.DATABASE_URL || '',
  pgHost: process.env.PGHOST || '',
  pgPort: optionalInt('PGPORT', 5432),
  pgUser: process.env.PGUSER || '',
  pgPassword: process.env.PGPASSWORD || '',
  pgDatabase: process.env.PGDATABASE || '',
  storageDriver: (process.env.STORAGE_DRIVER || 'local').toLowerCase(),
  uploadDir: process.env.UPLOAD_DIR || path.join(rootDir, 'uploads'),
  resourceSeedFile:
    process.env.RESOURCE_SEED_FILE || path.join(rootDir, 'seed', 'resources.local.json'),
  allowSeedWithoutDb:
    optionalBoolean('ALLOW_SEED_WITHOUT_DB', false) ||
    fs.existsSync(process.env.RESOURCE_SEED_FILE || path.join(rootDir, 'seed', 'resources.local.json')),
  publicAssetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3Region: process.env.S3_REGION || 'ap-guangzhou',
  s3Bucket: process.env.S3_BUCKET || '',
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  htmlProxyAllowlist: (process.env.HTML_PROXY_ALLOWLIST || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  htmlProxyTimeoutMs: optionalInt('HTML_PROXY_TIMEOUT_MS', 10000),
  htmlProxyCacheTtlMs: optionalInt('HTML_PROXY_CACHE_TTL_MS', 5 * 60 * 1000),
  htmlProxyCacheMaxEntries: optionalInt('HTML_PROXY_CACHE_MAX_ENTRIES', 200),
  htmlProxyCacheMaxMb: optionalInt('HTML_PROXY_CACHE_MAX_MB', 20),
  htmlProxyMaxFileSizeMb: optionalInt('HTML_PROXY_MAX_FILE_SIZE_MB', 10),
  maxUploadFileSizeMb: optionalInt('MAX_UPLOAD_FILE_SIZE_MB', 200),
  coverBrowserExecutablePath: process.env.COVER_BROWSER_EXECUTABLE_PATH || '',
  coverScreenshotTimeoutMs: optionalInt('COVER_SCREENSHOT_TIMEOUT_MS', 10000),
  coverScreenshotDelayMs: optionalInt('COVER_SCREENSHOT_DELAY_MS', 1200),
};

export function validateRuntimeConfig() {
  if (!config.adminPassword) {
    throw new Error('Missing required environment variable: ADMIN_PASSWORD');
  }

  if (!config.jwtSecret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  if (config.nodeEnv === 'production' && config.corsOrigins.length === 0) {
    throw new Error('Missing required environment variable: CORS_ORIGINS');
  }

  if (!config.databaseUrl && !(config.pgHost && config.pgUser && config.pgDatabase) && !config.allowSeedWithoutDb) {
    throw new Error(
      'Missing PostgreSQL configuration. Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE, or provide a local resource seed file.'
    );
  }

  if (config.storageDriver === 's3') {
    required('S3_BUCKET');
    required('S3_ACCESS_KEY_ID');
    required('S3_SECRET_ACCESS_KEY');
    if (!config.s3Endpoint && !config.s3PublicBaseUrl) {
      throw new Error('S3 storage requires S3_ENDPOINT or S3_PUBLIC_BASE_URL');
    }
  }
}
