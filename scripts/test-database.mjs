import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// Dedicated disposable local database. Never reads application .env, uses an
// existing container, mounts user data, or connects to DATABASE_URL.
const root = fileURLToPath(new URL('../', import.meta.url));
const runId = randomBytes(8).toString('hex');
const container = `mathflow-test-${runId}`;
const label = `mathflow.test-run=${runId}`;
const password = randomBytes(24).toString('hex');
let created = false;
let activeChild;
let interrupted = false;

function run(command, args, { env = process.env, capture = true, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    activeChild = child;
    let output = '';
    let errors = '';
    if (capture) {
      child.stdout.on('data', (chunk) => { output += chunk; });
      child.stderr.on('data', (chunk) => { errors += chunk; });
    }
    const timer = setTimeout(() => child.kill(), timeout);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (activeChild === child) activeChild = undefined;
      if (code !== 0) reject(new Error(`${command} failed (${code ?? 'timeout/interrupted'}): ${errors.trim()}`));
      else resolve(output.trim());
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = true;
  activeChild?.kill();
});

try {
  const context = await run('docker', ['context', 'show']);
  const endpoint = process.env.DOCKER_HOST || await run('docker', ['context', 'inspect', context, '--format', '{{.Endpoints.docker.Host}}']);
  if (!/^(npipe:\/\/|unix:\/\/)/.test(endpoint)) throw new Error('Only a local Docker socket is allowed; remote Docker hosts are refused.');
  await run('docker', ['info', '--format', '{{.ServerVersion}}']);
  console.log(`Creating isolated PostgreSQL 16 container: ${container}`);
  // Mark ownership before creation so an interrupted create is cleaned up too.
  created = true;
  await run('docker', ['create', '--name', container, '--label', label,
    '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data:rw',
    '--env', 'POSTGRES_DB=mathflow_integration_test', '--env', 'POSTGRES_USER=integration_test',
    '--env', 'POSTGRES_PASSWORD', 'postgres:16-alpine'], {
    env: { ...process.env, POSTGRES_PASSWORD: password }, timeout: 180000,
  });
  if (interrupted) throw new Error('Interrupted');
  await run('docker', ['start', container]);
  let ready = false;
  for (let attempt = 0; attempt < 30 && !interrupted; attempt++) {
    try {
      await run('docker', ['exec', container, 'pg_isready', '-U', 'integration_test', '-d', 'mathflow_integration_test']);
      ready = true;
      break;
    } catch { await delay(1000); }
  }
  if (!ready) throw new Error('Test database did not become ready.');
  const binding = await run('docker', ['port', container, '5432/tcp']);
  const port = /^127\.0\.0\.1:(\d+)$/.exec(binding)?.[1];
  if (!port) throw new Error('Expected a localhost-only database port.');
  const connection = `postgresql://integration_test:${password}@127.0.0.1:${port}/mathflow_integration_test`;
  console.log('Running real database tests (no application/production data).');
  await run(process.execPath, ['--test', '--test-concurrency=1',
    'scripts/resource-revisions.test.mjs', 'scripts/catalog-postgres.test.mjs', 'scripts/catalog-api-postgres.test.mjs'], {
    env: { ...process.env, REVISION_TEST_DATABASE_URL: connection }, capture: false, timeout: 120000,
  });
} catch (error) {
  console.error(error.message.replaceAll(password, '[redacted]'));
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      const metadata = JSON.parse(await run('docker', ['inspect', container]));
      if (metadata[0]?.Config?.Labels?.['mathflow.test-run'] !== runId) throw new Error('Container ownership mismatch; refusing cleanup.');
      await run('docker', ['rm', '--force', '--volumes', container]);
      console.log('Removed this run’s temporary container and test data.');
    } catch (error) {
      if (!error.message.includes('No such object')) {
        console.error(`Cleanup failed for ${container}: ${error.message.replaceAll(password, '[redacted]')}`);
        process.exitCode = 1;
      }
    }
  }
}
