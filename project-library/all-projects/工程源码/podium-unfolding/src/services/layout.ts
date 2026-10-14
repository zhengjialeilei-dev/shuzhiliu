import { Euler, Quaternion, Vector3 } from "three";
import type { FaceName, PodiumBlockSpec, Transform } from "../core/types";

function transform(position: Vector3, rotation: Euler): Transform {
  return { position, quaternion: new Quaternion().setFromEuler(rotation) };
}

function attach(parent: Transform, hinge: Vector3, rotation: Euler, offset: Vector3): Transform {
  const turn = new Quaternion().setFromEuler(rotation);
  return {
    position: offset.clone().applyQuaternion(turn).add(hinge).applyQuaternion(parent.quaternion).add(parent.position),
    quaternion: parent.quaternion.clone().multiply(turn),
  };
}

// Spread the three blocks first, then rotate each face about its shared edge.
// The back stays attached to the top instead of sliding through it.
export function unfoldingTransform(block: PodiumBlockSpec, face: FaceName, progress: number): Transform {
  const { x, width: w, height: h, depth: d } = block;
  const amount = Math.max(0, Math.min(1, progress));
  const spread = Math.min(amount / 0.25, 1);
  const opened = Math.max(0, (amount - 0.25) / 0.75);
  const angle = opened * Math.PI / 2;
  const folded = Math.PI / 2 - angle;
  const front = transform(
    new Vector3(x * (1 + 2.6 * spread), h / 2 * (1 - opened) + 0.055 * opened, d / 2 * (1 - opened) + 0.35 * opened),
    new Euler(-angle, 0, 0)
  );
  if (face === "front") return front;
  if (face === "left") return attach(front, new Vector3(-w / 2, 0, 0), new Euler(0, -folded, 0), new Vector3(-d / 2, 0, 0));
  if (face === "right") return attach(front, new Vector3(w / 2, 0, 0), new Euler(0, folded, 0), new Vector3(d / 2, 0, 0));
  if (face === "bottom") return attach(front, new Vector3(0, -h / 2, 0), new Euler(folded, 0, 0), new Vector3(0, -d / 2, 0));
  const top = attach(front, new Vector3(0, h / 2, 0), new Euler(-folded, 0, 0), new Vector3(0, d / 2, 0));
  if (face === "top") return top;
  return attach(top, new Vector3(0, d / 2, 0), new Euler(-folded, 0, 0), new Vector3(0, h / 2, 0));
}

export function solidTransform(block: PodiumBlockSpec, face: FaceName): Transform {
  return unfoldingTransform(block, face, 0);
}

export function flatTransform(block: PodiumBlockSpec, face: FaceName): Transform {
  return unfoldingTransform(block, face, 1);
}

export function separatedTransform(block: PodiumBlockSpec, face: FaceName): Transform {
  const base = flatTransform(block, face);
  const offsets: Record<FaceName, Vector3> = {
    front: new Vector3(0, 0.35, 0),
    back: new Vector3(0, 0.35, -0.7),
    left: new Vector3(-0.32, 0.35, 0),
    right: new Vector3(0.32, 0.35, 0),
    top: new Vector3(0, 0.35, -0.35),
    bottom: new Vector3(0, 0.35, 0.35),
  };
  base.position.add(offsets[face]);
  return base;
}

export function interpolateTransform(a: Transform, b: Transform, amount: number): Transform {
  return { position: a.position.clone().lerp(b.position, amount), quaternion: a.quaternion.clone().slerp(b.quaternion, amount) };
}
