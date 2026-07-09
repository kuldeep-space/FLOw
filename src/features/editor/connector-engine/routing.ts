import { PathPoint } from "../types";
import { getMidpoint } from "./geometry";
import { getCubicBezierPath } from "./bezier";

function getRoundedPolyline(points: PathPoint[], radius = 16): string {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);

    if (d1 === 0 || d2 === 0) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const r = Math.min(radius, d1 / 2, d2 / 2);

    if (r === 0) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const p1 = {
      x: curr.x - (curr.x - prev.x) * (r / d1),
      y: curr.y - (curr.y - prev.y) * (r / d1),
    };
    const p2 = {
      x: curr.x + (next.x - curr.x) * (r / d2),
      y: curr.y + (next.y - curr.y) * (r / d2),
    };

    path += ` L ${p1.x} ${p1.y} Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`;
  }

  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
}

/**
 * Renders an SVG path string from an array of Unified PathPoints.
 */
export function generateSvgPath(points: PathPoint[], routingType: string): string {
  if (points.length < 2) return "";

  if (routingType === "straight") {
    return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
  }

  if (routingType === "smoothstep" || routingType === "orthogonal") {
    return getRoundedPolyline(points, 12);
  }

  if (routingType === "curved" || routingType === "bezier") {
    return getRoundedPolyline(points, 100);
  }

  return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
}

/**
 * Calculates default orthogonal path points if there are only 2 points (Start/End)
 */
export function calculateDefaultOrthogonal(start: PathPoint, end: PathPoint): PathPoint[] {
  const midX = (start.x + end.x) / 2;
  return [
    start,
    { id: `bp_${Math.random().toString(36).substring(2, 6)}`, x: midX, y: start.y, type: "corner" },
    { id: `bp_${Math.random().toString(36).substring(2, 6)}`, x: midX, y: end.y, type: "corner" },
    end
  ];
}
