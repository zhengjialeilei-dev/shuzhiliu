import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { config } from '../config.js';

async function findBrowserExecutable() {
  const candidates = [
    config.coverBrowserExecutablePath,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '',
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : '',
    process.platform === 'linux' ? '/usr/bin/chromium-browser' : '',
    process.platform === 'linux' ? '/usr/bin/chromium' : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known browser location.
    }
  }

  const error = new Error('未找到封面截图浏览器，请手动上传封面图片');
  error.statusCode = 503;
  throw error;
}

export async function generateWorkCover({ htmlFilePath, outputPath }) {
  const executablePath = await findBrowserExecutable();
  const allowedRootPath = path.dirname(path.resolve(htmlFilePath));
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
      ],
    });
  } catch (error) {
    const launchError = new Error(`封面截图浏览器启动失败：${error instanceof Error ? error.message : '未知错误'}`);
    launchError.statusCode = 503;
    throw launchError;
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (isAllowedCoverRequest(request.url(), allowedRootPath)) {
        request.continue();
      } else {
        request.abort('blockedbyclient');
      }
    });

    await page.goto(pathToFileURL(path.resolve(htmlFilePath)).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: config.coverScreenshotTimeoutMs,
    });
    await new Promise((resolve) => setTimeout(resolve, config.coverScreenshotDelayMs));
    await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
  } catch (error) {
    const coverError = new Error(`自动生成封面失败：${error instanceof Error ? error.message : '未知错误'}`);
    coverError.statusCode = 422;
    throw coverError;
  } finally {
    await browser.close();
  }

  return outputPath;
}

export function isAllowedCoverRequest(requestUrl, allowedRootPath) {
  try {
    const url = new URL(requestUrl);
    if (url.protocol === 'data:' || url.protocol === 'blob:') return true;
    if (url.protocol !== 'file:') return false;

    const allowedRoot = path.resolve(allowedRootPath);
    const requestedPath = path.resolve(fileURLToPath(url));
    return requestedPath === allowedRoot || requestedPath.startsWith(`${allowedRoot}${path.sep}`);
  } catch {
    return false;
  }
}
