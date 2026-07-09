import { ShapeRegistry } from "../registry";
import type { ShapeDefinition, ShapeRenderProps, Point } from "../types";
import { getClosestPointOnPolygon, RectangleShape } from "./basic";
import { getFreehandPath } from "../../freehand";

function getCommonSvgAttrs(data: any) {
  return {
    fill: data.fill,
    stroke: data.stroke || "#a78bfa",
    strokeWidth: data.strokeWidth || 3,
    strokeDasharray: data.dashed ? "6 4" : undefined,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export const DiamondShape: ShapeDefinition = {
  type: "diamond",
  name: "Diamond",
  category: "Flowchart",
  description: "A diamond shape for decisions",
  defaultSize: { width: 160, height: 160 },
  minimumSize: { width: 40, height: 40 },
  supportsText: true,
  supportsImage: false,
  supportsGradient: true,
  supportsShadow: true,
  supportsBorderRadius: false,

  getTextArea: (w, h) => {
    // Inscribed rectangle in a diamond is w/2, h/2 centered
    const iw = w / 2;
    const ih = h / 2;
    return {
      x: (w - iw) / 2,
      y: (h - ih) / 2,
      width: iw,
      height: ih,
    };
  },

  getClosestPoint: (w, h, px, py) => {
    const vertices = [
      { x: w / 2, y: 0 },
      { x: w, y: h / 2 },
      { x: w / 2, y: h },
      { x: 0, y: h / 2 },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },

  getConnectionPoints: (w, h) => [
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ],

  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <polygon
          points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`}
          {...getCommonSvgAttrs(data)}
        />
      </svg>
    );
  },
};

// CloudShape removed

export const TriangleShape: ShapeDefinition = {
  type: "triangle",
  name: "Triangle",
  category: "Basic",
  description: "A triangle",
  defaultSize: { width: 160, height: 140 },
  minimumSize: { width: 40, height: 40 },
  supportsText: true,
  supportsImage: false,
  supportsGradient: true,
  supportsShadow: true,
  supportsBorderRadius: false,

  getTextArea: (w, h) => {
    // Bottom heavy inscribed rectangle
    return {
      x: w * 0.25,
      y: h * 0.4,
      width: w * 0.5,
      height: h * 0.5,
    };
  },

  getClosestPoint: (w, h, px, py) => {
    const vertices = [
      { x: w / 2, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },

  getConnectionPoints: (w, h) => [
    { x: w / 2, y: 0 },
    { x: w * 0.75, y: h / 2 },
    { x: w / 2, y: h },
    { x: w * 0.25, y: h / 2 },
  ],

  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <polygon
          points={`${w / 2},1 ${w - 1},${h - 1} 1,${h - 1}`}
          {...getCommonSvgAttrs(data)}
        />
      </svg>
    );
  },
};

export const HexagonShape: ShapeDefinition = {
  type: "hexagon",
  name: "Hexagon",
  category: "Basic",
  description: "A hexagon",
  defaultSize: { width: 160, height: 140 },
  minimumSize: { width: 40, height: 40 },
  supportsText: true,
  supportsImage: false,
  supportsGradient: true,
  supportsShadow: true,
  supportsBorderRadius: false,

  getTextArea: (w, h) => {
    const q = w * 0.2;
    return {
      x: q,
      y: h * 0.1,
      width: w - q * 2,
      height: h * 0.8,
    };
  },

  getClosestPoint: (w, h, px, py) => {
    const q = w * 0.2;
    const vertices = [
      { x: q, y: 0 },
      { x: w - q, y: 0 },
      { x: w, y: h / 2 },
      { x: w - q, y: h },
      { x: q, y: h },
      { x: 0, y: h / 2 },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },

  getConnectionPoints: (w, h) => [
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ],

  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    const q = w * 0.2;
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <polygon
          points={`${q},1 ${w - q},1 ${w - 1},${h / 2} ${w - q},${h - 1} ${q},${h - 1} 1,${h / 2}`}
          {...getCommonSvgAttrs(data)}
        />
      </svg>
    );
  },
};

export const PentagonShape: ShapeDefinition = {
  ...HexagonShape,
  type: "pentagon",
  name: "Pentagon",
  getClosestPoint: (w, h, px, py) => {
    const vertices = [
      { x: w / 2, y: 0 },
      { x: w, y: h * 0.4 },
      { x: w * 0.8, y: h },
      { x: w * 0.2, y: h },
      { x: 0, y: h * 0.4 },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },
  getTextArea: (w, h) => {
    return { x: w * 0.2, y: h * 0.3, width: w * 0.6, height: h * 0.6 };
  },
  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <polygon
          points={`${w / 2},1 ${w - 1},${h * 0.4} ${w * 0.8},${h - 1} ${w * 0.2},${h - 1} 1,${h * 0.4}`}
          {...getCommonSvgAttrs(data)}
        />
      </svg>
    );
  },
};

function getStarPoints(w: number, h: number): { x: number; y: number }[] {
  const vertices = [];
  const ro = 1;
  const ri = 0.38; 
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    vertices.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 10; i++) {
    if (vertices[i].x < minX) minX = vertices[i].x;
    if (vertices[i].x > maxX) maxX = vertices[i].x;
    if (vertices[i].y < minY) minY = vertices[i].y;
    if (vertices[i].y > maxY) maxY = vertices[i].y;
  }

  const xSpan = maxX - minX;
  const ySpan = maxY - minY;

  return vertices.map((v) => ({
    x: ((v.x - minX) / xSpan) * (w - 2) + 1,
    y: ((v.y - minY) / ySpan) * (h - 2) + 1,
  }));
}

export const StarShape: ShapeDefinition = {
  ...HexagonShape,
  type: "star",
  name: "Star",
  getTextArea: (w, h) => {
    return { x: w * 0.3, y: h * 0.3, width: w * 0.4, height: h * 0.4 };
  },
  getClosestPoint: (w, h, px, py) => {
    const vertices = getStarPoints(w, h);
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },
  getConnectionPoints: (w, h) => {
    return getStarPoints(w, h).filter((_, i) => i % 2 === 0);
  },
  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    const pts = getStarPoints(w, h).map((p) => `${p.x},${p.y}`).join(" ");
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <polygon points={pts} {...getCommonSvgAttrs(data)} />
      </svg>
    );
  },
};

export const CylinderShape: ShapeDefinition = {
  ...HexagonShape,
  type: "cylinder",
  name: "Database",
  category: "Flowchart",
  getTextArea: (w, h) => {
    const ry = Math.min(h * 0.12, 18);
    return { x: 10, y: ry * 2, width: w - 20, height: h - ry * 3 };
  },
  getClosestPoint: (w, h, px, py) => {
    const vertices = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },
  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    const ry = Math.min(h * 0.12, 18);
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <g {...getCommonSvgAttrs(data)}>
          <path
            d={`M 1,${ry} C 1,1 ${w - 1},1 ${w - 1},${ry} L ${w - 1},${h - ry} C ${w - 1},${h - 1} 1,${h - 1} 1,${h - ry} Z`}
          />
          <path
            d={`M 1,${ry} C 1,${ry * 2} ${w - 1},${ry * 2} ${w - 1},${ry}`}
            fill="none"
          />
        </g>
      </svg>
    );
  },
};

export const ParallelogramShape: ShapeDefinition = {
  ...HexagonShape,
  type: "parallelogram",
  name: "Parallelogram",
  category: "Flowchart",
  getTextArea: (w, h) => {
    const s = w * 0.15;
    return { x: s, y: 10, width: w - s * 2, height: h - 20 };
  },
  getClosestPoint: (w, h, px, py) => {
    const s = w * 0.15;
    const vertices = [
      { x: s, y: 0 },
      { x: w, y: 0 },
      { x: w - s, y: h },
      { x: 0, y: h },
    ];
    return getClosestPointOnPolygon({ x: px, y: py }, vertices);
  },
  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    const s = w * 0.15;
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <polygon
          points={`${s},1 ${w - 1},1 ${w - s},${h - 1} 1,${h - 1}`}
          {...getCommonSvgAttrs(data)}
        />
      </svg>
    );
  },
};

export const DrawShape: ShapeDefinition = {
  ...RectangleShape,
  type: "draw",
  name: "Draw",
  category: "Drawing",
  description: "A freehand drawing",
  supportsText: false,
  supportsImage: false,
  supportsGradient: false,
  supportsShadow: false,
  supportsBorderRadius: false,
  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    const pts =
      (data.points as { x: number; y: number; pressure?: number }[]) || [];
    if (pts.length === 0) return null;
    const pathData = getFreehandPath(pts, false, data.strokeWidth || 3);
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
      >
        <path d={pathData} fill={data.stroke || "#a78bfa"} />
      </svg>
    );
  },
};

export const HighlighterShape: ShapeDefinition = {
  ...DrawShape,
  type: "highlighter",
  name: "Highlighter",
  render: ({ width: w, height: h, data }: ShapeRenderProps) => {
    const pts =
      (data.points as { x: number; y: number; pressure?: number }[]) || [];
    if (pts.length === 0) return null;
    const pathData = getFreehandPath(pts, true, data.strokeWidth || 3);
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="absolute inset-0 overflow-visible"
        style={{ mixBlendMode: "multiply" }}
      >
        <path d={pathData} fill={data.stroke || "#a78bfa"} />
      </svg>
    );
  },
};

ShapeRegistry.register(DiamondShape);
ShapeRegistry.register(TriangleShape);
ShapeRegistry.register(HexagonShape);
ShapeRegistry.register(PentagonShape);
ShapeRegistry.register(StarShape);
ShapeRegistry.register(CylinderShape);
ShapeRegistry.register(ParallelogramShape);
ShapeRegistry.register(DrawShape);
ShapeRegistry.register(HighlighterShape);
