export type Point = { x: number; y: number };

export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function distanceToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return distance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

export function getMidpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

// Determines if two points are perfectly aligned (collinear) on X or Y axis
export function isCollinear(p1: Point, p2: Point, p3: Point, tolerance = 1): boolean {
  // Check horizontal collinearity
  if (Math.abs(p1.y - p2.y) <= tolerance && Math.abs(p2.y - p3.y) <= tolerance) {
    return true;
  }
  // Check vertical collinearity
  if (Math.abs(p1.x - p2.x) <= tolerance && Math.abs(p2.x - p3.x) <= tolerance) {
    return true;
  }
  // Check general collinearity using cross product
  const crossProduct = (p2.y - p1.y) * (p3.x - p2.x) - (p2.x - p1.x) * (p3.y - p2.y);
  return Math.abs(crossProduct) <= tolerance * 10;
}
