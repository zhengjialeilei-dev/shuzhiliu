import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseTextbookOrder = (titleOrDesc: string) => {
  const source = (titleOrDesc || '').replace(/\s+/g, '');
  const cnToNum: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
  };

  const grade1 = source.match(/([一二三四五六1-6])年级/);
  const grade2 = source.match(/^([一二三四五六1-6])(?=上册|下册|数学|$)/);
  const rawGrade = grade1?.[1] || grade2?.[1] || '';

  const gradeNum = rawGrade
    ? /[1-6]/.test(rawGrade)
      ? Number(rawGrade)
      : (cnToNum[rawGrade] ?? 99)
    : 99;

  const term = /下册/.test(source) ? 1 : /上册/.test(source) ? 0 : 2;
  return { gradeNum, term };
};
