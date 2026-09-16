import { readBundleAsset, resolveBundleAsset } from '../services/bundlePreview.js';

// This route serves public static files, never authenticated API responses.
// Its narrow CORS policy is independent of the credentialed admin API policy.
export function registerBundleAssetRoutes(app, { findResource, apiOrigin, allowHosts, fetchAsset = (...args) => fetch(...args), timeoutMs = 10000, maxBytes = 16 * 1024 * 1024 }) {
  app.get('/api/preview-assets/:id/:version/*', {
    config: { cors: false, rateLimit: { max: 600, timeWindow: '1 minute' } },
    schema: { params: { type: 'object', required: ['id', 'version', '*'], properties: {
      id: { type: 'string', format: 'uuid' },
      version: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' },
      '*': { type: 'string', minLength: 1, maxLength: 1024 },
    } } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const resource = await findResource(request.params.id);
    const asset = resolveBundleAsset(resource, request.params.version, request.params['*'], { apiOrigin, allowHosts });
    if (!asset) return reply.code(404).send({ error: 'Preview asset not found' });
    let response;
    let body;
    try {
      // Never follow a redirect to an unapproved host or forward client cookies.
      response = await fetchAsset(asset.target, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        await response.body?.cancel();
        return reply.code(response.status === 404 ? 404 : 502).send({ error: 'Preview asset unavailable' });
      }
      if (/text\/html|application\/(?:xhtml\+xml|xml)|text\/xml/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel();
        return reply.code(502).send({ error: 'Unexpected preview asset content' });
      }
      body = await readBundleAsset(response, maxBytes);
    } catch (error) {
      return reply.code(error.statusCode === 413 ? 413 : 502).send({ error: 'Preview asset unavailable' });
    }
    reply.headers({
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
      'Content-Type': asset.contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    });
    return reply.send(body);
  });
}
