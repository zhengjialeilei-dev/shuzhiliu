import { beforeEach, describe, expect, it } from 'vitest';
import { addSearchHistory, getSearchHistory } from './searchHistory';

describe('search history storage', () => {
  beforeEach(() => localStorage.clear());
  it('recovers from valid JSON with the wrong shape', () => {
    localStorage.setItem('mathflow_search_history', '{"bad":true}');
    expect(getSearchHistory()).toEqual([]);
    addSearchHistory('圆');
    expect(getSearchHistory()).toEqual(['圆']);
  });
  it('filters unsafe or unusable entries and caps saved queries at the API limit', () => {
    localStorage.setItem('mathflow_search_history', '[null,3,"",{},"圆"]');
    expect(getSearchHistory()).toEqual(['圆']);
    addSearchHistory('a'.repeat(101));
    expect(getSearchHistory()[0]).toHaveLength(100);
  });
});
