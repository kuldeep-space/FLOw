import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type NodeTypes,
  type Connection,
  type ReactFlowInstance,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type XYPosition,
  type ConnectionLineComponentProps,
  getStraightPath,
  getSmoothStepPath,
  getBezierPath,
  useStore,
} from "@xyflow/react";
import { getFreehandPath } from "./freehand";
import { useEditor, isConnectorTool, type FlowEdge, applyEdgeStyle, CONNECTOR_TO_EDGE, type ConnectorTool } from "./store";
import { ShapeNode } from "@/nodes/ShapeNode";
import { InfiniteCanvasGrid } from "./InfiniteCanvasGrid";
import { AnchorNode } from "@/nodes/AnchorNode";
import { SmartEdge } from "@/edges/SmartEdge";
import { importImageFile, importJSONFile } from "./exportImport";
import { ShortcutHelper } from "./ShortcutHelper";

const nodeTypes: NodeTypes = { shape: ShapeNode, anchor: AnchorNode };
const edgeTypes = {
  straight: SmartEdge,
  smoothstep: SmartEdge,
  simplebezier: SmartEdge,
  default: SmartEdge,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rfInstance: any = null;
export const getFlowInstance = () => rfInstance as ReactFlowInstance | null;

const cursorFor = (
  tool: string,
  spaceDown: boolean,
  pendingConnect: boolean,
) => {
  if (spaceDown) return "grab";
  if (tool === "hand") return "grab";
  if (tool === "select") return "default";
  if (tool === "text") return "text";
  if (tool === "pencil") return "crosshair";
  if (isConnectorTool(tool as never))
    return pendingConnect ? "crosshair" : "crosshair";
  return "crosshair";
};

function CanvasInner() {
  const [activeDrawStroke, setActiveDrawStroke] = useState<
    { x: number; y: number; pressure?: number }[] | null
  >(null);
  const [draftShapeId, setDraftShapeId] = useState<string | null>(null);
  const [draftShapeStart, setDraftShapeStart] = useState<XYPosition | null>(
    null,
  );
  const [draftConnector, setDraftConnector] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();

  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const activeTool = useEditor((s) => s.activeTool);
  const showGrid = useEditor((s) => s.showGrid);
  const gridSnap = useEditor((s) => s.gridSnap);
  const magneticSnap = useEditor((s) => s.magneticSnap);
  const edgeKind = useEditor((s) => s.edgeKind);
  const edgeAnimated = useEditor((s) => s.edgeAnimated);
  const presenting = useEditor((s) => s.presenting);
  const pendingConnect = useEditor((s) => s.pendingConnectSource);
  const snapGridSize = useEditor((s) => s.snapGridSize);

  const onNodesChange = useEditor((s) => s.onNodesChange);
  const onEdgesChange = useEditor((s) => s.onEdgesChange);
  const onConnect = useEditor((s) => s.onConnect);
  const onReconnect = useEditor((s) => s.onReconnect);
  const addShape = useEditor((s) => s.addShape);
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const setSelectedNodes = useEditor((s) => s.setSelectedNodes);
  const setSelectedEdges = useEditor((s) => s.setSelectedEdges);
  const setZoom = useEditor((s) => s.setZoom);
  const setCursor = useEditor((s) => s.setCursor);
  const setPendingConnectSource = useEditor((s) => s.setPendingConnectSource);
  const connectFromTo = useEditor((s) => s.connectFromTo);
  const openContextMenu = useEditor((s) => s.openContextMenu);
  const closeContextMenu = useEditor((s) => s.closeContextMenu);

  const [spaceDown, setSpaceDown] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    return () => {
      rfInstance = null;
    };
  }, []);

  // Temporary hand tool with Space
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          (e.target as HTMLElement)?.isContentEditable
        )
          return;
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const isShapeTool = useMemo(
    () =>
      !["select", "hand", "draw", "highlighter", "pencil", "image"].includes(
        activeTool,
      ) && !isConnectorTool(activeTool as never),
    [activeTool],
  );

  const isConnector = isConnectorTool(activeTool as never);

  const onPaneClick = useCallback(
    (evt: React.MouseEvent) => {
      closeContextMenu();
      if (isConnector) {
        setPendingConnectSource(null);
      }
    },
    [isConnector, setPendingConnectSource, closeContextMenu],
  );

  const eraseAtPosition = useCallback((pos: XYPosition) => {
    useEditor.setState((s) => {
      let changed = false;
      const nodesToKeep = s.nodes.filter((n) => {
        if (n.type === "anchor") return true;
        const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
        const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
        const inside =
          pos.x >= n.position.x &&
          pos.x <= n.position.x + nw &&
          pos.y >= n.position.y &&
          pos.y <= n.position.y + nh;
        if (inside) changed = true;
        return !inside;
      });

      const keptNodeIds = new Set(nodesToKeep.map((n) => n.id));

      const edgesToKeep = s.edges.filter((e) => {
        if (!keptNodeIds.has(e.source) || !keptNodeIds.has(e.target)) {
          changed = true;
          return false;
        }

        const srcNode = s.nodes.find((n) => n.id === e.source);
        const tgtNode = s.nodes.find((n) => n.id === e.target);
        if (srcNode && tgtNode) {
          const sw = srcNode.measured?.width ?? (srcNode.data as any)?.width ?? 180;
          const sh = srcNode.measured?.height ?? (srcNode.data as any)?.height ?? 100;
          const tw = tgtNode.measured?.width ?? (tgtNode.data as any)?.width ?? 180;
          const th = tgtNode.measured?.height ?? (tgtNode.data as any)?.height ?? 100;

          const sp = { x: srcNode.position.x + sw / 2, y: srcNode.position.y + sh / 2 };
          const tp = { x: tgtNode.position.x + tw / 2, y: tgtNode.position.y + th / 2 };
          
          const bendPoints = (e.data?.bendPoints as { x: number; y: number }[]) || [];
          const points = [sp, ...bendPoints, tp];

          for (let i = 0; i < points.length - 1; i++) {
            const dist = getPointToSegmentDistance(pos, points[i], points[i + 1]);
            if (dist < 16) {
              changed = true;
              return false;
            }
          }
        }
        return true;
      });

      if (!changed) return {};
      return {
        nodes: nodesToKeep,
        edges: edgesToKeep,
        isDirty: true,
      };
    });
  }, []);

  const onNodeClick = useCallback(
    (_evt: React.MouseEvent, node: Node) => {
      if (activeTool === "eraser") {
        useEditor.getState().pushHistory();
        useEditor.setState((s) => ({
          nodes: s.nodes.filter((n) => n.id !== node.id),
          edges: s.edges.filter(
            (e) => e.source !== node.id && e.target !== node.id,
          ),
          isDirty: true,
        }));
        return;
      }
      if (!isConnector) return;
      if (!pendingConnect) {
        setPendingConnectSource({ nodeId: node.id });
      } else {
        connectFromTo(pendingConnect.nodeId, node.id, pendingConnect.handleId);
        setPendingConnectSource(null);
      }
    },
    [
      isConnector,
      activeTool,
      pendingConnect,
      setPendingConnectSource,
      connectFromTo,
    ],
  );

  const onEdgeClick = useCallback(
    (_evt: React.MouseEvent, edge: Edge) => {
      if (activeTool === "eraser") {
        useEditor.getState().pushHistory();
        useEditor.setState((s) => ({
          edges: s.edges.filter((e) => e.id !== edge.id),
          isDirty: true,
        }));
      }
    },
    [activeTool],
  );

  const onReconnectHandler = useCallback(
    (oldEdge: FlowEdge, newConn: Connection) => onReconnect(oldEdge, newConn),
    [onReconnect],
  );

  const onDrop = useCallback(
    async (evt: React.DragEvent) => {
      evt.preventDefault();
      const files = Array.from(evt.dataTransfer.files);
      if (!files.length) return;
      const pos = rf.screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          await importImageFile(file, pos);
        } else if (
          file.name.endsWith(".json") ||
          file.type === "application/json"
        ) {
          await importJSONFile(file);
        }
      }
    },
    [rf],
  );

  const onDragOver = useCallback((evt: React.DragEvent) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  }, []);

  const onContextMenu = useCallback(
    (evt: React.MouseEvent, target?: { nodeId?: string; edgeId?: string }) => {
      evt.preventDefault();
      openContextMenu({ x: evt.clientX, y: evt.clientY, ...target });
    },
    [openContextMenu],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (
        activeTool === "draw" ||
        activeTool === "highlighter" ||
        activeTool === "pencil"
      ) {
        setActiveDrawStroke([{ x: pos.x, y: pos.y, pressure: e.pressure }]);
        setIsDrawing(true);
        wrapperRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      if (activeTool === "eraser") {
        setIsDrawing(true);
        useEditor.getState().pushHistory();
        wrapperRef.current?.setPointerCapture(e.pointerId);
        eraseAtPosition(pos);
        return;
      }

      if (isShapeTool) {
        const id = `draft_${Date.now()}`;
        setDraftShapeId(id);
        setDraftShapeStart(pos);
        useEditor.setState((s) => ({
          nodes: [
            ...s.nodes,
            {
              id,
              type: "shape",
              position: pos,
              width: 0,
              height: 0,
              data: {
                kind: activeTool,
                fill: "transparent",
                stroke: "#a78bfa",
                strokeWidth: 2,
              },
              selected: true,
            } as any,
          ],
          selectedNodeIds: [id],
        }));
        setIsDrawing(true);
        wrapperRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      if (isConnectorTool(activeTool as never)) {
        const sourceId = `anchor_${Date.now()}_s`;
        const targetId = `anchor_${Date.now()}_t`;
        const srcNode = {
          id: sourceId,
          type: "anchor",
          position: pos,
          data: {},
        };
        const tgtNode = {
          id: targetId,
          type: "anchor",
          position: pos,
          data: {},
        };

        let arrow = true;
        let type = edgeKind;
        const toolInfo = CONNECTOR_TO_EDGE[activeTool as ConnectorTool];
        if (toolInfo) {
          arrow = toolInfo.arrow;
          type = toolInfo.kind;
        }

        const newEdge = applyEdgeStyle({
          id: `e_${Date.now()}`,
          source: sourceId,
          target: targetId,
          type,
          data: { arrow, color: "#a78bfa", width: 2 },
        });

        useEditor.setState((s) => ({
          nodes: [...s.nodes, srcNode as any, tgtNode as any],
          edges: [...s.edges, newEdge as any],
        }));

        setDraftConnector({ sourceId, targetId });
        setIsDrawing(true);
        wrapperRef.current?.setPointerCapture(e.pointerId);
        return;
      }
    },
    [activeTool, isShapeTool, edgeKind, rf],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (activeDrawStroke) {
        const lastPoint = activeDrawStroke[activeDrawStroke.length - 1];
        if (lastPoint) {
          const dist = Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);
          if (dist < 2) return;
        }
        setActiveDrawStroke([
          ...activeDrawStroke,
          { x: pos.x, y: pos.y, pressure: e.pressure },
        ]);
        return;
      }

      if (activeTool === "eraser") {
        eraseAtPosition(pos);
        return;
      }

      if (draftShapeId && draftShapeStart) {
        const w = Math.abs(pos.x - draftShapeStart.x);
        const h = Math.abs(pos.y - draftShapeStart.y);
        const minX = Math.min(pos.x, draftShapeStart.x);
        const minY = Math.min(pos.y, draftShapeStart.y);
        useEditor.setState((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === draftShapeId
              ? { ...n, position: { x: minX, y: minY }, width: w, height: h }
              : n,
          ),
        }));
        return;
      }

      if (draftConnector) {
        useEditor.setState((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === draftConnector.targetId ? { ...n, position: pos } : n,
          ),
        }));
        return;
      }
    },
    [
      isDrawing,
      activeDrawStroke,
      draftShapeId,
      draftShapeStart,
      draftConnector,
      rf,
    ],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      wrapperRef.current?.releasePointerCapture(e.pointerId);

      if (activeDrawStroke && activeDrawStroke.length > 1) {
        const start = activeDrawStroke[0];
        const relativePoints = activeDrawStroke.map((p) => ({
          x: p.x - start.x,
          y: p.y - start.y,
          pressure: p.pressure,
        }));
        const toolToUse = activeTool === "pencil" ? "draw" : activeTool;
        addShape(
          toolToUse as any,
          { x: start.x + 90, y: start.y + 50 },
          { points: relativePoints },
        );
      }
      setActiveDrawStroke(null);

      if (draftShapeId && draftShapeStart) {
        const state = useEditor.getState();
        const node = state.nodes.find((n) => n.id === draftShapeId);
        if (node) {
          if ((node.width || 0) < 10 && (node.height || 0) < 10) {
            // Stamp default size
            state.pushHistory();
            useEditor.setState((s) => ({
              nodes: s.nodes.filter((n) => n.id !== draftShapeId),
            }));
            addShape(activeTool as never, draftShapeStart);
          } else {
            // Keep drawn size
            state.pushHistory();
            useEditor.setState((s) => ({
              nodes: s.nodes.map((n) =>
                n.id === draftShapeId ? { ...n, id: `n${Date.now()}` } : n,
              ),
              selectedNodeIds: [`n${Date.now()}`],
              isDirty: true,
            }));
          }
        }
        setDraftShapeId(null);
        setDraftShapeStart(null);
        if (!e.shiftKey) setActiveTool("select");
      }

      if (draftConnector) {
        const state = useEditor.getState();
        const targetPos = state.nodes.find(
          (n) => n.id === draftConnector.targetId,
        )?.position;
        let snappedNodeId = null;

        if (targetPos) {
          const hitNode = state.nodes.find((n) => {
            if (n.type === "anchor" || n.id === draftConnector.sourceId)
              return false;
            const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
            const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
            return (
              targetPos.x >= n.position.x &&
              targetPos.x <= n.position.x + nw &&
              targetPos.y >= n.position.y &&
              targetPos.y <= n.position.y + nh
            );
          });
          if (hitNode) snappedNodeId = hitNode.id;
        }

        if (snappedNodeId) {
          const edgeId = state.edges.find(
            (e) => e.target === draftConnector.targetId,
          )?.id;
          state.pushHistory();
          useEditor.setState((s) => ({
            nodes: s.nodes.filter((n) => n.id !== draftConnector.targetId),
            edges: s.edges.map((e) =>
              e.id === edgeId ? applyEdgeStyle({ ...e, target: snappedNodeId }) : e,
            ),
          }));
        } else {
          state.pushHistory();
        }
        setDraftConnector(null);
        if (!e.shiftKey) setActiveTool("select");
      }
    },
    [
      isDrawing,
      activeDrawStroke,
      draftShapeId,
      draftShapeStart,
      draftConnector,
      activeTool,
      addShape,
      setActiveTool,
    ],
  );

  const cursor = cursorFor(activeTool, spaceDown, !!pendingConnect);

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      style={{ cursor, touchAction: "none" }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={(e) => onContextMenu(e)}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        onPointerMove(e);
        const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        setCursor(p);
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <ReactFlow
        className={isConnector || !!pendingConnect ? "connector-mode" : ""}
        onInit={(instance) => (rfInstance = instance)}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={() => useEditor.getState().setIsConnecting(true)}
        onConnectEnd={() => useEditor.getState().setIsConnecting(false)}
        onReconnect={onReconnectHandler}
        onReconnectStart={() => useEditor.getState().setIsConnecting(true)}
        onReconnectEnd={() => useEditor.getState().setIsConnecting(false)}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeContextMenu={(e, n: Node) => onContextMenu(e, { nodeId: n.id })}
        onEdgeContextMenu={(e, ed: Edge) => onContextMenu(e, { edgeId: ed.id })}
        onPaneContextMenu={(e) =>
          onContextMenu(e as unknown as React.MouseEvent)
        }
        onMove={(_, v) => setZoom(v.zoom)}
        onSelectionChange={({ nodes: sel, edges: eSel }) => {
          setSelectedNodes(sel.map((n) => n.id));
          setSelectedEdges(eSel.map((e) => e.id));
        }}
        connectionLineComponent={CustomConnectionLine}
        connectionMode={"loose" as never}
        defaultEdgeOptions={{
          type: edgeKind,
          animated: edgeAnimated,
          interactionWidth: 24,
        }}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        panOnDrag={spaceDown || activeTool === "hand" ? true : [1, 2]}
        selectionOnDrag={activeTool === "select" && !spaceDown}
        selectionMode={SelectionMode.Partial}
        connectionRadius={magneticSnap ? 32 : 6}
        snapToGrid={gridSnap}
        snapGrid={[snapGridSize, snapGridSize]}
        minZoom={0.1}
        maxZoom={4}
        edgesReconnectable={!presenting}
        nodesDraggable={!presenting && activeTool === "select"}
        nodesConnectable={!presenting}
        elementsSelectable={!presenting}
        fitView
        fitViewOptions={{ padding: 0.4, maxZoom: 1 }}
        onNodeDragStart={() => useEditor.getState().setIsDragging(true)}
        onNodeDragStop={() => useEditor.getState().setIsDragging(false)}
        onSelectionDragStart={() => useEditor.getState().setIsDragging(true)}
        onSelectionDragStop={() => useEditor.getState().setIsDragging(false)}
      >
        {showGrid && <InfiniteCanvasGrid />}
        {!presenting && (
          <Controls position="bottom-right" showInteractive={false} />
        )}
      </ReactFlow>
      {activeDrawStroke && (
        <ActiveStrokeOverlay
          points={activeDrawStroke}
          isHighlighter={activeTool === "highlighter"}
        />
      )}

      {isConnector && pendingConnect && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-lg">
          Click another shape to connect · Esc to cancel
        </div>
      )}

      <ShortcutHelper />
    </div>
  );
}

