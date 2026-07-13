import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseTextbookOrder = (titleOrDesc: string) => {
  const source = (titleOrDesc || '').replace(/\s+/g, '');

  const normalizedSource = source
    .replace(/娴滃苯鍕剧痪?/g, '二年级')
    .replace(/娑撳鍕剧痪?/g, '三年级')
    .replace(/閸ユ稑鍕剧痪?/g, '四年级')
    .replace(/娴滄柨鍕剧痪?/g, '五年级')
    .replace(/閸忣厼鍕剧痪?/g, '六年级')
    .replace(/娑撯偓楠炲楠?/g, '一年级')
    .replace(/娑撳﹤鍞?/g, '上册')
    .replace(/娑撳鍞?/g, '下册')
    .replace(/閺佹澘顒?/g, '数学');

  const cnToNum: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
  };

  const grade1 = normalizedSource.match(/([一二三四五六1-6])年级/);
  const grade2 = normalizedSource.match(/^([一二三四五六1-6])(?=上册|下册|数学|$)/);
  const rawGrade = grade1?.[1] || grade2?.[1] || '';

  const gradeNum = rawGrade
    ? /[1-6]/.test(rawGrade)
      ? Number(rawGrade)
      : (cnToNum[rawGrade] ?? 99)
    : 99;

  const term = /下册/.test(normalizedSource) ? 1 : /上册/.test(normalizedSource) ? 0 : 2;
  return { gradeNum, term };
};
