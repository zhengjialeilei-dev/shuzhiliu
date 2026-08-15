import { Euler, Quaternion, Vector3 } from "three";
import type { FaceName, PodiumBlockSpec, Transform } from "../core/types";

const flatRotation = new Euler(-Math.PI / 2, 0, 0);

function transform(position: Vector3, rotation: Euler): Transform {
  return { position, quaternion: new Quaternion().setFromEuler(rotation) };
}

export function solidTransform(block: PodiumBlockSpec, face: FaceName): Transform {
  const { x, width: w, height: h, depth: d } = block;
  const map: Record<FaceName, Transform> = {
    front: transform(new Vector3(x, h / 2, d / 2), new Euler(0, 0, 0)),
    back: transform(new Vector3(x, h / 2, -d / 2), new Euler(0, Math.PI, 0)),
    left: transform(new Vector3(x - w / 2, h / 2, 0), new Euler(0, -Math.PI / 2, 0)),
    right: transform(new Vector3(x + w / 2, h / 2, 0), new Euler(0, Math.PI / 2, 0)),
    top: transform(new Vector3(x, h, 0), new Euler(-Math.PI / 2, 0, 0)),
    bottom: transform(new Vector3(x, 0.015, 0), new Euler(Math.PI / 2, 0, 0)),
  };
  return map[face];
}

export function flatTransform(block: PodiumBlockSpec, face: FaceName): Transform {
  const { x, width: w, height: h, depth: d } = block;
  const centerZ = 0.35;
  const map: Record<FaceName, Vector3> = {
    front: new Vector3(x, 0.055, centerZ),
    top: new Vector3(x, 0.055, centerZ - h / 2 - d / 2),
    back: new Vector3(x, 0.055, centerZ - h / 2 - d - h / 2),
    bottom: new Vector3(x, 0.055, centerZ + h / 2 + d / 2),
    left: new Vector3(x - w / 2 - d / 2, 0.055, centerZ),
    right: new Vector3(x + w / 2 + d / 2, 0.055, centerZ),
  };
  return transform(map[face], flatRotation);
}

export function separatedTransform(block: PodiumBlockSpec, face: FaceName): Transform {
  const base = flatTransform(block, face);
  const direction: Record<FaceName, Vector3> = {
    front: new Vector3(0, 0.48, 0.1),
    back: new Vector3(0, 0.24, -0.45),
    left: new Vector3(-0.38, 0.3, 0),
    right: new Vector3(0.38, 0.3, 0),
    top: new Vector3(0, 0.36, -0.2),
    bottom: new Vector3(0, 0.18, 0.35),
  };
  const tilt: Record<FaceName, Euler> = {
    front: new Euler(-Math.PI / 2 + 0.08, 0, 0),
    back: new Euler(-Math.PI / 2 - 0.08, 0.08, 0),
    left: new Euler(-Math.PI / 2, 0, -0.1),
    right: new Euler(-Math.PI / 2, 0, 0.1),
    top: new Euler(-Math.PI / 2 + 0.1, 0, 0),
    bottom: new Euler(-Math.PI / 2 - 0.06, 0, 0),
  };
  return transform(base.position.clone().add(direction[face]), tilt[face]);
}

export function interpolateTransform(a: Transform, b: Transform, amount: number): Transform {
  return {
    position: a.position.clone().lerp(b.position, amount),
    quaternion: a.quaternion.clone().slerp(b.quaternion, amount),
  };
}
