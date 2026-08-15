import type { Euler, Quaternion, Vector3 } from "three";

export type LayoutMode = "solid" | "half" | "flat" | "separated";
export type ViewMode = "front" | "top" | "perspective";
export type FaceName = "front" | "back" | "left" | "right" | "top" | "bottom";

export interface PodiumBlockSpec {
  place: 1 | 2 | 3;
  width: number;
  height: number;
  depth: number;
  x: number;
}

export interface Transform {
  position: Vector3;
  quaternion: Quaternion;
}

export interface FaceTransformSource {
  position: Vector3;
  rotation: Euler;
}
