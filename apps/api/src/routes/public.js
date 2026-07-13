import { config } from '../config.js';
import { query } from '../db.js';
import {
  errorResponseSchema,
  healthCheckSchema,
  resourceSchema,
  teachingResourceSchema,
} from '../schemas.js';
import {
  buildHtmlProxyAllowlist,
  fetchHealth,
  isAllowedProxyUrl,
  normalizeResource,
  normalizeTeachingResource,
} from '../utils/serializers.js';
import { findHtmlResourceByPath, findHtmlResourceByUrl } from '../utils/resourcePaths.js';
import { loadSeedResources, mergeResources } from '../utils/resourceSeed.js';

const htmlProxyCache = new Map();
let htmlProxyCacheBytes = 0;

function removeCachedHtmlProxyEntry(cacheKey) {
  const entry = htmlProxyCache.get(cacheKey);
  if (!entry) return;
  htmlProxyCacheBytes = Math.max(0, htmlProxyCacheBytes - (entry.byteLength || 0));
  htmlProxyCache.delete(cacheKey);
}

function getCachedHtmlProxyEntry(cacheKey) {
  const entry = htmlProxyCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    removeCachedHtmlProxyEntry(cacheKey);
    return null;
  }

  return entry;
}

function setCachedHtmlProxyEntry(cacheKey, payload) {
  const maxBytes = Math.max(config.htmlProxyCacheMaxMb, 0) * 1024 * 1024;
  if (maxBytes > 0 && payload.byteLength > maxBytes) return;

  removeCachedHtmlProxyEntry(cacheKey);
  while (
    (config.htmlProxyCacheMaxEntries > 0 && htmlProxyCache.size >= config.htmlProxyCacheMaxEntries) ||
    (maxBytes > 0 && htmlProxyCacheBytes + payload.byteLength > maxBytes)
  ) {
    const oldestKey = htmlProxyCache.keys().next().value;
    if (!oldestKey) break;
    removeCachedHtmlProxyEntry(oldestKey);
  }

  htmlProxyCache.set(cacheKey, {
    ...payload,
    expiresAt: Date.now() + Math.max(config.htmlProxyCacheTtlMs, 1000),
  });
  htmlProxyCacheBytes += payload.byteLength;
}

async function readResponseText(response, maxBytes) {
  const contentLength = Number.parseInt(response.headers?.get?.('content-length') || '', 10);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    const error = new Error('HTML resource exceeds the preview size limit');
    error.statusCode = 413;
    throw error;
  }

  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      const error = new Error('HTML resource exceeds the preview size limit');
      error.statusCode = 413;
      throw error;
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      const error = new Error('HTML resource exceeds the preview size limit');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(value);
  }

  const content = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(content);
}

function injectBaseHref(rawHtml, sourceUrl) {
  try {
    const parsed = new URL(sourceUrl);
    parsed.pathname = parsed.pathname.replace(/\/[^/]*$/, '/');
    parsed.search = '';
    parsed.hash = '';
    const base = `<base href="${parsed.toString()}" />`;

    if (/<base\s/i.test(rawHtml)) {
      return rawHtml;
    }

    if (/<head[^>]*>/i.test(rawHtml)) {
      return rawHtml.replace(/<head([^>]*)>/i, `<head$1>${base}`);
    }

    return `${base}\n${rawHtml}`;
  } catch {
    return rawHtml;
  }
}

