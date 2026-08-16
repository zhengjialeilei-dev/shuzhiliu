export type RegionId = "national" | "sichuan" | "shaanxi" | "luoyang" | "jiangxi";
export type DynastyFilter = "全部" | "唐" | "宋" | "其他";
export type ThemeFilter = "全部" | "山水" | "边塞" | "送别" | "怀古" | "田园";

export interface PoemLocation {
  name: string;
  province: string;
  coordinates: [number, number];
}

export type ScenePreset =
  | "moon-river"
  | "mountain-pass"
  | "spring-rain"
  | "autumn-wind"
  | "city-farewell"
  | "palace-road"
  | "yellow-river-pass"
  | "flute-night"
  | "luoyang-court"
  | "field-evening"
  | "waterfall"
  | "misty-mountain"
  | "high-mountain"
  | "frontier-night"
  | "snow-road"
  | "qinhuai-night"
  | "lake-storm"
  | "sunset-tower";

export interface PoemScene {
  preset: ScenePreset;
  moment: string;
  origin: string;
}

export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  lines: readonly string[];
  region: Exclude<RegionId, "national"> | "other";
  theme: Exclude<ThemeFilter, "全部">;
  location: PoemLocation;
  context: string;
  routeNote: string;
  scene: PoemScene;
}

export interface RegionOption {
  id: RegionId;
  label: string;
  description: string;
  provinces: readonly string[];
}

export interface AtlasFilters {
  region: RegionId;
  dynasty: DynastyFilter;
  theme: ThemeFilter;
}
