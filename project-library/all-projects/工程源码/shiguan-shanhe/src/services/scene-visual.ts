import type { Poem } from "../core/types";

export type SceneComposition =
  | "moon-boat"
  | "perilous-road"
  | "rain-cottage"
  | "broken-hut"
  | "city-gate"
  | "palace-rider"
  | "river-pass"
  | "flute-city"
  | "palace-court"
  | "chrysanthemum-field"
  | "waterfall"
  | "layered-mountain"
  | "summit"
  | "frontier-camp"
  | "snow-horses"
  | "snow-fisher"
  | "riverside-city"
  | "storm-lake"
  | "river-tower-sunset"
  | "white-emperor-boat"
  | "crane-tower-boat"
  | "river-gate-boat"
  | "peach-shore"
  | "spring-window"
  | "flower-path"
  | "ruined-city"
  | "autumn-river"
  | "homeward-route"
  | "red-cliff"
  | "west-lake"
  | "mid-autumn"
  | "willow-inn"
  | "pine-stream"
  | "deep-forest"
  | "mountain-festival"
  | "jiangnan-temple"
  | "moon-farm";

export interface SceneVisualProfile {
  composition: SceneComposition;
  description: string;
}

const sceneVisuals: Record<string, SceneVisualProfile> = {
  "emei-moon": { composition: "moon-boat", description: "峨眉秋月映入江面，一叶轻舟驶向三峡" },
  "shu-road": { composition: "perilous-road", description: "蜀道盘旋于高崖之间，云雾压住剑门雄关" },
  "spring-rain": { composition: "rain-cottage", description: "成都草堂沉入春夜，细雨无声润泽花木" },
  "thatched-hut": { composition: "broken-hut", description: "秋风卷走草堂茅草，冷雨落入破屋" },
  "send-du": { composition: "city-gate", description: "长安城门外风烟辽阔，友人将踏上入蜀长路" },
  "huaqing-palace": { composition: "palace-rider", description: "骊山宫阙层层开启，驿骑扬尘疾驰而来" },
  "tong-pass": { composition: "river-pass", description: "潼关夹在群峰与奔涌黄河之间" },
  "luoyang-flute": { composition: "flute-city", description: "洛阳春夜月色满城，远处传来折柳笛声" },
  "luoyang-daughter": { composition: "palace-court", description: "洛阳华宅灯火明丽，车马与楼阁映照繁华" },
  "drinking-five": { composition: "chrysanthemum-field", description: "东篱菊花盛开，南山与归鸟进入傍晚天色" },
  "lushan-waterfall": { composition: "waterfall", description: "庐山香炉峰升起紫烟，瀑布如银河垂落" },
  "west-forest-wall": { composition: "layered-mountain", description: "庐山峰岭随视角层层变化，云雾遮住全貌" },
  "view-tai": { composition: "summit", description: "泰山拔地而起，云海在峰顶下方铺展" },
  "liangzhou-song": { composition: "frontier-camp", description: "边塞军帐燃起篝火，夜光杯与战马相伴" },
  "snow-song": { composition: "snow-horses", description: "北风卷雪覆盖轮台，归马只留下远去蹄印" },
  qinhuai: { composition: "riverside-city", description: "秦淮烟月笼住河面，酒家灯影隔水摇动" },
  "watchtower-rain": { composition: "storm-lake", description: "西湖黑云翻涌，白雨跳珠后忽然天开" },
  "stork-tower": { composition: "river-tower-sunset", description: "夕阳落向群山，黄河从鹳雀楼前奔向大海" },
  "early-baidicheng": { composition: "white-emperor-boat", description: "彩云围住白帝城，轻舟顺三峡飞驰而下" },
  "yellow-crane-farewell": { composition: "crane-tower-boat", description: "黄鹤楼边孤帆远去，长江一直流入天际" },
  "tianmen-mountain": { composition: "river-gate-boat", description: "楚江劈开天门两山，孤帆从日边驶来" },
  "gift-wanglun": { composition: "peach-shore", description: "桃花潭水澄澈，岸上友人踏歌送别行舟" },
  "dufu-quatrain": { composition: "spring-window", description: "翠柳黄鹂映着草堂窗格，西岭积雪明亮" },
  "riverside-flowers": { composition: "flower-path", description: "浣花溪畔花朵压满小径，蝶舞莺啼" },
  "spring-view": { composition: "ruined-city", description: "战乱后的长安草木深深，远处仍有烽火" },
  "high-ascent": { composition: "autumn-river", description: "夔州落木无边，长江在秋风中滚滚东去" },
  "hearing-army-victory": { composition: "homeward-route", description: "捷报传来，归舟沿巴峡、巫峡驶向故乡" },
  "red-cliff": { composition: "red-cliff", description: "赤壁乱石穿空，惊涛拍岸，大江向东奔流" },
  "west-lake-clear-rain": { composition: "west-lake", description: "西湖在晴光与山雨之间变换，远塔映水" },
  "mid-autumn-moon": { composition: "mid-autumn", description: "中秋圆月高悬，清辉跨越千里照见思念" },
  "send-yuan-er": { composition: "willow-inn", description: "渭城朝雨洗净客舍，新柳垂在送别酒前" },
  "autumn-mountain-home": { composition: "pine-stream", description: "雨后明月穿过松林，清泉从山石上流过" },
  "deer-enclosure": { composition: "deep-forest", description: "空山深林幽静，夕阳返照在青苔上" },
  "double-ninth-memory": { composition: "mountain-festival", description: "重阳登高远望，山路与茱萸寄托乡思" },
  "jiangnan-spring": { composition: "jiangnan-temple", description: "江南水村莺啼，寺院楼台隐入烟雨" },
  "return-farm-three": { composition: "moon-farm", description: "月下田垄延伸，归农荷锄踏着露水回家" },
  "maple-bridge-night": { composition: "riverside-city", description: "枫桥霜夜里渔火摇动，寒山寺钟声抵达客船" },
  "qiantang-spring": { composition: "west-lake", description: "西湖早春水面初平，莺燕掠过白沙堤" },
  "dusk-river-song": { composition: "moon-boat", description: "钱塘江上残阳铺水，新月随后升起" },
  "spring-dawn": { composition: "spring-window", description: "襄阳山居清晨鸟鸣，庭院留着昨夜落花" },
  "jiande-river-night": { composition: "moon-boat", description: "建德江烟渚日暮，清月靠近夜泊客船" },
  "furong-tower-farewell": { composition: "crane-tower-boat", description: "京口寒雨连江，清晨在芙蓉楼送别" },
  "dongting-lake": { composition: "west-lake", description: "洞庭秋月映湖，君山像银盘中的青螺" },
  "river-snow": { composition: "snow-fisher", description: "永州千山飞雪，一叶孤舟独钓寒江" },
  "homecoming-couplet": { composition: "willow-inn", description: "白发归人走到会稽村口，故乡儿童笑问来处" },
  "moor-at-guazhou": { composition: "moon-boat", description: "瓜洲春风吹绿江南，明月照着隔江归路" },
  "shanxi-village": { composition: "flower-path", description: "山水重叠处道路转折，柳暗花明露出村庄" },
  "yellow-sand-night": { composition: "moon-farm", description: "黄沙岭月夜稻香蛙鸣，小雨落在溪桥前" },
  "jingting-alone": { composition: "layered-mountain", description: "飞鸟孤云离去，只剩诗人与敬亭山相看" },
  "mission-frontier": { composition: "frontier-camp", description: "居延大漠孤烟直上，长河托住圆圆落日" },
  "jiangnan-li-guinian": { composition: "ruined-city", description: "江南落花中故人重逢，回望长安盛世旧影" },
  "little-pond": { composition: "west-lake", description: "晴光树阴落进小池，蜻蜓停在新荷尖角" },
};

export function getSceneVisual(poem: Poem): SceneVisualProfile {
  return sceneVisuals[poem.id] ?? {
    composition: "layered-mountain",
    description: `${poem.location.name}的山河诗境`,
  };
}
