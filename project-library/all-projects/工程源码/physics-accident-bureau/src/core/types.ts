export type RoadCondition = "dry" | "wet" | "ice";

export interface Evidence {
  id: string;
  index: string;
  name: string;
  observation: string;
  inference: string;
  value: string;
}

export interface PhysicsInput {
  speedKmh: number;
  reactionTime: number;
  road: RoadCondition;
  availableDistance: number;
}

export interface PhysicsResult {
  speedMs: number;
  reactionDistance: number;
  brakingDistance: number;
  totalDistance: number;
  impactSpeed: number;
  safe: boolean;
}

export interface Trial extends PhysicsInput, PhysicsResult {
  id: number;
}

export interface AnalysisQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Verdict {
  id: string;
  title: string;
  description: string;
  correct: boolean;
}

export interface InvestigationState {
  entered: boolean;
  activeEvidenceId: string | null;
  collectedEvidence: Set<string>;
  input: PhysicsInput;
  trials: Trial[];
  answers: Record<string, number>;
  verdictId: string | null;
  simulating: boolean;
}
