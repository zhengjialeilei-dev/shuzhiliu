import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { checkRelease } from '../deploy/check_release.mjs';

const connectionString = process.env.REVISION_TEST_DATABASE_URL;
test('real API and PostgreSQL agree after admin create, update, and delete', {
  skip: !connectionString && 'Set REVISION_TEST_DATABASE_URL to an isolated PostgreSQL test database',
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `catalog_api_test_${randomBytes(8).toString('hex')}`;
  const uploadDir = await mkdtemp(path.join(tmpdir(), 'mathflow-api-db-test-'));
  let app;
  let pool;
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    for (const file of ['init/01-schema.sql', 'migrations/20260916_preserve_resource_revisions.sql', 'migrations/20260917_catalog_lookup_indexes.sql']) {
      await client.query(await readFile(new URL(`../deploy/db/${file}`, import.meta.url), 'utf8'));
    }
    // Every pooled connection targets this run's schema. Set before importing
    // the application so dotenv cannot select the user's database or storage.
    const url = new URL(connectionString);
    url.searchParams.set('options', `-c search_path=${schema},public`);
    Object.assign(process.env, {
      NODE_ENV: 'test', DATABASE_URL: url.toString(), STORAGE_DRIVER: 'local', UPLOAD_DIR: uploadDir,
      ADMIN_PASSWORD: 'isolated-api-test', JWT_SECRET: randomBytes(32).toString('hex'),
      ALLOW_SEED_WITHOUT_DB: 'false', COOKIE_SECURE: 'false', PUBLIC_ASSET_BASE_URL: '',
    });
    const { buildApp } = await import('../apps/api/src/app.js');
    ({ pool } = await import('../apps/api/src/db.js'));
    app = await buildApp();
    const login = await app.inject({ method: 'POST', url: '/api/admin/login', payload: { password: 'isolated-api-test' } });
    assert.equal(login.statusCode, 200);
    const headers = { cookie: login.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ') };
    const payload = {
      title: '圆的面积推导', description: '数据库联调', category: '图形与几何', grade: '六年级',
      image_url: '', file_path: 'https://example.invalid/circle.html', route_path: '/works/db-check', resource_type: 'html',
    };
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/resources', payload })).statusCode, 401);
    const created = await app.inject({ method: 'POST', url: '/api/admin/resources', headers, payload });
    assert.equal(created.statusCode, 201, created.body);
    const id = created.json().id;
    const listing = await app.inject({ url: '/api/resources/page?section=ai&q=ydmjtd' });
    assert.equal(listing.statusCode, 200, listing.body);
    assert.equal(listing.json().items[0].id, id);
    assert.equal(listing.json().total, 1);
    assert.equal(listing.headers['cache-control'], 'no-store');
    const releaseChecks = await checkRelease({ baseUrl: 'http://localhost:3001', fetchImpl: async (url) => {
      const response = await app.inject({ url: new URL(url).pathname + new URL(url).search });
      return new Response(response.body, { status: response.statusCode, headers: response.headers });
    } });
    assert.ok(releaseChecks.includes('preview identity'));
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/resources', headers, payload })).statusCode, 409);
    const update = await app.inject({ method: 'PUT', url: `/api/admin/resources/${id}`, headers,
      payload: { title: '圆的面积新版本', description: '已更新', category: '图形与几何', grade: '六年级' } });
    assert.equal(update.statusCode, 200, update.body);
    assert.equal(update.json().version, 2);
    const resolved = await app.inject({ url: '/api/resources/resolve?path=/works/db-check' });
    assert.equal(resolved.json().version, 2);
    assert.equal(resolved.json().title, '圆的面积新版本');
    assert.equal((await client.query('SELECT snapshot FROM resource_revisions WHERE resource_id=$1', [id])).rows[0].snapshot.title, payload.title);
    assert.equal((await app.inject({ method: 'DELETE', url: `/api/admin/resources/${id}`, headers })).statusCode, 200);
    assert.equal((await app.inject({ url: '/api/resources/page?section=ai' })).json().total, 0);
    assert.equal((await app.inject({ url: '/api/resources/resolve?path=/works/db-check' })).statusCode, 404);
    assert.equal((await client.query('SELECT count(*)::int n FROM resource_revisions WHERE resource_id=$1', [id])).rows[0].n, 1);
    const teaching = await app.inject({ method: 'POST', url: '/api/admin/teaching-resources', headers,
      payload: { title: '一年级数学', description: '测试教材', zone: 'textbook', file_url: 'https://example.invalid/book.pdf' } });
    assert.equal(teaching.statusCode, 201, teaching.body);
    assert.equal((await app.inject({ url: '/api/teaching-resources/page?zone=textbook' })).json().zones.textbook, 1);
    assert.equal((await app.inject({ method: 'DELETE', url: `/api/admin/teaching-resources/${teaching.json().id}`, headers })).statusCode, 200);
    assert.equal((await app.inject({ url: '/api/teaching-resources/page?zone=textbook' })).json().total, 0);
  } finally {
    await app?.close();
    await pool?.end();
    if (connected) {
      await client.query('ROLLBACK');
      await client.query('SET search_path TO public');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
    await client.end();
    if (path.dirname(uploadDir) === path.resolve(tmpdir()) && path.basename(uploadDir).startsWith('mathflow-api-db-test-')) {
      await rm(uploadDir, { recursive: true, force: true });
    }
  }
});
