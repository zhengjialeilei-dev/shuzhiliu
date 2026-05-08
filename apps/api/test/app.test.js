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

test('html proxy injects base href and strips google font imports for iframe requests', async () => {
  config.nodeEnv = 'test';
  config.htmlProxyAllowlist = ['cdn.example.com'];
  config.publicAssetBaseUrl = '';
  config.s3PublicBaseUrl = '';

  const realFetch = global.fetch;
  global.fetch = async () =>
    ({
      ok: true,
      text: async () =>
        '<html><head><link rel="preconnect" href="https://fonts.googleapis.com"><style>@import url("https://fonts.googleapis.com/css2?family=Outfit");</style></head><body>Hello</body></html>',
    });

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/html-proxy',
      query: {
        url: 'https://cdn.example.com/collections/demo/timeout.html',
        iframe: '1',
        title: 'Demo',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /<base href="https:\/\/cdn\.example\.com\/collections\/demo\/" \/>/);
    assert.doesNotMatch(response.body, /fonts\.googleapis\.com/);
  } finally {
    global.fetch = realFetch;
    await app.close();
  }
});

test('html proxy resolves html resources directly from route paths and serves cached responses', async () => {
  config.nodeEnv = 'test';
  config.htmlProxyAllowlist = ['cdn.example.com'];
  config.publicAssetBaseUrl = '';
  config.s3PublicBaseUrl = '';

  const realQuery = pool.query.bind(pool);
  const realFetch = global.fetch;
  let fetchCalls = 0;

  pool.query = async (text) => {
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC') {
      return {
        rows: [
          {
            id: 'html-path-1',
            title: '环绕轨迹比较台',
            category: '图形与几何',
            grade: '通用',
            image_url: 'https://example.com/yuanrao.png',
            description: '环绕轨迹比较',
            file_path: 'https://cdn.example.com/collections/demo/yuanrao.html',
            route_path: '/lab/yuanrao',
            resource_type: 'html',
            created_at: new Date().toISOString(),
          },
        ],
      };
    }

    return realQuery(text);
  };

  global.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      text: async () => '<html><head></head><body><main>Ready</main></body></html>',
    };
  };

  const app = await buildApp();

  try {
    const firstResponse = await app.inject({
      method: 'GET',
      url: '/api/html-proxy',
      query: {
        path: '/lab/yuanrao',
        iframe: '1',
      },
    });

    assert.equal(firstResponse.statusCode, 200);
    assert.equal(firstResponse.headers['x-html-proxy-cache'], 'MISS');
    assert.match(firstResponse.body, /<base href="https:\/\/cdn\.example\.com\/collections\/demo\/" \/>/);

    const secondResponse = await app.inject({
      method: 'GET',
      url: '/api/html-proxy',
      query: {
        path: '/lab/yuanrao',
        iframe: '1',
      },
    });

    assert.equal(secondResponse.statusCode, 200);
    assert.equal(secondResponse.headers['x-html-proxy-cache'], 'HIT');
    assert.equal(fetchCalls, 1);
  } finally {
    pool.query = realQuery;
    global.fetch = realFetch;
    await app.close();
  }
});

test('html proxy returns html fallback document for iframe timeout', async () => {
  config.nodeEnv = 'test';
  config.htmlProxyAllowlist = ['cdn.example.com'];
  config.publicAssetBaseUrl = '';
  config.s3PublicBaseUrl = '';

  const realFetch = global.fetch;
  global.fetch = async () => {
    const error = new Error('timed out');
    error.name = 'AbortError';
    throw error;
  };

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/html-proxy',
      query: {
        url: 'https://cdn.example.com/collections/demo/index.html',
        iframe: '1',
        title: 'Demo',
      },
    });

    assert.equal(response.statusCode, 504);
    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.body, /资源加载超时/);
  } finally {
    global.fetch = realFetch;
    await app.close();
  }
});

test('resource resolve matches generated html slugs without returning the full list', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC') {
      return {
        rows: [
          {
            id: 'html-1',
            title: 'Potion Percentages',
            category: 'AI应用',
            grade: '六年级',
            image_url: 'https://example.com/potion.png',
            description: 'Potion demo',
            file_path: 'https://cdn.example.com/legacy/ai-apps/potion-percentages.html',
            route_path: null,
            resource_type: 'html',
            created_at: new Date().toISOString(),
          },
        ],
      };
    }

    return realQuery(text, params);
  };

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/resources/resolve',
      query: {
        path: '/zhijing/potion-percentages',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().id, 'html-1');
    assert.equal(response.json().file_path, 'https://cdn.example.com/legacy/ai-apps/potion-percentages.html');
  } finally {
    pool.query = realQuery;
    await app.close();
  }
});

test('resource resolve treats SQL-like path input as plain data', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  const seenQueries = [];

  pool.query = async (text, params) => {
    seenQueries.push({ text, params });
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC') {
      return {
        rows: [
          {
            id: 'html-safe-1',
            title: 'Safe Resource',
            category: 'AI搴旂敤',
            grade: '閫氱敤',
            image_url: 'https://example.com/safe.png',
            description: 'Safe demo',
            file_path: 'https://cdn.example.com/collections/demo/safe.html',
            route_path: '/safe-resource',
            resource_type: 'html',
            created_at: new Date().toISOString(),
          },
        ],
      };
    }

    return realQuery(text, params);
  };

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/resources/resolve',
      query: {
        path: "' OR 1=1--",
      },
    });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(seenQueries, [{ text: 'SELECT * FROM resources ORDER BY created_at DESC', params: [] }]);
  } finally {
    pool.query = realQuery;
    await app.close();
  }
});

test('resource resolve supports legacy file urls for html resources', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC') {
      return {
        rows: [
          {
            id: 'html-2',
            title: '利率',
            category: 'AI应用',
            grade: '六年级',
            image_url: 'https://example.com/interest.png',
            description: 'Interest demo',
            file_path: 'https://cdn.example.com/collections/ai-apps/interest-calculator.html',
            route_path: '/ll',
            resource_type: 'html',
            created_at: new Date().toISOString(),
          },
        ],
      };
    }

    return realQuery(text, params);
  };

  const app = await buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/resources/resolve',
      query: {
        url: 'https://cdn.example.com/collections/ai-apps/interest-calculator.html',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().route_path, '/ll');
    assert.equal(response.headers['cache-control'], 'public, max-age=60');
  } finally {
    pool.query = realQuery;
    await app.close();
  }
});

test('html proxy rejects unsafe local upload paths', async () => {
  config.nodeEnv = 'production';
  config.htmlProxyAllowlist = [];
  config.publicAssetBaseUrl = '';
  config.s3PublicBaseUrl = '';

  const app = await buildApp();

  const response = await app.inject({
    method: 'GET',
    url: '/api/html-proxy',
    query: {
      url: '/uploads/%2e%2e/private.html',
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
