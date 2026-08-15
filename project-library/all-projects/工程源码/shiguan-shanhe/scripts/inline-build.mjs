import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(projectRoot, "dist");
const indexPath = path.join(distDirectory, "index.html");

const html = await readFile(indexPath, "utf8");
const stylesheetTag = html.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/i);
const moduleTag = html.match(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i);
if (!stylesheetTag || !moduleTag) throw new Error("Expected Vite asset tags were not found");

const resolveAsset = (url) => path.join(distDirectory, url.replace(/^\.\//, ""));
const [css, javascript] = await Promise.all([
  readFile(resolveAsset(stylesheetTag[1]), "utf8"),
  readFile(resolveAsset(moduleTag[1]), "utf8"),
]);

const singleFileHtml = html
  .replace(stylesheetTag[0], () => `<style data-build="inlined">${css.replace(/<\/style/gi, "<\\/style")}</style>`)
  .replace(moduleTag[0], () => `<script type="module" data-build="inlined">${javascript.replace(/<\/script/gi, "<\\/script")}</script>`);

await writeFile(indexPath, singleFileHtml, "utf8");
console.log(`Inlined production build: ${(Buffer.byteLength(singleFileHtml) / 1024).toFixed(1)} KiB`);
