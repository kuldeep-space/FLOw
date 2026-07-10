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
  Position,
} from "@xyflow/react";
import { useEditor, isConnectorTool, type FlowEdge, applyEdgeStyle, CONNECTOR_TO_EDGE, type ConnectorTool, defaultsFor } from "./store";
import { InteractionManager } from "./connector-engine";
import { getFreehandPath, getSimplePath } from "./freehand";
import { ShapeNode } from "@/nodes/ShapeNode";
import { ShapeRegistry } from "@/features/editor/shapes";
import { getClosestPointOnShape } from "./shapeMath";
import { InfiniteCanvasGrid } from "./InfiniteCanvasGrid";
import { AnchorNode } from "@/nodes/AnchorNode";
import { SmartEdge } from "@/edges/SmartEdge";
import { importImageFile, importJSONFile } from "./exportImport";
import { ShortcutHelper } from "./ShortcutHelper";

const nodeTypes: NodeTypes = { shape: ShapeNode, anchor: AnchorNode };
const edgeTypes = {
  smart: SmartEdge,
  straight: SmartEdge,
  smoothstep: SmartEdge,
  simplebezier: SmartEdge,
  bezier: SmartEdge,
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
  const [presentationDrawStrokes, setPresentationDrawStrokes] = useState<{ id: string; points: { x: number; y: number; pressure?: number }[]; isHighlighter: boolean; ds: any }[]>([]);
  const [laserStrokes, setLaserStrokes] = useState<{ id: string; points: {x: number, y: number}[] }[]>([]);
  const [activeLaser, setActiveLaser] = useState<{x: number, y: number}[] | null>(null);

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
  const connectionMade = useRef(false);

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
      !["select", "hand", "draw", "highlighter", "pencil", "image", "cloud"].includes(
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
        useEditor.setState((s) => {
          const remainingEdges = s.edges.filter(
            (e) => e.source !== node.id && e.target !== node.id
          );
          const remainingNodes = s.nodes.filter((n) => n.id !== node.id).filter((n) => {
            if (n.type === "anchor") {
              return remainingEdges.some((e) => e.source === n.id || e.target === n.id);
            }
            return true;
          });
          return {
            nodes: remainingNodes,
            edges: remainingEdges,
            isDirty: true,
          };
        });
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
        useEditor.setState((s) => {
          const remainingEdges = s.edges.filter((e) => e.id !== edge.id);
          const remainingNodes = s.nodes.filter((n) => {
            if (n.type === "anchor") {
              return remainingEdges.some((e) => e.source === n.id || e.target === n.id);
            }
            return true;
          });
          return {
            nodes: remainingNodes,
            edges: remainingEdges,
            isDirty: true,
          };
        });
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
      const state = useEditor.getState();
      if (state.presenting) {
        if (state.activeTool !== "pencil") {
          if (e.button === 2) {
            // Right click clears laser
            setLaserStrokes([]);
      setPresentationDrawStrokes([]);
            setActiveLaser(null);
            return;
          } else if (e.button === 0) {
            // Left click draws laser
            const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setActiveLaser([{ x: pos.x, y: pos.y }]);
            try { wrapperRef.current?.setPointerCapture(e.pointerId); } catch (err) {}
            return;
          }
        } else {
          if (e.button === 2) {
            // Right click in presentation pencil mode clears all drawings
            useEditor.getState().pushHistory();
            useEditor.setState((s) => ({
              nodes: s.nodes.filter((n) => {
                if (n.type === "shape") {
                  const kind = (n.data as any)?.kind;
                  if (kind === "draw" || kind === "highlighter" || kind === "pencil") return false;
                }
                return true;
              }),
              isDirty: true,
            }));
            return;
          }
        }
      }

      if (e.button !== 0) return;
      
      if (state.interactionState !== "IDLE" && state.interactionState !== "SELECTING") {
        return; // An interaction is already in progress (e.g. edge moving)
      }

      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (
        activeTool === "draw" ||
        activeTool === "highlighter" ||
        activeTool === "pencil"
      ) {
        setActiveDrawStroke([{ x: pos.x, y: pos.y, pressure: e.pressure }]);
        setIsDrawing(true);
        try {
          try { wrapperRef.current?.setPointerCapture(e.pointerId); } catch (err) {}
        } catch (err) {}
        return;
      }

      if (activeTool === "eraser") {
        setIsDrawing(true);
        useEditor.getState().pushHistory();
        try { wrapperRef.current?.setPointerCapture(e.pointerId); } catch (err) {}
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
                ...defaultsFor(activeTool as never),
              },
              selected: true,
            } as any,
          ],
          selectedNodeIds: [id],
        }));
        useEditor.getState().setInteractionState("DRAWING_SHAPE");
        setIsDrawing(true);
        try { wrapperRef.current?.setPointerCapture(e.pointerId); } catch (err) {}
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
          data: { arrow, color: "#a78bfa", width: 1 },
        });

        useEditor.setState((s) => ({
          nodes: [...s.nodes, srcNode as any, tgtNode as any],
          edges: [...s.edges, newEdge as any],
        }));

        useEditor.getState().setInteractionState("DRAWING_CONNECTOR");
        setDraftConnector({ sourceId, targetId });
        setIsDrawing(true);
        try { wrapperRef.current?.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }
    },
    [activeTool, isShapeTool, edgeKind, rf],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (activeLaser) {
        setActiveLaser((prev) => (prev ? [...prev, { x: pos.x, y: pos.y }] : null));
        return;
      }

      if (!isDrawing) return;

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
        let currentPos = pos;
        const storeNodes = useEditor.getState().nodes;
        let closestPoint: { nodeId: string; pointIndex?: number; x?: number; y?: number; customPos?: { x: number; y: number; pctX: number; pctY: number } } | null = null;
        let minDist = 24; // 24px configured border snap distance
        const isMagneticSnap = useEditor.getState().magneticSnap;

        if (isMagneticSnap) {
          for (const n of storeNodes) {
            if (n.type === "anchor") continue;
            const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
            const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
            const shapeDef = ShapeRegistry.get((n.data as any)?.kind) ?? ShapeRegistry.get("rectangle");
            if (shapeDef) {
              const pts = shapeDef.getConnectionPoints(nw, nh);
              pts.forEach((pt, i) => {
                const gx = n.position.x + pt.x;
                const gy = n.position.y + pt.y;
                const dist = Math.hypot(pos.x - gx, pos.y - gy);
                if (dist < minDist) {
                  minDist = dist;
                  closestPoint = { nodeId: n.id, pointIndex: i, x: gx, y: gy };
                }
              });
            }
          }
        } else {
          for (const n of storeNodes) {
            if (n.type === "anchor") continue;
            const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
            const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
            const kind = (n.data as any)?.kind || "rectangle";
            
            if (pos.x >= n.position.x - 24 && pos.x <= n.position.x + nw + 24 &&
                pos.y >= n.position.y - 24 && pos.y <= n.position.y + nh + 24) {
                
                const localX = pos.x - n.position.x;
                const localY = pos.y - n.position.y;
                const p = getClosestPointOnShape(kind, nw, nh, localX, localY);
                
                let dist = Math.hypot(localX - p.x, localY - p.y);
                
                if (localX >= 0 && localX <= nw && localY >= 0 && localY <= nh) {
                    dist = 0;
                }
                
                if (dist < minDist) {
                   minDist = dist;
                   const pctX = p.x / nw;
                   const pctY = p.y / nh;
                   closestPoint = { nodeId: n.id, customPos: { x: p.x + n.position.x, y: p.y + n.position.y, pctX, pctY } };
                }
            }
          }
        }

        if (closestPoint) {
          if (isMagneticSnap) {
            currentPos = { x: closestPoint.x!, y: closestPoint.y! };
            useEditor.getState().setMagneticSnapPoint({ nodeId: closestPoint.nodeId, pointIndex: closestPoint.pointIndex });
          } else {
            currentPos = { x: closestPoint.customPos!.x, y: closestPoint.customPos!.y };
            useEditor.getState().setMagneticSnapPoint({ nodeId: closestPoint.nodeId, customPos: closestPoint.customPos });
          }
        } else {
          useEditor.getState().setMagneticSnapPoint(null);
        }

        useEditor.setState((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === draftConnector.targetId ? { ...n, position: currentPos } : n,
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
      if (activeLaser) {
        try { wrapperRef.current?.releasePointerCapture(e.pointerId); } catch (err) {}
        if (activeLaser.length > 1) {
          setLaserStrokes((prev) => [...prev, { id: `laser_${Date.now()}`, points: activeLaser }]);
        }
        setActiveLaser(null);
        return;
      }

      if (!isDrawing) return;
      setIsDrawing(false);
      try {
        try { wrapperRef.current?.releasePointerCapture(e.pointerId); } catch (err) {}
      } catch (err) {}
      if (activeDrawStroke && activeDrawStroke.length > 1) {
        if (presenting) {
          const ds = useEditor.getState().drawSettings;
          setPresentationDrawStrokes(prev => [...prev, {
            id: `pres_draw_${Date.now()}`,
            points: activeDrawStroke,
            isHighlighter: activeTool === "highlighter",
            ds: { ...ds }
          }]);
        } else {
          const start = activeDrawStroke[0];
          const relativePoints = activeDrawStroke.map((p) => ({
            x: p.x - start.x,
            y: p.y - start.y,
            pressure: p.pressure,
          }));
          const toolToUse = activeTool === "pencil" ? "draw" : activeTool;
          addShape(
            toolToUse as any,
            { x: start.x, y: start.y },
            { points: relativePoints },
          );
        }
      }
      InteractionManager.end();
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
        const snapPoint = state.magneticSnapPoint;
        state.setMagneticSnapPoint(null);
        
        let snappedNodeId = null;
        let snappedPointIndex = undefined;
        let snappedCustomTarget = undefined;

        if (snapPoint) {
            snappedNodeId = snapPoint.nodeId;
            if (state.magneticSnap) {
              snappedPointIndex = snapPoint.pointIndex;
            } else if (snapPoint.customPos) {
              snappedCustomTarget = { pctX: snapPoint.customPos.pctX, pctY: snapPoint.customPos.pctY };
            }
        } else {
            const targetPos = state.nodes.find(
              (n) => n.id === draftConnector.targetId,
            )?.position;

            if (targetPos) {
              const hitNode = state.nodes.find((n) => {
                if (n.type === "anchor" || n.id === draftConnector.sourceId)
                  return false;
                const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
                const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
                return (
                  targetPos.x >= n.position.x - 24 &&
                  targetPos.x <= n.position.x + nw + 24 &&
                  targetPos.y >= n.position.y - 24 &&
                  targetPos.y <= n.position.y + nh + 24
                );
              });
              if (hitNode) snappedNodeId = hitNode.id;
            }
        }

        if (snappedNodeId) {
          const edgeId = state.edges.find(
            (e) => e.target === draftConnector.targetId,
          )?.id;
          if (edgeId) {
            let targetHandle = undefined;
            if (snappedPointIndex !== undefined) {
               targetHandle = `point-${snappedPointIndex}`;
            }
            
            state.pushHistory();
            useEditor.setState((s) => {
              const edge = s.edges.find(e => e.id === edgeId);
              const customTarget = snappedCustomTarget ? { customTarget: snappedCustomTarget } : {};
              return {
                nodes: s.nodes.filter((n) => n.id !== draftConnector.targetId),
                edges: s.edges.map((e) =>
                  e.id === edgeId ? applyEdgeStyle({ 
                    ...e, 
                    target: snappedNodeId, 
                    targetHandle,
                    data: { ...e.data, ...customTarget }
                  }) : e,
                ),
              };
            });
          }
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
      activeLaser,
    ],
  );

  let cursor = cursorFor(activeTool, spaceDown, !!pendingConnect);
  if (presenting) cursor = "crosshair"; // Laser cursor

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
        zoomOnDoubleClick={false}
        onConnect={(conn) => {
          connectionMade.current = true;
          onConnect(conn);
        }}
        onConnectStart={(e, params) => {
          connectionMade.current = false;
          useEditor.getState().setIsConnecting(true);
          if (params) {
            useEditor.getState().setPendingConnectSource({
              nodeId: params.nodeId as string,
              handleId: params.handleId as string | undefined,
            });
          }
        }}
        onConnectEnd={(event: any) => {
          useEditor.getState().setIsConnecting(false);
          const pending = useEditor.getState().pendingConnectSource;
          if (!connectionMade.current && pending && pending.nodeId && rfInstance) {
            const { clientX, clientY } = "changedTouches" in event ? event.changedTouches[0] : event;
            const pos = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });
            
            // Check if dropped on another node without snapping
            const state = useEditor.getState();
            let targetNodeId = null;
            
            const hitNode = state.nodes.find((n) => {
              if (n.type === "anchor" || n.id === pending.nodeId) return false;
              const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
              const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
              return (
                pos.x >= n.position.x &&
                pos.x <= n.position.x + nw &&
                pos.y >= n.position.y &&
                pos.y <= n.position.y + nh
              );
            });
            
            let finalTargetId = hitNode?.id;
            
            // Create anchor if dropped in empty space
            if (!finalTargetId) {
              finalTargetId = `anchor_${Date.now()}_t`;
              useEditor.setState((s) => ({
                nodes: [
                  ...s.nodes,
                  { id: finalTargetId, type: "anchor", position: pos, data: {} } as any,
                ],
              }));
            }
            
            // Force connection
            onConnect({
              source: pending.nodeId,
              sourceHandle: pending.handleId || null,
              target: finalTargetId!,
              targetHandle: null,
            });
          }
          useEditor.getState().setPendingConnectSource(null);
          if (!("shiftKey" in event && event.shiftKey)) {
            useEditor.getState().setActiveTool("select");
          }
        }}
        onReconnect={onReconnectHandler}
        onReconnectStart={() => useEditor.getState().setIsConnecting(true)}
        onReconnectEnd={() => useEditor.getState().setIsConnecting(false)}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e as any, { nodeId: node.id });
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e as any, { edgeId: edge.id });
        }}
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
        panOnScroll={false}
        zoomOnScroll={true}
        panOnDrag={spaceDown || activeTool === "hand" ? true : [1, 2]}
        selectionOnDrag={activeTool === "select" && !spaceDown}
        selectionMode={SelectionMode.Partial}
        connectionRadius={magneticSnap ? 32 : 6}
        snapToGrid={gridSnap}
        snapGrid={[snapGridSize, snapGridSize]}
        minZoom={0.1}
        maxZoom={4}
        edgesReconnectable={false}
        nodesDraggable={!presenting && activeTool === "select"}
        nodesConnectable={!presenting}
        elementsSelectable={!presenting}
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
      <GlowFilterRegistry />

      {/* Laser Pointer Overlay */}
      {presenting && (
        <>
          <PresentationDrawOverlay strokes={presentationDrawStrokes} />
          <LaserStrokeOverlay strokes={laserStrokes} activeLaser={activeLaser} />
        </>
      )}
    </div>
  );
}

