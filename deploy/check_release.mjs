import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function check(condition, message) {
  if (!condition) throw new Error(message);
}

// Read-only release checks. Inject fetch for deterministic local failure tests.
export async function checkRelease({ baseUrl, checkWeb = false, expectedIndexHash, fetchImpl = fetch }) {
  const base = new URL(baseUrl);
  check(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password, 'Expected a credential-free HTTP(S) base URL');
  const checks = [];
  async function request(path, type, headers = {}) {
    const response = await fetchImpl(new URL(path, base), {
      signal: AbortSignal.timeout(10000), redirect: 'error', headers: { 'Cache-Control': 'no-cache', ...headers },
    });
    check(response.ok, `${path}: HTTP ${response.status}`);
    check(type.test(response.headers.get('content-type') || ''), `${path}: unexpected content type`);
    return response;
  }
  async function json(path) {
    return (await request(path, /application\/json/i)).json();
  }
  const health = await json('/api/health');
  for (const component of ['api', 'auth', 'database', 'storage']) {
    check(health[component]?.status === 'success', `Health check failed: ${component}`);
  }
  checks.push('health payload');
  function validatePage(page, path) {
    check(page.source === 'database', `${path}: not authoritative database data`);
    check(page.page === 1 && page.pageSize === 1, `${path}: pagination contract mismatch`);
    check(Array.isArray(page.items) && page.items.length <= 1, `${path}: unbounded items`);
    check(Number.isInteger(page.total) && page.total >= page.items.length && page.total >= 0, `${path}: invalid total`);
    check(page.hasMore === (page.total > 1), `${path}: invalid hasMore`);
    check(page.total === 0 || page.items.length === 1, `${path}: missing first item`);
    for (const row of page.items) check(typeof row.id === 'string' && typeof row.title === 'string', `${path}: malformed item`);
  }
  let preview;
  for (const section of ['ai', 'games', 'tools']) {
    const path = `/api/resources/page?section=${section}&page=1&pageSize=1`;
    const page = await json(path);
    validatePage(page, path);
    for (const row of page.items) {
      const valid = section === 'ai' ? !['互动游戏', '互动工具'].includes(row.category) : row.category === (section === 'games' ? '互动游戏' : '互动工具');
      check(valid, `${path}: wrong resource section`);
      if (!preview && row.resource_type === 'html' && row.file_path) preview = row;
    }
    checks.push(`resource section ${section}`);
  }
  for (const zone of ['standard', 'textbook', 'plan', 'courseware']) {
    const path = `/api/teaching-resources/page?zone=${zone}&page=1&pageSize=1`;
    const page = await json(path);
    validatePage(page, path);
    check(page.zones?.[zone] === page.total, `${path}: zone count mismatch`);
    check(page.items.every((row) => row.zone === zone), `${path}: wrong teaching zone`);
    checks.push(`teaching zone ${zone}`);
  }
  if (preview) {
    const params = new URLSearchParams(preview.route_path ? { path: preview.route_path } : { url: preview.file_path });
    const resolved = await json(`/api/resources/resolve?${params}`);
    check(resolved.id === preview.id && resolved.version === preview.version, 'Preview resolves to a different resource/version');
    checks.push('preview identity');
    if (preview.file_path.includes('/apps/bundles/')) {
      const html = await (await request(`/api/html-proxy?iframe=1&${params}&v=${preview.version || 1}`, /text\/html/i)).text();
      const prefix = `/api/preview-assets/${preview.id}/${preview.version || 1}/`;
      const assetBase = new URL((html.match(/<base\b[^>]*href=["']([^"']+)["']/i) || [])[1] || '', base);
      check(assetBase.origin === base.origin && assetBase.pathname.startsWith(prefix), 'Bundle preview is missing its isolated asset gateway');
      let scripts = 0;
      for (const tag of html.match(/<(?:script|link)\b[^>]*>/gi) || []) {
        const script = /^<script/i.test(tag) && /type=["']module["']/.test(tag);
        const stylesheet = /^<link/i.test(tag) && /rel=["']stylesheet["']/.test(tag);
        if (!script && !stylesheet) continue;
        const target = new URL((tag.match(/(?:src|href)=["']([^"']+)["']/) || [])[1] || '', assetBase);
        check(target.origin === base.origin && target.pathname.startsWith(prefix), 'Bundle entry asset bypasses its isolated gateway');
        const asset = await request(target.pathname, script ? /(?:javascript|ecmascript)/i : /text\/css/i, { Origin: 'null' });
        check(asset.headers.get('access-control-allow-origin') === '*' && !asset.headers.has('access-control-allow-credentials'), 'Bundle entry asset does not support credential-free sandbox loading');
        if (script) scripts++;
      }
      check(scripts > 0, 'Bundle preview has no module entry');
      checks.push('sandbox bundle scripts and styles');
    }
  }
  if (checkWeb) {
    check(/^[a-f0-9]{64}$/.test(expectedIndexHash || ''), 'Expected built index SHA-256 is required for web verification');
    const html = await (await request(`/?release_check=${expectedIndexHash}`, /text\/html/i)).text();
    check(createHash('sha256').update(html).digest('hex') === expectedIndexHash, 'Website is not serving the expected release entry');
    check(/id=["']root["']/.test(html), 'Missing application root');
    const tags = html.match(/<(?:script|link)\b[^>]*>/gi) || [];
    let scripts = 0;
    for (const tag of tags) {
      const script = /^<script/i.test(tag) && /type=["']module["']/.test(tag);
      const stylesheet = /^<link/i.test(tag) && /rel=["']stylesheet["']/.test(tag);
      if (!script && !stylesheet) continue;
      const target = new URL((tag.match(/(?:src|href)=["']([^"']+)["']/) || [])[1] || '', base);
      check(target.origin === base.origin && target.pathname.startsWith('/assets/'), 'Unexpected release asset location');
      await request(target.pathname + target.search, script ? /(?:javascript|ecmascript)/i : /text\/css/i);
      if (script) scripts++;
    }
    check(scripts > 0, 'Missing module entry script');
    checks.push('expected web entry and entry assets');
  }
  return checks;
}

if (!process.argv[1] || import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const checks = await checkRelease({ baseUrl: process.env.RELEASE_BASE_URL,
      checkWeb: process.env.RELEASE_CHECK_WEB === 'true', expectedIndexHash: process.env.RELEASE_EXPECTED_INDEX_SHA256 });
    console.log(`Release checks passed: ${checks.join(', ')}`);
  } catch (error) {
    console.error(`Release check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
