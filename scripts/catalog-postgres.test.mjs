import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { createResourceCatalog } from '../apps/api/src/services/resourceCatalog.js';

// Never read the production or application DB environment as a fallback.
const connectionString = process.env.REVISION_TEST_DATABASE_URL;

const titleMigration = await readFile(new URL('../deploy/db/migrations/20260930_plain_resource_titles.sql', import.meta.url), 'utf8');
const titleChanges = [...titleMigration.matchAll(/\('([a-f0-9-]+)'::uuid, '([^']+)', '([^']+)'\)/g)]
  .map(([, id, oldTitle, newTitle]) => ({ id, oldTitle, newTitle }));

test('plain resource titles are concise, distinct and explicitly scoped', () => {
  assert.equal(titleChanges.length, 94);
  assert.equal(new Set(titleChanges.map((r) => r.id)).size, 94);
  assert.equal(new Set(titleChanges.map((r) => r.newTitle)).size, 94);
  for (const { oldTitle, newTitle } of titleChanges) {
    assert.notEqual(newTitle, oldTitle);
    assert.ok(newTitle.length <= 14, newTitle);
    assert.doesNotMatch(newTitle, /观察台|推演台|训练场|工具台/);
  }
});

test('title migration preserves content, archives revisions and respects manual renames and deletions', {
  skip: !connectionString && 'Set REVISION_TEST_DATABASE_URL to an isolated PostgreSQL test database',
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `titles_test_${randomBytes(8).toString('hex')}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(await readFile(new URL('../deploy/db/init/01-schema.sql', import.meta.url), 'utf8'));
    await client.query(await readFile(new URL('../deploy/db/migrations/20260916_preserve_resource_revisions.sql', import.meta.url), 'utf8'));
    // Reproduce legacy rows predating the NOT VALID grade constraint.
    await client.query('ALTER TABLE resources DROP CONSTRAINT chk_resources_grade');
    // Leave one absent and one manually renamed: neither should be overwritten.
    for (const [index, row] of titleChanges.slice(0, -1).entries()) {
      await client.query(`INSERT INTO resources(id,title,category,grade,image_url,description,file_path,route_path)
        VALUES ($1,$2,'其他',$4,'/cover.png','Original description','/lesson.html',$3)`,
      [row.id, index === 0 ? '用户自定标题' : row.oldTitle, `/lesson-${index}`,
        row.oldTitle === '高年级找零训练场' ? '五六年级' : row.oldTitle === '低年级找零训练场' ? '一二年级' : '通用']);
    }
    await client.query(`ALTER TABLE resources ADD CONSTRAINT chk_resources_grade
      CHECK (grade IN ('一年级','二年级','三年级','四年级','五年级','六年级','通用','拓展')) NOT VALID`);
    const before = (await client.query('SELECT * FROM resources ORDER BY id')).rows;
    await client.query(titleMigration);
    const after = (await client.query('SELECT * FROM resources ORDER BY id')).rows;
    assert.equal(after.length, 93);
    for (const [index, row] of after.entries()) {
      const original = before[index];
      const changed = original.title !== '用户自定标题';
      const expectedTitle = changed ? titleChanges.find((r) => r.id === row.id).newTitle : original.title;
      assert.equal(row.title, expectedTitle);
      assert.equal(row.version, original.version + Number(changed));
      assert.deepEqual({ ...row, title: original.title, version: original.version, updated_at: original.updated_at }, original);
    }
    const revisions = (await client.query('SELECT * FROM resource_revisions')).rows;
    assert.equal(revisions.length, 92);
    for (const revision of revisions) {
      assert.equal(revision.snapshot.title, titleChanges.find((r) => r.id === revision.resource_id).oldTitle);
    }
    await client.query(titleMigration);
    assert.deepEqual((await client.query('SELECT * FROM resources ORDER BY id')).rows, after);
    assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM resource_revisions')).rows[0].count, 92);
    await assert.rejects(client.query("UPDATE resources SET grade = 'invalid-grade'"), { code: '23514' });
  } finally {
    await client.query('ROLLBACK');
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  }
});
test('catalog SQL paginates, searches, resolves paths and does not resurrect deleted entries', {
  skip: !connectionString && 'Set REVISION_TEST_DATABASE_URL to an isolated PostgreSQL test database',
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `catalog_test_${randomBytes(8).toString('hex')}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(await readFile(new URL('../deploy/db/init/01-schema.sql', import.meta.url), 'utf8'));
    const indexes = await readFile(new URL('../deploy/db/migrations/20260917_catalog_lookup_indexes.sql', import.meta.url), 'utf8');
    await client.query(indexes);
    await client.query(indexes);
    await client.query(`INSERT INTO resources(title, category, grade, image_url, description, file_path, route_path, created_at)
      SELECT '圆的面积推导' || n, '图形与几何', CASE WHEN n % 2 = 0 THEN '六年级' ELSE '通用' END,
        '/cover.png', '推导', '/works/circle-' || n || '.html', '/works/circle-' || n, '2026-09-17'::timestamptz
      FROM generate_series(1,45) n`);
    await client.query(`INSERT INTO resources(title,category,grade,image_url,description,file_path)
      VALUES ('趣味数独','互动游戏','通用','/cover.png','数独','/sudoku.html'),
      ('Legacy sample','其他','通用','/cover.png','test','https://example.com/potion.html')`);
    const catalog = createResourceCatalog({ query: (...args) => client.query(...args), config: { nodeEnv: 'test', allowSeedWithoutDb: true }, loadSeedResources: async () => { throw new Error('Seed must not run'); } });
    const options = { section: 'ai', category: '图形与几何', page: 1, pageSize: 20 };
    const first = await catalog.resourcePage(options);
    const second = await catalog.resourcePage({ ...options, page: 2 });
    assert.equal(first.total, 45);
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 20);
    assert.equal(new Set([...first.items, ...second.items].map((r) => r.id)).size, 40);
    assert.deepEqual((await catalog.resourcePage(options)).items, first.items);
    assert.equal((await catalog.resourcePage({ ...options, page: 3 })).hasMore, false);
    assert.equal((await catalog.resourcePage({ ...options, page: 4 })).total, 45);
    assert.equal((await catalog.resourcePage({ ...options, page: 4 })).items.length, 0);
    assert.equal((await catalog.resourcePage({ ...options, grade: '六年级' })).total, 45);
    assert.equal((await catalog.resourcePage({ ...options, grade: '五年级' })).total, 23);
    assert.equal((await catalog.resourcePage({ ...options, category: "' OR 1=1--" })).total, 0);
    assert.equal((await catalog.resourcePage({ ...options, q: 'ydmjtd', page: 3 })).items.length, 5);
    assert.equal((await catalog.resourcePage({ page: 1, pageSize: 20, section: 'games' })).total, 1);
    assert.equal((await catalog.resolve({ resourcePath: '/works/circle-1' })).title, '圆的面积推导1');
    assert.equal((await catalog.resolve({ resourcePath: '/zhijing/potion' })).title, 'Legacy sample');
    assert.equal((await catalog.resolve({ url: '/sudoku.html' })).title, '趣味数独');
    await client.query(`INSERT INTO teaching_resources(title,zone,file_url,file_type) VALUES
      ('三年级下册','textbook','/3b.pdf','pdf'), ('一年级下册','textbook','/1b.pdf','pdf'),
      ('一年级上册','textbook','/1a.pdf','pdf'), ('课程标准','standard','/s.pdf','pdf')`);
    const books = await catalog.teachingPage({ page: 1, pageSize: 2, zone: 'textbook' });
    assert.deepEqual(books.items.map((r) => r.title), ['一年级上册', '一年级下册']);
    assert.equal(books.zones.textbook, 3);
    assert.equal(books.zones.standard, 1);
    assert.equal(books.hasMore, true);
    await client.query('DELETE FROM resources');
    await client.query('DELETE FROM teaching_resources');
    assert.equal((await catalog.resourcePage(options)).total, 0);
    assert.equal((await catalog.teachingPage({ page: 1, pageSize: 20, zone: 'textbook' })).total, 0);
  } finally {
    await client.query('ROLLBACK');
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  }
});
