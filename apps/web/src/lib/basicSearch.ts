export type SearchMatch = { matched: boolean; score: number };
export type HighlightPart = { text: string; highlighted: boolean };

export function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

export function matchBasicSearch(text: string, query: string): SearchMatch {
  if (!text) return { matched: false, score: 0 };

  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return { matched: true, score: 0 };

  const normalizedText = text.toLowerCase();
  if (normalizedText === normalizedQuery) return { matched: true, score: 100 };
  if (normalizedText.includes(normalizedQuery)) return { matched: true, score: 80 };

  let cursor = 0;
  let matchedCharacters = 0;
  for (const character of normalizedQuery) {
    const index = normalizedText.indexOf(character, cursor);
    if (index === -1) continue;
    matchedCharacters += 1;
    cursor = index + 1;
  }

  if (matchedCharacters === normalizedQuery.length) return { matched: true, score: 40 };
  if (matchedCharacters > normalizedQuery.length * 0.6) return { matched: true, score: 20 };
  return { matched: false, score: 0 };
}

export function highlightLiteralMatch(text: string, query: string): HighlightPart[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!text || !normalizedQuery) return [{ text, highlighted: false }];

  const start = text.toLowerCase().indexOf(normalizedQuery);
  if (start === -1) return [{ text, highlighted: false }];

  const end = start + query.trim().length;
  return [
    ...(start > 0 ? [{ text: text.slice(0, start), highlighted: false }] : []),
    { text: text.slice(start, end), highlighted: true },
    ...(end < text.length ? [{ text: text.slice(end), highlighted: false }] : []),
  ];
}
