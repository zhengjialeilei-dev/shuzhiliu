import type { MetricKey } from "../core/types";

export const metricContent: Record<MetricKey, { title: string; target: string; explanation: string; action: string }> = {
  warming: {
    title: "全球升温",
    target: "≤ 1.5°C",
    explanation: "温室气体会吸收地表向外辐射的热量。减少排放、提高清洁能源比例和恢复森林，都能降低模型中的升温风险。",
    action: "优先提高清洁能源和森林恢复力度。",
  },
  airQuality: {
    title: "空气质量",
    target: "≥ 75",
    explanation: "化石能源燃烧和高排放交通会产生多种空气污染物。能源转型与绿色交通常能同时改善气候和空气质量。",
    action: "提高绿色交通和清洁能源比例。",
  },
  biodiversity: {
    title: "生物多样性",
    target: "≥ 65",
    explanation: "森林是大量生物的栖息地，也能储存碳。只减少排放还不够，生态系统恢复也是保护地球的关键部分。",
    action: "为森林与栖息地恢复保留更多预算。",
  },
  seaLevel: {
    title: "海平面风险",
    target: "≤ 28 cm",
    explanation: "海水变暖膨胀和陆地冰体融化都会推高海平面。海岸防护能减少部分影响，但不能代替减排。",
    action: "先控制升温，再合理配置海岸防护。",
  },
};

export const policyMeta = {
  renewable: { label: "清洁能源", unit: "%", min: 30, max: 90, step: 5, cost: "每提高1%需0.8点" },
  forest: { label: "森林恢复", unit: "M km²", min: 0, max: 20, step: 1, cost: "每恢复100万km²需1.8点" },
  transport: { label: "绿色交通", unit: "%", min: 20, max: 90, step: 5, cost: "每提高1%需0.4点" },
  coastal: { label: "海岸防护", unit: "%", min: 0, max: 40, step: 5, cost: "每覆盖1%需0.6点" },
} as const;
