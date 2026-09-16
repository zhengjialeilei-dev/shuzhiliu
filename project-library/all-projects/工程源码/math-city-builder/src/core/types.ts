export type TaskId = "park" | "road" | "market" | "school";

export interface CityTask {
  id: TaskId;
  order: string;
  district: string;
  title: string;
  skill: string;
  brief: string;
  reward: string;
}

export interface TaskValues {
  parkWidth: number;
  parkHeight: number;
  mapLength: number;
  salePrice: number;
  extraSeats: number;
}

export interface CityState {
  started: boolean;
  activeTask: TaskId | null;
  completed: Set<TaskId>;
  values: TaskValues;
  feedback: "idle" | "correct" | "wrong";
  showCertificate: boolean;
}
