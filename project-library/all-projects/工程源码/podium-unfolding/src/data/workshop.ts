import type { LayoutMode, PodiumBlockSpec, ViewMode } from "../core/types";

export const podiumBlocks: readonly PodiumBlockSpec[] = [
  { place: 2, width: 1.45, height: 1.65, depth: 1.45, x: -1.5 },
  { place: 1, width: 1.45, height: 2.45, depth: 1.45, x: 0 },
  { place: 3, width: 1.45, height: 1.15, depth: 1.45, x: 1.5 },
];

export const layoutOptions: ReadonlyArray<{
  mode: LayoutMode;
  label: string;
  shortLabel: string;
  instruction: string;
}> = [
  { mode: "solid", label: "立体图", shortLabel: "观察立体", instruction: "拖动领奖台，先找出每个长方体的六个面。" },
  { mode: "half", label: "半展开", shortLabel: "打开表面", instruction: "观察相邻的面如何绕公共棱向外打开。" },
  { mode: "flat", label: "完全展开", shortLabel: "铺平展开图", instruction: "三个长方体的六个面已经分别铺在同一平面。" },
  { mode: "separated", label: "分离观察", shortLabel: "逐面辨认", instruction: "六个面彼此分离，比较它们的形状与位置。" },
];

export const viewOptions: ReadonlyArray<{ mode: ViewMode; label: string }> = [
  { mode: "front", label: "正面" },
  { mode: "top", label: "俯视" },
  { mode: "perspective", label: "立体" },
];
