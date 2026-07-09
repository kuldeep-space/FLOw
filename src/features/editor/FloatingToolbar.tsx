import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useEditor } from "./store";
import { useStore, useReactFlow } from "@xyflow/react";
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  Palette,
  Type as TypeIcon,
} from "lucide-react";
import type { EdgeKind } from "./types";

const SWATCH_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
  "#e4e4e7",
];

function ColorPopover({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (c: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="glass-panel absolute top-full left-1/2 z-40 mt-2 flex -translate-x-1/2 items-center gap-1 rounded-xl p-1.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {SWATCH_COLORS.map((c) => (
        <button
          key={c}
          className="h-5 w-5 rounded-md border border-white/10 transition-transform hover:scale-110"
          style={{ background: c }}
          onClick={() => {
            onChange(c);
            onClose();
          }}
        />
      ))}
      <input
        type="color"
        value={value.startsWith("#") ? value.slice(0, 7) : "#a78bfa"}
        onChange={(e) => onChange(e.target.value)}
        className="ml-1 h-5 w-6 cursor-pointer rounded border-0 bg-transparent"
      />
    </motion.div>
  );
}

function NodeFloating({ nodeId }: { nodeId: string }) {
  const nodes = useEditor((s) => s.nodes);
  const updateShape = useEditor((s) => s.updateShape);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const toggleLock = useEditor((s) => s.toggleLock);
  const pushHistory = useEditor((s) => s.pushHistory);

  const node = nodes.find((n) => n.id === nodeId);
  const [openPop, setOpenPop] = useState<"fill" | "stroke" | "text" | null>(
    null,
  );
  if (!node) return null;

  const btn =
    "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--color-accent)] hover:text-foreground transition-colors";

  return (
    <>
      <div className="relative">
        <button
          className={btn}
          title="Fill color"
          onClick={() => setOpenPop(openPop === "fill" ? null : "fill")}
        >
          <div
            className="h-4 w-4 rounded"
            style={{
              background: node.data.fill || "#a78bfa22",
              border: "1px solid var(--hairline)",
            }}
          />
        </button>
        {openPop === "fill" && (
          <ColorPopover
            value={node.data.fill}
            onChange={(c) => {
              pushHistory();
              updateShape(nodeId, { fill: c + "22", stroke: c });
            }}
            onClose={() => setOpenPop(null)}
          />
        )}
      </div>
      <div className="relative">
        <button
          className={btn}
          title="Stroke color"
          onClick={() => setOpenPop(openPop === "stroke" ? null : "stroke")}
        >
          <div
            className="h-4 w-4 rounded"
            style={{ border: `2px solid ${node.data.stroke}` }}
          />
        </button>
        {openPop === "stroke" && (
          <ColorPopover
            value={node.data.stroke}
            onChange={(c) => {
              pushHistory();
              updateShape(nodeId, { stroke: c });
            }}
            onClose={() => setOpenPop(null)}
          />
        )}
      </div>
      <div className="relative">
        <button
          className={btn}
          title="Text color"
          onClick={() => setOpenPop(openPop === "text" ? null : "text")}
        >
          <TypeIcon size={14} style={{ color: node.data.textColor }} />
        </button>
        {openPop === "text" && (
          <ColorPopover
            value={node.data.textColor}
            onChange={(c) => {
              pushHistory();
              updateShape(nodeId, { textColor: c });
            }}
            onClose={() => setOpenPop(null)}
          />
        )}
      </div>

      <div className="mx-0.5 h-4 w-px bg-[var(--hairline)]" />

      <button
        className={btn}
        onClick={duplicateSelected}
        title="Duplicate (⌘D)"
      >
        <Copy size={14} />
      </button>
      <button
        className={btn}
        onClick={() => {
          pushHistory();
          toggleLock(node.id);
        }}
        title={node.data.locked ? "Unlock" : "Lock"}
      >
        {node.data.locked ? <Lock size={14} /> : <Unlock size={14} />}
      </button>
      <button
        className={`${btn} hover:!bg-red-500/20 hover:!text-red-400`}
        onClick={deleteSelected}
        title="Delete (⌫)"
      >
        <Trash2 size={14} />
      </button>
    </>
  );
}



export function FloatingToolbar() {
  const rf = useReactFlow();
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const selectedNodeIds = useEditor((s) => s.selectedNodeIds);
  const selectedEdgeIds = useEditor((s) => s.selectedEdgeIds);
  const presenting = useEditor((s) => s.presenting);

  const viewport = useStore((s) => s.transform);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const selectedNode = nodes.find((n) => selectedNodeIds.includes(n.id));
  const selectedEdgeId = selectedEdgeIds[0];
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  useEffect(() => {
    if (presenting) {
      setPos(null);
      return;
    }
    if (selectedNode && selectedNodeIds.length === 1) {
      const w = selectedNode.width ?? 180;
      const flowPoint = {
        x: selectedNode.position.x + w / 2,
        y: selectedNode.position.y,
      };
      const screen = rf.flowToScreenPosition(flowPoint);
      setPos({ x: screen.x, y: screen.y });
      return;
    }
    setPos(null);
  }, [selectedNode, selectedNodeIds.length, presenting, rf, viewport, nodes]);

  return (
    <AnimatePresence>
      {pos && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className="glass-panel pointer-events-auto fixed z-30 flex items-center gap-0.5 rounded-xl px-1.5 py-1"
          style={{
            left: pos.x,
            top: pos.y - 44,
            transform: "translate(-50%, 0)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          {selectedNode && selectedNodeIds.length === 1 && (
            <NodeFloating nodeId={selectedNode.id} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
