import { ShapeRegistry } from "../registry";
import type {
  ShapeDefinition,
  ShapeRenderProps,
  Point,
  BoundingBox,
} from "../types";

// --- RECTANGLE ---
export const RectangleShape: ShapeDefinition = {
  type: "rectangle",
  name: "Rectangle",
  category: "Basic",
  description: "A standard rectangle with sharp corners",
  defaultSize: { width: 180, height: 100 },
  minimumSize: { width: 40, height: 24 },
  supportsText: true,
  supportsImage: true,
  supportsGradient: true,
  supportsShadow: true,
  supportsBorderRadius: false,

  getTextArea: (w, h) => ({ x: 10, y: 10, width: w - 20, height: h - 20 }),

  getClosestPoint: (w, h, px, py) => {
    // Math for closest point on a rectangle perimeter
    const vertices = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },

  getConnectionPoints: (w, h, density: number = 1) => {
    const points: Point[] = [];
    const ptsX = Math.max(1, Math.round((w / 36) * density));
    const ptsY = Math.max(1, Math.round((h / 36) * density));
    // Top (Left to Right, includes Top-Left corner)
    for (let i = 0; i <= ptsX; i++) points.push({ x: (w * i) / (ptsX + 1), y: 0 });
    // Right (Top to Bottom, includes Top-Right corner)
    for (let i = 0; i <= ptsY; i++) points.push({ x: w, y: (h * i) / (ptsY + 1) });
    // Bottom (Right to Left, includes Bottom-Right corner)
    for (let i = ptsX + 1; i >= 1; i--) points.push({ x: (w * i) / (ptsX + 1), y: h });
    // Left (Bottom to Top, includes Bottom-Left corner)
    for (let i = ptsY + 1; i >= 1; i--) points.push({ x: 0, y: (h * i) / (ptsY + 1) });
    return points;
  },

  render: ({ width, height, data }: ShapeRenderProps) => {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: data.fill,
          border: `${data.strokeWidth || 3}px ${data.dashed ? "dashed" : "solid"} ${data.stroke || "#a78bfa"}`,
          borderRadius: 0,
        }}
      />
    );
  },
};

// --- ROUNDED RECTANGLE ---
export const RoundedRectangleShape: ShapeDefinition = {
  ...RectangleShape,
  type: "rounded",
  name: "Rounded Rectangle",
  description: "A rectangle with rounded corners",
  supportsBorderRadius: true,
  render: ({ width, height, data }: ShapeRenderProps) => {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: data.fill,
          border: `${data.strokeWidth || 3}px ${data.dashed ? "dashed" : "solid"} ${data.stroke || "#a78bfa"}`,
          borderRadius: Math.min(width, height) / 4,
        }}
      />
    );
  },
};

// --- ELLIPSE / CIRCLE ---
export const EllipseShape: ShapeDefinition = {
  type: "ellipse",
  name: "Ellipse",
  category: "Basic",
  description: "An elliptical shape",
  defaultSize: { width: 180, height: 100 },
  minimumSize: { width: 40, height: 40 },
  supportsText: true,
  supportsImage: true,
  supportsGradient: true,
  supportsShadow: true,
  supportsBorderRadius: false,

  getTextArea: (w, h) => {
    // Inscribed rectangle in an ellipse is (w / sqrt(2)), (h / sqrt(2))
    const sq = Math.SQRT2;
    const iw = w / sq;
    const ih = h / sq;
    return {
      x: (w - iw) / 2,
      y: (h - ih) / 2,
      width: iw,
      height: ih,
    };
  },

  getClosestPoint: (w, h, px, py) => {
    const cx = w / 2;
    const cy = h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const angle = Math.atan2(py - cy, px - cx);
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  },

  getConnectionPoints: (w, h, density: number = 1) => {
    const points: Point[] = [];
    const circumference = Math.PI * Math.sqrt(2 * ((w/2)**2 + (h/2)**2));
    const numPoints = Math.max(8, Math.round((circumference / 36) * density));
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      points.push({
        x: w / 2 + (w / 2) * Math.cos(angle),
        y: h / 2 + (h / 2) * Math.sin(angle),
      });
    }
    return points;
  },

  render: ({ width, height, data }: ShapeRenderProps) => {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: data.fill,
          border: `${data.strokeWidth || 3}px ${data.dashed ? "dashed" : "solid"} ${data.stroke || "#a78bfa"}`,
          borderRadius: "50%",
        }}
      />
    );
  },
};

export const CircleShape: ShapeDefinition = {
  ...EllipseShape,
  type: "circle",
  name: "Circle",
  aspectRatio: 1,
};

// --- STICKY ---
export const StickyShape: ShapeDefinition = {
  ...RoundedRectangleShape,
  type: "sticky",
  name: "Sticky Note",
  description: "A sticky note",
  render: ({ width, height, data }: ShapeRenderProps) => {
    return (
      <div
        className="absolute inset-0 rounded-[6px]"
        style={{
          background: data.fill,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.35) inset, 0 12px 24px -8px rgba(0,0,0,0.35)",
        }}
      />
    );
  },
};

// --- TEXT ---
export const TextShape: ShapeDefinition = {
  ...RectangleShape,
  type: "text",
  name: "Text",
  description: "Just text without background",
  supportsImage: false,
  supportsGradient: false,
  supportsShadow: false,
  supportsBorderRadius: false,
  render: () => null,
};

// --- UTILITIES ---
function getClosestPointOnSegment(p: Point, v: Point, w: Point): Point {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return { x: v.x, y: v.y };
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
}

export function getClosestPointOnPolygon(p: Point, vertices: Point[]): Point {
  let closest = { x: 0, y: 0 };
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    const pt = getClosestPointOnSegment(p, v1, v2);
    const dist = (p.x - pt.x) ** 2 + (p.y - pt.y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      closest = pt;
    }
  }
  return closest;
}

// Register basic shapes
ShapeRegistry.register(RectangleShape);
ShapeRegistry.register(RoundedRectangleShape);
ShapeRegistry.register(EllipseShape);
ShapeRegistry.register(CircleShape);
ShapeRegistry.register(StickyShape);
ShapeRegistry.register(TextShape);
