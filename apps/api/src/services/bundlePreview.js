import path from 'node:path';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const types = {
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4',
};

export function bundleLocation(filePath, apiOrigin) {
  try {
    const local = filePath.startsWith('/uploads/apps/bundles/');
    const entry = local ? new URL(filePath, apiOrigin) : new URL(filePath);
    if (!['https:', 'http:'].includes(entry.protocol) || entry.username || entry.password || entry.search || entry.hash) return null;
    const match = entry.pathname.match(/^(\/(?:uploads\/)?apps\/bundles\/[^/]+\/)(.+\.html?)$/i);
    if (!match || /[\\\x00-\x1f]/.test(decodeURIComponent(entry.pathname))) return null;
    const root = new URL(match[1], entry);
    return { root, entryPath: match[2], local };
  } catch { return null; }
}

export function bundlePreviewBase(resource, apiOrigin) {
  if (!resource || !uuid.test(resource.id)) return null;
  const location = bundleLocation(resource.file_path, apiOrigin);
  if (!location) return null;
  const directory = location.entryPath.replace(/[^/]+$/, '');
  return `/api/preview-assets/${resource.id}/${resource.version || 1}/${directory}`;
}

export function resolveBundleAsset(resource, version, assetPath, { apiOrigin, allowHosts }) {
  if (!resource || resource.resource_type !== 'html' || Number(version) !== (resource.version || 1)) return null;
  const location = bundleLocation(resource.file_path, apiOrigin);
  if (!location || (!location.local && !allowHosts.has(location.root.host))) return null;
  // Fastify has decoded the wildcard once. Reject further encodings, traversal,
  // absolute URLs and query syntax before constructing an upstream request.
  if (!assetPath || /[%\\\x00-\x1f?#:]/.test(assetPath) || assetPath.startsWith('/')) return null;
  if (assetPath.split('/').some((part) => !part || part === '.' || part === '..')) return null;
  const contentType = types[path.posix.extname(assetPath).toLowerCase()];
  if (!contentType) return null; // Never serve HTML, credentials or arbitrary files.
  const target = new URL(assetPath.split('/').map(encodeURIComponent).join('/'), location.root);
  if (target.origin !== location.root.origin || !target.pathname.startsWith(location.root.pathname)) return null;
  return { target, contentType };
}

export async function readBundleAsset(response, maxBytes) {
  const tooLarge = () => Object.assign(new Error('Preview asset exceeds size limit'), { statusCode: 413 });
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw tooLarge();
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body || []) {
    size += chunk.length;
    if (size > maxBytes) {
      throw tooLarge();
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}
