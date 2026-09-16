import type { CityTask } from "../core/types";

export const cityTasks: CityTask[] = [
  {
    id: "park",
    order: "01",
    district: "滨水生态区",
    title: "为城市留一片绿",
    skill: "面积 · 周长",
    brief: "规划长方形中心公园，用有限的围栏围出足够大的活动空间。",
    reward: "中心公园",
  },
  {
    id: "road",
    order: "02",
    district: "城市东西轴",
    title: "让蓝图变成道路",
    skill: "比例尺 · 单位换算",
    brief: "为 2.4 千米的东西大道绘制施工图，找准它在蓝图上的长度。",
    reward: "滨河大道",
  },
  {
    id: "market",
    order: "03",
    district: "活力商业区",
    title: "算清每一笔生意",
    skill: "百分数 · 折扣",
    brief: "开业商品原价 240 元，全场优惠 15%，请核对收银台应收金额。",
    reward: "创意市集",
  },
  {
    id: "school",
    order: "04",
    district: "宜居生活区",
    title: "为每个孩子留个座位",
    skill: "统计 · 差量",
    brief: "根据社区儿童数据检查学位规划，计算距 1200 个学位目标还差多少。",
    reward: "未来学校",
  },
];
