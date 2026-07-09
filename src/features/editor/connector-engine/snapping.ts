import { Point, distance } from "./geometry";

// A bounding box definition
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates the mathematically closest point on the border of a bounding box 
 * from a given exterior or interior point.
 */
export function getClosestBorderPoint(bounds: Bounds, targetPoint: Point): Point {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;

  // If the target point is exactly in the center, default to the right border
  if (targetPoint.x === cx && targetPoint.y === cy) {
    return { x: x + width, y: cy };
  }

  // Calculate the vector from center to target
  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;

  // Calculate intersection with the bounding box edges
  const w2 = width / 2;
  const h2 = height / 2;

  let scaleX = Infinity;
  let scaleY = Infinity;

  if (Math.abs(dx) > 0.0001) scaleX = w2 / Math.abs(dx);
  if (Math.abs(dy) > 0.0001) scaleY = h2 / Math.abs(dy);

  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}