function stripSlowExternalAssets(rawHtml) {
  return rawHtml
    .replace(/<link[^>]+href=["']https?:\/\/fonts\.googleapis\.com[^>]*>\s*/gi, '')
    .replace(/<link[^>]+href=["']https?:\/\/fonts\.gstatic\.com[^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']preconnect["'][^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi, '')
    .replace(/@import\s+url\((['"]?)https?:\/\/fonts\.googleapis\.com[^)]+\);\s*/gi, '');
}

function buildProxyErrorDocument(title, message, detail = '') {
  const safeTitle = String(title || '教学应用').replace(/[<>&"]/g, '');
  const safeMessage = String(message || '资源加载失败').replace(/[<>&"]/g, '');
  const safeDetail = String(detail || '').replace(/[<>&"]/g, '');

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #0f172a;
      }
      .card {
        width: min(92vw, 38rem);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.28);
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
        padding: 24px;
      }
      h1 { margin: 0 0 10px; font-size: 24px; }
      p { margin: 0; line-height: 1.7; color: #475569; }
      .detail {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 16px;
        background: #fff7ed;
        color: #9a3412;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${safeMessage}</h1>
      <p>这个资源没有正常返回可渲染的页面内容，通常是外部依赖加载失败、上游响应过慢，或源文件本身存在脚本错误。</p>
      ${safeDetail ? `<div class="detail">${safeDetail}</div>` : ''}
    </main>
  </body>
</html>`;
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timer);
    },
  };
}

async function getPublicResources() {
  let databaseResources = [];

  try {
    const result = await query('SELECT * FROM resources ORDER BY created_at DESC, id DESC');
    databaseResources = result.rows.map(normalizeResource);
  } catch {
    databaseResources = [];
  }

  const seedResources = await loadSeedResources();
  return mergeResources(databaseResources, seedResources);
}

async function resolveHtmlResource({ resourcePath, url }) {
  const resources = (await getPublicResources()).filter((resource) => resource.resource_type === 'html');
  return resourcePath ? findHtmlResourceByPath(resources, resourcePath) : findHtmlResourceByUrl(resources, url);
}

export async function registerPublicRoutes(app) {
  const htmlProxyAllowHosts = buildHtmlProxyAllowlist();

  app.get(
    '/api/health',
    {
      schema: {
        response: {
          200: healthCheckSchema,
        },
      },
    },
    async (_request, reply) => {
      const health = await fetchHealth();
      const isHealthy = [health.auth, health.database, health.storage].every(
        (component) => component.status === 'success'
      );
      const publicHealth = {
        api: {
          status: health.api.status,
          message: 'API service is available',
          storageDriver: 'configured',
        },
        auth: {
          status: health.auth.status,
          message: 'Authentication service is available',
        },
        database: {
          status: health.database.status,
          message:
            health.database.status === 'success'
              ? 'Database service is healthy'
              : 'Database service is unavailable',
        },
        storage: {
          status: health.storage.status,
          message:
            health.storage.status === 'success'
              ? 'Storage service is healthy'
              : 'Storage service is unavailable',
        },
      };
      return reply.code(isHealthy ? 200 : 503).send(publicHealth);
    }
  );

  app.get(
    '/api/resources/resolve',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: { type: 'string', minLength: 1 },
            url: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: resourceSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { path: resourcePath, url } = request.query || {};
      const hasPath = typeof resourcePath === 'string' && resourcePath.trim().length > 0;
      const hasUrl = typeof url === 'string' && url.trim().length > 0;

      if (!hasPath && !hasUrl) {
        return reply.code(400).send({ error: 'Missing path or url' });
      }

      const matchedResource = await resolveHtmlResource({ resourcePath, url });

      if (!matchedResource) {
        return reply.code(404).send({ error: 'Resource not found' });
      }

      reply.header('Cache-Control', 'public, max-age=60');
      return reply.send(matchedResource);
    }
  );

  app.get(
    '/api/resources',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: resourceSchema,
          },
        },
      },
    },
    async () => {
      return getPublicResources();
    }
  );

  app.get(
    '/api/teaching-resources',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: teachingResourceSchema,
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await query('SELECT * FROM teaching_resources ORDER BY created_at DESC, id DESC');
        return result.rows.map(normalizeTeachingResource);
      } catch (error) {
        request.log.warn({ err: error }, 'Teaching resources database unavailable; returning fallback signal');
        reply.header('X-MathFlow-Data-Source', 'fallback');
        return [];
      }
    }
  );

  app.get(
    '/api/html-proxy',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            url: { type: 'string', minLength: 1 },
            path: { type: 'string', minLength: 1 },
            iframe: { type: 'string', enum: ['1'] },
            title: { type: 'string' },
          },
        },
        response: {
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { url, path: resourcePath, iframe, title } = request.query || {};
      const isIframeRequest = iframe === '1';
      const hasUrl = typeof url === 'string' && url.trim().length > 0;
      const hasPath = typeof resourcePath === 'string' && resourcePath.trim().length > 0;

      if (!hasUrl && !hasPath) {
        return reply.code(400).send({ error: 'Missing url or path' });
      }

      let matchedResource = null;
      if (!hasUrl && hasPath) {
        matchedResource = await resolveHtmlResource({ resourcePath, url: null });
        if (!matchedResource) {
          if (isIframeRequest) {
            reply.code(404).header('Content-Type', 'text/html; charset=utf-8');
            return reply.send(buildProxyErrorDocument(title, '资源不存在', '这个短链当前没有对应的 HTML 资源。'));
          }
          return reply.code(404).send({ error: 'Resource not found' });
        }
      }

      const rawTargetUrl = hasUrl ? url : matchedResource?.file_path;
      if (!rawTargetUrl || typeof rawTargetUrl !== 'string') {
        return reply.code(400).send({ error: 'Missing target url' });
      }

      if (!isAllowedProxyUrl(rawTargetUrl, htmlProxyAllowHosts)) {
        return reply.code(400).send({ error: 'URL not allowed' });
      }

      const cacheKey = `${resourcePath || ''}|${rawTargetUrl}`;
      const cachedEntry = getCachedHtmlProxyEntry(cacheKey);
      if (cachedEntry) {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        reply.header('Cache-Control', 'public, max-age=600, stale-while-revalidate=86400');
        reply.header('X-HTML-Proxy-Cache', 'HIT');
        return reply.send(cachedEntry.html);
      }

      const targetUrl = rawTargetUrl.startsWith('/uploads/')
        ? `${config.apiBaseUrl || `http://127.0.0.1:${config.port}`}${rawTargetUrl}`
        : rawTargetUrl;

      const requestTimeout = withTimeout(config.htmlProxyTimeoutMs);
      let response;

      try {
        response = await fetch(targetUrl, { signal: requestTimeout.signal });
      } catch (error) {
        requestTimeout.clear();

        if (error instanceof Error && error.name === 'AbortError') {
          if (isIframeRequest) {
            reply.code(504).header('Content-Type', 'text/html; charset=utf-8');
            return reply.send(buildProxyErrorDocument(title, '资源加载超时', '上游文件响应超过等待时间，请稍后重试。'));
          }
          return reply.code(504).send({ error: 'Upstream timed out' });
        }

        throw error;
      }

      requestTimeout.clear();

      if (!response.ok) {
        if (isIframeRequest) {
          reply.code(response.status).header('Content-Type', 'text/html; charset=utf-8');
          return reply.send(
            buildProxyErrorDocument(title, '资源加载失败', `上游返回 ${response.status} ${response.statusText}。`)
          );
        }
        return reply.code(response.status).send({
          error: `Upstream error: ${response.status} ${response.statusText}`,
        });
      }

      const maxHtmlBytes = Math.max(config.htmlProxyMaxFileSizeMb, 1) * 1024 * 1024;
      let sourceHtml;
      try {
        sourceHtml = await readResponseText(response, maxHtmlBytes);
      } catch (error) {
        if (error?.statusCode === 413 && isIframeRequest) {
          reply.code(413).header('Content-Type', 'text/html; charset=utf-8');
          return reply.send(buildProxyErrorDocument(title, '资源文件过大', '该 HTML 超过在线预览大小限制。'));
        }
        throw error;
      }

      const text = injectBaseHref(stripSlowExternalAssets(sourceHtml), targetUrl);
      setCachedHtmlProxyEntry(cacheKey, { html: text, byteLength: Buffer.byteLength(text) });
      reply.header('Content-Type', 'text/html; charset=utf-8');
      reply.header('Cache-Control', 'public, max-age=600, stale-while-revalidate=86400');
      reply.header('X-HTML-Proxy-Cache', 'MISS');
      return reply.send(text);
    }
  );
}
