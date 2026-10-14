// Executed inside mathflow-api by the manually dispatched teaching workflow.
// Credentials stay in the container; only an explicitly allowlisted resource can change.
import { createHash } from 'node:crypto';
import { uploadObject } from '/app/apps/api/src/storage.js';
import { pool, query, withTransaction } from '/app/apps/api/src/db.js';

const projects = {
  'podium-unfolding': { id: 'd9da7515-1a1d-4f54-8fc1-e6faa0ec10e4', route: '/xxxxx-140054' },
  'expression-merge': { id: '6115b0cb-12dd-4162-a1af-cfd50d92f459', route: '/xxxxx-120015' },
};
const project = process.env.TEACHING_PROJECT || 'podium-unfolding';
const { PODIUM_SOURCE_URL: source, PODIUM_SHA: sha, PODIUM_FILE_HASH: expectedHash } = process.env;
const expectedVersion = Number(process.env.PODIUM_EXPECTED_VERSION);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

try {
  if (!Object.hasOwn(projects, project)) throw new Error('Project is not approved for publication');
  const { id, route } = projects[project];
  if (!/^[a-f0-9]{40}$/.test(sha || '') || !/^[a-f0-9]{64}$/.test(expectedHash || '') || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new Error('Invalid release identity');
  const current = (await query('SELECT * FROM resources WHERE id = $1 AND route_path = $2', [id, route])).rows[0];
  if (!current || current.version !== expectedVersion) throw new Error('Resource changed since review; refusing to replace it');
  const response = await fetch(source, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Build transfer failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 2 * 1024 * 1024 || digest(bytes) !== expectedHash || !bytes.includes(Buffer.from('data-build="inlined"'))) throw new Error('Build integrity check failed');
  const fileUrl = await uploadObject({ key: `apps/${project}/${sha}.html`, body: bytes, contentType: 'text/html; charset=utf-8' });
  const published = await fetch(fileUrl, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!published.ok || digest(Buffer.from(await published.arrayBuffer())) !== expectedHash) throw new Error('Published file verification failed; resource was not switched');
  const updated = await withTransaction(async (client) => {
    // The existing trigger archives the prior file URL and metadata atomically.
    const result = await client.query(`UPDATE resources SET file_path = $1
      WHERE id = $2 AND route_path = $3 AND version = $4 RETURNING id, version, route_path`, [fileUrl, id, route, expectedVersion]);
    if (result.rowCount !== 1) throw new Error('Concurrent resource change; previous publication preserved');
    return result.rows[0];
  });
  console.log(JSON.stringify({ published: true, ...updated, sha256: expectedHash }));
} finally {
  await pool.end();
}
