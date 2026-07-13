const SEARCH_HISTORY_KEY = 'mathflow_search_history';
const MAX_HISTORY_ITEMS = 10;

export function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(query: string) {
  const normalized = query.trim();
  if (!normalized) return;

  try {
    const history = getSearchHistory().filter((item) => item !== normalized);
    localStorage.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify([normalized, ...history].slice(0, MAX_HISTORY_ITEMS))
    );
  } catch {
    // Browsing in privacy mode can make localStorage unavailable.
  }
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Ignore unavailable localStorage.
  }
}

export function removeSearchHistoryItem(query: string) {
  try {
    const history = getSearchHistory().filter((item) => item !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore unavailable localStorage.
  }
}
