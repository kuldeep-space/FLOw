import { PathPoint } from "../types";
import { distance } from "./geometry";

/**
 * Automatically calculates and sets handle offsets for a PathPoint 
 * based on its neighbors to create a smooth curve.
 */
export function calculateSmoothHandles(prev: PathPoint, curr: PathPoint, next: PathPoint) {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const distPrev = distance(curr, prev);
  const distNext = distance(curr, next);
  const totalDist = distPrev + distNext;

  // Tangent vector
  const tx = dx / totalDist;
  const ty = dy / totalDist;

  // Scale factor (usually 0.3 for cubic bezier tension)
  const scale = 0.3;

  curr.inHandle = { dx: -tx * distPrev * scale, dy: -ty * distPrev * scale };
  curr.outHandle = { dx: tx * distNext * scale, dy: ty * distNext * scale };
}

export function getCubicBezierPath(start: PathPoint, end: PathPoint): string {
  const cp1x = start.x + (start.outHandle?.dx || 0);
  const cp1y = start.y + (start.outHandle?.dy || 0);
  const cp2x = end.x + (end.inHandle?.dx || 0);
  const cp2y = end.y + (end.inHandle?.dy || 0);

  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}
