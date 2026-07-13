import { pinyin } from 'pinyin-pro';

/**
 * 拼音搜索工具
 * - 支持汉字转拼音首字母
 * - 支持完整拼音匹配
 * - 支持模糊匹配
 * - 支持搜索高亮
 */

type HighlightPart = { text: string; highlighted: boolean };

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function compactQuery(query: string) {
  return normalizeQuery(query).replace(/\s+/g, '');
}

function getPinyinTokens(text: string) {
  return pinyin(text, {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }).map((token) => String(token).toLowerCase());
}

function buildHighlightParts(text: string, start: number, end: number): HighlightPart[] {
  if (start < 0 || end <= start) {
    return [{ text, highlighted: false }];
  }

  const result: HighlightPart[] = [];

  if (start > 0) {
    result.push({ text: text.slice(0, start), highlighted: false });
  }

  result.push({ text: text.slice(start, end), highlighted: true });

  if (end < text.length) {
    result.push({ text: text.slice(end), highlighted: false });
  }

  return result;
}

function findPinyinMatchRange(text: string, query: string) {
  const normalized = compactQuery(query);
  if (!normalized) {
    return null;
  }

  const chars = Array.from(text);
  const tokens = getPinyinTokens(text);
  const initials = tokens.map((token) => token[0] || '').join('');
  const initialMatchIndex = initials.indexOf(normalized);

  if (initialMatchIndex !== -1) {
    return {
      start: initialMatchIndex,
      end: Math.min(chars.length, initialMatchIndex + normalized.length),
    };
  }

  const flattened = tokens.join('');
  const flattenedMatchIndex = flattened.indexOf(normalized);
  if (flattenedMatchIndex === -1) {
    return null;
  }

  let cursor = 0;
  let start = 0;
  let end = chars.length;

  for (let index = 0; index < tokens.length; index += 1) {
    const nextCursor = cursor + tokens[index].length;

    if (flattenedMatchIndex >= cursor && flattenedMatchIndex < nextCursor) {
      start = index;
    }

    if (flattenedMatchIndex + normalized.length > cursor && flattenedMatchIndex + normalized.length <= nextCursor) {
      end = index + 1;
      break;
    }

    cursor = nextCursor;
  }

  return { start, end };
}

/**
 * 获取汉字的拼音首字母
 */
export const getFirstLetter = (char: string): string => {
  if (!char) return '';

  const token = getPinyinTokens(char)[0] || '';
  return token[0] || '';
};

/**
 * 获取字符串的拼音首字母组合
 */
export const getPinyinInitials = (str: string): string => {
  if (!str) return '';
  return getPinyinTokens(str)
    .map((token) => token[0] || '')
    .join('');
};

/**
 * 检查是否匹配（支持拼音首字母、全文、模糊匹配）
 */
export const matchSearch = (
  text: string,
  query: string
): { matched: boolean; score: number } => {
  if (!text) return { matched: false, score: 0 };

  const lowerQuery = normalizeQuery(query);
  if (!lowerQuery) {
    return { matched: true, score: 0 };
  }
  
  const lowerText = text.toLowerCase();
  const normalizedQuery = compactQuery(query);

  // 1. 完全匹配（最高分）
  if (lowerText === lowerQuery) {
    return { matched: true, score: 100 };
  }

  // 2. 包含匹配（高分）
  if (lowerText.includes(lowerQuery)) {
    return { matched: true, score: 80 };
  }

  // 3. 拼音首字母匹配
  const initials = getPinyinInitials(text);
  if (normalizedQuery && initials.includes(normalizedQuery)) {
    return { matched: true, score: 60 };
  }

  // 4. 完整拼音匹配
  const fullPinyin = getPinyinTokens(text).join('');
  if (normalizedQuery && fullPinyin.includes(normalizedQuery)) {
    return { matched: true, score: 55 };
  }

  // 5. 模糊匹配（查询的每个字符都出现在文本中，且顺序正确）
  let textIndex = 0;
  let matchCount = 0;
  for (const char of lowerQuery) {
    const foundIndex = lowerText.indexOf(char, textIndex);
    if (foundIndex !== -1) {
      matchCount++;
      textIndex = foundIndex + 1;
    }
  }
  
  if (matchCount === lowerQuery.length) {
    return { matched: true, score: 40 };
  }

  // 6. 部分字符匹配（低分）
  if (matchCount > lowerQuery.length * 0.6) {
    return { matched: true, score: 20 };
  }

  return { matched: false, score: 0 };
};

/**
 * 高亮匹配的文本
 */
export const highlightMatch = (
  text: string,
  query: string
): HighlightPart[] => {
  if (!text) return [{ text, highlighted: false }];

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizeQuery(query);
  if (!lowerQuery) return [{ text, highlighted: false }];

  // 尝试直接匹配
  const index = lowerText.indexOf(lowerQuery);
  if (index !== -1) {
    return buildHighlightParts(text, index, index + query.length);
  }

  // 尝试拼音匹配 - 高亮对应的原文片段
  const pinyinRange = findPinyinMatchRange(text, query);
  if (pinyinRange) {
    return buildHighlightParts(text, pinyinRange.start, pinyinRange.end);
  }

  // 无法高亮，返回原文
  return [{ text, highlighted: false }];
};
