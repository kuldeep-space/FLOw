import type { ReactNode } from "react";
import type { ShapeData, ShapeKind } from "../types";

export type ShapeCategory =
  | "Basic"
  | "Flowchart"
  | "UML"
  | "Network"
  | "Mind Map"
  | "AWS"
  | "Custom"
  | "Drawing";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ShapeRenderProps {
  id: string;
  width: number;
  height: number;
  data: ShapeData;
  selected: boolean;
  hovered: boolean;
  isConnectorMode: boolean;
}

/**
 * ShapeDefinition is the foundation of the modular rendering architecture.
 * It strictly separates geometry, rendering, and editor behavior.
 */
export interface ShapeDefinition {
  // Metadata
  type: ShapeKind; // Unique identifier for the registry
  name: string; // Human-readable name
  category: ShapeCategory;
  description: string;

  // Sizing Rules
  defaultSize: { width: number; height: number };
  minimumSize: { width: number; height: number };
  aspectRatio?: number; // If set, forces proportional scaling by default (e.g., 1 for circle)

  // Geometry & Connections
  /** Returns the mathematical bounding box where text can safely render without overlapping borders */
  getTextArea: (width: number, height: number) => BoundingBox;

  /** Given a point (px, py), returns the closest exact point on the shape's perimeter. Crucial for magnetic snapping. */
  getClosestPoint: (
    width: number,
    height: number,
    px: number,
    py: number,
  ) => Point;

  /** Returns the fixed cardinal connection points (usually 4 or 8) for rigid connector routing */
  getConnectionPoints: (width: number, height: number, density?: number) => Point[];

  // Rendering
  /** Renders the visual shape. Must NOT include the wrapper, text, or selection logic, only the shape itself. */
  render: (props: ShapeRenderProps) => ReactNode;

  // Capability Flags (for the Inspector UI)
  supportsText: boolean;
  supportsImage: boolean;
  supportsGradient: boolean;
  supportsShadow: boolean;
  supportsBorderRadius: boolean;
}
