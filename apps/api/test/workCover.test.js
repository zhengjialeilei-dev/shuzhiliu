import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isAllowedCoverRequest } from '../src/utils/workCover.js';

test('cover renderer only allows assets inside the current work directory', () => {
  const root = path.resolve('test-work');
  const nestedAsset = pathToFileURL(path.join(root, 'assets', 'app.js')).toString();
  const outsideFile = pathToFileURL(path.resolve('private.txt')).toString();

  assert.equal(isAllowedCoverRequest(nestedAsset, root), true);
  assert.equal(isAllowedCoverRequest('data:image/png;base64,AAAA', root), true);
  assert.equal(isAllowedCoverRequest(outsideFile, root), false);
  assert.equal(isAllowedCoverRequest('http://127.0.0.1:3001/api/admin/resources', root), false);
  assert.equal(isAllowedCoverRequest('https://example.com/tracker.js', root), false);
});
