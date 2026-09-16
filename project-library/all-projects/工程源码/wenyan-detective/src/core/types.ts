export type ClueKind = "testimony" | "object" | "experiment";

export interface Clue {
  id: string;
  kind: ClueKind;
  eyebrow: string;
  title: string;
  classical: string;
  translation: string;
  note: string;
}

export interface Question {
  id: string;
  prompt: string;
  quote: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface VerdictOption {
  id: string;
  title: string;
  summary: string;
  correct: boolean;
}

export interface CaseState {
  entered: boolean;
  activeClueId: string | null;
  collectedClues: Set<string>;
  experimentComplete: boolean;
  translationAnswers: Record<string, number>;
  verdictId: string | null;
}