function ActiveStrokeOverlay({
  points,
  isHighlighter,
}: {
  points: { x: number; y: number; pressure?: number }[];
  isHighlighter: boolean;
}) {
  const transform = useStore((s) => s.transform);
  const path = getFreehandPath(points, isHighlighter, 3);
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      style={{ mixBlendMode: isHighlighter ? "multiply" : "normal" }}
    >
      <g
        transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}
      >
        <path
          d={path}
          fill={isHighlighter ? "rgba(250, 204, 21, 0.4)" : "#a78bfa"}
        />
      </g>
    </svg>
  );
}

function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  // Use reactive subscription so re-renders happen as user drags
  const activeTool = useEditor((s) => s.activeTool);
  const edgeKind = useEditor((s) => s.edgeKind);

  // Determine kind and whether to show arrowhead
  let isArrow = true;
  let kind = edgeKind;
  if (activeTool === "line") {
    isArrow = false;
    kind = "straight";
  } else if (activeTool === "arrow") {
    isArrow = true;
    kind = "straight";
  } else if (activeTool === "orthogonal") {
    isArrow = true;
    kind = "smoothstep";
  } else if (activeTool === "curved") {
    isArrow = false;
    kind = "simplebezier";
  }

  let path = "";
  if (kind === "smoothstep") {
    [path] = getSmoothStepPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
      borderRadius: 12,
    });
  } else if (kind === "simplebezier" || kind === "bezier" || kind === "curved") {
    [path] = getBezierPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
    });
  } else {
    [path] = getStraightPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
    });
  }

  // Arrowhead angle based on direction of travel toward target
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const color = "#a78bfa";

  return (
    <g>
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {isArrow && (
        <polygon
          points="-14,-7 0,0 -14,7"
          fill={color}
          stroke="none"
          transform={`translate(${toX},${toY}) rotate(${angle})`}
        />
      )}
    </g>
  );
}

function getPointToSegmentDistance(
  p: XYPosition,
  a: XYPosition,
  b: XYPosition,
): number {
  const l2 = Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (a.x + t * (b.x - a.x)),
    p.y - (a.y + t * (b.y - a.y)),
  );
}

export function Canvas() {
  return <CanvasInner />;
}
