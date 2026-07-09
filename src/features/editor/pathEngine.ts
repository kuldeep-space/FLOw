export type Point = { x: number; y: number };

export interface PathResult {
  path: string;
  midpoints: { x: number; y: number; index: number }[];
}

/**
 * Calculates the exact midpoint between two points.
 */
function getMidpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

/**
 * Calculates the true center point along a polyline.
 */
export function getPolylineCenter(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let totalLength = 0;
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    segments.push({ p1, p2, len });
    totalLength += len;
  }

  const targetLength = totalLength / 2;
  let currentLength = 0;

  for (const seg of segments) {
    if (currentLength + seg.len >= targetLength) {
      const remaining = targetLength - currentLength;
      const t = seg.len === 0 ? 0.5 : remaining / seg.len;
      return {
        x: seg.p1.x + (seg.p2.x - seg.p1.x) * t,
        y: seg.p1.y + (seg.p2.y - seg.p1.y) * t,
      };
    }
    currentLength += seg.len;
  }
  
  return points[points.length - 1];
}

/**
 * Generates a straight polyline through all points.
 */
export function getStraightPath(points: Point[]): PathResult {
  if (points.length < 2) return { path: "", midpoints: [] };

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const midpoints = [];

  for (let i = 0; i < points.length - 1; i++) {
    const mid = getMidpoint(points[i], points[i + 1]);
    midpoints.push({ ...mid, index: i });
  }

  return { path, midpoints };
}

/**
 * Generates an orthogonal/smoothstep path through all points.
 * For now, we assume the points precisely define the orthogonal corners.
 * To make it "smooth", we add corner radii.
 */
export function getRoundedPolyline(
  points: Point[],
  radius: number = 20,
): PathResult {
  if (points.length < 2) return { path: "", midpoints: [] };
  if (points.length === 2) return getStraightPath(points);

  let path = `M ${points[0].x} ${points[0].y}`;
  const midpoints = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Add midpoint for this segment
    midpoints.push({ ...getMidpoint(p1, p2), index: i });

    if (i === points.length - 2) {
      // Last point, just draw line
      path += ` L ${p2.x} ${p2.y}`;
      break;
    }

    const p3 = points[i + 2];

    // Distance to next and previous
    const d1 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const d2 = Math.hypot(p3.x - p2.x, p3.y - p2.y);

    // If segment is too short for full radius, scale it down
    const r = Math.min(radius, d1 / 2, d2 / 2);

    if (r <= 0) {
      path += ` L ${p2.x} ${p2.y}`;
      continue;
    }

    // Direction vectors
    const dx1 = (p2.x - p1.x) / d1;
    const dy1 = (p2.y - p1.y) / d1;
    const dx2 = (p3.x - p2.x) / d2;
    const dy2 = (p3.y - p2.y) / d2;

    // Corner start and end points
    const p2Start = { x: p2.x - dx1 * r, y: p2.y - dy1 * r };
    const p2End = { x: p2.x + dx2 * r, y: p2.y + dy2 * r };

    path += ` L ${p2Start.x} ${p2Start.y} Q ${p2.x} ${p2.y} ${p2End.x} ${p2End.y}`;
  }

  return { path, midpoints };
}

/**
 * Generates a curved path using cubic bezier approximation (Catmull-Rom to Bezier).
 */
export function getCurvedPath(
  points: Point[],
  tension: number = 0.2,
): PathResult {
  if (points.length < 2) return { path: "", midpoints: [] };
  if (points.length === 2) return getStraightPath(points);

  let path = `M ${points[0].x} ${points[0].y}`;
  const midpoints = [];

  const controlPoints: Point[][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1 = {
      x: p1.x + (p2.x - p0.x) * tension,
      y: p1.y + (p2.y - p0.y) * tension,
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) * tension,
      y: p2.y - (p3.y - p1.y) * tension,
    };

    controlPoints.push([cp1, cp2]);
    path += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;

    // Approximate midpoint of cubic bezier
    // B(t) = (1-t)^3*P0 + 3(1-t)^2*t*P1 + 3(1-t)*t^2*P2 + t^3*P3 for t=0.5
    const midX = 0.125 * p1.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p2.x;
    const midY = 0.125 * p1.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p2.y;
    midpoints.push({ x: midX, y: midY, index: i });
  }

  return { path, midpoints };
}

export function getEdgePath(points: Point[], kind: string): PathResult {
  if (kind === "straight") {
    return getStraightPath(points);
  } else if (kind === "orthogonal" || kind === "smoothstep") {
    return getRoundedPolyline(points, 20);
  } else if (kind === "bezier" || kind === "curved" || kind === "simplebezier") {
    return getCurvedPath(points, 0.25);
  } else {
    return getStraightPath(points);
  }
}
