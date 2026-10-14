import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { withSandboxStorage } from '../src/utils/sandboxStorage.js';

function runShim(window) {
  const html = withSandboxStorage('<!doctype html><html><head></head><body></body></html>');
  const script = html.match(/<script data-mathflow-preview-storage>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, { window });
}

function opaqueWindow() {
  const window = {};
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(window, name, { configurable: true, get() { throw new Error('SecurityError'); } });
  }
  return window;
}

test('sandbox storage supports preferences without sharing storage across documents', () => {
  const first = opaqueWindow();
  runShim(first);
  first.localStorage.setItem('theme', 'dark');
  first.localStorage.setItem('score', 5);
  assert.equal(first.localStorage.getItem('score'), '5');
  assert.equal(first.localStorage.length, 2);
  assert.equal(first.localStorage.key(0), 'theme');
  assert.equal(first.localStorage.key(9), null);
  assert.equal(first.sessionStorage.getItem('theme'), null);
  const second = opaqueWindow();
  runShim(second);
  assert.equal(second.localStorage.getItem('theme'), null);
  first.localStorage.removeItem('score');
  assert.equal(first.localStorage.getItem('score'), null);
  first.localStorage.clear();
  assert.equal(first.localStorage.length, 0);
});

test('available native storage remains untouched', () => {
  const nativeStorage = { getItem: () => 'existing' };
  const window = { localStorage: nativeStorage, sessionStorage: nativeStorage };
  runShim(window);
  assert.equal(window.localStorage, nativeStorage);
  assert.equal(window.sessionStorage, nativeStorage);
});

test('the compatibility script runs before lesson scripts and preserves the doctype', () => {
  for (const source of [
    '<!doctype html><html><head><script>lesson()</script></head></html>',
    '<!doctype html><html><body><script>lesson()</script></body></html>',
    '<!doctype html><script>lesson()</script>',
    '<script>lesson()</script>',
  ]) {
    const result = withSandboxStorage(source);
    assert.ok(result.indexOf('data-mathflow-preview-storage') < result.indexOf('lesson()'));
    if (source.startsWith('<!doctype')) assert.ok(result.startsWith('<!doctype html>'));
  }
});

test('a locked browser storage accessor does not break shim execution', () => {
  const window = {};
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError'); } });
  assert.doesNotThrow(() => runShim(window));
});
