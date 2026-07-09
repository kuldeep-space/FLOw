import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Handle,
  NodeResizer,
  Position,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import { Copy, Plus, MessageSquare, Trash2 } from "lucide-react";
import type { ShapeNode as SN } from "@/features/editor/store";
import { useEditor, isConnectorTool } from "@/features/editor/store";
import { ShapeRegistry } from "@/features/editor/shapes";
import type { ShapeRenderProps } from "@/features/editor/shapes";

function ShapeNodeInner({ id, data, selected, width, height }: NodeProps<SN>) {
  const w = width ?? 180;
  const h = height ?? 100;
  const updateShape = useEditor((s) => s.updateShape);
  const pushHistory = useEditor((s) => s.pushHistory);
  const magneticSnap = useEditor((s) => s.magneticSnap);
  const presenting = useEditor((s) => s.presenting);
  const activeTool = useEditor((s) => s.activeTool);
  const pendingConnect = useEditor((s) => s.pendingConnectSource);
  const isConnecting = useEditor((s) => s.isConnecting);
  const setPendingConnectSource = useEditor((s) => s.setPendingConnectSource);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
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
  const isDraw = data.kind === "draw" || data.kind === "highlighter";
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
    ShapeRegistry.get(data.kind) ?? ShapeRegistry.get("rectangle")!;
  const renderProps: ShapeRenderProps = {
    id,
    width: w,
    height: h,
    data,
    selected,
    hovered,
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
            width: 8,
            height: 8,
            borderRadius: 2,
            background: "#ffffff",
            border: "1.5px solid #0ea5e9",
          }}
          lineStyle={{
            borderColor: "#0ea5e9",
            borderWidth: 1.5,
            borderStyle: "solid",
          }}
          onResizeStart={() => useEditor.getState().setIsResizing(true)}
          onResizeEnd={() => useEditor.getState().setIsResizing(false)}
        />
      )}

      {/* Rotation handle (visual only for now; use inspector for precise angle) */}
      {selected && !presenting && !data.locked && !isDraw && (
        <div
          className="pointer-events-auto absolute -top-8 left-1/2 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-[1.5px] border-[#0ea5e9] bg-background shadow-sm hover:scale-110 transition-transform"
          title="Rotate (use Inspector › Rotation)"
          onMouseDown={(e) => {
            e.stopPropagation();
            // Simple drag-to-rotate around center
            const rect = (
              e.currentTarget.parentElement as HTMLElement
            ).getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const startX = e.clientX;
            const startY = e.clientY;
            const start = Math.atan2(startY - cy, startX - cx);
            const startRot = data.rotation || 0;
            pushHistory();

            const move = (ev: MouseEvent) => {
              const cur = Math.atan2(ev.clientY - cy, ev.clientX - cx);
              const deg = ((cur - start) * 180) / Math.PI;
              updateShape(id, { rotation: Math.round(startRot + deg) });
            };
            const up = () => {
              window.removeEventListener("mousemove", move);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", move);
            window.addEventListener("mouseup", up);
          }}
        >
          <div className="h-1.5 w-1.5 rounded-full bg-[#0ea5e9]" />
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
      )}

      {/* Hover quick-actions (fade-in) */}
      {!presenting &&
        !selected &&
        hovered &&
        !data.locked &&
        !isConnectorMode && (
          <div
            className="pointer-events-auto absolute -right-9 top-1/2 flex -translate-y-1/2 flex-col gap-1 rounded-lg border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface-elevated)_90%,transparent)] p-1 opacity-0 shadow-lg backdrop-blur transition-opacity animate-fade-in"
            style={{ opacity: 1 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="tool-btn !h-6 !w-6"
              title="Connect from here"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodes([id]);
                setPendingConnectSource({ nodeId: id });
                useEditor.getState().setActiveTool("arrow");
              }}
            >
              <Plus size={12} />
            </button>
            <button
              className="tool-btn !h-6 !w-6"
              title="Duplicate"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodes([id]);
                duplicateSelected();
              }}
            >
              <Copy size={12} />
            </button>
            <button
              className="tool-btn !h-6 !w-6"
              title="Comment (Inspector › Label)"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodes([id]);
              }}
            >
              <MessageSquare size={12} />
            </button>
            <button
              className="tool-btn !h-6 !w-6 hover:!bg-red-500/20 hover:!text-red-400"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodes([id]);
                deleteSelected();
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}

      {!presenting &&
        magneticSnap &&
        !isDraw &&
        !isImage &&
        (isConnectorMode || isConnecting) && (
          <div style={{ pointerEvents: "none" }}>
            {(() => {
              const insetPoint = (
                pt: { x: number; y: number },
                amount: number,
              ) => {
                const cx = w / 2;
                const cy = h / 2;
                const vx = pt.x - cx;
                const vy = pt.y - cy;
                const len = Math.hypot(vx, vy);
                if (len === 0) return pt;
                const newLen = Math.max(0, len - amount);
                return {
                  x: cx + (vx * newLen) / len,
                  y: cy + (vy * newLen) / len,
                };
              };

              const fixedPoints = shapeDef
                .getConnectionPoints(w, h)
                .map((p) => insetPoint(p, 4));

              let activePt = null;
              if (localMouse) {
                // Check if close to a fixed point
                let minD = Infinity;
                let closestFixed = null;
                for (const fp of fixedPoints) {
                  const d = Math.hypot(
                    fp.x - localMouse.x,
                    fp.y - localMouse.y,
                  );
                  if (d < 30 && d < minD) {
                    minD = d;
                    closestFixed = fp;
                  }
                }
                activePt =
                  closestFixed ||
                  insetPoint(
                    shapeDef.getClosestPoint(w, h, localMouse.x, localMouse.y),
                    4,
                  );
              }

              return (
                <>
                  {/* Render fixed points */}
                  {fixedPoints.map((fp, i) => (
                    <div
                      key={i}
                      className="absolute z-10 flex h-4 w-4 -ml-2 -mt-2 items-center justify-center rounded-full pointer-events-auto"
                      style={{ left: fp.x, top: fp.y }}
                    >
                      <div className="h-1 w-1 rounded-full bg-primary/40 shadow-sm" />
                    </div>
                  ))}

                  {/* Render active sliding/snapped point */}
                  {activePt && (
                    <div
                      className="absolute z-20 flex h-6 w-6 -ml-3 -mt-3 items-center justify-center rounded-full transition-transform hover:scale-125 cursor-crosshair pointer-events-auto"
                      style={{ left: activePt.x, top: activePt.y }}
                    >
                      <div className="h-2 w-2 rounded-full border border-[var(--color-primary)] bg-[var(--color-background)] shadow-sm" />
                      <Handle
                        id={`anchor-dynamic`}
                        type="source"
                        position={Position.Bottom}
                        isConnectable={!data.locked}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          border: "none",
                        }}
                      />
                      <Handle
                        id={`anchor-dynamic`}
                        type="target"
                        position={Position.Bottom}
                        isConnectable={!data.locked}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          border: "none",
                        }}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

      {/* Suppress unused warning */}
      {isText ? null : null}
    </div>
  );
}

export const ShapeNode = memo(ShapeNodeInner);
