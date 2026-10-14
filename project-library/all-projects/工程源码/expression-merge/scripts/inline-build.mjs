import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../dist/index.html', import.meta.url);
let html = await readFile(path, 'utf8');
const css = html.match(/<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
const js = html.match(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!css || !js) throw new Error('Missing build assets');
const asset = (name) => new URL('../dist/' + name.replace(/^\.?\//, ''), import.meta.url);
// Replace literal strings through callbacks: bundled JavaScript may contain "$".
const stylesheet = (await readFile(asset(css[1]), 'utf8')).replace(/<\/style/gi, '<\\/style');
const javascript = (await readFile(asset(js[1]), 'utf8')).replace(/<\/script/gi, '<\\/script');
html = html.replace(css[0], () => `<style data-build="inlined">${stylesheet}</style>`)
  .replace(js[0], () => `<script type="module" data-build="inlined">${javascript}</script>`);
await writeFile(path, html);
console.log(`Standalone HTML: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB`);
