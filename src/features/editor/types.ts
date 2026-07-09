export type ShapeKind =
  | "rectangle"
  | "rounded"
  | "ellipse"
  | "circle"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "pentagon"
  | "star"
  | "cylinder"
  | "parallelogram"
  | "sticky"
  | "text"
  | "image"
  | "draw"
  | "highlighter"
  | "eraser";

export type ConnectorTool = "line" | "arrow" | "orthogonal" | "curved";

export type ShapeData = {
  kind: ShapeKind;
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
  fontSize: number;
  fontWeight: number;
  fontAlign: "left" | "center" | "right";
  opacity: number;
  rotation: number;
  dashed?: boolean;
  locked?: boolean;
  hidden?: boolean;
  // Image-specific
  src?: string;
  brightness?: number;
  contrast?: number;
  blur?: number;
  radius?: number;
  flipH?: boolean;
  flipV?: boolean;
  shadow?: boolean;
  points?: { x: number; y: number; pressure?: number }[]; // For freehand drawing
  [key: string]: unknown;
};

export type EdgeKind =
  "smoothstep" | "step" | "straight" | "simplebezier" | "curved" | "orthogonal";

export interface BendPoint {
  id: string;
  x: number;
  y: number;
}

export interface EdgeExtras {
  arrow?: boolean;
  arrowStart?: boolean;
  dashed?: boolean;
  dotted?: boolean;
  animated?: boolean;
  color?: string;
  width?: number;
  label?: string;
  bendPoints?: BendPoint[];
  [key: string]: unknown;
}
