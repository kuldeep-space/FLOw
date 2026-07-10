import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Handle,
  NodeResizer,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import { Copy, Plus, MessageSquare, Trash2, RotateCw } from "lucide-react";
import type { ShapeNode as SN } from "@/features/editor/store";
import { useEditor, isConnectorTool } from "@/features/editor/store";
import { ShapeRegistry } from "@/features/editor/shapes";
import type { ShapeRenderProps } from "@/features/editor/shapes";

function ShapeNodeInner({ id, data, selected, width, height }: NodeProps<SN>) {
  const w = width ?? 180;
  const h = height ?? 100;
  const updateShape = useEditor((s) => s.updateShape);
  const pushHistory = useEditor((s) => s.pushHistory);
  const presenting = useEditor((s) => s.presenting);
  const activeTool = useEditor((s) => s.activeTool);
  const pendingConnect = useEditor((s) => s.pendingConnectSource);
  const isConnecting = useEditor((s) => s.isConnecting);
  const setPendingConnectSource = useEditor((s) => s.setPendingConnectSource);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const magneticSnapPoint = useEditor((s) => s.magneticSnapPoint);
  const magneticSnapEnabled = useEditor((s) => s.magneticSnap);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const setSelectedNodes = useEditor((s) => s.setSelectedNodes);
  const updateInternals = useUpdateNodeInternals();
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [localMouse, setLocalMouse] = useState<{ x: number; y: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    updateInternals(id);
  }, [id, w, h, updateInternals]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editing]);

  const isSticky = data.kind === "sticky";
  const isText = data.kind === "text";
  const isImage = data.kind === "image";
  const isDraw = data.kind === "draw" || data.kind === "highlighter" || data.kind === "pencil";
  const isConnectorMode = isConnectorTool(activeTool as never);
  const isPendingSource = pendingConnect?.nodeId === id;

  if (data.hidden) return null;

  const imgFilter = isImage
    ? `brightness(${data.brightness ?? 100}%) contrast(${data.contrast ?? 100}%) blur(${data.blur ?? 0}px)`
    : undefined;
  const imgTransform = isImage
    ? `${data.flipH ? "scaleX(-1) " : ""}${data.flipV ? "scaleY(-1)" : ""}`.trim() ||
      undefined
    : undefined;

  const shapeDef =
    ShapeRegistry.get(data.kind) ?? ShapeRegistry.get("rectangle");

  if (!shapeDef) {
    console.warn(`Shape definition not found for kind: ${data.kind}`);
    return null;
  }

  const renderProps: ShapeRenderProps = {
    id,
    width: w,
    height: h,
    data,
    selected: !!selected,
    hovered: false, // Handled via CSS hover state mostly
    isConnectorMode,
  };

  const textArea = shapeDef.getTextArea(w, h);

  return (
    <div
      className={`shape-node group relative ${data.locked ? "cursor-not-allowed" : ""} ${
        isPendingSource ? "is-pending-source" : ""
      }`}
      style={{
        width: w,
        height: h,
        opacity: data.opacity,
        transform: `rotate(${data.rotation}deg)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setLocalMouse(null);
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setLocalMouse({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      onDoubleClick={(e) => {
        if (data.locked || isImage || isConnectorMode) return;
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {!presenting && (
        <NodeResizer
          color="#0ea5e9"
          isVisible={
            !!selected &&
            !data.locked &&
            !isDraw &&
            !isConnectorMode &&
            !isConnecting
          }
          minWidth={40}
          minHeight={24}
          handleStyle={{
            width: 9,
            height: 9,
            borderRadius: 2,
            background: "#ffffff",
            border: "1.5px solid #0ea5e9",
          }}
          lineStyle={{
            borderColor: "transparent",
          }}
          onResizeStart={() => useEditor.getState().setIsResizing(true)}
          onResizeEnd={() => useEditor.getState().setIsResizing(false)}
        />
      )}

      {/* Explicit Selection Bounding Box */}
      {selected && !presenting && !isDraw && !data.locked && (
        <div className="pointer-events-none absolute -inset-[1.5px] border-[1.5px] border-[#0ea5e9] z-40" />
      )}

      {/* Rotation handle */}
      {selected && !presenting && !data.locked && !isDraw && (
        <div className="nodrag nopan absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
          <div
            className="pointer-events-auto flex h-7 w-7 cursor-grab active:cursor-grabbing items-center justify-center rounded-full border-2 border-white bg-[#0ea5e9] shadow-md hover:scale-110 transition-all text-white"
            title="Rotate (Hold Shift to snap to 15°)"
            onPointerDown={(e) => {
              e.stopPropagation();
              const el = e.currentTarget;
              el.setPointerCapture(e.pointerId);

              const rect = (el.parentElement?.parentElement as HTMLElement).getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const startX = e.clientX;
              const startY = e.clientY;
              const start = Math.atan2(startY - cy, startX - cx);
              const startRot = data.rotation || 0;
              pushHistory();

              const move = (ev: PointerEvent) => {
                const cur = Math.atan2(ev.clientY - cy, ev.clientX - cx);
                let deg = ((cur - start) * 180) / Math.PI;
                let newRot = startRot + deg;
                
                if (ev.shiftKey) {
                  newRot = Math.round(newRot / 15) * 15;
                }
                
                updateShape(id, { rotation: Math.round(newRot) });
              };
              
              const up = (ev: PointerEvent) => {
                el.releasePointerCapture(ev.pointerId);
                el.removeEventListener("pointermove", move);
                el.removeEventListener("pointerup", up);
              };
              
              el.addEventListener("pointermove", move);
              el.addEventListener("pointerup", up);
            }}
          >
            <RotateCw size={14} strokeWidth={2.5} />
          </div>
          <div className="w-[1.5px] h-3 bg-[#0ea5e9]" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`shape-body absolute inset-0 rounded-[10px] transition-shadow ${isDraw ? "is-draw" : ""}`}
        style={{
          filter: isSticky
            ? "drop-shadow(0 12px 24px rgba(0,0,0,0.35))"
            : data.shadow
              ? "drop-shadow(0 12px 24px rgba(0,0,0,0.45))"
              : undefined,
        }}
      >
        {isImage && data.src ? (
          <img
            src={data.src}
            alt={data.label || "image"}
            draggable={false}
            className="h-full w-full select-none object-cover"
            style={{
              borderRadius: data.radius ?? 8,
              filter: imgFilter,
              transform: imgTransform,
              boxShadow: data.shadow
                ? "0 20px 40px -12px rgba(0,0,0,0.5)"
                : undefined,
            }}
          />
        ) : (
          shapeDef.render(renderProps)
        )}
      </motion.div>

      {!isImage && (
        <div
          className="pointer-events-none absolute flex leading-snug select-none"
          style={{
            left: textArea.x,
            top: textArea.y,
            width: textArea.width,
            height: textArea.height,
            color: data.textColor,
            fontSize: data.fontSize,
            fontWeight: data.fontWeight,
            alignItems: "center",
            justifyContent:
              data.fontAlign === "left"
                ? "flex-start"
                : data.fontAlign === "right"
                  ? "flex-end"
                  : "center",
            textAlign: data.fontAlign,
          }}
        >
          {editing ? (
            <div
              ref={inputRef}
              contentEditable
              suppressContentEditableWarning
              className="pointer-events-auto w-full outline-none"
              style={{
                color: data.textColor,
                fontSize: data.fontSize,
                fontWeight: data.fontWeight,
                textAlign: data.fontAlign,
                minHeight: "1em",
              }}
              onBlur={(e) => {
                pushHistory();
                updateShape(id, { label: e.currentTarget.innerText });
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape")
                  (e.currentTarget as HTMLDivElement).blur();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).blur();
                }
                e.stopPropagation();
              }}
              dangerouslySetInnerHTML={{ __html: data.label }}
            />
          ) : (
            <span className="w-full whitespace-pre-wrap break-words">
              {data.label}
            </span>
          )}
        </div>
      )}      {/* Hover quick-actions removed, moved to context menu below */}

      {/* Visible X connection points (always visible) */}
      {!presenting && !isDraw && (
        <div style={{ pointerEvents: "none" }} className="absolute inset-0 z-20">
          {(() => {
            const pts = shapeDef.getConnectionPoints(w, h);
            const snappedIndex = magneticSnapPoint?.nodeId === id ? magneticSnapPoint.pointIndex : -1;
            
            return pts.map((p, i) => {
              const isGlow = snappedIndex === i;
              let isNeighbor = false;
              if (snappedIndex !== undefined && snappedIndex !== -1) {
                const diff = Math.abs(i - snappedIndex);
                isNeighbor = diff === 1 || diff === pts.length - 1;
              }
              
              const strokeWidth = data.strokeWidth || 3;
              const inset = strokeWidth / 2;
              const cx = w / 2;
              const cy = h / 2;
              const dx = p.x - cx;
              const dy = p.y - cy;
              const dist = Math.hypot(dx, dy);
              
              let dotX = p.x;
              let dotY = p.y;
              if (dist > 0) {
                dotX = cx + (dx / dist) * (dist - inset);
                dotY = cy + (dy / dist) * (dist - inset);
              }

              return (
                <div key={i}>
                  {magneticSnapEnabled && (isGlow || isNeighbor) && (
                    <div
                      className={`absolute flex items-center justify-center transition-all duration-200 ${isGlow ? "scale-150 z-30" : "z-20 opacity-50 scale-75 blur-[0.5px]"}`}
                      style={{ left: dotX, top: dotY, width: 12, height: 12, marginLeft: -6, marginTop: -6 }}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full border-[1.5px] border-white shadow-sm transition-colors ${isGlow ? "bg-cyan-400 border-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-primary"}`} />
                    </div>
                  )}
                  {/* Specific handles to satisfy React Flow edge connection */}
                  <Handle
                    id={`point-${i}`}
                    type="source"
                    position={Position.Top}
                    className="opacity-0"
                    style={{ position: "absolute", left: p.x, top: p.y, pointerEvents: "none" }}
                  />
                  <Handle
                    id={`point-${i}`}
                    type="target"
                    position={Position.Top}
                    className="opacity-0"
                    style={{ position: "absolute", left: p.x, top: p.y, pointerEvents: "none" }}
                  />
                </div>
              );
            });
          })()}
        </div>
      )}


      {/* Invisible Handles to satisfy React Flow */}
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0"
        style={{ position: "absolute", left: "50%", top: "50%", pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0"
        style={{ position: "absolute", left: "50%", top: "50%", pointerEvents: "none" }}
      />

      {/* Suppress unused warning */}
      {isText ? null : null}
    </div>
  );
}

export const ShapeNode = memo(ShapeNodeInner);
