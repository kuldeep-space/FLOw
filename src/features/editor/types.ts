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
  | "pencil"
  | "highlighter"
  | "eraser"
  | "cloud";

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
  // Pencil/Drawing specific
  glowIntensity?: number;
  glowRadius?: number;
  lineCap?: "round" | "square" | "butt";
  lineJoin?: "round" | "bevel" | "miter";
  [key: string]: unknown;
};

export type EdgeKind =
  "smoothstep" | "step" | "straight" | "simplebezier" | "curved" | "orthogonal" | "bezier";

export interface PathPoint {
  id: string;
  x: number;
  y: number;
  type?: "corner" | "smooth" | "symmetric";
  inHandle?: { dx: number; dy: number };
  outHandle?: { dx: number; dy: number };
  locked?: boolean;
}

export interface ConnectorLabel {
  id: string;
  text: string;
  t: number;
  offset: { x: number; y: number };
  rotation: number;
}

export interface EdgeExtras {
  arrow?: boolean;
  arrowStart?: boolean;
  dashed?: boolean;
  dotted?: boolean;
  animated?: boolean;
  color?: string;
  width?: number;
  label?: string; // Legacy label
  labels?: ConnectorLabel[];
  points?: PathPoint[];
  version?: number;
  glowIntensity?: number;
  glowRadius?: number;
  glowOpacity?: number;
  
  // Legacy support during migration
  bendPoints?: { id: string; x: number; y: number }[];
  controlPoints?: { x: number; y: number }[];
  
  [key: string]: unknown;
}

export interface DrawSettings {
  color: string;
  thickness: number;
  opacity: number;
  glowIntensity: number;
  glowRadius: number;
  glowOpacity: number;
  dashed: boolean;
  lineCap: "round" | "square" | "butt";
  lineJoin: "round" | "bevel" | "miter";
}
