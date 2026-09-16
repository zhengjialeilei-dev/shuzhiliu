import { cityTasks } from "../data/city-tasks";
import type { CityState, TaskId, TaskValues } from "../core/types";

type Listener = (state: CityState, change?: "controls") => void;

export class CityEngine {
  private state: CityState = {
    started: false,
    activeTask: null,
    completed: new Set(),
    values: { parkWidth: 5, parkHeight: 4, mapLength: 8, salePrice: 200, extraSeats: 80 },
    feedback: "idle",
    showCertificate: false,
  };
  private listeners = new Set<Listener>();

  get snapshot(): CityState {
    return { ...this.state, completed: new Set(this.state.completed), values: { ...this.state.values } };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  start(): void { this.state.started = true; this.emit(); }

  openTask(id: TaskId): void {
    if (!cityTasks.some((task) => task.id === id)) return;
    this.state.activeTask = id;
    this.state.feedback = "idle";
    this.emit();
  }

  closeTask(): void { this.state.activeTask = null; this.state.feedback = "idle"; this.emit(); }

  updateValue<K extends keyof TaskValues>(key: K, value: TaskValues[K]): void {
    this.state.values[key] = value;
    this.state.feedback = "idle";
    this.emit("controls");
  }

  checkActiveTask(): void {
    const task = this.state.activeTask;
    if (!task) return;
    const v = this.state.values;
    const correct = task === "park"
      ? v.parkWidth * v.parkHeight >= 30 && 2 * (v.parkWidth + v.parkHeight) <= 26
      : task === "road"
        ? v.mapLength === 12
        : task === "market"
          ? v.salePrice === 204
          : v.extraSeats === 120;
    this.state.feedback = correct ? "correct" : "wrong";
    this.emit();
  }

  finishTask(): void {
    if (!this.state.activeTask || this.state.feedback !== "correct") return;
    this.state.completed.add(this.state.activeTask);
    this.state.activeTask = null;
    this.state.feedback = "idle";
    if (this.state.completed.size === cityTasks.length) this.state.showCertificate = true;
    this.emit();
  }

  dismissCertificate(): void { this.state.showCertificate = false; this.emit(); }

  restart(): void {
    this.state = {
      started: true, activeTask: null, completed: new Set(),
      values: { parkWidth: 5, parkHeight: 4, mapLength: 8, salePrice: 200, extraSeats: 80 },
      feedback: "idle", showCertificate: false,
    };
    this.emit();
  }

  private emit(change?: "controls"): void {
    const snapshot = this.snapshot;
    this.listeners.forEach((listener) => listener(snapshot, change));
  }
}
