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
import { getEdgePath } from "@/features/editor/pathEngine";
import { useEditor } from "@/features/editor/store";

// Helper to find intersection between a point (inside node) and the node's bounds
// towards an outside point. For now we use the center-to-center intersection.
function getIntersection(
  nodePos: XYPosition,
  nodeWidth: number,
  nodeHeight: number,
  targetPoint: XYPosition,
  kind: string,
) {
  // Center of node
  const cx = nodePos.x + nodeWidth / 2;
  const cy = nodePos.y + nodeHeight / 2;

  // Simple bounding box intersection (Rectangle)
  // For production we'd add circle/diamond specific math based on `kind`.
  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;

  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const w2 = nodeWidth / 2;
  const h2 = nodeHeight / 2;

  const scaleX = w2 / Math.abs(dx);
  const scaleY = h2 / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
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
    sourceHandle,
    targetHandle,
    style,
    markerEnd,
    markerStart,
    data,
  } = props;

  // Get nodes from store to calculate intersection
  const nodes = useEditor((s) => s.nodes);
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;

  const { screenToFlowPosition } = useReactFlow();
  const addBendPoint = useEditor((s) => s.addBendPoint);
  const updateBendPoint = useEditor((s) => s.updateBendPoint);
  const setSelectedBendPointId = useEditor((s) => s.setSelectedBendPointId);
  const openContextMenu = useEditor((s) => s.openContextMenu);

  // Handle double click on the edge to add a bend point
  const handleEdgeDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // Find closest segment to insert at
    const bestIndex = 0;
    // For now we just insert at the end if we don't calculate distances
    addBendPoint(id, pos);
  };

  // Draggable logic for a bend point
  const startDragPoint = (e: React.PointerEvent, pointId: string) => {
    e.stopPropagation();
    setSelectedBendPointId({ edgeId: id, pointId });

    const handlePointerMove = (eMove: PointerEvent) => {
      const pos = screenToFlowPosition({ x: eMove.clientX, y: eMove.clientY });
      updateBendPoint(id, pointId, pos);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Logic for midpoint + handles
  const startDragMidpoint = (
    e: React.PointerEvent,
    index: number,
    initialPos: XYPosition,
  ) => {
    e.stopPropagation();
    const newId = `bp-${Date.now()}`;
    addBendPoint(id, { id: newId, ...initialPos }, index);
    startDragPoint(e, newId);
  };

  // If we have both nodes, calculate precise border intersection
  if (sourceNode && targetNode) {
    const sw =
      sourceNode.measured?.width || (sourceNode.data as any)?.width || 180;
    const sh =
      sourceNode.measured?.height || (sourceNode.data as any)?.height || 100;
    const tw =
      targetNode.measured?.width || (targetNode.data as any)?.width || 180;
    const th =
      targetNode.measured?.height || (targetNode.data as any)?.height || 100;

    const scx = sourceNode.position.x + sw / 2;
    const scy = sourceNode.position.y + sh / 2;
    const tcx = targetNode.position.x + tw / 2;
    const tcy = targetNode.position.y + th / 2;

    if (sourceNode.type !== "anchor" && !sourceHandle?.startsWith("anchor-")) {
      const p = getIntersection(
        sourceNode.position,
        sw,
        sh,
        { x: tcx, y: tcy },
        (sourceNode.data as any)?.kind,
      );
      sx = p.x;
      sy = p.y;
    }

    if (targetNode.type !== "anchor" && !targetHandle?.startsWith("anchor-")) {
      const p = getIntersection(
        targetNode.position,
        tw,
        th,
        { x: scx, y: scy },
        (targetNode.data as any)?.kind,
      );
      tx = p.x;
      ty = p.y;
    }
  }

  const edgeKind = props.type || "straight";
  const points = [{ x: sx, y: sy }];
  const bendPoints =
    (props.data?.bendPoints as { x: number; y: number; id: string }[]) || [];
  points.push(...bendPoints);
  points.push({ x: tx, y: ty });

  let path = "";
  let midpoints: { x: number; y: number; index: number }[] = [];
  let labelX = (sx + tx) / 2;
  let labelY = (sy + ty) / 2;

  if (bendPoints.length === 0) {
    if (edgeKind === "smoothstep") {
      const [p, lX, lY] = getSmoothStepPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, sourcePosition, targetPosition, borderRadius: 12 });
      path = p;
      labelX = lX;
      labelY = lY;
      midpoints = [{ x: lX, y: lY, index: 0 }];
    } else if (edgeKind === "simplebezier" || edgeKind === "bezier" || edgeKind === "curved") {
      const [p, lX, lY] = getBezierPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, sourcePosition, targetPosition });
      path = p;
      labelX = lX;
      labelY = lY;
      midpoints = [{ x: lX, y: lY, index: 0 }];
    } else {
      const [p, lX, lY] = getNativeStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
      path = p;
      labelX = lX;
      labelY = lY;
      midpoints = [{ x: lX, y: lY, index: 0 }];
    }
  } else {
    const res = getEdgePath(points, edgeKind);
    path = res.path;
    midpoints = res.midpoints;
    const midIndex = Math.floor(midpoints.length / 2);
    labelX = midpoints[midIndex]?.x || (sx + tx) / 2;
    labelY = midpoints[midIndex]?.y || (sy + ty) / 2;
  }

  return (
    <>
      {/* Invisible thick path for easier hit detection */}
      <path
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction pointer-events-auto cursor-pointer"
        onDoubleClick={handleEdgeDoubleClick}
      />
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          stroke: (data as any)?.color || "#a78bfa",
          strokeWidth: (data as any)?.width || 2,
          strokeDasharray: (data as any)?.dashed
            ? "8 6"
            : (data as any)?.dotted
              ? "2 6"
              : "none",
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
          {/* Start Handle */}
          <div
            className="absolute nodrag nopan pointer-events-none rounded-full bg-white border-2 border-purple-500 shadow-sm"
            style={{
              width: 10,
              height: 10,
              transform: `translate(-50%, -50%) translate(${sx}px, ${sy}px)`,
            }}
          />
          {/* End Handle */}
          <div
            className="absolute nodrag nopan pointer-events-none rounded-full bg-white border-2 border-purple-500 shadow-sm"
            style={{
              width: 10,
              height: 10,
              transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
            }}
          />
          {/* Bend Points */}
          {bendPoints.map((bp) => (
            <div
              key={bp.id}
              onPointerDown={(e) => startDragPoint(e, bp.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedBendPointId({ edgeId: id, pointId: bp.id });
                openContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  edgeId: id,
                  bendPointId: bp.id,
                });
              }}
              className="absolute nodrag nopan pointer-events-auto rounded-full bg-white border-2 border-purple-500 shadow-sm transition-transform hover:scale-125"
              style={{
                width: 8,
                height: 8,
                transform: `translate(-50%, -50%) translate(${bp.x}px, ${bp.y}px)`,
                cursor: "pointer",
              }}
            />
          ))}
          {/* Midpoint insertion handles */}
          {midpoints.map((mp, i) => (
            <div
              key={`mp-${i}`}
              onPointerDown={(e) =>
                startDragMidpoint(e, i, { x: mp.x, y: mp.y })
              }
              className="absolute nodrag nopan pointer-events-auto rounded-full bg-white/80 border border-purple-300 shadow-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              style={{
                width: 12,
                height: 12,
                transform: `translate(-50%, -50%) translate(${mp.x}px, ${mp.y}px)`,
                cursor: "pointer",
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
