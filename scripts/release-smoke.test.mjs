import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { checkRelease } from '../deploy/check_release.mjs';

const html = '<div id="root"></div><script type="module" src="/assets/new.js"></script><link rel="stylesheet" href="/assets/new.css">';
const hash = createHash('sha256').update(html).digest('hex');
function fixture(override = () => undefined) {
  return async (input) => {
    const url = new URL(input);
    const replacement = override(url);
    if (replacement) return replacement;
    if (url.pathname === '/api/health') return Response.json(Object.fromEntries(['api', 'auth', 'database', 'storage'].map((key) => [key, { status: 'success' }])));
    if (url.pathname.endsWith('/page')) return Response.json({ items: [], total: 0, page: 1, pageSize: 1, hasMore: false, source: 'database', zones: { standard: 0, textbook: 0, plan: 0, courseware: 0 } });
    if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } });
    return new Response('/* asset */', { headers: { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' } });
  };
}
const run = (fetchImpl, options = {}) => checkRelease({ baseUrl: 'https://release.example', checkWeb: true, expectedIndexHash: hash, fetchImpl, ...options });

test('release smoke accepts healthy empty database and exact web entry', async () => {
  assert.equal((await run(fixture())).length, 9);
});
test('HTTP 200 with unhealthy database or storage blocks release', async () => {
  for (const failed of ['database', 'storage']) {
    await assert.rejects(run(fixture((url) => url.pathname === '/api/health' ? Response.json(Object.fromEntries(['api', 'auth', 'database', 'storage'].map((key) => [key, { status: key === failed ? 'error' : 'success' }]))) : undefined)), new RegExp(failed));
  }
});
test('old API missing pagination and HTML fallback responses block release', async () => {
  for (const status of [200, 404]) await assert.rejects(run(fixture((url) => url.pathname.endsWith('/page') ? new Response('<html>old site</html>', { status, headers: { 'content-type': 'text/html' } }) : undefined)));
});
test('demo data and malformed pagination block release', async () => {
  for (const patch of [{ source: 'demo' }, { total: 5 }, { pageSize: 20 }, { hasMore: true }]) {
    await assert.rejects(run(fixture((url) => url.pathname === '/api/resources/page' ? Response.json({ items: [], total: 0, page: 1, pageSize: 1, hasMore: false, source: 'database', ...patch }) : undefined)));
  }
});
test('stale entry and missing script returning SPA HTML block release', async () => {
  await assert.rejects(run(fixture(), { expectedIndexHash: 'a'.repeat(64) }), /expected release entry/);
  await assert.rejects(run(fixture((url) => url.pathname.endsWith('.js') ? new Response(html, { headers: { 'content-type': 'text/html' } }) : undefined)), /content type/);
});
test('API-only check does not fetch the website before activation', async () => {
  const inner = fixture();
  await run(async (url) => { assert.match(new URL(url).pathname, /^\/api\//); return inner(url); }, { checkWeb: false });
});

test('wrong teaching zone counts block release', async () => {
  await assert.rejects(run(fixture((url) => url.pathname === '/api/teaching-resources/page' ? Response.json({
    items: [], total: 0, page: 1, pageSize: 1, hasMore: false, source: 'database', zones: { standard: 1 },
  }) : undefined)), /zone count mismatch/);
});

test('preview must match the listed resource identity and version', async () => {
  const row = { id: 'sample', title: 'Test', category: '其他', resource_type: 'html', file_path: '/sample.html', route_path: '/works/sample', version: 2 };
  const fetchImpl = fixture((url) => {
    if (url.pathname === '/api/resources/page' && url.searchParams.get('section') === 'ai') return Response.json({ items: [row], total: 1, page: 1, pageSize: 1, hasMore: false, source: 'database' });
    if (url.pathname === '/api/resources/resolve') return Response.json({ ...row, version: 1 });
  });
  await assert.rejects(run(fetchImpl), /different resource\/version/);
});

test('bundle preview gate checks script/style MIME and sandbox CORS, not just resource identity', async () => {
  const row = { id: 'bundle', title: 'Test', category: '其他', resource_type: 'html', file_path: 'https://cdn.example/apps/bundles/test/index.html', route_path: '/works/test', version: 1 };
  const prefix = '/api/preview-assets/bundle/1/';
  function bundleFetch(corsHeader) {
    const inner = fixture((url) => {
      if (url.pathname === '/api/resources/page' && url.searchParams.get('section') === 'ai') return Response.json({ items: [row], total: 1, page: 1, pageSize: 1, hasMore: false, source: 'database' });
      if (url.pathname === '/api/resources/resolve') return Response.json(row);
      if (url.pathname === '/api/html-proxy') return new Response(`<head><base href="${prefix}"><script type="module" src="./assets/app.js"></script><link rel="stylesheet" href="./assets/app.css"></head>`, { headers: { 'content-type': 'text/html' } });
      if (url.pathname.startsWith(prefix)) return new Response('/* asset */', { headers: { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript', ...(corsHeader ? { 'access-control-allow-origin': corsHeader } : {}) } });
    });
    return async (url, init) => {
      if (new URL(url).pathname.startsWith(prefix)) assert.equal(init.headers.Origin, 'null');
      return inner(url);
    };
  }
  assert.ok((await run(bundleFetch('*'))).includes('sandbox bundle scripts and styles'));
  await assert.rejects(run(bundleFetch(null)), /sandbox loading/);
});
