import type { Clue, Question, VerdictOption } from "../core/types";

export const clues: Clue[] = [
  {
    id: "child-dawn",
    kind: "testimony",
    eyebrow: "证人甲 · 日初出",
    title: "大如车盖",
    classical: "我以日始出时去人近，而日中时远也。",
    translation: "我认为太阳刚出来时离人近，到了中午离人远。",
    note: "证人甲依据的是太阳看起来的大小。",
  },
  {
    id: "child-noon",
    kind: "testimony",
    eyebrow: "证人乙 · 日中",
    title: "热如探汤",
    classical: "我以日初出远，而日中时近也。",
    translation: "我认为太阳刚出来时离人远，到了中午离人近。",
    note: "证人乙依据的是人体感受到的凉热。",
  },
  {
    id: "wheel",
    kind: "object",
    eyebrow: "现场物证 · 车轮",
    title: "车盖有多大？",
    classical: "日初出大如车盖，及日中则如盘盂。",
    translation: "太阳刚出来时大得像车盖，到了中午却像盘子。",
    note: "大小可能是真实的，也可能是环境参照物带来的视觉错觉。",
  },
  {
    id: "water",
    kind: "object",
    eyebrow: "现场物证 · 汤盂",
    title: "沧沧凉凉",
    classical: "日初出沧沧凉凉，及其日中如探汤。",
    translation: "太阳刚出来时清凉，到了中午就热得像把手伸进热水。",
    note: "地面升温需要时间。冷热并不能直接证明太阳距离发生了明显变化。",
  },
  {
    id: "confucius",
    kind: "testimony",
    eyebrow: "过路人 · 孔子",
    title: "知之为知之",
    classical: "孔子不能决也。两小儿笑曰：“孰为汝多知乎？”",
    translation: "孔子不能判断。两个小孩笑道：“谁说你知识渊博呢？”",
    note: "面对没有把握的问题，不随意下结论，也是一种求真的态度。",
  },
];

export const questions: Question[] = [
  {
    id: "q1",
    prompt: "“去人近”中的“去”是什么意思？",
    quote: "我以日始出时去人近",
    options: ["前往", "距离", "离开"],
    answer: 1,
    explanation: "“去”在这里表示距离，句意是太阳离人很近。",
  },
  {
    id: "q2",
    prompt: "“及其日中”中的“及”是什么意思？",
    quote: "及其日中如探汤",
    options: ["比得上", "以及", "等到"],
    answer: 2,
    explanation: "“及”是“等到”，“日中”就是正午。",
  },
  {
    id: "q3",
    prompt: "“孰为汝多知乎”表达了什么？",
    quote: "孰为汝多知乎？",
    options: ["谁说你知道得多呢", "你认识谁呢", "谁让你过来呢"],
    answer: 0,
    explanation: "“孰”是谁，“汝”是你，“知”同“智”。",
  },
];

export const verdicts: VerdictOption[] = [
  {
    id: "dawn",
    title: "证人甲正确",
    summary: "早晨太阳看起来更大，所以更近。",
    correct: false,
  },
  {
    id: "noon",
    title: "证人乙正确",
    summary: "中午感觉更热，所以太阳更近。",
    correct: false,
  },
  {
    id: "evidence",
    title: "证据不足",
    summary: "两人观察都真实，但不能由此推断距离。",
    correct: true,
  },
];
