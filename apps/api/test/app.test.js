import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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

function buildMultipartPayload(boundary, fields, files) {
  const chunks = [];
  for (const [name, value] of fields) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  for (const file of files) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      ),
      file.content,
      Buffer.from('\r\n')
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

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
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(response.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(
    response.headers['permissions-policy'],
    'camera=(), microphone=(), geolocation=()'
  );

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
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC, id DESC') {
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

test('html proxy rejects resources larger than the configured preview limit', async () => {
  config.nodeEnv = 'test';
  config.htmlProxyAllowlist = ['cdn.example.com'];
  config.htmlProxyMaxFileSizeMb = 1;

  const realFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    headers: new Headers({ 'content-length': String(2 * 1024 * 1024) }),
    text: async () => '<html></html>',
  });

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/html-proxy',
      query: {
        url: 'https://cdn.example.com/collections/demo/large.html',
        iframe: '1',
      },
    });

    assert.equal(response.statusCode, 413);
    assert.match(response.body, /资源文件过大/);
  } finally {
    global.fetch = realFetch;
    config.htmlProxyMaxFileSizeMb = 10;
    await app.close();
  }
});

test('resource resolve matches generated html slugs without returning the full list', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC, id DESC') {
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
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC, id DESC') {
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
    assert.deepEqual(seenQueries, [{ text: 'SELECT * FROM resources ORDER BY created_at DESC, id DESC', params: [] }]);
  } finally {
    pool.query = realQuery;
    await app.close();
  }
});

