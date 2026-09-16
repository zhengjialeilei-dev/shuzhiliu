import { roadLabels } from "../data/case-data";
import type { PhysicsInput, PhysicsResult } from "../core/types";

const GRAVITY = 9.8;

export class BrakingPhysics {
  calculate(input: PhysicsInput): PhysicsResult {
    const speedMs = input.speedKmh / 3.6;
    const friction = roadLabels[input.road].friction;
    const reactionDistance = speedMs * input.reactionTime;
    const brakingDistance = (speedMs * speedMs) / (2 * friction * GRAVITY);
    const totalDistance = reactionDistance + brakingDistance;
    const brakingRoom = Math.max(0, input.availableDistance - reactionDistance);
    const remainingSpeedSquared = Math.max(0, speedMs * speedMs - 2 * friction * GRAVITY * brakingRoom);
    const impactSpeed = Math.sqrt(remainingSpeedSquared) * 3.6;

    return {
      speedMs,
      reactionDistance,
      brakingDistance,
      totalDistance,
      impactSpeed,
      safe: totalDistance <= input.availableDistance,
    };
  }
}
