import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerBundleAssetRoutes } from '../src/routes/bundleAssets.js';
import { bundlePreviewBase, resolveBundleAsset } from '../src/services/bundlePreview.js';

const id = '8a9ee6ca-e5d1-43e4-ba12-6f71581cf2fa';
const resource = { id, version: 2, resource_type: 'html', file_path: 'https://cdn.example.com/apps/bundles/lesson/index.html' };
const options = { apiOrigin: 'http://127.0.0.1:3001', allowHosts: new Set(['cdn.example.com']) };
const prefix = `/api/preview-assets/${id}/2/`;

test('bundle base preserves nested entry directories and leaves legacy HTML unchanged', () => {
  assert.equal(bundlePreviewBase(resource, options.apiOrigin), prefix);
  assert.equal(bundlePreviewBase({ ...resource, file_path: resource.file_path.replace('index.html', 'nested/index.html') }, options.apiOrigin), `${prefix}nested/`);
  assert.equal(bundlePreviewBase({ ...resource, file_path: 'https://cdn.example.com/legacy.html' }, options.apiOrigin), null);
});

test('only current registered bundle files with safe paths and extensions can be resolved', () => {
  const good = resolveBundleAsset(resource, '2', 'assets/chunk.js', options);
  assert.equal(good.target.href, 'https://cdn.example.com/apps/bundles/lesson/assets/chunk.js');
  assert.match(good.contentType, /javascript/);
  for (const name of ['../secret.js', '%2e%2e/secret.js', '/elsewhere.js', 'https://evil/a.js', 'assets\\a.js', 'index.html', '.env', 'data.js?token=x', 'a\u0000.js']) {
    assert.equal(resolveBundleAsset(resource, '2', name, options), null, name);
  }
  assert.equal(resolveBundleAsset(resource, '1', 'a.js', options), null);
  assert.equal(resolveBundleAsset(null, '2', 'a.js', options), null);
  assert.equal(resolveBundleAsset({ ...resource, file_path: resource.file_path.replace('cdn.example.com', 'evil.example') }, '2', 'a.js', options), null);
  assert.equal(resolveBundleAsset({ ...resource, file_path: 'https://user:pass@cdn.example.com/apps/bundles/a/index.html' }, '2', 'a.js', options), null);
  assert.equal(resolveBundleAsset({ ...resource, file_path: '/uploads/apps/bundles/local/index.html' }, '2', 'a.js', options).target.href, 'http://127.0.0.1:3001/uploads/apps/bundles/local/a.js');
});

async function setup(t, fetchAsset, extra = {}) {
  const app = Fastify();
  await app.register(cors, { origin: 'https://site.example', credentials: true });
  registerBundleAssetRoutes(app, { ...options, findResource: async (key) => key === id ? resource : null, fetchAsset, ...extra });
  app.get('/admin-policy', () => ({ ok: true }));
  t.after(() => app.close());
  return app;
}

test('sandbox modules, styles and nested imports get CORS without credentials or upstream cookies', async (t) => {
  const app = await setup(t, async (url, init) => {
    assert.match(url.href, /^https:\/\/cdn.example.com\/apps\/bundles\/lesson\//);
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers, undefined);
    return new Response('/* static */', { headers: { 'content-type': 'application/octet-stream', 'set-cookie': 'secret=x' } });
  });
  for (const file of ['assets/main.js', 'assets/lazy/chunk.js', 'assets/styles.css']) {
    const result = await app.inject({ url: prefix + file, headers: { origin: 'null', cookie: 'mf_admin=private' } });
    assert.equal(result.statusCode, 200);
    assert.equal(result.headers['access-control-allow-origin'], '*');
    assert.equal(result.headers['access-control-allow-credentials'], undefined);
    assert.equal(result.headers['set-cookie'], undefined);
    assert.equal(result.body, '/* static */');
    assert.match(result.headers['content-type'], file.endsWith('.css') ? /text\/css/ : /javascript/);
  }
  const admin = await app.inject({ url: '/admin-policy', headers: { origin: 'null' } });
  assert.notEqual(admin.headers['access-control-allow-origin'], '*');
});

test('missing/deleted resources, old versions and HTML are rejected without upstream requests', async (t) => {
  const app = await setup(t, () => { throw new Error('must not fetch'); });
  for (const url of [prefix + 'index.html', prefix.replace('/2/', '/1/') + 'a.js', prefix.replace(id, '11111111-1111-1111-1111-111111111111') + 'a.js', prefix + '%252e%252e/private.js']) {
    assert.equal((await app.inject({ url })).statusCode, 404);
  }
  assert.equal((await app.inject({ url: prefix.replace(id, 'invalid') + 'a.js' })).statusCode, 400);
});

test('upstream redirects, errors and HTML fallback fail closed', async (t) => {
  const app = await setup(t, async (url) => {
    if (url.pathname.endsWith('redirect.js')) throw new TypeError('redirect blocked');
    if (url.pathname.endsWith('missing.js')) return new Response('not found', { status: 404 });
    return new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } });
  });
  assert.equal((await app.inject({ url: prefix + 'redirect.js' })).statusCode, 502);
  assert.equal((await app.inject({ url: prefix + 'missing.js' })).statusCode, 404);
  assert.equal((await app.inject({ url: prefix + 'fallback.js' })).statusCode, 502);
});

test('declared and streamed oversized bodies are bounded', async (t) => {
  const app = await setup(t, async (url) => new Response('0123456789', {
    headers: url.pathname.endsWith('declared.js') ? { 'content-length': '100' } : {},
  }), { maxBytes: 5 });
  assert.equal((await app.inject({ url: prefix + 'declared.js' })).statusCode, 413);
  assert.equal((await app.inject({ url: prefix + 'streamed.js' })).statusCode, 413);
});
