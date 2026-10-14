// Opaque-origin previews cannot access Web Storage. Give legacy lessons isolated,
// in-memory storage so optional preferences never abort the rest of their script.
// This does not grant origin access or persist data beyond this document.
function installPreviewStorage() {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      window[name].getItem('__mathflow_storage_probe__');
      continue;
    } catch {
      const values = new Map();
      const storage = {
        get length() { return values.size; },
        key(index) { return Array.from(values.keys())[Number(index) >>> 0] ?? null; },
        getItem(key) { return values.get(String(key)) ?? null; },
        setItem(key, value) { values.set(String(key), String(value)); },
        removeItem(key) { values.delete(String(key)); },
        clear() { values.clear(); },
      };
      try {
        Object.defineProperty(window, name, { configurable: true, value: storage });
      } catch {
        // Some embedded browsers lock the accessor; never stop page execution.
      }
    }
  }
}

export function withSandboxStorage(html) {
  const script = `<script data-mathflow-preview-storage>(${installPreviewStorage.toString()})();</script>`;
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${script}`);
  }
  if (/<html(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<html(?:\s[^>]*)?>/i, (root) => `${root}<head>${script}</head>`);
  }
  if (/^\s*<!doctype[^>]*>/i.test(html)) {
    return html.replace(/^(\s*<!doctype[^>]*>)/i, `$1${script}`);
  }
  return script + html;
}