test('resource resolve supports legacy file urls for html resources', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT * FROM resources ORDER BY created_at DESC, id DESC') {
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

test('teaching resources return a fallback signal when the database is unavailable', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query;
  pool.query = async (text) => {
    if (text === 'SELECT * FROM teaching_resources ORDER BY created_at DESC, id DESC') {
      throw new Error('simulated database outage');
    }
    return { rows: [] };
  };

  const app = await buildApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/teaching-resources',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), []);
    assert.equal(response.headers['x-mathflow-data-source'], 'fallback');
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

test('admin creates teaching resource links only from validated HTTPS URLs', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  let insertedParams = null;
  pool.query = async (text, params) => {
    if (text.includes('INSERT INTO teaching_resources')) {
      insertedParams = params;
      return {
        rows: [
          {
            id: 'official-link',
            title: params[0],
            description: params[1],
            zone: params[2],
            file_url: params[3],
            file_type: params[4],
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    return realQuery(text, params);
  };

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const headers = { cookie: loginResponse.headers['set-cookie'] };
    const validResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/teaching-resources',
      headers,
      payload: {
        title: '义务教育数学课程标准',
        description: '教育部正式发布版本',
        zone: 'standard',
        file_url: 'https://www.moe.gov.cn/math-standard.pdf',
      },
    });

    assert.equal(validResponse.statusCode, 201);
    assert.equal(validResponse.json().file_type, 'link');
    assert.deepEqual(insertedParams, [
      '义务教育数学课程标准',
      '教育部正式发布版本',
      'standard',
      'https://www.moe.gov.cn/math-standard.pdf',
      'link',
    ]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/teaching-resources',
      headers,
      payload: {
        title: '不安全链接',
        description: '不应写入数据库',
        zone: 'standard',
        file_url: 'http://example.com/resource',
      },
    });

    assert.equal(invalidResponse.statusCode, 400);
    assert.match(invalidResponse.json().error, /必须使用 HTTPS/);
  } finally {
    pool.query = realQuery;
    await app.close();
  }
});

test('upload route streams files through temporary storage into the configured upload directory', async () => {
  config.nodeEnv = 'test';
  config.storageDriver = 'local';
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-upload-test-'));
  config.uploadDir = uploadDir;

  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT id FROM resources WHERE route_path = $1 LIMIT 1') {
      return { rows: [] };
    }
    if (text.includes('INSERT INTO resources')) {
      return {
        rows: [
          {
            id: 'streamed-resource',
            title: params[0],
            description: params[1],
            category: params[2],
            grade: params[3],
            image_url: params[4],
            file_path: params[5],
            route_path: params[6],
            resource_type: params[7],
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    return realQuery(text, params);
  };

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const boundary = '----MathflowStreamingBoundary';
    const parts = [
      ['section', 'ai'],
      ['title', '流式上传作品'],
      ['description', '上传测试'],
      ['category', '数与代数'],
      ['grade', '一年级'],
      ['routeSlug', 'streaming-demo'],
    ];
    const body = [
      ...parts.flatMap(([name, value]) => [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${name}"`,
        '',
        value,
      ]),
      `--${boundary}`,
      'Content-Disposition: form-data; name="htmlFile"; filename="demo.html"',
      'Content-Type: text/html',
      '',
      '<html><body>streamed</body></html>',
      `--${boundary}`,
      'Content-Disposition: form-data; name="coverFile"; filename="cover.png"',
      'Content-Type: image/png',
      '',
      'PNGDATA',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/upload',
      headers: {
        cookie: loginResponse.headers['set-cookie'],
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(response.statusCode, 201);
    const resource = response.json();
    assert.equal(resource.route_path, '/works/streaming-demo');
    const htmlPath = path.join(uploadDir, resource.file_path.replace(/^\/uploads\//, ''));
    const coverPath = path.join(uploadDir, decodeURIComponent(resource.image_url.replace(/^\/uploads\//, '')));
    assert.equal(await fs.readFile(htmlPath, 'utf8'), '<html><body>streamed</body></html>');
    assert.equal(await fs.readFile(coverPath, 'utf8'), 'PNGDATA');
  } finally {
    pool.query = realQuery;
    config.uploadDir = originalUploadDir;
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});

test('upload route extracts a ZIP work and preserves its asset directory', async () => {
  config.nodeEnv = 'test';
  config.storageDriver = 'local';
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-zip-upload-test-'));
  config.uploadDir = uploadDir;

  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT id FROM resources WHERE route_path = $1 LIMIT 1') return { rows: [] };
    if (text.includes('INSERT INTO resources')) {
      return {
        rows: [
          {
            id: 'zip-resource',
            title: params[0],
            description: params[1],
            category: params[2],
            grade: params[3],
            image_url: params[4],
            file_path: params[5],
            route_path: params[6],
            resource_type: params[7],
            created_at: new Date().toISOString(),
          },
        ],
      };
    }
    return realQuery(text, params);
  };

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const boundary = '----MathflowZipBoundary';
    const zipContent = await fs.readFile(new URL('./fixtures/multi-file-work.zip', import.meta.url));
    const payload = buildMultipartPayload(
      boundary,
      [
        ['section', 'ai'],
        ['title', 'ZIP 作品'],
        ['description', '多文件作品'],
        ['category', '数与代数'],
        ['grade', '一年级'],
        ['routeSlug', 'zip-demo'],
      ],
      [
        { name: 'htmlFile', filename: 'work.zip', contentType: 'application/zip', content: zipContent },
        { name: 'coverFile', filename: 'cover.png', contentType: 'image/png', content: Buffer.from('PNG') },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/upload',
      headers: {
        cookie: loginResponse.headers['set-cookie'],
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    assert.equal(response.statusCode, 201);
    const resource = response.json();
    assert.equal(resource.route_path, '/works/zip-demo');
    assert.match(resource.file_path, /^\/uploads\/apps\/bundles\/[^/]+\/index\.html$/);
    const indexPath = path.join(uploadDir, resource.file_path.replace(/^\/uploads\//, ''));
    assert.match(await fs.readFile(indexPath, 'utf8'), /assets\/app\.js/);
    assert.equal(await fs.readFile(path.join(path.dirname(indexPath), 'assets', 'app.js'), 'utf8'), 'console.log("ok")');
  } finally {
    pool.query = realQuery;
    config.uploadDir = originalUploadDir;
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});

test('upload route generates a cover when no cover file is provided', async () => {
  config.nodeEnv = 'test';
  config.storageDriver = 'local';
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-auto-cover-test-'));
  config.uploadDir = uploadDir;

  const realQuery = pool.query.bind(pool);
  pool.query = async (text, params) => {
    if (text === 'SELECT id FROM resources WHERE route_path = $1 LIMIT 1') return { rows: [] };
    if (text.includes('INSERT INTO resources')) {
      return {
        rows: [{
          id: 'auto-cover-resource',
          title: params[0],
          description: params[1],
          category: params[2],
          grade: params[3],
          image_url: params[4],
          file_path: params[5],
          route_path: params[6],
          resource_type: params[7],
          created_at: new Date().toISOString(),
        }],
      };
    }
    return realQuery(text, params);
  };

  let capturedHtmlPath = '';
  const app = await buildApp({
    coverGenerator: async ({ htmlFilePath, outputPath }) => {
      capturedHtmlPath = htmlFilePath;
      await fs.writeFile(outputPath, 'AUTO-COVER');
    },
  });

  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const boundary = '----MathflowAutoCoverBoundary';
    const payload = buildMultipartPayload(
      boundary,
      [
        ['section', 'tools'],
        ['title', '自动封面作品'],
        ['description', '封面截图测试'],
        ['routeSlug', 'auto-cover-demo'],
      ],
      [{
        name: 'htmlFile',
        filename: 'auto-cover.html',
        contentType: 'text/html',
        content: Buffer.from('<html><body>cover me</body></html>'),
      }]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/upload',
      headers: {
        cookie: loginResponse.headers['set-cookie'],
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    assert.equal(response.statusCode, 201);
    const resource = response.json();
    assert.match(capturedHtmlPath, /\.upload$/);
    const coverPath = path.join(uploadDir, decodeURIComponent(resource.image_url.replace(/^\/uploads\//, '')));
    assert.equal(await fs.readFile(coverPath, 'utf8'), 'AUTO-COVER');
  } finally {
    pool.query = realQuery;
    config.uploadDir = originalUploadDir;
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});

test('resource replacement keeps the route and removes old files after the database update', async () => {
  config.nodeEnv = 'test';
  config.storageDriver = 'local';
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-replace-test-'));
  config.uploadDir = uploadDir;
  await fs.mkdir(path.join(uploadDir, 'apps'), { recursive: true });
  await fs.mkdir(path.join(uploadDir, 'images'), { recursive: true });
  await fs.writeFile(path.join(uploadDir, 'apps', 'old.html'), 'OLD-WORK');
  await fs.writeFile(path.join(uploadDir, 'images', 'old.png'), 'OLD-COVER');

  const previous = {
    id: 'replace-resource',
    title: '旧标题',
    description: '旧描述',
    category: '数与代数',
    grade: '一年级',
    image_url: '/uploads/images/old.png',
    file_path: '/uploads/apps/old.html',
    route_path: '/works/stable-link',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  };
  const realQuery = pool.query.bind(pool);
  let databaseUpdated = false;
  pool.query = async (text, params) => {
    if (text === 'SELECT * FROM resources WHERE id = $1') return { rows: [previous] };
    if (text.includes('UPDATE resources')) {
      await fs.access(path.join(uploadDir, 'apps', 'old.html'));
      await fs.access(path.join(uploadDir, 'images', 'old.png'));
      databaseUpdated = true;
      return {
        rows: [{
          ...previous,
          title: params[0],
          description: params[1],
          category: params[2],
          grade: params[3],
          file_path: params[4],
          image_url: params[5],
        }],
      };
    }
    return realQuery(text, params);
  };

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const boundary = '----MathflowReplaceBoundary';
    const payload = buildMultipartPayload(
      boundary,
      [
        ['title', '新标题'],
        ['description', '新描述'],
        ['category', '数与代数'],
        ['grade', '二年级'],
        ['regenerateCover', 'false'],
      ],
      [
        { name: 'htmlFile', filename: 'new.html', contentType: 'text/html', content: Buffer.from('NEW-WORK') },
        { name: 'coverFile', filename: 'new.png', contentType: 'image/png', content: Buffer.from('NEW-COVER') },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/resources/replace-resource/replace',
      headers: {
        cookie: loginResponse.headers['set-cookie'],
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    assert.equal(response.statusCode, 200);
    const resource = response.json();
    assert.equal(databaseUpdated, true);
    assert.equal(resource.route_path, '/works/stable-link');
    await assert.rejects(fs.access(path.join(uploadDir, 'apps', 'old.html')));
    await assert.rejects(fs.access(path.join(uploadDir, 'images', 'old.png')));
    const newWorkPath = path.join(uploadDir, decodeURIComponent(resource.file_path.replace(/^\/uploads\//, '')));
    const newCoverPath = path.join(uploadDir, decodeURIComponent(resource.image_url.replace(/^\/uploads\//, '')));
    assert.equal(await fs.readFile(newWorkPath, 'utf8'), 'NEW-WORK');
    assert.equal(await fs.readFile(newCoverPath, 'utf8'), 'NEW-COVER');
  } finally {
    pool.query = realQuery;
    config.uploadDir = originalUploadDir;
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});

test('resource replacement rolls back new files when the database update fails', async () => {
  config.nodeEnv = 'test';
  config.storageDriver = 'local';
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-replace-rollback-test-'));
  config.uploadDir = uploadDir;
  await fs.mkdir(path.join(uploadDir, 'apps'), { recursive: true });
  await fs.mkdir(path.join(uploadDir, 'images'), { recursive: true });
  await fs.writeFile(path.join(uploadDir, 'apps', 'old.html'), 'OLD-WORK');
  await fs.writeFile(path.join(uploadDir, 'images', 'old.png'), 'OLD-COVER');

  const previous = {
    id: 'rollback-resource',
    title: '旧标题',
    description: '旧描述',
    category: '数与代数',
    grade: '一年级',
    image_url: '/uploads/images/old.png',
    file_path: '/uploads/apps/old.html',
    route_path: '/works/rollback-link',
    resource_type: 'html',
    created_at: new Date().toISOString(),
  };
  const realQuery = pool.query.bind(pool);
  pool.query = async (text) => {
    if (text === 'SELECT * FROM resources WHERE id = $1') return { rows: [previous] };
    if (text.includes('UPDATE resources')) throw new Error('simulated database failure');
    return realQuery(text);
  };

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const boundary = '----MathflowReplaceRollbackBoundary';
    const payload = buildMultipartPayload(
      boundary,
      [
        ['title', '新标题'],
        ['description', '新描述'],
        ['category', '数与代数'],
        ['grade', '二年级'],
        ['regenerateCover', 'false'],
      ],
      [
        { name: 'htmlFile', filename: 'new.html', contentType: 'text/html', content: Buffer.from('NEW-WORK') },
        { name: 'coverFile', filename: 'new.png', contentType: 'image/png', content: Buffer.from('NEW-COVER') },
      ]
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/resources/rollback-resource/replace',
      headers: {
        cookie: loginResponse.headers['set-cookie'],
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    assert.equal(response.statusCode, 500);
    assert.equal(await fs.readFile(path.join(uploadDir, 'apps', 'old.html'), 'utf8'), 'OLD-WORK');
    assert.equal(await fs.readFile(path.join(uploadDir, 'images', 'old.png'), 'utf8'), 'OLD-COVER');
    assert.deepEqual(await fs.readdir(path.join(uploadDir, 'apps')), ['old.html']);
    assert.deepEqual(await fs.readdir(path.join(uploadDir, 'images')), ['old.png']);
  } finally {
    pool.query = realQuery;
    config.uploadDir = originalUploadDir;
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
});

test('database uniqueness violations return a conflict response', async () => {
  config.nodeEnv = 'test';
  const realQuery = pool.query.bind(pool);
  pool.query = async (text) => {
    if (text.includes('INSERT INTO resources')) {
      const error = new Error('duplicate key value violates unique constraint');
      error.code = '23505';
      error.constraint = 'uq_resources_route_path';
      throw error;
    }
    return realQuery(text);
  };

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/resources',
      headers: { cookie: loginResponse.headers['set-cookie'] },
      payload: {
        title: '重复短链接作品',
        description: '测试数据库唯一约束',
        category: '数与代数',
        grade: '一年级',
        image_url: '/uploads/images/demo.png',
        file_path: '/uploads/apps/demo.html',
        route_path: '/works/duplicate',
        resource_type: 'html',
      },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error, '这个作品短链接已经被使用');
  } finally {
    pool.query = realQuery;
    await app.close();
  }
});

test('resource deletion commits the database change before removing stored files', async () => {
  config.nodeEnv = 'test';
  config.storageDriver = 'local';
  const originalUploadDir = config.uploadDir;
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mathflow-delete-test-'));
  config.uploadDir = uploadDir;
  await fs.mkdir(path.join(uploadDir, 'apps'), { recursive: true });
  await fs.writeFile(path.join(uploadDir, 'apps', 'demo.html'), 'demo');

  const realConnect = pool.connect.bind(pool);
  let committed = false;
  pool.connect = async () => ({
    async query(text) {
      if (text === 'SELECT * FROM resources WHERE id = $1') {
        return { rows: [{ file_path: '/uploads/apps/demo.html', image_url: '' }] };
      }
      if (text === 'COMMIT') committed = true;
      if (text === 'DELETE FROM resources WHERE id = $1') {
        await fs.access(path.join(uploadDir, 'apps', 'demo.html'));
      }
      return { rows: [] };
    },
    release() {},
  });

  const app = await buildApp();
  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'secret-pass' },
    });
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/admin/resources/resource-id',
      headers: { cookie: loginResponse.headers['set-cookie'] },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(committed, true);
    await assert.rejects(fs.access(path.join(uploadDir, 'apps', 'demo.html')));
  } finally {
    pool.connect = realConnect;
    config.uploadDir = originalUploadDir;
    await app.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
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
