export const TOOL_CATEGORY = '互动工具';
export const GAME_CATEGORY = '互动游戏';

export const AI_CATEGORIES = [
  '数与代数',
  '图形与几何',
  '统计与概率',
  '综合实践',
  '微课',
  '习题',
  '其他',
] as const;

export const ALL_RESOURCE_CATEGORIES = [...AI_CATEGORIES, GAME_CATEGORY, TOOL_CATEGORY] as const;

export const INTERACTIVE_GAME_TITLES = [
  '趣味数独',
  '三国华容道',
  '欢乐五子棋',
  '黑白棋大师',
  '乘法消消乐',
  '全能数学消消乐',
  '找零钱大作战（低年级）',
  '找零钱大作战（高年级版）',
  '奇异博士',
  '吃豆人角度规',
] as const;

export function isInteractiveGameTitle(title: string) {
  return INTERACTIVE_GAME_TITLES.includes(title as (typeof INTERACTIVE_GAME_TITLES)[number]);
}
