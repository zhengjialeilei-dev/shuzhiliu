import { pinyin } from 'pinyin-pro';

// Keep the existing site's ranking, including initials and ordered fuzzy
// matching. Only text metadata is loaded for a search, never all asset records.
export function searchScore(text, query) {
  if (!text) return 0;
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  const haystack = text.toLowerCase();
  if (haystack === needle) return 100;
  if (haystack.includes(needle)) return 80;
  if (/^[a-z\s]+$/i.test(needle)) {
    const tokens = pinyin(text, { toneType: 'none', type: 'array', nonZh: 'consecutive' }).map((token) => String(token).toLowerCase());
    const compact = needle.replace(/\s+/g, '');
    if (tokens.map((token) => token[0] || '').join('').includes(compact)) return 60;
    if (tokens.join('').includes(compact)) return 55;
  }
  let cursor = 0;
  let matched = 0;
  for (const character of needle) {
    const index = haystack.indexOf(character, cursor);
    if (index !== -1) { matched++; cursor = index + 1; }
  }
  return matched === needle.length ? 40 : matched > needle.length * .6 ? 20 : 0;
}

export function rankResources(rows, query, section) {
  return rows.map((row) => ({
    row,
    score: Math.max(...(section === 'ai' ? [row.title, row.description] : [row.title, row.description, row.category, row.grade])
      .map((text) => searchScore(text, query))),
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.row);
}
