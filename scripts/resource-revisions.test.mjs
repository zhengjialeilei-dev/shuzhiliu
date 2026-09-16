import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

// Explicit test-only connection. Never falls back to apps/api/.env or DATABASE_URL.
const connectionString = process.env.REVISION_TEST_DATABASE_URL;
test('revision migration is repeatable, transactional and retains historical metadata', {
  skip: !connectionString && 'Set REVISION_TEST_DATABASE_URL to an isolated PostgreSQL test database',
}, async () => {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
  const schema = `revision_test_${randomBytes(8).toString('hex')}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(await readFile(new URL('../deploy/db/init/01-schema.sql', import.meta.url), 'utf8'));
    const migration = await readFile(new URL('../deploy/db/migrations/20260916_preserve_resource_revisions.sql', import.meta.url), 'utf8');
    await client.query(migration);
    await client.query(migration);
    const { rows: [original] } = await client.query(`
      INSERT INTO resources(title, category, grade, image_url, description, file_path, route_path)
      VALUES ('Release test', '其他', '通用', '/old.png', 'test', '/old.html', '/works/revision-test')
      RETURNING *`);
    const { rows: [updated] } = await client.query(
      'UPDATE resources SET file_path = $1 WHERE id = $2 RETURNING *', ['/new.html', original.id]);
    assert.equal(updated.version, 2);
    const { rows: [revision] } = await client.query('SELECT * FROM resource_revisions WHERE resource_id = $1', [original.id]);
    assert.equal(revision.version, 1);
    assert.equal(revision.snapshot.file_path, '/old.html');
    assert.equal(revision.snapshot.route_path, '/works/revision-test');

    await assert.rejects(client.query('UPDATE resources SET grade = $1 WHERE id = $2', ['invalid-grade', original.id]));
    assert.equal((await client.query('SELECT count(*)::int AS n FROM resource_revisions')).rows[0].n, 1);
    assert.equal((await client.query('SELECT version FROM resources WHERE id = $1', [original.id])).rows[0].version, 2);
    await client.query('DELETE FROM resources WHERE id = $1', [original.id]);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM resource_revisions')).rows[0].n, 1);
  } finally {
    await client.query('ROLLBACK');
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  }
});
