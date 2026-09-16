import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCatalog } from '../src/services/resourceCatalog.js';
import { rankResources, searchScore } from '../src/domain/resourceSearch.js';

const options = { section: 'ai', page: 1, pageSize: 20 };
const make = (query, config = {}) => createResourceCatalog({ query, config: { nodeEnv: 'test', ...config }, loadSeedResources: async () => [
  { id: 'demo', title: '圆的面积推导', category: '图形与几何', grade: '通用', file_path: '/demo.html' },
] });

test('resource pagination bounds SQL result and parameterizes filters', async () => {
  const catalog = make(async (sql, args) => {
    assert.match(sql, /category NOT IN/);
    assert.match(sql, /category = \$1/);
    assert.match(sql, /grade IN \(\$2, '通用'\)/);
    assert.match(sql, /LIMIT \$3 OFFSET \$4/);
    assert.doesNotMatch(sql, /OR 1=1/);
    assert.deepEqual(args, ["' OR 1=1--", '六年级', 20, 20]);
    return { rows: [{ items: [{ id: 'page2' }], total: 41 }] };
  });
  const result = await catalog.resourcePage({ ...options, page: 2, category: "' OR 1=1--", grade: '六年级' });
  assert.equal(result.page, 2);
  assert.equal(result.hasMore, true);
  assert.equal(result.source, 'database');
});

test('empty database remains empty even with explicit seed opt-in', async () => {
  const catalog = make(async () => ({ rows: [{ items: [], total: 0 }] }), { allowSeedWithoutDb: true });
  assert.deepEqual(await catalog.resourcePage(options), { items: [], total: 0, page: 1, pageSize: 20, hasMore: false, source: 'database' });
});

test('database outage is 503 except explicit non-production demo', async () => {
  const fail = async () => { throw new Error('private database connection details'); };
  for (const config of [{}, { nodeEnv: 'production', allowSeedWithoutDb: true }]) {
    const catalog = make(fail, config);
    for (const work of [() => catalog.resourcePage(options), () => catalog.allResources(), () => catalog.teachingPage(options), () => catalog.resolve({ resourcePath: '/demo' })]) {
      await assert.rejects(work, (error) => error.statusCode === 503 && !error.message.includes('private'));
    }
  }
  const demo = make(fail, { allowSeedWithoutDb: true });
  assert.equal((await demo.resourcePage(options)).source, 'demo');
  await assert.rejects(() => demo.teachingPage(options), { statusCode: 503 });
});

test('search preserves Chinese, pinyin, initials, fuzzy matching and stable ranking', () => {
  assert.equal(searchScore('圆的面积推导', 'ydmjtd'), 60);
  assert.equal(searchScore('圆的面积推导', 'yuan de mian ji tui dao'), 55);
  assert.equal(searchScore('圆的面积推导', '圆面积'), 40);
  assert.equal(searchScore('圆的面积推导', 'xyz'), 0);
  assert.deepEqual(rankResources([{ id: 1, title: '圆的面积' }, { id: 2, title: '圆' }, { id: 3, title: '圆的周长' }], '圆', 'ai').map((r) => r.id), [2, 1, 3]);
  assert.equal(rankResources([{ title: '示例', category: '互动游戏' }], '游戏', 'ai').length, 0);
});

test('keyword search fetches full records only for the requested ranked page', async () => {
  let calls = 0;
  const catalog = make(async (sql, args) => {
    calls++;
    if (calls === 1) {
      assert.match(sql, /^SELECT id, title, description, category, grade/);
      return { rows: Array.from({ length: 45 }, (_, i) => ({ id: String(i), title: '圆的面积推导' })) };
    }
    assert.match(sql, /ANY\(\$1::uuid\[\]\)/);
    assert.deepEqual(args[0], Array.from({ length: 20 }, (_, i) => String(i + 20)));
    return { rows: args[0].map((id) => ({ id })) };
  });
  const result = await catalog.resourcePage({ ...options, page: 2, q: 'ydmjtd' });
  assert.equal(result.items.length, 20);
  assert.equal(result.total, 45);
  assert.equal(result.hasMore, true);
  assert.equal(calls, 2);
});

test('empty search results skip full row retrieval', async () => {
  let calls = 0;
  const catalog = make(async () => { calls++; return { rows: [] }; });
  assert.equal((await catalog.resourcePage({ ...options, q: 'xyz' })).total, 0);
  assert.equal(calls, 1);
});

test('teaching pagination retains all zone counts and natural textbook order', async () => {
  const catalog = make(async (sql, args) => {
    assert.match(sql, /substring\(title/);
    assert.match(sql, /GROUP BY zone/);
    assert.deepEqual(args, ['textbook', 20, 0]);
    return { rows: [{ items: [], total: 0, zones: { standard: 2 } }] };
  });
  const result = await catalog.teachingPage({ ...options, zone: 'textbook' });
  assert.deepEqual(result.zones, { standard: 2, textbook: 0, plan: 0, courseware: 0 });
});
