import { useState } from "react";
import {
  BaseEdge,
  type EdgeProps,
  type XYPosition,
  EdgeLabelRenderer,
  Position,
  useReactFlow,
  getSmoothStepPath,
  getBezierPath,
  getStraightPath as getNativeStraightPath,
} from "@xyflow/react";
import { BsArrowsMove } from "react-icons/bs";
import { getEdgePath } from "@/features/editor/pathEngine";
import { useEditor } from "@/features/editor/store";

function getIntersection(
  nodePos: XYPosition,
  nodeWidth: number,
  nodeHeight: number,
  targetPoint: XYPosition,
  kind: string,
) {
  const cx = nodePos.x + nodeWidth / 2;
  const cy = nodePos.y + nodeHeight / 2;
  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const w2 = nodeWidth / 2;
  const h2 = nodeHeight / 2;
  const scaleX = w2 / Math.abs(dx);
  const scaleY = h2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function SmartEdge(props: EdgeProps) {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Right,
    targetPosition = Position.Left,
    sourceHandleId,
    targetHandleId,
    style,
    markerEnd,
    markerStart,
    data,
  } = props;

  const nodes = useEditor((s) => s.nodes);
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;

  const [dragState, setDragState] = useState<{
    type: "endpoint" | "body" | "move";
    handle?: "source" | "target";
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const { screenToFlowPosition } = useReactFlow();
  const setInteractionState = useEditor((s) => s.setInteractionState);
  const updateEdge = useEditor((s) => s.updateEdge);
  const addBendPoint = useEditor((s) => s.addBendPoint);
  const updateBendPoint = useEditor((s) => s.updateBendPoint);
  const setSelectedBendPointId = useEditor((s) => s.setSelectedBendPointId);
  const openContextMenu = useEditor((s) => s.openContextMenu);

  const handleEdgeDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((props.type || "straight") === "straight") return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addBendPoint(id, pos);
  };

  const startDragPoint = (e: React.PointerEvent, pointId: string) => {
    e.stopPropagation();
    setSelectedBendPointId({ edgeId: id, pointId });
    setInteractionState("EDITING_CONNECTOR");
    const handlePointerMove = (eMove: PointerEvent) => {
      const pos = screenToFlowPosition({ x: eMove.clientX, y: eMove.clientY });
      updateBendPoint(id, pointId, pos);
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setInteractionState("IDLE");
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const startDragMidpoint = (e: React.PointerEvent, index: number, initialPos: XYPosition) => {
    e.stopPropagation();
    const newId = `bp-${Date.now()}`;
    addBendPoint(id, { id: newId, ...initialPos }, index);
    startDragPoint(e, newId);
  };


  const handleEndpointDragStart = (e: React.PointerEvent, handle: "source" | "target") => {
    e.stopPropagation();
    setInteractionState("EDITING_CONNECTOR");
    const startPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDragState({
      type: "endpoint",
      handle,
      startX: startPos.x,
      startY: startPos.y,
      currentX: startPos.x,
      currentY: startPos.y,
    });

    const handlePointerMove = (eMove: PointerEvent) => {
      const pos = screenToFlowPosition({ x: eMove.clientX, y: eMove.clientY });
      setDragState((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
    };

    const handlePointerUp = (eUp: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      
      const dropPos = screenToFlowPosition({ x: eUp.clientX, y: eUp.clientY });
      setDragState(null);
      setInteractionState("IDLE");

      const storeNodes = useEditor.getState().nodes;
      let hitNode = null;
      for (const n of storeNodes) {
        if (n.type === "anchor") continue;
        const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
        const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
        if (
          dropPos.x >= n.position.x &&
          dropPos.x <= n.position.x + nw &&
          dropPos.y >= n.position.y &&
          dropPos.y <= n.position.y + nh
        ) {
          hitNode = n;
          break;
        }
      }

      if (hitNode) {
        updateEdge(id, { [handle]: hitNode.id });
      } else {
        const anchorId = `anchor-${Date.now()}`;
        useEditor.setState((s) => ({
          nodes: [...s.nodes, { id: anchorId, type: "anchor", position: dropPos, data: {} }],
          isDirty: true
        }));
        updateEdge(id, { [handle]: anchorId });
      }
      
      useEditor.getState().cleanupOrphanAnchors();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleMoveDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setInteractionState("MOVING_CONNECTOR");
    const startPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDragState({
      type: "move",
      startX: startPos.x,
      startY: startPos.y,
      currentX: startPos.x,
      currentY: startPos.y,
    });

    const handlePointerMove = (eMove: PointerEvent) => {
      const pos = screenToFlowPosition({ x: eMove.clientX, y: eMove.clientY });
      setDragState((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
    };

    const handlePointerUp = (eUp: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      
      const dropPos = screenToFlowPosition({ x: eUp.clientX, y: eUp.clientY });
      const dx = dropPos.x - startPos.x;
      const dy = dropPos.y - startPos.y;
      
      setDragState(null);
      setInteractionState("IDLE");

      if (dx === 0 && dy === 0) return;

      useEditor.setState((s) => {
         const nextNodes = [...s.nodes];
         const nextEdges = [...s.edges];
         
         const edgeIndex = nextEdges.findIndex((e) => e.id === id);
         if (edgeIndex === -1) return {};
         const edge = { ...nextEdges[edgeIndex] };

         const sourceIndex = nextNodes.findIndex((n) => n.id === source);
         const targetIndex = nextNodes.findIndex((n) => n.id === target);
         
         if (sourceIndex !== -1) {
            const sourceN = nextNodes[sourceIndex];
            if (sourceN.type === "anchor") {
               nextNodes[sourceIndex] = { ...sourceN, position: { x: sourceN.position.x + dx, y: sourceN.position.y + dy } };
            }
         }
         
         if (targetIndex !== -1) {
            const targetN = nextNodes[targetIndex];
            if (targetN.type === "anchor") {
               nextNodes[targetIndex] = { ...targetN, position: { x: targetN.position.x + dx, y: targetN.position.y + dy } };
            }
         }
         
         const currentBends = (edge.data?.bendPoints as { x: number; y: number; id: string }[]) || [];
         if (currentBends.length > 0) {
            edge.data = { ...edge.data, bendPoints: currentBends.map(bp => ({ ...bp, x: bp.x + dx, y: bp.y + dy })) };
         }
         nextEdges[edgeIndex] = edge;
         
         return { nodes: nextNodes, edges: nextEdges, isDirty: true };
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleBodyDragStart = (e: React.PointerEvent) => {
    const currentBends = (props.data?.bendPoints as { x: number; y: number; id: string }[]) || [];
    if (currentBends.length === 0) return;
    
    e.stopPropagation();
    setInteractionState("MOVING_CONNECTOR");
    const startPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDragState({
      type: "body",
      startX: startPos.x,
      startY: startPos.y,
      currentX: startPos.x,
      currentY: startPos.y,
    });

    const handlePointerMove = (eMove: PointerEvent) => {
      const pos = screenToFlowPosition({ x: eMove.clientX, y: eMove.clientY });
      setDragState((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
    };

    const handlePointerUp = (eUp: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      
      const dropPos = screenToFlowPosition({ x: eUp.clientX, y: eUp.clientY });
      const dx = dropPos.x - startPos.x;
      const dy = dropPos.y - startPos.y;
      
      setDragState(null);
      setInteractionState("IDLE");

      if (dx === 0 && dy === 0) return;

      useEditor.setState((s) => {
         const nextEdges = [...s.edges];
         const edgeIndex = nextEdges.findIndex((e) => e.id === id);
         if (edgeIndex === -1) return {};
         
         const edge = { ...nextEdges[edgeIndex] };
         const cb = (edge.data?.bendPoints as { x: number; y: number; id: string }[]) || [];
         if (cb.length > 0) {
            edge.data = { ...edge.data, bendPoints: cb.map(bp => ({ ...bp, x: bp.x + dx, y: bp.y + dy })) };
         }
         nextEdges[edgeIndex] = edge;
         
         return { edges: nextEdges, isDirty: true };
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };


  if (sourceNode && targetNode) {
    const sw = sourceNode.measured?.width || (sourceNode.data as any)?.width || 180;
    const sh = sourceNode.measured?.height || (sourceNode.data as any)?.height || 100;
    const tw = targetNode.measured?.width || (targetNode.data as any)?.width || 180;
    const th = targetNode.measured?.height || (targetNode.data as any)?.height || 100;

    const scx = sourceNode.position.x + sw / 2;
    const scy = sourceNode.position.y + sh / 2;
    const tcx = targetNode.position.x + tw / 2;
    const tcy = targetNode.position.y + th / 2;

    if (sourceNode.type !== "anchor" && !sourceHandleId?.startsWith("anchor-")) {
      const p = getIntersection(sourceNode.position, sw, sh, { x: tcx, y: tcy }, (sourceNode.data as any)?.kind);
      sx = p.x;
      sy = p.y;
    }

    if (targetNode.type !== "anchor" && !targetHandleId?.startsWith("anchor-")) {
      const p = getIntersection(targetNode.position, tw, th, { x: scx, y: scy }, (targetNode.data as any)?.kind);
      tx = p.x;
      ty = p.y;
    }
  }

  const bendPoints = (props.data?.bendPoints as { x: number; y: number; id: string }[]) || [];
  const edgeKind = props.type || "straight";

  if (dragState) {
    const dx = dragState.currentX - dragState.startX;
    const dy = dragState.currentY - dragState.startY;
    
    if (dragState.type === "endpoint") {
      if (dragState.handle === "source") {
        sx = dragState.currentX;
        sy = dragState.currentY;
      } else {
        tx = dragState.currentX;
        ty = dragState.currentY;
      }
    } else if (dragState.type === "move") {
      if (sourceNode?.type === "anchor") { sx += dx; sy += dy; }
      if (targetNode?.type === "anchor") { tx += dx; ty += dy; }
    }
  }

  const points = [{ x: sx, y: sy }];
  let effectiveBendPoints = bendPoints;
  if (dragState && (dragState.type === "move" || dragState.type === "body")) {
     const dx = dragState.currentX - dragState.startX;
     const dy = dragState.currentY - dragState.startY;
     effectiveBendPoints = bendPoints.map(bp => ({...bp, x: bp.x + dx, y: bp.y + dy}));
  }
  points.push(...effectiveBendPoints);
  points.push({ x: tx, y: ty });

  let path = "";
  let labelX = (sx + tx) / 2;
  let labelY = (sy + ty) / 2;
  let midpoints: { x: number; y: number; index: number }[] = [];
  let midIndex = 0;

  if (effectiveBendPoints.length === 0) {
    // Make all edges initially straight, regardless of type
    const [p, lX, lY] = getNativeStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
    path = p;
    labelX = lX;
    labelY = lY;
    midpoints = [{ x: lX, y: lY, index: 0 }];
  } else {
    const res = getEdgePath(points, edgeKind);
    path = res.path;
    midpoints = res.midpoints;
    midIndex = Math.floor(midpoints.length / 2);
    labelX = midpoints[midIndex]?.x || (sx + tx) / 2;
    labelY = midpoints[midIndex]?.y || (sy + ty) / 2;
  }

  let moveHandleX = labelX;
  let moveHandleY = labelY;
  
  if (edgeKind === "straight") {
    midpoints = [];
  }
  let nx = 0;
  let ny = 0;

  if (effectiveBendPoints.length > 0) {
    const p1 = points[midIndex];
    const p2 = points[midIndex + 1];
    if (p1 && p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx = -dy / len;
      ny = dx / len;
    }
  } else {
    const dx_overall = tx - sx;
    const dy_overall = ty - sy;
    const len_overall = Math.sqrt(dx_overall * dx_overall + dy_overall * dy_overall) || 1;
    nx = -dy_overall / len_overall;
    ny = dx_overall / len_overall;
  }

  const OFFSET = 36;
  moveHandleX += nx * OFFSET;
  moveHandleY += ny * OFFSET;



  return (
    <>
      <path
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction pointer-events-auto cursor-pointer"
        onDoubleClick={handleEdgeDoubleClick}
        onPointerDown={handleBodyDragStart}
      />
      
      {dragState?.type === "endpoint" && (
        <path
          d={path}
          fill="none"
          stroke={(data as any)?.color || "#a78bfa"}
          strokeWidth={(data as any)?.width || 2}
          strokeDasharray="4 4"
          className="pointer-events-none opacity-50"
        />
      )}

      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          stroke: (data as any)?.color || "#a78bfa",
          strokeWidth: (data as any)?.width || 2,
          strokeDasharray: (data as any)?.dashed ? "8 6" : (data as any)?.dotted ? "2 6" : "none",
        }}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {props.data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              background: "white",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              color: "#333",
            }}
            className="nodrag nopan"
          >
            {props.data.label as string}
          </div>
        </EdgeLabelRenderer>
      )}

      {props.selected && (
        <EdgeLabelRenderer>
          {/* Move Handle */}
          <div
            onPointerDown={handleMoveDragStart}
            className="absolute nodrag nopan pointer-events-auto rounded-full bg-white border-2 border-purple-500 shadow-sm flex items-center justify-center cursor-move"
            style={{
              width: 24,
              height: 24,
              transform: `translate(-50%, -50%) translate(${moveHandleX}px, ${moveHandleY}px)`,
              color: "#a855f7",
              zIndex: 101,
            }}
          >
            <BsArrowsMove size={14} />
          </div>

          <div
            className="absolute nodrag nopan pointer-events-auto rounded-full bg-white border-2 border-purple-500 shadow-sm cursor-crosshair"
            style={{
              width: 12,
              height: 12,
              transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px)`,
              zIndex: 101,
            }}
            onPointerDown={(e) => handleEndpointDragStart(e, "source")}
          />
          <div
            className="absolute nodrag nopan pointer-events-auto rounded-full bg-white border-2 border-purple-500 shadow-sm cursor-crosshair"
            style={{
              width: 12,
              height: 12,
              transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
              zIndex: 101,
            }}
            onPointerDown={(e) => handleEndpointDragStart(e, "target")}
          />
        </EdgeLabelRenderer>
      )}

      {props.selected &&
        effectiveBendPoints.map((bp, i) => (
          <circle
            key={bp.id}
            cx={bp.x}
            cy={bp.y}
            r={6}
            fill="white"
            stroke="#a855f7"
            strokeWidth={2}
            className="cursor-pointer"
            onPointerDown={(e) => startDragPoint(e, bp.id)}
            style={{ zIndex: 101 }}
          />
        ))}

      {props.selected && (
        <EdgeLabelRenderer>
          {effectiveBendPoints.map((bp) => (
            <div
              key={bp.id}
              onPointerDown={(e) => startDragPoint(e, bp.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedBendPointId({ edgeId: id, pointId: bp.id });
                openContextMenu({ x: e.clientX, y: e.clientY, edgeId: id, bendPointId: bp.id });
              }}
              className="absolute nodrag nopan pointer-events-auto rounded-full bg-white border-2 border-purple-500 shadow-sm cursor-pointer"
              style={{
                width: 8,
                height: 8,
                transform: `translate(-50%, -50%) translate(${bp.x}px, ${bp.y}px)`,
                zIndex: 101,
              }}
            />
          ))}
          {midpoints.map((mp, i) => (
            <div
              key={`mp-${i}`}
              onPointerDown={(e) => startDragMidpoint(e, i, { x: mp.x, y: mp.y })}
              className="absolute nodrag nopan pointer-events-auto rounded-full bg-white/80 border border-purple-300 shadow-sm flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
              style={{
                width: 12,
                height: 12,
                transform: `translate(-50%, -50%) translate(${mp.x}px, ${mp.y}px)`,
                zIndex: 101,
              }}
            >
              <div className="w-1.5 h-[1.5px] bg-purple-500 absolute" />
              <div className="w-[1.5px] h-1.5 bg-purple-500 absolute" />
            </div>
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

