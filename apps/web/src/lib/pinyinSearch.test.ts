import { describe, expect, it } from 'vitest';
import { getFirstLetter, getPinyinInitials, highlightMatch, matchSearch } from './pinyinSearch';

describe('pinyinSearch', () => {
  it('builds pinyin initials from Chinese text', () => {
    expect(getFirstLetter('随')).toBe('s');
    expect(getPinyinInitials('随机点名器')).toBe('sjdmq');
    expect(getPinyinInitials('圆的面积推导')).toBe('ydmjtd');
  });

  it('matches both initials and full pinyin queries', () => {
    expect(matchSearch('随机点名器', 'sjdm')).toEqual({ matched: true, score: 60 });
    expect(matchSearch('随机点名器', 'suijidianming')).toEqual({ matched: true, score: 55 });
  });

  it('highlights the matching Chinese fragment for pinyin queries', () => {
    expect(highlightMatch('随机点名器', 'sjdm')).toEqual([
      { text: '随机点名', highlighted: true },
      { text: '器', highlighted: false },
    ]);
  });
});
