import { getStroke } from "perfect-freehand";

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"],
  );
  d.push("Z");
  return d.join(" ");
}

export function getFreehandPath(
  points: { x: number; y: number; pressure?: number }[],
  isHighlighter: boolean,
  strokeWidth: number,
) {
  const strokePoints = getStroke(
    points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
    {
      size: isHighlighter ? 24 : strokeWidth,
      thinning: isHighlighter ? 0 : 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
    },
  );
  return getSvgPathFromStroke(strokePoints);
}

export function getSimplePath(points: { x: number; y: number }[]) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;
  
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x},${points[i].y}`;
  }
  return d;
}
