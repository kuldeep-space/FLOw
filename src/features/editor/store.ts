import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type XYPosition,
} from "@xyflow/react";
import type {
  ConnectorTool,
  EdgeExtras,
  EdgeKind,
  ShapeData,
  ShapeKind,
  DrawSettings,
} from "./types";
export type { ConnectorTool } from "./types";
import { db } from "../../db";

export type ShapeNode = Node<ShapeData, "shape">;
export type AnchorNodeData = Node<Record<string, never>, "anchor">;
export type FlowNode = ShapeNode | AnchorNodeData;
export type FlowEdge = Edge<EdgeExtras>;

interface HistorySnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type Tool = ShapeKind | "select" | "hand" | "pencil" | ConnectorTool;

export const CONNECTOR_TOOLS: ConnectorTool[] = [
  "line",
  "arrow",
  "orthogonal",
  "curved",
];
export const isConnectorTool = (t: Tool): t is ConnectorTool =>
  (CONNECTOR_TOOLS as string[]).includes(t as string);

export const CONNECTOR_TO_EDGE: Record<
  ConnectorTool,
  { kind: EdgeKind; arrow: boolean }
> = {
  line: { kind: "straight", arrow: false },
  arrow: { kind: "straight", arrow: true },
  orthogonal: { kind: "smoothstep", arrow: true },
  curved: { kind: "simplebezier", arrow: false },
};

export type InteractionState = 
  | "IDLE"
  | "SELECTING"
  | "MOVING_CONNECTOR"
  | "EDITING_CONNECTOR"
  | "DRAWING_CONNECTOR"
  | "DRAWING_SHAPE"
  | "PANNING";

interface EditorState {
  interactionState: InteractionState;
  nodes: FlowNode[];
  edges: FlowEdge[];
  activeTool: Tool;
  edgeKind: EdgeKind;
  edgeAnimated: boolean;
  magneticSnap: boolean;
  showGrid: boolean;
  gridSnap: boolean;
  theme: "dark" | "light";
  projectName: string;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  selectedBendPointId: { edgeId: string; pointId: string } | null;
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  zoom: number;
  cursor: XYPosition;
  clipboard: { nodes: FlowNode[]; edges: FlowEdge[] } | null;
  showLayers: boolean;
  showSearch: boolean;
  showInspector: boolean;
  inspectorCollapsed: boolean;
  showLeftToolbar: boolean;
  isConnecting: boolean;
  pendingConnectSource: { nodeId: string; handleId?: string } | null;
  contextMenu: {
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
    bendPointId?: string;
  } | null;
  presenting: boolean;
  lastSavedAt: number | null;
  isDirty: boolean;
  currentProjectId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  snapGridSize: number;
  magneticSnapPoint: { nodeId: string; pointIndex?: number; customPos?: { x: number; y: number; pctX: number; pctY: number } } | null;

  setMagneticSnapPoint: (p: { nodeId: string; pointIndex?: number; customPos?: { x: number; y: number; pctX: number; pctY: number } } | null) => void;
  setIsDragging: (v: boolean) => void;
  setIsResizing: (v: boolean) => void;
  setInteractionState: (state: InteractionState) => void;
  setSnapGridSize: (v: number) => void;

  drawSettings: DrawSettings;
  setDrawSettings: (patch: Partial<DrawSettings>) => void;

