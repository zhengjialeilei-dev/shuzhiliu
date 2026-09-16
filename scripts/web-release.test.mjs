import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const helper = path.join(root, 'deploy/web_release.sh');
const gitBash = 'C:/Program Files/Git/bin/bash.exe';
const bash = process.env.RELEASE_TEST_BASH || (process.platform === 'win32' && existsSync(gitBash) ? gitBash : 'bash');
const portable = (value) => value.replaceAll('\\', '/');

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mathflow-release-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const site = path.join(dir, 'site');
  const staged = path.join(dir, 'staged');
  const backup = path.join(dir, 'backup');
  for (const folder of [site, staged]) await mkdir(path.join(folder, 'assets'), { recursive: true });
  await writeFile(path.join(site, 'index.html'), '<script src="/assets/old.js"></script>');
  await writeFile(path.join(site, 'assets/old.js'), 'old chunk');
  await writeFile(path.join(staged, 'index.html'), '<script src="/assets/new.js"></script>');
  await writeFile(path.join(staged, 'assets/new.js'), 'new chunk');
  return { site, staged, backup };
}

function run(script, { staged, site, backup }) {
  const result = spawnSync(bash, ['--noprofile', '--norc', '-c',
    `set -euo pipefail\nsource "$1"\n${script}`, 'release-test',
    portable(helper), portable(staged), portable(site), portable(backup)], { encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}

test('prepare keeps old entry; activation preserves both versions of lazy chunks', async (t) => {
  const f = await fixture(t);
  const prepare = run('prepare_web_release "$2" "$3" "$4"', f);
  assert.equal(prepare.status, 0, prepare.stderr);
  assert.match(await readFile(path.join(f.site, 'index.html'), 'utf8'), /old.js/);
  assert.equal(await readFile(path.join(f.site, 'assets/new.js'), 'utf8'), 'new chunk');
  const activate = run('activate_web_release "$3" "$4"', f);
  assert.equal(activate.status, 0, activate.stderr);
  assert.match(await readFile(path.join(f.site, 'index.html'), 'utf8'), /new.js/);
  assert.equal(await readFile(path.join(f.site, 'assets/old.js'), 'utf8'), 'old chunk');
  assert.match(await readFile(path.join(f.backup, 'index.html'), 'utf8'), /old.js/);
});

test('rollback restores old entry without breaking browsers already using new chunks', async (t) => {
  const f = await fixture(t);
  const result = run('prepare_web_release "$2" "$3" "$4"\nactivate_web_release "$3" "$4"\nrollback_web_release "$3" "$4"', f);
  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(path.join(f.site, 'index.html'), 'utf8'), /old.js/);
  assert.equal(await readFile(path.join(f.site, 'assets/old.js'), 'utf8'), 'old chunk');
  assert.equal(await readFile(path.join(f.site, 'assets/new.js'), 'utf8'), 'new chunk');
});

test('missing build or reused backup fails without switching entry', async (t) => {
  const f = await fixture(t);
  await mkdir(f.backup);
  const duplicate = run('prepare_web_release "$2" "$3" "$4"', f);
  assert.notEqual(duplicate.status, 0);
  await rm(path.join(f.staged, 'index.html'));
  const missing = run('prepare_web_release "$2" "$3" "$4"', f);
  assert.notEqual(missing.status, 0);
  assert.match(await readFile(path.join(f.site, 'index.html'), 'utf8'), /old.js/);
});

test('production release builds and checks API before switching entry and retains rollback image', async () => {
  const workflow = await readFile(path.join(root, '.github/workflows/deploy-web.yml'), 'utf8');
  assert.ok(workflow.indexOf('build api') < workflow.indexOf('POSTGRES_CONTAINER=mathflow-postgres sh'));
  assert.ok(workflow.indexOf('test "$API_READY" = true') < workflow.indexOf('activate_web_release "$SITE_ROOT"'));
  assert.ok(workflow.includes('docker image tag "$PREVIOUS_API_IMAGE" "$ROLLBACK_IMAGE"'));
  assert.ok(workflow.includes('up -d --no-build --pull never api'));
  assert.doesNotMatch(workflow, /rm -f "\$asset"/);
  assert.ok(workflow.includes('deploy/web_release.sh deploy/db'));
  assert.ok(workflow.includes('deploy/db deploy/check_release.mjs'));
  assert.ok(workflow.indexOf('docker exec -i -e RELEASE_BASE_URL=http://127.0.0.1:3001') < workflow.indexOf('activate_web_release "$SITE_ROOT"'));
  assert.ok(workflow.indexOf('RELEASE_CHECK_WEB=true') > workflow.indexOf('activate_web_release "$SITE_ROOT"'));
  assert.ok(workflow.indexOf('RELEASE_CHECK_WEB=true') < workflow.lastIndexOf('trap - ERR'));
  // Syntax-check the actual remote payload without contacting the server.
  const start = workflow.indexOf('          # A cancelled Actions runner');
  const end = workflow.indexOf('          SCRIPT', start);
  assert.ok(start > 0 && end > start);
  const payload = workflow.slice(start, end).replace(/^ {10}/gm, '');
  const result = spawnSync(bash, ['-n'], { input: payload, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test('actual deployment error handler restores entry and invokes saved API image without masking failure', async (t) => {
  const f = await fixture(t);
  const workflow = await readFile(path.join(root, '.github/workflows/deploy-web.yml'), 'utf8');
  const start = workflow.indexOf('          recover_release() {');
  const end = workflow.indexOf('          set -E', start);
  assert.ok(start > 0 && end > start);
  const handler = workflow.slice(start, end).replace(/^ {10}/gm, '');
  const result = run(`
mkdir "$4"
prepare_web_release "$2" "$3" "$4/web"
activate_web_release "$3" "$4/web"
SITE_ROOT="$3"
RELEASE_BACKUP="$4"
SOURCE_ROOT=/unused
ENV_FILE=/unused
WEB_ACTIVATION_STARTED=true
API_SWITCH_STARTED=true
docker() { printf '%s\\n' "$*" >> "$RELEASE_BACKUP/docker-calls"; }
curl() { return 0; }
${handler}
set -E
trap recover_release ERR
false`, f);
  assert.equal(result.status, 1);
  assert.match(await readFile(path.join(f.site, 'index.html'), 'utf8'), /old.js/);
  assert.match(await readFile(path.join(f.backup, 'docker-calls'), 'utf8'), /api-rollback.yml.*up -d --no-build --pull never api/);
  assert.match(result.stderr, /Database is NOT automatically restored/);
});
