import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const oldDir = "C:\\Users\\p\\Desktop\\ai应用";
const newDir = "C:\\Users\\p\\Desktop\\11111\\ai应用";

const excludes = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".cursor", ".trae", ".vercel"]);

function shouldExclude(filePath) {
  return filePath.split(path.sep).some((part) => excludes.has(part));
}

async function collectHtml(baseDir) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (shouldExclude(fullPath)) continue;
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (path.extname(entry.name).toLowerCase() !== ".html") continue;
      const stats = await fs.stat(fullPath);
      if (stats.size === 0) continue;
      results.push({
        name: entry.name,
        fullPath,
        relativePath: path.relative(baseDir, fullPath),
        baseDir,
        size: stats.size,
      });
    }
  }

  await walk(baseDir);
  return results;
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      const scope = url.pathname.startsWith("/old/") ? "old" : url.pathname.startsWith("/new/") ? "new" : null;
      if (!scope) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const baseDir = scope === "old" ? oldDir : newDir;
      const relative = decodeURIComponent(url.pathname.replace(/^\/(old|new)\//, ""));
      const resolved = path.normalize(path.join(baseDir, relative));
      if (!resolved.startsWith(path.normalize(baseDir))) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const data = await fs.readFile(resolved);
      const ext = path.extname(resolved).toLowerCase();
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
      };

      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(data);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });

  return new Promise((resolve) => {
    server.listen(41791, "127.0.0.1", () => resolve(server));
  });
}

function buildUrl(file) {
  const prefix = file.baseDir === oldDir ? "old" : "new";
  const relative = file.relativePath.split(path.sep).map(encodeURIComponent).join("/");
  return `http://127.0.0.1:41791/${prefix}/${relative}`;
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.type}|${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function inspectPage(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  const issues = [];

  page.on("pageerror", (error) => {
    issues.push({ type: "pageerror", message: error.message });
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    issues.push({
      type: "requestfailed",
      message: `${request.method()} ${request.url()} :: ${failure?.errorText || "failed"}`,
    });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      issues.push({ type: "console", message: msg.text() });
    }
  });

  let status = "ok";
  let bodyTextLength = 0;
  let bodyChildren = 0;

  try {
    const response = await page.goto(buildUrl(file), { waitUntil: "load", timeout: 45000 });
    if (!response || !response.ok()) {
      issues.push({ type: "navigation", message: `HTTP ${response?.status() || "unknown"}` });
      status = "failed";
    }
    await page.waitForTimeout(2500);
    const metrics = await page.evaluate(() => ({
      bodyTextLength: document.body?.innerText?.trim().length ?? 0,
      bodyChildren: document.body?.children?.length ?? 0,
      title: document.title,
    }));
    bodyTextLength = metrics.bodyTextLength;
    bodyChildren = metrics.bodyChildren;
  } catch (error) {
    status = "failed";
    issues.push({ type: "exception", message: error.message });
  } finally {
    await page.close();
  }

  return {
    name: file.name,
    fullPath: file.fullPath,
    url: buildUrl(file),
    status,
    bodyTextLength,
    bodyChildren,
    issues: dedupeIssues(issues),
  };
}

async function main() {
  const allFiles = [...(await collectHtml(oldDir)), ...(await collectHtml(newDir))];
  const server = await createServer();
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const results = [];
    for (const file of allFiles) {
      results.push(await inspectPage(browser, file));
    }
    const outputPath = path.join(repoRoot, "tmp", "html-resource-check.json");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf8");
    console.log(outputPath);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