  setNodes: (n: FlowNode[]) => void;
  setEdges: (e: FlowEdge[]) => void;
  onNodesChange: (c: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (c: EdgeChange<FlowEdge>[]) => void;
  onConnect: (c: Connection) => void;
  onReconnect: (oldEdge: FlowEdge, newConn: Connection) => void;
  addShape: (
    kind: ShapeKind,
    pos: XYPosition,
    extra?: Partial<ShapeData>,
  ) => string;
  addImage: (src: string, pos: XYPosition, w: number, h: number) => string;
  updateShape: (id: string, patch: Partial<ShapeData>) => void;
  updateEdge: (id: string, patch: Partial<FlowEdge>) => void;
  updateEdgeExtras: (id: string, patch: Partial<EdgeExtras>) => void;
  addBendPoint: (
    edgeId: string,
    point: { id?: string; x: number; y: number },
    index?: number,
  ) => void;
  updateBendPoint: (
    edgeId: string,
    pointId: string,
    point: { x: number; y: number },
  ) => void;
  removeBendPoint: (edgeId: string, pointId: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  paste: (offset?: XYPosition) => void;
  selectAll: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  cleanupOrphanAnchors: () => void;
  alignNodes: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  distributeNodes: (axis: "horizontal" | "vertical") => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  reorderNode: (from: number, to: number) => void;
  setActiveTool: (t: Tool) => void;
  setEdgeKind: (k: EdgeKind) => void;
  setEdgeAnimated: (v: boolean) => void;
  setMagneticSnap: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setGridSnap: (v: boolean) => void;
  toggleTheme: () => void;
  setProjectName: (n: string) => void;
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  setZoom: (z: number) => void;
  setCursor: (p: XYPosition) => void;
  setSelectedBendPointId: (
    p: { edgeId: string; pointId: string } | null,
  ) => void;
  setShowLayers: (v: boolean) => void;
  setShowSearch: (v: boolean) => void;
  setShowInspector: (v: boolean) => void;
  toggleInspector: () => void;
  setInspectorCollapsed: (v: boolean) => void;
  setShowLeftToolbar: (v: boolean) => void;
  toggleLeftToolbar: () => void;
  setIsConnecting: (v: boolean) => void;
  setPendingConnectSource: (
    v: { nodeId: string; handleId?: string } | null,
  ) => void;
  connectFromTo: (
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string,
  ) => void;
  openContextMenu: (e: {
    x: number;
    y: number;
    nodeId?: string;
    edgeId?: string;
    bendPointId?: string;
  }) => void;
  closeContextMenu: () => void;
  setPresenting: (v: boolean) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  loadSnapshot: (snap: HistorySnapshot & { projectName?: string }) => void;
  markSaved: () => void;
  loadProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;
}

const labelFor = (kind: ShapeKind): string => {
  const map: Record<ShapeKind, string> = {
    rectangle: "Rectangle",
    rounded: "Process",
    ellipse: "Ellipse",
    circle: "Start",
    diamond: "Decision",
    triangle: "Triangle",
    hexagon: "Preparation",
    pentagon: "Pentagon",
    star: "Star",
    cylinder: "Database",
    parallelogram: "Input",
    sticky: "Note",
    text: "Text",
    image: "",
    draw: "Freehand",
    highlighter: "Highlighter",
    eraser: "Eraser",
    pencil: "Pencil",
    cloud: "Cloud",
  };
  return map[kind];
};

export const defaultsFor = (kind: ShapeKind): ShapeData => {
  const colors = [
    "purple",
    "blue",
    "cyan",
    "emerald",
    "amber",
    "rose",
    "pink",
    "zinc",
    "stone",
    "red",
    "orange",
    "lime",
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const isTransparent =
    kind === "text" ||
    kind === "image" ||
    kind === "draw" ||
    kind === "pencil" ||
    kind === "highlighter" ||
    kind === "eraser";

  const base: ShapeData = {
    kind,
    label: "",
    fill: isTransparent ? "transparent" : `var(--shape-fill-${randomColor})`,
    stroke: isTransparent ? "transparent" : `var(--shape-stroke-${randomColor})`,
    strokeWidth: 1.5,
    textColor: "var(--foreground)",
    fontSize: 14,
    fontWeight: 500,
    fontAlign: "center",
    opacity: 1,
    rotation: 0,
  };
  if (kind === "sticky")
    return {
      ...base,
      fill: "var(--shape-fill-amber)",
      textColor: "#1c1917",
      stroke: "var(--shape-stroke-amber)",
      label: "",
    };
  if (kind === "text")
    return {
      ...base,
      fill: "transparent",
      stroke: "transparent",
      label: "",
      fontSize: 20,
      fontWeight: 600,
      fontAlign: "left",
    };
  if (kind === "image")
    return {
      ...base,
      fill: "transparent",
      stroke: "transparent",
      label: "",
      src: "",
    };
  if (kind === "highlighter")
    return {
      ...base,
      fill: "transparent",
      stroke: "#facc15",
      strokeWidth: 24,
      opacity: 0.6,
      label: "",
      points: [],
    };
  if (kind === "draw")
    return {
      ...base,
      fill: "transparent",
      stroke: `var(--shape-stroke-${randomColor})`,
      strokeWidth: 3,
      label: "",
      points: [],
    };
  return base;
};

const sizeFor = (kind: ShapeKind) => {
  switch (kind) {
    case "circle":
      return { width: 120, height: 120 };
    case "sticky":
      return { width: 180, height: 180 };
    case "text":
      return { width: 160, height: 40 };
    case "cylinder":
      return { width: 160, height: 120 };
    default:
      return { width: 180, height: 100 };
  }
};

let idCounter = 1;
const nid = (prefix = "n") =>
  `${prefix}${Date.now().toString(36)}${(idCounter++).toString(36)}`;

const snapshot = (s: EditorState): HistorySnapshot => ({
  nodes: JSON.parse(JSON.stringify(s.nodes)),
  edges: JSON.parse(JSON.stringify(s.edges)),
});

export const applyEdgeStyle = (edge: FlowEdge): FlowEdge => {
  const extras = edge.data ?? {};
  const color = extras.color ?? "#a78bfa";
  const width = extras.width ?? 1;
  const dashed = extras.dashed;
  const dotted = extras.dotted;
  return {
    ...edge,
    zIndex: 100,
    animated: !!extras.animated,
    label: extras.label,
    labelStyle: extras.label
      ? { fill: "#e4e4e7", fontSize: 11, fontWeight: 500 }
      : undefined,
    labelBgStyle: extras.label ? { fill: "#1f1f24", opacity: 0.9 } : undefined,
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 6,
    style: {
      stroke: color,
      strokeWidth: width,
      strokeDasharray: dashed ? "6 4" : dotted ? "1 4" : undefined,
    },
    markerEnd:
      extras.arrow !== false
        ? { type: MarkerType.ArrowClosed, color, width: 24, height: 24 }
        : undefined,
    markerStart: extras.arrowStart
      ? { type: MarkerType.ArrowClosed, color, width: 24, height: 24 }
      : undefined,
  };
};

export const useEditor = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  activeTool: "select",
  edgeKind: "smoothstep",
  edgeAnimated: false,
  magneticSnap: false,
  showGrid: true,
  gridSnap: false,
  theme: "dark",
  projectName: "Untitled diagram",
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectedBendPointId: null,
  past: [],
  future: [],
  zoom: 1,
  cursor: { x: 0, y: 0 },
  clipboard: null,
  showLayers: false,
  showSearch: false,
  showInspector: true,
  inspectorCollapsed: false,
  showLeftToolbar: true,
  isConnecting: false,
  pendingConnectSource: null,
  contextMenu: null,
  presenting: false,
  lastSavedAt: null,
  isDirty: false,
  currentProjectId: null,
  interactionState: "IDLE",
  isDragging: false,
  isResizing: false,
  snapGridSize: 15,
  magneticSnapPoint: null,

  setMagneticSnapPoint: (p) => set({ magneticSnapPoint: p }),
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as FlowNode[],
      isDirty: s.isDirty || changes.some((c) => c.type !== "select"),
    })),
  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges) as FlowEdge[],
      isDirty: s.isDirty || changes.some((c) => c.type !== "select"),
    })),

  onConnect: (conn) => {
    get().pushHistory();
    set((s) => {
      let arrow = true;
      let type = s.edgeKind;

      if (isConnectorTool(s.activeTool)) {
        const toolInfo = CONNECTOR_TO_EDGE[s.activeTool as ConnectorTool];
        if (toolInfo) {
          arrow = toolInfo.arrow;
          type = toolInfo.kind;
        }
      }

      let initialBendPoints: { id: string; x: number; y: number }[] = [];

      const base: FlowEdge = {
        id: nid("e"),
        source: conn.source!,
        target: conn.target!,
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
        type,
        data: { arrow, color: "#a78bfa", width: 1, animated: s.edgeAnimated, bendPoints: initialBendPoints },
      };
      return { edges: [...s.edges, applyEdgeStyle(base)], isDirty: true };
    });
  },

  onReconnect: (oldEdge, newConn) => {
    get().pushHistory();
    set((s) => ({
      edges: reconnectEdge(oldEdge, newConn, s.edges) as FlowEdge[],
      isDirty: true,
    }));
  },

  addShape: (kind, pos, extra) => {
    get().pushHistory();
    const id = nid();
    const size = sizeFor(kind);
    
    let drawExtra = {};
    if (kind === "draw" || kind === "pencil" || kind === "highlighter") {
      const ds = get().drawSettings;
      drawExtra = {
        stroke: ds.color,
        strokeWidth: ds.thickness,
        opacity: ds.opacity,
        glowIntensity: ds.glowIntensity,
        glowRadius: ds.glowRadius,
        dashed: ds.dashed,
        lineCap: ds.lineCap,
        lineJoin: ds.lineJoin,
      };
    }
    
    const node: ShapeNode = {
      id,
      type: "shape",
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      data: { ...defaultsFor(kind), ...drawExtra, ...extra },
      width: size.width,
      height: size.height,
      selected: true,
    };
    set((s) => ({
      nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), node],
      selectedNodeIds: [id],
      isDirty: true,
    }));
    return id;
  },

  addImage: (src, pos, w, h) => {
    get().pushHistory();
    const id = nid("img");
    const node: ShapeNode = {
      id,
      type: "shape",
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
      data: { ...defaultsFor("image"), src },
      width: w,
      height: h,
      selected: true,
    };
    set((s) => ({
      nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), node],
      selectedNodeIds: [id],
      isDirty: true,
    }));
    return id;
  },

  updateShape: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? n.type === "shape"
            ? { ...n, data: { ...n.data, ...patch } as ShapeData }
            : n
          : n,
      ),
      isDirty: true,
    })),

  updateEdge: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id ? applyEdgeStyle({ ...e, ...patch }) : e,
      ),
      isDirty: true,
    })),

  updateEdgeExtras: (id, patch) =>
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === id
          ? applyEdgeStyle({ ...e, data: { ...(e.data ?? {}), ...patch } })
          : e,
      ),
      isDirty: true,
    })),

  addBendPoint: (edgeId, point, index) =>
    set((s) => {
      const edge = s.edges.find((e) => e.id === edgeId);
      if (!edge) return {};

      const bendPoints = [...((edge.data?.bendPoints as any[]) || [])];
      const newPoint = {
        id:
          point.id ||
          `bp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        x: point.x,
        y: point.y,
      };

      if (
        typeof index === "number" &&
        index >= 0 &&
        index <= bendPoints.length
      ) {
        bendPoints.splice(index, 0, newPoint);
      } else {
        bendPoints.push(newPoint);
      }

      return {
        edges: s.edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, bendPoints } } : e,
        ),
        selectedBendPointId: { edgeId, pointId: newPoint.id },
        isDirty: true,
      };
    }),

  updateBendPoint: (edgeId, pointId, point) =>
    set((s) => ({
      edges: s.edges.map((e) => {
        if (e.id !== edgeId) return e;
        const bendPoints = ((e.data?.bendPoints as any[]) || []).map((bp) =>
          bp.id === pointId ? { ...bp, ...point } : bp,
        );
        return { ...e, data: { ...e.data, bendPoints } };
      }),
      isDirty: true,
    })),

  removeBendPoint: (edgeId, pointId) =>
    set((s) => ({
      edges: s.edges.map((e) => {
        if (e.id !== edgeId) return e;
        const bendPoints = ((e.data?.bendPoints as any[]) || []).filter(
          (bp) => bp.id !== pointId,
        );
        return { ...e, data: { ...e.data, bendPoints } };
      }),
      selectedBendPointId:
        s.selectedBendPointId?.pointId === pointId
          ? null
          : s.selectedBendPointId,
      isDirty: true,
    })),

  deleteSelected: () => {
    const { selectedNodeIds, selectedEdgeIds, selectedBendPointId } = get();

    if (selectedBendPointId) {
      get().pushHistory();
      get().removeBendPoint(
        selectedBendPointId.edgeId,
        selectedBendPointId.pointId,
      );
      return;
    }

    if (!selectedNodeIds.length && !selectedEdgeIds.length) return;
    get().pushHistory();
    set((s) => {
      const nextEdges = s.edges.filter(
        (e) =>
          !selectedEdgeIds.includes(e.id) &&
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target)
      );

      const nextNodes = s.nodes.filter((n) => {
        if (selectedNodeIds.includes(n.id)) return false;
        if (n.type === "anchor") {
          return nextEdges.some((e) => e.source === n.id || e.target === n.id);
        }
        return true;
      });

      return {
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        isDirty: true,
      };
    });
    get().cleanupOrphanAnchors();
  },

  duplicateSelected: () => {
    const { nodes, selectedNodeIds } = get();
    if (!selectedNodeIds.length) return;
    get().pushHistory();
    const newOnes: FlowNode[] = nodes
      .filter((n) => selectedNodeIds.includes(n.id))
      .map((n) => ({
        ...n,
        id: nid(),
        position: { x: n.position.x + 32, y: n.position.y + 32 },
        selected: true,
      }));
    set((s) => ({
      nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...newOnes],
      selectedNodeIds: newOnes.map((n) => n.id),
      isDirty: true,
    }));
  },

  copySelected: () => {
    const { nodes, edges, selectedNodeIds, selectedEdgeIds } = get();
    if (!selectedNodeIds.length && !selectedEdgeIds.length) return;
    const set2 = new Set(selectedNodeIds);
    const copiedEdges = edges.filter(
      (e) =>
        selectedEdgeIds.includes(e.id) ||
        (set2.has(e.source) && set2.has(e.target)),
    );
    // Include any anchor nodes that belong to the copied edges
    const anchorIdsToCopy = new Set<string>();
    copiedEdges.forEach((e) => {
      const srcNode = nodes.find((n) => n.id === e.source);
      if (srcNode?.type === "anchor") anchorIdsToCopy.add(e.source);
      const tgtNode = nodes.find((n) => n.id === e.target);
      if (tgtNode?.type === "anchor") anchorIdsToCopy.add(e.target);
    });

    const copiedNodes = nodes.filter(
      (n) => set2.has(n.id) || anchorIdsToCopy.has(n.id),
    );
    set({
      clipboard: {
        nodes: JSON.parse(JSON.stringify(copiedNodes)),
        edges: JSON.parse(JSON.stringify(copiedEdges)),
      },
    });
  },

  paste: (offset = { x: 40, y: 40 }) => {
    const { clipboard } = get();
    if (!clipboard || !clipboard.nodes.length) return;
    get().pushHistory();
    const idMap = new Map<string, string>();
    const newNodes: FlowNode[] = clipboard.nodes.map((n) => {
      const id = nid();
      idMap.set(n.id, id);
      return {
        ...n,
        id,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
        selected: true,
      };
    });
    const newEdges: FlowEdge[] = clipboard.edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({
        ...e,
        id: nid("e"),
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
      }));
    set((s) => ({
      nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
      edges: [...s.edges, ...newEdges],
      selectedNodeIds: newNodes.map((n) => n.id),
      isDirty: true,
    }));
  },

  selectAll: () =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.type === "anchor" ? n : { ...n, selected: true },
      ),
      edges: s.edges.map((e) => ({ ...e, selected: true })),
      selectedNodeIds: s.nodes
        .filter((n) => n.type !== "anchor")
        .map((n) => n.id),
      selectedEdgeIds: s.edges.map((e) => e.id),
    })),

  bringToFront: () => {
    const { selectedNodeIds } = get();
    if (!selectedNodeIds.length) return;
    get().pushHistory();
    set((s) => {
      const sel = s.nodes.filter((n) => selectedNodeIds.includes(n.id));
      const rest = s.nodes.filter((n) => !selectedNodeIds.includes(n.id));
      return { nodes: [...rest, ...sel], isDirty: true };
    });
  },

  sendToBack: () => {
    const { selectedNodeIds } = get();
    if (!selectedNodeIds.length) return;
    get().pushHistory();
    set((s) => {
      const sel = s.nodes.filter((n) => selectedNodeIds.includes(n.id));
      const rest = s.nodes.filter((n) => !selectedNodeIds.includes(n.id));
      return { nodes: [...sel, ...rest], isDirty: true };
    });
  },

  cleanupOrphanAnchors: () =>
    set((s) => {
      // Find all anchors that are NOT referenced by any edge's source or target
      const referencedAnchorIds = new Set<string>();
      s.edges.forEach((e) => {
        referencedAnchorIds.add(e.source);
        referencedAnchorIds.add(e.target);
      });
      const nextNodes = s.nodes.filter(
        (n) => n.type !== "anchor" || referencedAnchorIds.has(n.id)
      );
      if (nextNodes.length === s.nodes.length) return {};
      return { nodes: nextNodes, isDirty: true };
    }),

  alignNodes: (alignment) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length < 2) return;
    get().pushHistory();
    set((s) => {
      const sel = s.nodes.filter(
        (n) => selectedNodeIds.includes(n.id) && n.type === "shape",
      );
      if (sel.length < 2) return s;

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      sel.forEach((n) => {
        const w = n.measured?.width || (n.data as any).width || 180;
        const h = n.measured?.height || (n.data as any).height || 100;
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + w);
        maxY = Math.max(maxY, n.position.y + h);
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const newNodes = s.nodes.map((n) => {
        if (!selectedNodeIds.includes(n.id) || n.type !== "shape") return n;
        const w = n.measured?.width || (n.data as any).width || 180;
        const h = n.measured?.height || (n.data as any).height || 100;
        let x = n.position.x;
        let y = n.position.y;

        switch (alignment) {
          case "left":
            x = minX;
            break;
          case "right":
            x = maxX - w;
            break;
          case "center":
            x = centerX - w / 2;
            break;
          case "top":
            y = minY;
            break;
          case "bottom":
            y = maxY - h;
            break;
          case "middle":
            y = centerY - h / 2;
            break;
        }
        return { ...n, position: { x, y } };
      });
      return { nodes: newNodes, isDirty: true };
    });
  },

  distributeNodes: (axis) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length < 3) return; // Distribute needs at least 3
    get().pushHistory();
    set((s) => {
      const sel = s.nodes.filter(
        (n) => selectedNodeIds.includes(n.id) && n.type === "shape",
      );
      if (sel.length < 3) return s;

      // Sort by chosen axis
      const sorted = [...sel].sort((a, b) =>
        axis === "horizontal"
          ? a.position.x - b.position.x
          : a.position.y - b.position.y,
      );

      let minP = Infinity,
        maxP = -Infinity,
        totalSize = 0;
      sorted.forEach((n) => {
        const w = n.measured?.width || (n.data as any).width || 180;
        const h = n.measured?.height || (n.data as any).height || 100;
        if (axis === "horizontal") {
          minP = Math.min(minP, n.position.x);
          maxP = Math.max(maxP, n.position.x + w);
          totalSize += w;
        } else {
          minP = Math.min(minP, n.position.y);
          maxP = Math.max(maxP, n.position.y + h);
          totalSize += h;
        }
      });

      const totalGap = maxP - minP - totalSize;
      const gap = totalGap / (sorted.length - 1);

      let currentPos = minP;
      const posMap = new Map<string, number>();
      sorted.forEach((n) => {
        posMap.set(n.id, currentPos);
        const size =
          axis === "horizontal"
            ? n.measured?.width || (n.data as any).width || 180
            : n.measured?.height || (n.data as any).height || 100;
        currentPos += size + gap;
      });

      const newNodes = s.nodes.map((n) => {
        if (!posMap.has(n.id)) return n;
        const p = posMap.get(n.id)!;
        return {
          ...n,
          position:
            axis === "horizontal"
              ? { x: p, y: n.position.y }
              : { x: n.position.x, y: p },
        };
      });

      return { nodes: newNodes, isDirty: true };
    });
  },

  toggleLock: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? n.type === "shape"
            ? {
              ...n,
              draggable: n.data.locked ? true : false,
              data: { ...n.data, locked: !n.data.locked } as ShapeData,
            }
            : n
          : n,
      ),
      isDirty: true,
    })),

  toggleHidden: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? n.type === "shape"
            ? {
              ...n,
              hidden: !n.data.hidden,
              data: { ...n.data, hidden: !n.data.hidden } as ShapeData,
            }
            : n
          : n,
      ),
      isDirty: true,
    })),

  reorderNode: (from, to) =>
    set((s) => {
      const arr = [...s.nodes];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { nodes: arr, isDirty: true };
    }),

  setActiveTool: (activeTool) => {
    if (isConnectorTool(activeTool)) {
      const cfg = CONNECTOR_TO_EDGE[activeTool];
      set({ activeTool, edgeKind: cfg.kind, pendingConnectSource: null });
      // Also update selected edges to this type
      const { selectedEdgeIds } = get();
      if (selectedEdgeIds.length) {
        set((s) => ({
          edges: s.edges.map((e) =>
            selectedEdgeIds.includes(e.id)
              ? applyEdgeStyle({
                ...e,
                type: cfg.kind,
                data: { ...(e.data ?? {}), arrow: cfg.arrow },
              })
              : e,
          ),
          isDirty: true,
        }));
      }
    } else {
      const keepSelection = ["select", "grab", "laser"].includes(activeTool);
      set((s) => ({ 
        activeTool, 
        pendingConnectSource: null,
        ...(keepSelection ? {} : { selectedNodeIds: [], selectedEdgeIds: [] })
      }));
    }
  },
  setEdgeKind: (edgeKind) => {
    set({ edgeKind });
    const { selectedEdgeIds } = get();
    if (selectedEdgeIds.length) {
      set((s) => ({
        edges: s.edges.map((e) =>
          selectedEdgeIds.includes(e.id)
            ? applyEdgeStyle({ ...e, type: edgeKind })
            : e,
        ),
        isDirty: true,
      }));
    }
  },
  setEdgeAnimated: (edgeAnimated) => set({ edgeAnimated }),
  setMagneticSnap: (magneticSnap) => set({ magneticSnap }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setGridSnap: (gridSnap) => set({ gridSnap }),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("light", theme === "light");
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
      return { theme };
    }),
  setProjectName: (projectName) => set({ projectName, isDirty: true }),
  setSelectedNodes: (selectedNodeIds) =>
    set({ selectedNodeIds, selectedBendPointId: null }),
  setSelectedEdges: (selectedEdgeIds) =>
    set({ selectedEdgeIds, selectedBendPointId: null }),
  setSelectedBendPointId: (selectedBendPointId) => set({ selectedBendPointId }),
  setZoom: (zoom) => set({ zoom }),
  setCursor: (cursor) => set({ cursor }),
  setShowLayers: (showLayers) => set({ showLayers }),
  setShowSearch: (showSearch) => set({ showSearch }),
  setShowInspector: (showInspector) => set({ showInspector }),
  toggleInspector: () => set((s) => ({ showInspector: !s.showInspector })),
  setInspectorCollapsed: (inspectorCollapsed) => set({ inspectorCollapsed }),
  setShowLeftToolbar: (showLeftToolbar) => set({ showLeftToolbar }),
  toggleLeftToolbar: () =>
    set((s) => ({ showLeftToolbar: !s.showLeftToolbar })),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setPendingConnectSource: (pendingConnectSource) =>
    set({ pendingConnectSource }),
  setIsDragging: (v) => set({ isDragging: v }),
  setIsResizing: (v) => set({ isResizing: v }),
  setInteractionState: (v) => set({ interactionState: v }),
  setSnapGridSize: (v) => set({ snapGridSize: v }),

  setDrawSettings: (patch) => set((s) => ({
    drawSettings: { ...s.drawSettings, ...patch }
  })),

  connectFromTo: (source, target, sourceHandle, targetHandle) => {
    if (source === target) return;
    get().onConnect({
      source,
      target,
      sourceHandle: sourceHandle ?? "r-50-s",
      targetHandle: targetHandle ?? "l-50-t",
    });
  },
  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
  setPresenting: (presenting) => set({ presenting }),

  drawSettings: {
    color: "#000000",
    thickness: 4,
    opacity: 1,
    glowIntensity: 0,
    glowRadius: 10,
    glowOpacity: 1.0,
    dashed: false,
    lineCap: "round",
    lineJoin: "round",
  },

  pushHistory: () =>
    set((s) => ({ past: [...s.past.slice(-49), snapshot(s)], future: [] })),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      return {
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, 50),
        nodes: prev.nodes,
        edges: prev.edges,
        isDirty: true,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return {};
      return {
        past: [...s.past, snapshot(s)].slice(-50),
        future: s.future.slice(1),
        nodes: next.nodes,
        edges: next.edges,
        isDirty: true,
      };
    }),

  clear: () => {
    if (!get().nodes.length && !get().edges.length) return;
    get().pushHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      isDirty: true,
    });
  },

  loadSnapshot: (snap) => {
    set({
      nodes: snap.nodes.map((n) => ({ ...n, selected: false })),
      edges: (snap.edges as FlowEdge[]).map((e) => applyEdgeStyle(e)),
      selectedNodeIds: [],
      selectedEdgeIds: [],
      past: [],
      future: [],
      projectName: snap.projectName ?? "Untitled diagram",
      isDirty: false,
      lastSavedAt: Date.now(),
    });
  },

  markSaved: () => set({ isDirty: false, lastSavedAt: Date.now() }),

  loadProject: async (id: string) => {
    const project = await db.projects.get(id);
    if (project) {
      set({
        nodes: project.data.nodes,
        edges: project.data.edges,
        projectName: project.name,
        currentProjectId: id,
        zoom: project.data.zoom ?? 1,
        cursor: project.data.cursor ?? { x: 0, y: 0 },
        past: [],
        future: [],
        isDirty: false,
        lastSavedAt: project.lastModified,
      });
    }
  },


  saveProject: async () => {
    const s = get();
    if (!s.currentProjectId) return;
    const saveNodes = s.nodes.filter((n) => n.type !== "anchor") as ShapeNode[];
    await db.projects.update(s.currentProjectId, {
      name: s.projectName,
      lastModified: Date.now(),
      objectCount: saveNodes.length + s.edges.length,
      data: {
        nodes: saveNodes,
        edges: s.edges,
        zoom: s.zoom,
        cursor: s.cursor,
      },
    });
    set({ isDirty: false, lastSavedAt: Date.now() });
  },
}));

