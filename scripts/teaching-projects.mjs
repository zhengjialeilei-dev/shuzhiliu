import { readFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const sourceRoot = fileURLToPath(new URL('../project-library/all-projects/工程源码/', import.meta.url));

export async function loadProjects() {
  const registry = JSON.parse(await readFile(new URL('./teaching-projects.json', import.meta.url), 'utf8'));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.projects)) throw new Error('Unsupported project registry');
  const ids = new Set();
  const dirs = new Set();
  for (const project of registry.projects) {
    if (!/^[a-z0-9-]+$/.test(project.id) || !/^[a-z0-9-]+$/.test(project.directory)) throw new Error('Unsafe project identifier');
    if (ids.has(project.id) || dirs.has(project.directory)) throw new Error(`Duplicate project: ${project.id}`);
    ids.add(project.id);
    dirs.add(project.directory);
    if (!project.title || !project.subject || !['build', 'interaction'].includes(project.verification)) throw new Error(`Incomplete metadata: ${project.id}`);
    if (project.entry !== 'dist/index.html') throw new Error(`Unsupported build entry: ${project.id}`);
    const directory = path.join(sourceRoot, project.directory);
    const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    if (!pkg.scripts?.build || !pkg.scripts?.typecheck) throw new Error(`Missing build/typecheck: ${project.id}`);
    await access(path.join(directory, 'package-lock.json'));
  }
  // A new engineering project cannot silently sit outside the quality gate.
  for (const dir of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    try { await access(path.join(sourceRoot, dir.name, 'package.json')); }
    catch { continue; }
    if (!dirs.has(dir.name)) throw new Error(`Unregistered teaching project: ${dir.name}`);
  }
  return registry.projects;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  for (const arg of args) if (!['--list', '--install', '--check', '--build'].includes(arg)) throw new Error(`Unknown option: ${arg}`);
  const projects = await loadProjects();
  const npmCli = process.env.npm_execpath;
  const run = (project, command) => {
    if (!npmCli) throw new Error('Run this tool through npm run teaching:list/check/build');
    const result = spawnSync(process.execPath, [npmCli, ...command], {
      cwd: path.join(sourceRoot, project.directory), stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${project.id}: ${command.join(' ')} failed (${result.status})`);
  };
  for (const project of projects) {
    console.log(`\n[${project.id}] ${project.title} / ${project.subject} / ${project.verification}`);
    if (args.has('--install')) run(project, ['ci', '--no-audit', '--no-fund']);
    if (args.has('--check')) run(project, ['run', 'typecheck']);
    if (args.has('--build')) {
      run(project, ['run', 'build']);
      const html = await readFile(path.join(sourceRoot, project.directory, project.entry), 'utf8');
      if (!html.includes('<html') || !html.includes('<body')) throw new Error(`Invalid entry: ${project.id}`);
      // Validate emitted local script/style references without opening the app.
      for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const ref = match[1];
        if (!ref.startsWith('./assets/') && !ref.startsWith('assets/')) continue;
        await access(path.resolve(sourceRoot, project.directory, 'dist', ref.split(/[?#]/)[0]));
      }
    }
  }
  console.log(`\n${projects.length} teaching projects verified. No upload or deployment performed.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
