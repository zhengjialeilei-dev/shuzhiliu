import type { ClimatePolicy, ClimateState, MetricKey } from "../core/types";

type Listener = (state: ClimateState, change?: "controls") => void;

export class ClimateStore {
  private state: ClimateState = {
    started: false,
    policy: { renewable: 30, forest: 0, transport: 20, coastal: 0 },
    activeMetric: null,
    submitted: false,
    showBriefing: true,
  };
  private listeners = new Set<Listener>();

  get snapshot(): ClimateState { return { ...this.state, policy: { ...this.state.policy } }; }
  subscribe(listener: Listener): () => void { this.listeners.add(listener); listener(this.snapshot); return () => this.listeners.delete(listener); }
  start(): void { this.state.started = true; this.emit(); }
  update<K extends keyof ClimatePolicy>(key: K, value: ClimatePolicy[K]): void { this.state.policy[key] = value; this.state.submitted = false; this.emit("controls"); }
  openMetric(key: MetricKey): void { this.state.activeMetric = key; this.emit(); }
  closeMetric(): void { this.state.activeMetric = null; this.emit(); }
  closeBriefing(): void { this.state.showBriefing = false; this.emit(); }
  submit(): void { this.state.submitted = true; this.emit(); }
  dismissResult(): void { this.state.submitted = false; this.emit(); }
  loadBalancedPlan(): void { this.state.policy = { renewable: 70, forest: 15, transport: 70, coastal: 20 }; this.state.submitted = false; this.emit(); }
  restart(): void { this.state = { started: true, policy: { renewable: 30, forest: 0, transport: 20, coastal: 0 }, activeMetric: null, submitted: false, showBriefing: true }; this.emit(); }
  private emit(change?: "controls"): void { const snapshot = this.snapshot; this.listeners.forEach((listener) => listener(snapshot, change)); }
}
