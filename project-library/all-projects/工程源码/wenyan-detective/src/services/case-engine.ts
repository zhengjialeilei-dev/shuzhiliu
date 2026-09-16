import { clues, questions, verdicts } from "../data/case-file";
import type { CaseState } from "../core/types";

type Listener = (state: CaseState) => void;

export class CaseEngine {
  private state: CaseState = {
    entered: false,
    activeClueId: null,
    collectedClues: new Set(),
    experimentComplete: false,
    translationAnswers: {},
    verdictId: null,
  };

  private listeners = new Set<Listener>();

  get snapshot(): CaseState {
    return {
      ...this.state,
      collectedClues: new Set(this.state.collectedClues),
      translationAnswers: { ...this.state.translationAnswers },
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  enter(): void {
    this.state.entered = true;
    this.emit();
  }

  openClue(id: string): void {
    if (!clues.some((clue) => clue.id === id)) return;
    this.state.activeClueId = id;
    this.state.collectedClues.add(id);
    this.emit();
  }

  closeClue(): void {
    this.state.activeClueId = null;
    this.emit();
  }

  completeExperiment(): void {
    this.state.experimentComplete = true;
    this.emit();
  }

  answerQuestion(questionId: string, optionIndex: number): void {
    if (!questions.some((question) => question.id === questionId)) return;
    this.state.translationAnswers[questionId] = optionIndex;
    this.emit();
  }

  submitVerdict(verdictId: string): void {
    if (!this.canJudge) return;
    if (!verdicts.some((verdict) => verdict.id === verdictId)) return;
    this.state.verdictId = verdictId;
    this.emit();
  }

  dismissVerdict(): void {
    this.state.verdictId = null;
    this.emit();
  }

  restart(): void {
    this.state = {
      entered: true,
      activeClueId: null,
      collectedClues: new Set(),
      experimentComplete: false,
      translationAnswers: {},
      verdictId: null,
    };
    this.emit();
  }

  get solvedTranslations(): number {
    return questions.filter((question) => this.state.translationAnswers[question.id] === question.answer).length;
  }

  get canJudge(): boolean {
    return this.state.collectedClues.size >= clues.length && this.state.experimentComplete && this.solvedTranslations >= questions.length;
  }

  private emit(): void {
    const snapshot = this.snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
