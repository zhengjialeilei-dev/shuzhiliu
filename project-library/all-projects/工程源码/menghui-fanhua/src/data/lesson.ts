import type { LessonConfig } from "../core/models";

const ASSET_BASE =
  "https://tuxiaoling-glb-2026.oss-cn-shenzhen.aliyuncs.com/programs/menghui";

export const lesson: LessonConfig = {
  title: "梦回繁华",
  eyebrow: "八年级语文 · 长卷探微",
  subtitle: "从一幅画，走进一座城",
  description:
    "沿《清明上河图》由郊野入汴京，在五幕观察中理解散点透视、市井百态与北宋城市生活。",
  cover: `${ASSET_BASE}/04_bridge.webp`,
  fullScroll: `${ASSET_BASE}/00_full_scroll.webp`,
  scrollRod: `${ASSET_BASE}/right_rod.webp`,
  scenes: [
    {
      id: "suburb",
      order: 1,
      act: "第一幕",
      title: "郊野春景",
      image: `${ASSET_BASE}/02_suburb.webp`,
      thumbnail: `${ASSET_BASE}/btn_suburb.webp`,
      panorama: `${ASSET_BASE}/360/1.webp`,
      question: "画面中哪些细节表现了春天和生活气息？",
      tags: ["田野", "村舍", "行旅", "柳树"],
      hotspots: [
        {
          x: 35.2,
          y: 70.8,
          title: "行旅小路",
          text: "小路上的行人、驴马和车队，使画卷从宁静的郊野生活开始展开。",
          question: "为什么画家不直接从最热闹的街市开始画？",
        },
        {
          x: 79.1,
          y: 16.5,
          title: "远处城郭",
          text: "远处若隐若现的城郭，暗示画面即将从郊外进入城市。",
          question: "这种由远及近的安排有什么好处？",
        },
      ],
    },
    {
      id: "river",
      order: 2,
      act: "第二幕",
      title: "汴河运输",
      image: `${ASSET_BASE}/03_river.webp`,
      thumbnail: `${ASSET_BASE}/btn_river.webp`,
      panorama: `${ASSET_BASE}/360/2.webp`,
      question: "从汴河运输中，你能看出北宋城市经济的哪些特点？",
      tags: ["船只", "码头", "货物", "商旅"],
      hotspots: [
        {
          x: 30.5,
          y: 35.3,
          title: "汴河船只",
          text: "河道上的船只表现出水路运输的繁忙，也让画面开始变得热闹。",
          question: "城市繁华为什么离不开河流和运输？",
        },
        {
          x: 62.3,
          y: 75.2,
          title: "岸边搬运",
          text: "岸边搬运货物的人物细节，表现出城市商业背后的劳动场景。",
          question: "这些劳动者为什么也是“繁华”的一部分？",
        },
      ],
    },
    {
      id: "bridge",
      order: 3,
      act: "第三幕",
      title: "虹桥高潮",
      image: `${ASSET_BASE}/04_bridge.webp`,
      thumbnail: `${ASSET_BASE}/btn_bridge.webp`,
      panorama: `${ASSET_BASE}/360/3.webp`,
      question: "为什么虹桥部分常被认为是全卷的高潮？",
      tags: ["虹桥", "船桥相遇", "围观者", "人流"],
      hotspots: [
        {
          x: 49.8,
          y: 30.9,
          title: "虹桥",
          text: "虹桥是水陆交通交汇的视觉中心，桥上行人密集，桥下船只穿行。",
          question: "为什么虹桥最能体现画面的繁华？",
        },
        {
          x: 49.7,
          y: 51,
          title: "桥下船只",
          text: "船只通过桥洞时形成紧张场面，增强了画面的动感和戏剧性。",
          question: "这个细节为什么会吸引岸边人群围观？",
        },
        {
          x: 28.7,
          y: 49.7,
          title: "桥头人群",
          text: "桥头聚集的人群、商贩和行旅，让画面呈现出高度密集的市井气息。",
          question: "从这些人物中，你能看到哪些社会生活内容？",
        },
      ],
    },
    {
      id: "gate",
      order: 4,
      act: "第四幕",
      title: "城门内外",
      image: `${ASSET_BASE}/05_gate.webp`,
      thumbnail: `${ASSET_BASE}/btn_gate.webp`,
      panorama: `${ASSET_BASE}/360/4.webp`,
      question: "城门在长卷中起到了什么连接作用？",
      tags: ["城门", "车马", "行人", "空间过渡"],
      hotspots: [
        {
          x: 52.8,
          y: 44.8,
          title: "城门楼",
          text: "城门楼连接城外与城内，是画卷空间转换的重要标志。",
          question: "城门为什么能成为画卷中的过渡节点？",
        },
        {
          x: 57,
          y: 63,
          title: "进出人流",
          text: "进城和出城的人群、车马在这里汇聚，形成繁忙的城市入口。",
          question: "这里的人流和虹桥的人流有什么不同？",
        },
      ],
    },
    {
      id: "market",
      order: 5,
      act: "第五幕",
      title: "街市繁华",
      image: `${ASSET_BASE}/06_market.webp`,
      thumbnail: `${ASSET_BASE}/btn_market.webp`,
      panorama: `${ASSET_BASE}/360/5.webp`,
      question: "哪些细节最能表现“繁华”？",
      tags: ["店铺", "招牌", "摊贩", "市井生活"],
      hotspots: [
        {
          x: 32.4,
          y: 30,
          title: "店铺招牌",
          text: "街市中的店铺、招牌和顾客表现出商业生活的繁盛。",
          question: "你能从画面中找出哪些行业或职业？",
        },
        {
          x: 64.2,
          y: 57,
          title: "车马行人",
          text: "密集的车马行人让街市充满动感，体现都城生活的复杂与热闹。",
          question: "“繁华”除了人多，还体现在哪些方面？",
        },
      ],
    },
  ],
  summary: [
    {
      marker: "卷",
      title: "画卷三段 · 布局之妙",
      points: [
        "开卷郊野：疏林薄雾、茅檐行旅，一派早春乡间气象。",
        "中段汴河：漕船云集、虹桥险情，叙事进入高潮。",
        "后段街市：城门、酒楼与商旅共同铺陈城市生活。",
      ],
      takeaway: "由静到动，再由动归静，如一部纸上交响。",
    },
    {
      marker: "市",
      title: "市井万象 · 内容之丰",
      points: [
        "人物 814 位：农夫、船工、商贩、轿夫与说书人。",
        "牲畜 83 匹、船只 29 艘，水陆交通一应俱全。",
        "酒楼、茶坊、药铺与摊贩构成繁盛商业网络。",
      ],
      takeaway: "它不仅是画，也是北宋城市生活的全景档案。",
    },
    {
      marker: "艺",
      title: "艺术成就 · 技法之精",
      points: [
        "散点透视让观者移步换景，可行、可望、可游、可居。",
        "人物精工，树木房屋写意，工而不板、放而不乱。",
        "水墨为主、薄施淡彩，设色古朴而含蓄。",
      ],
      takeaway: "中国画“以大观小”的典范。",
    },
    {
      marker: "史",
      title: "传世价值 · 意义之重",
      points: [
        "建筑、服饰与风俗，是研究宋代社会的重要视觉史料。",
        "张择端传世真迹，留下千年前汴京的城市切片。",
        "一幅长卷连接艺术史、城市史与普通人的生活史。",
      ],
      takeaway: "穿越千年的文化密码，一座永不落幕的纸上京城。",
    },
  ],
  reflection:
    "为什么说《清明上河图》不仅是一幅画，也是一部北宋城市生活的百科全书？哪些细节让你感受到了宋朝人的“烟火气”？",
};
