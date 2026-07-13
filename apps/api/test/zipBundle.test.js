import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from '../src/config.js';
import { deleteResourceFilesByUrl } from '../src/storage.js';
import { extractZipBundle } from '../src/utils/zipBundle.js';

const VALID_ZIP = 'UEsDBBQAAAAIAPwN7lxyb2DFKwAAADIAAAASAAAAcHJvamVjdC9pbmRleC5odG1ss8koyc2xsylOLsosKFEoLkq2VUosLk4tKdZPLCjQyypWsrPRh0gCGWC1AFBLAwQUAAAACAD8De5cUq8AfBMAAAARAAAAFQAAAHByb2plY3QvYXNzZXRzL2FwcC5qc0vOzyvOz0nVy8lP11DKz1bSBABQSwMEFAAAAAgA/A3uXJ4vsg4SAAAAEAAAABgAAABwcm9qZWN0L2Fzc2V0cy9zdHlsZS5jc3NLyk+prE7Oz8kvslI2NDKuBQBQSwECFAAUAAAACAD8De5ccm9gxSsAAAAyAAAAEgAAAAAAAAAAAAAAAAAAAAAAcHJvamVjdC9pbmRleC5odG1sUEsBAhQAFAAAAAgA/A3uXFKvAHwTAAAAEQAAABUAAAAAAAAAAAAAAAAAWwAAAHByb2plY3QvYXNzZXRzL2FwcC5qc1BLAQIUABQAAAAIAPwN7lyeL7IOEgAAABAAAAAYAAAAAAAAAAAAAAAAAKEAAABwcm9qZWN0L2Fzc2V0cy9zdHlsZS5jc3NQSwUGAAAAAAMAAwDJAAAA6QAAAAAA';
const UNSAFE_ZIP = 'UEsDBBQAAAAIAPwN7lz7OSuCBQAAAAMAAAANAAAALi4vZXNjYXBlLnR4dEtKTAEAUEsDBBQAAAAIAPwN7lwfhxtgCwAAAA0AAAAKAAAAaW5kZXguaHRtbLPJKMnNsbPRB1MAUEsBAhQAFAAAAAgA/A3uXPs5K4IFAAAAAwAAAA0AAAAAAAAAAAAAAAAAAAAAAC4uL2VzY2FwZS50eHRQSwECFAAUAAAACAD8De5cH4cbYAsAAAANAAAACgAAAAAAAAAAAAAAAAAwAAAAaW5kZXguaHRtbFBLBQYAAAAAAgACAHMAAABjAAAAAAA=';
const MULTI_INDEX_ZIP = 'UEsDBBQAAAAIAPwN7lzxhmx6BQAAAAMAAAAOAAAAb25lL2luZGV4Lmh0bWzLz0sFAFBLAwQUAAAACAD8De5cZorKEQUAAAADAAAADgAAAHR3by9pbmRleC5odG1sKynPBwBQSwECFAAUAAAACAD8De5c8YZsegUAAAADAAAADgAAAAAAAAAAAAAAAAAAAAAAb25lL2luZGV4Lmh0bWxQSwECFAAUAAAACAD8De5cZorKEQUAAAADAAAADgAAAAAAAAAAAAAAAAAxAAAAdHdvL2luZGV4Lmh0bWxQSwUGAAAAAAIAAgB4AAAAYgAAAAAA';

async function withZipFixture(base64, run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-zip-test-'));
  const zipPath = path.join(root, 'work.zip');
  const outputDir = path.join(root, 'output');
  await fs.writeFile(zipPath, Buffer.from(base64, 'base64'));
  try {
    await run(zipPath, outputDir);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('extractZipBundle preserves files relative to the root index', async () => {
  await withZipFixture(VALID_ZIP, async (zipPath, outputDir) => {
    const bundle = await extractZipBundle(zipPath, outputDir);
    assert.equal(bundle.indexRelativePath, 'index.html');
    assert.deepEqual(
      bundle.files.map((item) => item.relativePath).sort(),
      ['assets/app.js', 'assets/style.css', 'index.html']
    );
    const index = bundle.files.find((item) => item.relativePath === 'index.html');
    assert.match(await fs.readFile(index.filePath, 'utf8'), /assets\/app\.js/);
  });
});

test('extractZipBundle rejects path traversal entries', async () => {
  await withZipFixture(UNSAFE_ZIP, async (zipPath, outputDir) => {
    await assert.rejects(
      extractZipBundle(zipPath, outputDir),
      /unsafe path|invalid relative path/i
    );
  });
});

test('extractZipBundle rejects ambiguous root index files', async () => {
  await withZipFixture(MULTI_INDEX_ZIP, async (zipPath, outputDir) => {
    await assert.rejects(extractZipBundle(zipPath, outputDir), /multiple possible root index/i);
  });
});

test('deleteResourceFilesByUrl removes an entire local bundle directory', async () => {
  const originalDriver = config.storageDriver;
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-bundle-delete-'));
  const bundleDir = path.join(uploadDir, 'apps', 'bundles', 'bundle-1');
  config.storageDriver = 'local';
  config.uploadDir = uploadDir;
  await fs.mkdir(path.join(bundleDir, 'assets'), { recursive: true });
  await fs.writeFile(path.join(bundleDir, 'index.html'), '<html></html>');
  await fs.writeFile(path.join(bundleDir, 'assets', 'app.js'), 'console.log(1)');

  try {
    await deleteResourceFilesByUrl('/uploads/apps/bundles/bundle-1/index.html');
    await assert.rejects(fs.access(bundleDir));
  } finally {
    config.storageDriver = originalDriver;
    config.uploadDir = originalUploadDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});
