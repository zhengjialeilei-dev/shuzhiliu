import type { ClimateMetrics, ClimatePolicy } from "../core/types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class ClimateModel {
  calculate(policy: ClimatePolicy): ClimateMetrics {
    const emissions = clamp(42 - policy.renewable * 0.22 - policy.forest * 0.45 - policy.transport * 0.1, 4, 42);
    const warming = clamp(1.2 + emissions * 0.025 - policy.forest * 0.018, 0.8, 2.5);
    const airQuality = clamp(40 + policy.renewable * 0.25 + policy.transport * 0.35 + policy.forest * 0.6, 0, 100);
    const biodiversity = clamp(45 + policy.forest * 1.8 + policy.renewable * 0.12 - warming * 7, 0, 100);
    const seaLevel = clamp(warming * 28 - policy.coastal * 0.7, 5, 70);
    const budget = (policy.renewable - 30) * 0.8 + policy.forest * 1.8 + (policy.transport - 20) * 0.4 + policy.coastal * 0.6;
    return { emissions, warming, airQuality, biodiversity, seaLevel, budget };
  }

  isSuccessful(metrics: ClimateMetrics): boolean {
    return metrics.warming <= 1.5 && metrics.airQuality >= 75 && metrics.biodiversity >= 65 && metrics.seaLevel <= 28 && metrics.budget <= 100;
  }

  passedTargets(metrics: ClimateMetrics): number {
    return [metrics.warming <= 1.5, metrics.airQuality >= 75, metrics.biodiversity >= 65, metrics.seaLevel <= 28].filter(Boolean).length;
  }
}
