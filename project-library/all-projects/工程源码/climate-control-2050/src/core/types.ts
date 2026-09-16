export interface ClimatePolicy {
  renewable: number;
  forest: number;
  transport: number;
  coastal: number;
}

export interface ClimateMetrics {
  emissions: number;
  warming: number;
  airQuality: number;
  biodiversity: number;
  seaLevel: number;
  budget: number;
}

export type MetricKey = "warming" | "airQuality" | "biodiversity" | "seaLevel";

export interface ClimateState {
  started: boolean;
  policy: ClimatePolicy;
  activeMetric: MetricKey | null;
  submitted: boolean;
  showBriefing: boolean;
}