function PresentationDrawOverlay({
  strokes,
}: {
  strokes: { id: string; points: { x: number; y: number; pressure?: number }[]; isHighlighter: boolean; ds: any }[];
}) {
  const transform = useStore((s) => s.transform);

  if (strokes.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full">
      {strokes.map((stroke) => {
        const ds = stroke.ds;
        const isGlow = ds.glowIntensity && ds.glowIntensity > 0;
        const filterId = `neon-glow-${ds.glowRadius || 10}-${ds.glowIntensity || 0}-${ds.glowOpacity ?? 1}`;

        if (stroke.isHighlighter) {
          const path = getFreehandPath(stroke.points, true, 3);
          return (
            <g key={stroke.id} transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`} opacity={ds.opacity ?? 1}>
              <path
                d={path}
                fill={ds.color || "rgba(250, 204, 21, 0.4)"}
                style={{ mixBlendMode: "multiply" }}
              />
            </g>
          );
        } else {
          const path = getSimplePath(stroke.points);
          return (
            <g key={stroke.id} transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`} opacity={ds.opacity ?? 1}>
              <path
                d={path}
                fill="none"
                stroke={ds.color}
                strokeWidth={ds.thickness || 4}
                strokeLinecap={ds.lineCap || "round"}
                strokeLinejoin={ds.lineJoin || "round"}
                filter={isGlow ? `url(#${filterId})` : undefined}
                strokeDasharray={ds.dashed ? "8 8" : "none"}
              />
            </g>
          );
        }
      })}
    </svg>
  );
}

