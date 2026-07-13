import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import yauzl from 'yauzl';

const openZip = promisify(yauzl.open);
const UNIX_FILE_TYPE_MASK = 0o170000;
const UNIX_SYMLINK_TYPE = 0o120000;

function normalizeEntryPath(fileName) {
  const normalized = fileName.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (
    !normalized ||
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    /^[a-z]:\//i.test(normalized) ||
    segments.includes('..')
  ) {
    throw new Error(`ZIP contains an unsafe path: ${fileName}`);
  }
  return path.posix.normalize(normalized).replace(/^\.\//, '');
}

function isSymbolicLink(entry) {
  const unixMode = entry.externalFileAttributes >>> 16;
  return (unixMode & UNIX_FILE_TYPE_MASK) === UNIX_SYMLINK_TYPE;
}

function openEntryStream(zipFile, entry) {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else resolve(stream);
    });
  });
}

export async function extractZipBundle(
  zipPath,
  outputDir,
  { maxEntries = 500, maxUncompressedBytes = 500 * 1024 * 1024 } = {}
) {
  const zipFile = await openZip(zipPath, { lazyEntries: true, validateEntrySizes: true });
  const outputRoot = path.resolve(outputDir);
  const extractedFiles = [];
  let entryCount = 0;
  let totalBytes = 0;

  await fs.mkdir(outputRoot, { recursive: true });

  await new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      zipFile.close();
      reject(error);
    };

    zipFile.on('error', fail);
    zipFile.on('end', () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    zipFile.on('entry', (entry) => {
      void (async () => {
        entryCount += 1;
        if (entryCount > maxEntries) throw new Error(`ZIP contains more than ${maxEntries} entries`);
        if (isSymbolicLink(entry)) throw new Error(`ZIP symbolic links are not allowed: ${entry.fileName}`);

        const relativePath = normalizeEntryPath(entry.fileName);
        totalBytes += entry.uncompressedSize;
        if (totalBytes > maxUncompressedBytes) {
          throw new Error('ZIP uncompressed size exceeds the allowed limit');
        }

        const destination = path.resolve(outputRoot, ...relativePath.split('/'));
        if (destination !== outputRoot && !destination.startsWith(`${outputRoot}${path.sep}`)) {
          throw new Error(`ZIP contains an unsafe path: ${entry.fileName}`);
        }

        if (entry.fileName.endsWith('/')) {
          await fs.mkdir(destination, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(destination), { recursive: true });
          const input = await openEntryStream(zipFile, entry);
          await pipeline(input, createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
          extractedFiles.push({ relativePath, filePath: destination, size: entry.uncompressedSize });
        }

        zipFile.readEntry();
      })().catch(fail);
    });

    zipFile.readEntry();
  });

  const indexCandidates = extractedFiles
    .filter((item) => path.posix.basename(item.relativePath).toLowerCase() === 'index.html')
    .sort((left, right) => left.relativePath.split('/').length - right.relativePath.split('/').length);
  if (indexCandidates.length === 0) throw new Error('ZIP must contain an index.html file');

  const shallowestDepth = indexCandidates[0].relativePath.split('/').length;
  if (indexCandidates.filter((item) => item.relativePath.split('/').length === shallowestDepth).length > 1) {
    throw new Error('ZIP contains multiple possible root index.html files');
  }

  const indexEntry = indexCandidates[0];
  const bundleRoot = path.posix.dirname(indexEntry.relativePath);
  const rootPrefix = bundleRoot === '.' ? '' : `${bundleRoot}/`;
  const files = extractedFiles
    .filter((item) => !rootPrefix || item.relativePath.startsWith(rootPrefix))
    .map((item) => ({
      ...item,
      relativePath: rootPrefix ? item.relativePath.slice(rootPrefix.length) : item.relativePath,
    }));

  return {
    files,
    indexRelativePath: rootPrefix ? indexEntry.relativePath.slice(rootPrefix.length) : indexEntry.relativePath,
    totalBytes,
  };
}
