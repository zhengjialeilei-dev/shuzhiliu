import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ADMIN_PASSWORD = 'secret-pass';
process.env.JWT_SECRET = 'test-jwt-secret-1234567890';
process.env.DATABASE_URL = 'postgres://user:pass@127.0.0.1:5432/mathflow';
process.env.CORS_ORIGINS = 'http://localhost:5173';

const [{ buildApp }, { config }, { pool }, { createLoginRateLimiter, resetRateLimiterState }, { requireRow }] = await Promise.all([
  import('../src/app.js'),
  import('../src/config.js'),
  import('../src/db.js'),
  import('../src/utils/security.js'),
  import('../src/routes/admin.js'),
]);

test.after(async () => {
  await pool.end();
});

test.afterEach(() => {
  resetRateLimiterState();
});

test('protected admin route returns 401 without cookie', async () => {
  config.nodeEnv = 'test';
  config.htmlProxyAllowlist = [];
  const app = await buildApp();

  const response = await app.inject({
    method: 'DELETE',
    url: '/api/admin/resources/test-id',
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'Unauthorized');

  await app.close();
});

test('login writes admin cookie', async () => {
  config.nodeEnv = 'test';
  const app = await buildApp();

  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password: 'secret-pass' },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().success, true);
  assert.match(response.headers['set-cookie'] || '', /mf_admin=/);

  await app.close();
});

test('successful logins do not consume rate limit budget', async () => {
  config.nodeEnv = 'test';
  const app = await buildApp();

  for (let index = 0; index < 5; index += 1) {
    const successResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
      remoteAddress: '203.0.113.8',
    });

    assert.equal(successResponse.statusCode, 200);
  }

  const failedResponse = await app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password: 'wrong-pass' },
    remoteAddress: '203.0.113.8',
  });

  assert.equal(failedResponse.statusCode, 401);
  assert.equal(failedResponse.json().error, '密码错误');

  await app.close();
});

test('failed logins are rate limited on the sixth attempt', async () => {
  config.nodeEnv = 'test';
  const app = await buildApp();

  for (let index = 0; index < 5; index += 1) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'wrong-pass' },
      remoteAddress: '198.51.100.9',
    });

    assert.equal(response.statusCode, 401);
  }

  const blockedResponse = await app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password: 'wrong-pass' },
    remoteAddress: '198.51.100.9',
  });

  assert.equal(blockedResponse.statusCode, 429);
  assert.equal(blockedResponse.json().error, 'Too many login attempts. Please try again later.');

  await app.close();
});

test('html proxy rejects external URL when allowlist is empty in production', async () => {
  config.nodeEnv = 'production';
  config.htmlProxyAllowlist = [];
  config.publicAssetBaseUrl = '';
  config.s3PublicBaseUrl = '';

  const app = await buildApp();

  const response = await app.inject({
    method: 'GET',
    url: '/api/html-proxy',
    query: {
      url: 'https://example.com/test.html',
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'URL not allowed');

  await app.close();
});

test('upload route validates multipart fields before touching database', async () => {
  config.nodeEnv = 'test';
  const app = await buildApp();

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password: 'secret-pass' },
  });

  const cookie = loginResponse.headers['set-cookie'];
  const boundary = '----MathflowBoundary';
  const payload = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="section"',
    '',
    'ai',
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    '',
    '示例资源',
    `--${boundary}`,
    'Content-Disposition: form-data; name="description"',
    '',
    '示例描述',
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    '数与代数',
    `--${boundary}`,
    'Content-Disposition: form-data; name="grade"',
    '',
    '一年级',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/upload',
    headers: {
      cookie,
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'htmlFile is required');

  await app.close();
});

test('requireRow throws a 404-style error when the row is missing', () => {
  assert.throws(
    () => requireRow(undefined, 'Resource'),
    (error) => error instanceof Error && error.message === 'Resource not found' && error.statusCode === 404
  );
});

test('rate limiter prunes expired attempts', () => {
  const realNow = Date.now;
  const limiter = createLoginRateLimiter({ maxAttempts: 1, timeWindowMs: 1000 });
  const request = { ip: '192.0.2.55' };

  try {
    Date.now = () => 1000;
    limiter.recordFailure(request);
    assert.equal(limiter.getAttemptCount(request), 1);

    Date.now = () => 2501;
    assert.equal(limiter.getAttemptCount(request), 0);
  } finally {
    Date.now = realNow;
  }
});
