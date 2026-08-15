import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';
import { getFileExtension } from '../domain/uploadPolicy.js';
import { deleteObjectByUrl, deleteResourceFilesByUrl, sanitizeFilename, uploadFile } from '../storage.js';
import { inferContentType } from '../utils/serializers.js';
import { extractZipBundle } from '../utils/zipBundle.js';

export async function collectMultipartUpload(request) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-upload-'));
  const fields = {};
  const files = {};

  try {
    for await (const part of request.parts()) {
      if (part.type !== 'file') {
        fields[part.fieldname] = part.value;
        continue;
      }
      if (files[part.fieldname]) {
        throw new Error(`${part.fieldname} was provided more than once`);
      }

      const filePath = path.join(tempDir, `${Object.keys(files).length}.upload`);
      await pipeline(part.file, createWriteStream(filePath, { flags: 'wx', mode: 0o600 }));
      if (part.file.truncated) {
        const error = new Error(`${part.fieldname} exceeds the upload size limit`);
        error.statusCode = 413;
        throw error;
      }
      files[part.fieldname] = { filename: part.filename, mimetype: part.mimetype, filePath };
    }
    return { fields, files, tempDir };
  } catch (error) {
    await removeTempDirectory(tempDir);
    throw error;
  }
}

export function removeTempDirectory(tempDir) {
  return fs.rm(tempDir, { recursive: true, force: true });
}

export async function cleanupObjects(urls, logger) {
  const results = await Promise.allSettled(urls.filter(Boolean).map((url) => deleteObjectByUrl(url)));
  logCleanupFailures(results, logger, 'Failed to clean up one or more stored resource objects');
}

export async function cleanupResourceObjects(fileUrl, imageUrl, logger) {
  const results = await Promise.allSettled([
    deleteResourceFilesByUrl(fileUrl),
    deleteObjectByUrl(imageUrl),
  ]);
  logCleanupFailures(results, logger, 'Failed to clean up one or more stored resource objects');
}

export async function cleanupReplacedResourceObjects(previous, current, logger) {
  const operations = [];
  if (previous.file_path && previous.file_path !== current.file_path) {
    operations.push(deleteResourceFilesByUrl(previous.file_path));
  }
  if (previous.image_url && previous.image_url !== current.image_url) {
    operations.push(deleteObjectByUrl(previous.image_url));
  }
  const results = await Promise.allSettled(operations);
  logCleanupFailures(results, logger, 'Failed to clean up one or more replaced resource objects');
}

function logCleanupFailures(results, logger, message) {
  const failedCount = results.filter((result) => result.status === 'rejected').length;
  if (failedCount > 0) logger.warn({ failedCount }, message);
}

export async function uploadWorkFile(file, tempDir, uploadedUrls) {
  if (getFileExtension(file.filename) !== '.zip') {
    const url = await uploadFile({
      key: `apps/${sanitizeFilename(file.filename)}`,
      filePath: file.filePath,
      contentType: inferContentType(file.filename, file.mimetype),
    });
    uploadedUrls.push(url);
    return { fileUrl: url, previewFilePath: file.filePath };
  }

  const extractedDir = path.join(tempDir, 'bundle');
  let bundle;
  try {
    bundle = await extractZipBundle(file.filePath, extractedDir, {
      maxEntries: 500,
      maxUncompressedBytes: Math.min(config.maxUploadFileSizeMb * 4, 500) * 1024 * 1024,
    });
  } catch (error) {
    if (error instanceof Error) error.statusCode = 400;
    throw error;
  }

  const bundleId = sanitizeFilename(file.filename).replace(/\.zip$/i, '');
  let fileUrl = null;
  for (let index = 0; index < bundle.files.length; index += 5) {
    const results = await uploadBundleBatch(bundle.files.slice(index, index + 5), bundleId);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        uploadedUrls.push(result.value.url);
        if (result.value.item.relativePath === bundle.indexRelativePath) fileUrl = result.value.url;
      }
    }
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }

  if (!fileUrl) throw new Error('ZIP index.html was not uploaded');
  const indexFile = bundle.files.find((item) => item.relativePath === bundle.indexRelativePath);
  if (!indexFile) throw new Error('ZIP index.html could not be resolved');
  return { fileUrl, previewFilePath: indexFile.filePath };
}

function uploadBundleBatch(files, bundleId) {
  return Promise.allSettled(
    files.map(async (item) => {
      const url = await uploadFile({
        key: `apps/bundles/${bundleId}/${item.relativePath}`,
        filePath: item.filePath,
        contentType: inferContentType(item.relativePath),
      });
      return { item, url };
    })
  );
}
