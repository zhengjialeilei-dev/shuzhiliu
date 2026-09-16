import type { AnalysisQuestion, Evidence, RoadCondition, Verdict } from "../core/types";

export const evidence: Evidence[] = [
  {
    id: "skid",
    index: "E-01",
    name: "刹车痕迹",
    observation: "障碍物前发现长约 28 米的深色轮胎痕迹。",
    inference: "车辆制动后仍滑行了很长距离，制动距离异常值得调查。",
    value: "28 m",
  },
  {
    id: "sign",
    index: "E-02",
    name: "限速标志",
    observation: "事故路段限速 50 km/h，车载记录显示刹车前约为 72 km/h。",
    inference: "车速提高不只会增加反应距离，制动距离增长得更快。",
    value: "72 km/h",
  },
  {
    id: "road",
    index: "E-03",
    name: "湿滑路面",
    observation: "事故时正在降雨，路面有连续水膜，轮胎与路面的附着力下降。",
    inference: "最大摩擦力减小，同样速度下需要更长的制动距离。",
    value: "μ ≈ 0.42",
  },
  {
    id: "phone",
    index: "E-04",
    name: "驾驶员反应",
    observation: "行车记录显示，发现障碍物后约 1.4 秒才踩下刹车。",
    inference: "在反应时间内，车辆仍以原速度向前行驶。",
    value: "1.4 s",
  },
];

export const roadLabels: Record<RoadCondition, { label: string; friction: number; short: string }> = {
  dry: { label: "干燥沥青", friction: 0.75, short: "干燥" },
  wet: { label: "雨天湿滑", friction: 0.42, short: "湿滑" },
  ice: { label: "结冰路面", friction: 0.18, short: "结冰" },
};

export const questions: AnalysisQuestion[] = [
  {
    id: "speed",
    prompt: "其他条件不变，车速变为原来的 2 倍，制动距离约变为多少？",
    options: ["2 倍", "4 倍", "8 倍"],
    answer: 1,
    explanation: "制动距离与速度的平方成正比，v 变为 2 倍，距离约变为 4 倍。",
  },
  {
    id: "reaction",
    prompt: "在真正踩下刹车之前，车辆行驶的距离取决于什么？",
    options: ["车速和反应时间", "车身颜色", "车辆总价"],
    answer: 0,
    explanation: "反应距离 = 车速 × 反应时间。分心会延长反应时间。",
  },
  {
    id: "friction",
    prompt: "雨天刹车距离变长，最直接的物理原因是？",
    options: ["重力消失", "摩擦系数减小", "车辆质量消失"],
    answer: 1,
    explanation: "水膜使轮胎与路面之间的摩擦系数减小，制动加速度也随之减小。",
  },
];

export const verdicts: Verdict[] = [
  {
    id: "weather",
    title: "仅由降雨造成",
    description: "路面湿滑是不可抗力，驾驶员没有责任。",
    correct: false,
  },
  {
    id: "brake",
    title: "刹车系统失效",
    description: "长刹车痕说明制动器没有工作。",
    correct: false,
  },
  {
    id: "combined",
    title: "多项因素共同作用",
    description: "超速、反应较慢与湿滑路面共同导致停车距离超限。",
    correct: true,
  },
];