function LaserStrokeOverlay({
  strokes,
  activeLaser,
}: {
  strokes: { id: string; points: { x: number; y: number }[] }[];
  activeLaser: { x: number; y: number }[] | null;
}) {
  const transform = useStore((s) => s.transform);

  const allStrokes = [
    ...strokes,
    ...(activeLaser ? [{ id: "active", points: activeLaser }] : []),
  ];

  if (allStrokes.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      style={{
        filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))",
      }}
    >
      <g
        transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}
      >
        {allStrokes.map((stroke) => {
          if (stroke.points.length < 2) return null;
          const path = getFreehandPath(stroke.points, false, 4);
          return <path key={stroke.id} d={path} fill="#ff0000" />;
        })}
      </g>
    </svg>
  );
}

function GlowFilterRegistry() {
  const nodes = useEditor((s) => s.nodes);
  const ds = useEditor((s) => s.drawSettings);
  const uniqueGlows = useMemo(() => {
    const glows = new Set<string>();
    nodes.forEach((n) => {
      if (n.type === "shape") {
        const data = n.data as any;
        if (data.glowIntensity && data.glowIntensity > 0) {
          const r = data.glowRadius || 10;
          const i = data.glowIntensity || 0;
          const o = data.glowOpacity ?? 1;
          glows.add(`${r}-${i}-${o}`);
        }
      }
    });
    if (ds.glowIntensity > 0) {
      glows.add(`${ds.glowRadius || 10}-${ds.glowIntensity}-${ds.glowOpacity ?? 1}`);
    }
    return Array.from(glows);
  }, [nodes, ds.glowIntensity, ds.glowRadius, ds.glowOpacity]);

  if (uniqueGlows.length === 0) return null;

  return (
    <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
      <defs>
        {uniqueGlows.map((glowKey) => {
          const [rStr, iStr, oStr] = glowKey.split("-");
          const r = parseFloat(rStr);
          const i = parseFloat(iStr);
          const o = parseFloat(oStr);
          const filterId = `neon-glow-${glowKey}`;
          
          return (
            <filter
              key={filterId}
              id={filterId}
              filterUnits="objectBoundingBox"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(r / 3, 1)} result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation={Math.max(r / 1.5, 2)} result="blur2" />
              <feGaussianBlur in="SourceGraphic" stdDeviation={r} result="blur3" />
              
              <feMerge result="bloom">
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur3" />
              </feMerge>
              
              <feComponentTransfer in="bloom" result="boosted-bloom">
                <feFuncA type="linear" slope={i * 3} />
              </feComponentTransfer>
              
              <feColorMatrix
                type="matrix"
                values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${o} 0`}
                in="boosted-bloom"
                result="final-glow"
              />
              
              <feMerge>
                <feMergeNode in="final-glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          );
        })}
      </defs>
    </svg>
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
  const ds = useEditor((s) => s.drawSettings);

  try {
    if (isHighlighter) {
      const path = getFreehandPath(points, true, 3);
      return (
        <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full" style={{ mixBlendMode: "multiply" }}>
          <g transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}>
            <path d={path} fill={ds.color || "rgba(250, 204, 21, 0.4)"} />
          </g>
        </svg>
      );
    }

    const pathData = getSimplePath(points);
    const isGlow = ds.glowIntensity && ds.glowIntensity > 0;
    const filterId = `neon-glow-${ds.glowRadius || 10}-${ds.glowIntensity || 0}-${ds.glowOpacity ?? 1}`;

    return (
      <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full">
        <g transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`} opacity={ds.opacity ?? 1}>
          <path
            d={pathData}
            fill="none"
            stroke={ds.color || "#000"}
            strokeWidth={ds.thickness || 4}
            strokeLinecap={ds.lineCap || "round"}
            strokeLinejoin={ds.lineJoin || "round"}
            strokeDasharray={ds.dashed ? "8 8" : "none"}
            filter={isGlow ? `url(#${filterId})` : undefined}
          />
        </g>
      </svg>
    );
  } catch (e) {
    console.error("ActiveStrokeOverlay error:", e);
    return null;
  }
}

function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  toPosition,
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
    isArrow = true;
    kind = "simplebezier";
  }

  // All tools draw a straight line initially (no initial bends), just like the final edges do.
  const [path] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  // Arrowhead angle based on direction of travel toward target
  const dx = toX - fromX;
  const dy = toY - fromY;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  if (toPosition) {
    if (toPosition === Position.Left) angle = 0;
    else if (toPosition === Position.Right) angle = 180;
    else if (toPosition === Position.Top) angle = 90;
    else if (toPosition === Position.Bottom) angle = -90;
  }

  const color = "#a78bfa";

  return (
    <g>
      <path d={path} fill="none" stroke={color} strokeWidth={1} />
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
