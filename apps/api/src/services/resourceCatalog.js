import { rankResources } from '../domain/resourceSearch.js';
import { findHtmlResourceByPath, findHtmlResourceByUrl } from '../utils/resourcePaths.js';

const order = 'created_at DESC, id DESC';
const emptyZones = { standard: 0, textbook: 0, plan: 0, courseware: 0 };

function unavailable(error) {
  const failure = new Error('资源服务暂时不可用，请稍后重试', { cause: error });
  failure.statusCode = 503;
  return failure;
}

export function createResourceCatalog({ query, config, loadSeedResources }) {
  async function fromDatabase(work, demo) {
    try { return await work(); }
    catch (error) {
      if (config.nodeEnv !== 'production' && config.allowSeedWithoutDb && demo) {
        return demo(await loadSeedResources());
      }
      throw unavailable(error);
    }
  }

  function filters({ section, category, grade }) {
    const values = [];
    const conditions = ['(route_path IS NOT NULL OR file_path IS NOT NULL)'];
    const param = (value) => { values.push(value); return `$${values.length}`; };
    if (section === 'ai') conditions.push(`category NOT IN ('互动游戏', '互动工具')`);
    if (section === 'games') conditions.push(`category = '互动游戏'`);
    if (section === 'tools') conditions.push(`category = '互动工具'`);
    if (category) conditions.push(`category = ${param(category)}`);
    if (grade) conditions.push(`grade IN (${param(grade)}, '通用')`);
    return { values, where: conditions.join(' AND ') };
  }

  const pageResult = (items, total, options, source = 'database') => ({
    items, total: Number(total), page: options.page, pageSize: options.pageSize,
    hasMore: options.page * options.pageSize < Number(total), source,
  });

  async function resourcePage(options) {
    const { page, pageSize, q = '', section } = options;
    const { where, values } = filters(options);
    return fromDatabase(async () => {
      if (q.trim()) {
        const candidates = await query(`SELECT id, title, description, category, grade FROM resources WHERE ${where} ORDER BY ${order}`, values);
        const ranked = rankResources(candidates.rows, q, section);
        const ids = ranked.slice((page - 1) * pageSize, page * pageSize).map((row) => row.id);
        const result = ids.length ? await query('SELECT * FROM resources WHERE id = ANY($1::uuid[]) ORDER BY array_position($1::uuid[], id)', [ids]) : { rows: [] };
        return pageResult(result.rows, ranked.length, options);
      }
      const args = [...values, pageSize, (page - 1) * pageSize];
      // Count and page share a PostgreSQL statement snapshot, including empty
      // pages. The unfiltered catalog is never copied into Node just to slice it.
      const result = await query(`SELECT
        (SELECT count(*)::int FROM resources WHERE ${where}) AS total,
        COALESCE((SELECT json_agg(p) FROM (SELECT * FROM resources WHERE ${where}
          ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}) p), '[]'::json) AS items`, args);
      return pageResult(result.rows[0].items, result.rows[0].total, options);
    }, (seed) => {
      let rows = seed.filter((row) => (row.route_path || row.file_path)
        && (!section || section === 'all' || (section === 'ai' ? !['互动游戏', '互动工具'].includes(row.category) : row.category === (section === 'games' ? '互动游戏' : '互动工具')))
        && (!options.category || row.category === options.category)
        && (!options.grade || [options.grade, '通用'].includes(row.grade)))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id)));
      if (q.trim()) rows = rankResources(rows, q, section);
      return pageResult(rows.slice((page - 1) * pageSize, page * pageSize), rows.length, options, 'demo');
    });
  }

  async function teachingPage(options) {
    const { page, pageSize, zone } = options;
    return fromDatabase(async () => {
      const where = zone ? 'zone = $1' : 'TRUE';
      const values = zone ? [zone] : [];
      const sort = zone === 'textbook' ? `COALESCE(translate(substring(title FROM '([一二三四五六1-6])年级'), '一二三四五六', '123456')::int, 99),
        CASE WHEN title LIKE '%下册%' THEN 1 WHEN title LIKE '%上册%' THEN 0 ELSE 2 END, title, id` : order;
      const result = await query(`SELECT
        (SELECT count(*)::int FROM teaching_resources WHERE ${where}) AS total,
        COALESCE((SELECT json_agg(p) FROM (SELECT * FROM teaching_resources WHERE ${where}
          ORDER BY ${sort} LIMIT $${values.length + 1} OFFSET $${values.length + 2}) p), '[]'::json) AS items,
        COALESCE((SELECT json_object_agg(zone, n) FROM (SELECT zone, count(*)::int AS n FROM teaching_resources GROUP BY zone) z), '{}'::json) AS zones`, [...values, pageSize, (page - 1) * pageSize]);
      const row = result.rows[0];
      return { ...pageResult(row.items, row.total, options), zones: { ...emptyZones, ...row.zones } };
    });
  }

  async function resolve({ resourcePath, url }) {
    return fromDatabase(async () => {
      if (!resourcePath) {
        const result = await query(`SELECT * FROM resources WHERE resource_type = 'html' AND file_path = $1 ORDER BY ${order} LIMIT 1`, [url]);
        return result.rows[0] || null;
      }
      const normalized = `/${resourcePath.trim().replace(/^\/+/, '')}`.replace(/\/+/g, '/').replace(/\/$/, '');
      const exact = await query(`SELECT * FROM resources WHERE resource_type = 'html' AND route_path = $1 AND file_path IS NOT NULL LIMIT 1`, [normalized]);
      if (exact.rows[0]) return exact.rows[0];
      if (!normalized.startsWith('/zhijing/')) return null;
      // Compatibility for legacy rows whose URL was derived from a filename.
      // Explicit routes above use their unique DB index with no catalog scan.
      const candidates = await query(`SELECT id, title, file_path, route_path, resource_type FROM resources WHERE resource_type = 'html' AND route_path IS NULL ORDER BY ${order}`);
      const matched = findHtmlResourceByPath(candidates.rows, normalized);
      if (!matched) return null;
      const result = await query('SELECT * FROM resources WHERE id = $1', [matched.id]);
      return result.rows[0] || null;
    }, (seed) => resourcePath ? findHtmlResourceByPath(seed, resourcePath) : findHtmlResourceByUrl(seed, url));
  }

  return {
    resourcePage, teachingPage, resolve,
    allResources: () => fromDatabase(async () => (await query(`SELECT * FROM resources ORDER BY ${order}`)).rows, (seed) => seed),
    allTeaching: () => fromDatabase(async () => (await query(`SELECT * FROM teaching_resources ORDER BY ${order}`)).rows),
  };
}
