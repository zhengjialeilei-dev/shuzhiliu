import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeExternalTeachingUrl,
  normalizeRoutePath,
  validateUpload,
} from '../src/domain/uploadPolicy.js';

test('normalizeRoutePath accepts a slug or an existing works path', () => {
  assert.equal(normalizeRoutePath('fraction-lab'), '/works/fraction-lab');
  assert.equal(normalizeRoutePath('/works/fraction-lab/'), '/works/fraction-lab');
  assert.equal(normalizeRoutePath(''), null);
});

test('normalizeRoutePath rejects unsafe or malformed slugs', () => {
  assert.throws(() => normalizeRoutePath('../admin'), /作品短链接/);
  assert.throws(() => normalizeRoutePath('A'), /作品短链接/);
});

test('normalizeExternalTeachingUrl accepts only credential-free HTTPS links', () => {
  assert.equal(
    normalizeExternalTeachingUrl(' https://www.moe.gov.cn/resource?id=1 '),
    'https://www.moe.gov.cn/resource?id=1'
  );
  assert.throws(() => normalizeExternalTeachingUrl('http://example.com/resource'), /必须使用 HTTPS/);
  assert.throws(() => normalizeExternalTeachingUrl('https://user:pass@example.com/resource'), /账号密码/);
  assert.throws(() => normalizeExternalTeachingUrl('not-a-url'), /格式不正确/);
  assert.throws(
    () => normalizeExternalTeachingUrl('   '),
    (error) => error instanceof Error && error.message === 'file_url is required' && error.statusCode === 400
  );
});

test('validateUpload applies the teaching resource policy independently', () => {
  assert.doesNotThrow(() =>
    validateUpload(
      { section: 'teaching', title: '数学课本', description: '电子课本', zone: 'textbook' },
      { teachingFile: { filename: 'book.pdf' } }
    )
  );
  assert.throws(
    () =>
      validateUpload(
        { section: 'teaching', title: '数学课本', description: '电子课本', zone: 'unknown' },
        { teachingFile: { filename: 'book.pdf' } }
      ),
    /zone is invalid/
  );
});
