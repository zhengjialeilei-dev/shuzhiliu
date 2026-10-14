import { describe, expect, it } from 'vitest';
import { podiumBlocks } from '../../project-library/all-projects/工程源码/podium-unfolding/src/data/workshop';
import { flatTransform, solidTransform, unfoldingTransform, separatedTransform } from '../../project-library/all-projects/工程源码/podium-unfolding/src/services/layout';
import type { FaceName, Transform } from '../../project-library/all-projects/工程源码/podium-unfolding/src/core/types';

const faces: FaceName[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
const point = (pose: Transform, x: number, y: number) => pose.position.clone().set(x, y, 0).applyQuaternion(pose.quaternion).add(pose.position);

describe('podium geometry', () => {
  it('keeps both endpoints of all five shared edges attached throughout unfolding', () => {
    for (const block of podiumBlocks) for (const progress of [0, 0.1, 0.25, 0.4, 0.65, 0.8, 1]) {
      const pose = (face: FaceName) => unfoldingTransform(block, face, progress);
      const { width: w, height: h, depth: d } = block;
      for (const side of [-1, 1]) {
        const pairs = [
          [point(pose('front'), -w / 2, side * h / 2), point(pose('left'), d / 2, side * h / 2)],
          [point(pose('front'), w / 2, side * h / 2), point(pose('right'), -d / 2, side * h / 2)],
          [point(pose('front'), side * w / 2, h / 2), point(pose('top'), side * w / 2, -d / 2)],
          [point(pose('front'), side * w / 2, -h / 2), point(pose('bottom'), side * w / 2, d / 2)],
          [point(pose('top'), side * w / 2, d / 2), point(pose('back'), side * w / 2, -h / 2)],
        ];
        for (const [a, b] of pairs) expect(a.distanceTo(b)).toBeLessThan(1e-8);
      }
    }
  });

  it('produces six coplanar, non-overlapping faces per net and separates the three nets', () => {
    for (const layout of [flatTransform, separatedTransform]) {
      const rectangles = podiumBlocks.flatMap((block) => faces.map((face) => {
        const pose = layout(block, face);
        const width = face === 'left' || face === 'right' ? block.depth : block.width;
        const height = face === 'top' || face === 'bottom' ? block.depth : block.height;
        const corners = [-1, 1].flatMap((x) => [-1, 1].map((y) => point(pose, x * width / 2, y * height / 2)));
        for (const corner of corners) expect(corner.y).toBeCloseTo(pose.position.y, 8);
        return { x1: Math.min(...corners.map((p) => p.x)), x2: Math.max(...corners.map((p) => p.x)), z1: Math.min(...corners.map((p) => p.z)), z2: Math.max(...corners.map((p) => p.z)) };
      }));
      expect(rectangles).toHaveLength(18);
      rectangles.forEach((a, i) => rectangles.slice(i + 1).forEach((b) => {
        const overlapX = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
        const overlapZ = Math.min(a.z2, b.z2) - Math.max(a.z1, b.z1);
        expect(overlapX <= 1e-8 || overlapZ <= 1e-8).toBe(true);
      }));
    }
  });

  it('folds back to the original three cuboids', () => {
    for (const block of podiumBlocks) {
      const front = solidTransform(block, 'front').position;
      const back = solidTransform(block, 'back').position;
      expect(front.x).toBeCloseTo(block.x);
      expect(front.y).toBeCloseTo(block.height / 2);
      expect(front.distanceTo(back)).toBeCloseTo(block.depth);
      expect(solidTransform(block, 'bottom').position.y).toBeCloseTo(0);
      expect(solidTransform(block, 'top').position.y).toBeCloseTo(block.height);
    }
  });
});
