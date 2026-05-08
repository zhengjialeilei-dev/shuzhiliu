import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseTextbookOrder = (titleOrDesc: string) => {
  const source = (titleOrDesc || '').replace(/\s+/g, '');

  const normalizedSource = source
    .replace(/浜屽勾绾?/g, '二年级')
    .replace(/涓夊勾绾?/g, '三年级')
    .replace(/鍥涘勾绾?/g, '四年级')
    .replace(/浜斿勾绾?/g, '五年级')
    .replace(/鍏勾绾?/g, '六年级')
    .replace(/涓€骞寸骇/g, '一年级')
    .replace(/涓婂唽/g, '上册')
    .replace(/涓嬪唽/g, '下册')
    .replace(/鏁板/g, '数学');

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
