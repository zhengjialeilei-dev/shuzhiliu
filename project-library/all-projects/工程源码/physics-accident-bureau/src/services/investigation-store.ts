import { evidence, questions, verdicts } from "../data/case-data";
import type { InvestigationState, PhysicsInput, RoadCondition, Trial } from "../core/types";
import { BrakingPhysics } from "./braking-physics";

type Listener = (state: InvestigationState, change?: "controls") => void;

export class InvestigationStore {
  private readonly physics = new BrakingPhysics();
  private listeners = new Set<Listener>();
  private trialId = 0;
  private trialTimer: number | undefined;
  private state: InvestigationState = {
    entered: false,
    activeEvidenceId: null,
    collectedEvidence: new Set(),
    input: { speedKmh: 50, reactionTime: 1, road: "dry", availableDistance: 55 },
    trials: [],
    answers: {},
    verdictId: null,
    simulating: false,
  };

  get snapshot(): InvestigationState {
    return {
      ...this.state,
      collectedEvidence: new Set(this.state.collectedEvidence),
      input: { ...this.state.input },
      trials: this.state.trials.map((trial) => ({ ...trial })),
      answers: { ...this.state.answers },
    };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  enter(): void { this.state.entered = true; this.emit(); }

  openEvidence(id: string): void {
    if (!evidence.some((item) => item.id === id)) return;
    this.state.activeEvidenceId = id;
    this.state.collectedEvidence.add(id);
    this.emit();
  }

  closeEvidence(): void { this.state.activeEvidenceId = null; this.emit(); }

  updateInput<K extends keyof PhysicsInput>(key: K, value: PhysicsInput[K]): void {
    if (this.state.simulating) return;
    this.state.input[key] = value;
    this.emit("controls");
  }

  setRoad(road: RoadCondition): void { this.updateInput("road", road); }

  runTrial(): void {
    if (this.state.simulating) return;
    const input = { ...this.state.input };
    this.state.simulating = true;
    this.emit("controls");
    this.trialTimer = window.setTimeout(() => {
      this.trialTimer = undefined;
      const result = this.physics.calculate(input);
      const trial: Trial = { id: ++this.trialId, ...input, ...result };
      this.state.trials = [trial, ...this.state.trials].slice(0, 5);
      this.state.simulating = false;
      this.emit("controls");
    }, 1600);
  }

  loadAccidentPreset(): void {
    if (this.state.simulating) return;
    this.state.input = { speedKmh: 72, reactionTime: 1.4, road: "wet", availableDistance: 55 };
    this.emit("controls");
  }

  answer(questionId: string, option: number): void {
    if (!questions.some((item) => item.id === questionId)) return;
    this.state.answers[questionId] = option;
    this.emit();
  }

  submitVerdict(id: string): void {
    if (!this.canConclude) return;
    if (!verdicts.some((item) => item.id === id)) return;
    this.state.verdictId = id;
    this.emit();
  }

  dismissVerdict(): void { this.state.verdictId = null; this.emit(); }

  restart(): void {
    if (this.trialTimer !== undefined) window.clearTimeout(this.trialTimer);
    this.trialTimer = undefined;
    this.trialId = 0;
    this.state = {
      entered: true,
      activeEvidenceId: null,
      collectedEvidence: new Set(),
      input: { speedKmh: 50, reactionTime: 1, road: "dry", availableDistance: 55 },
      trials: [], answers: {}, verdictId: null, simulating: false,
    };
    this.emit();
  }

  get currentResult() { return this.physics.calculate(this.state.input); }
  get correctAnswers() { return questions.filter((q) => this.state.answers[q.id] === q.answer).length; }
  get canConclude() { return this.state.collectedEvidence.size === evidence.length && this.state.trials.length >= 2 && this.correctAnswers === questions.length; }

  private emit(change?: "controls"): void {
    const snapshot = this.snapshot;
    this.listeners.forEach((listener) => listener(snapshot, change));
  }
}
