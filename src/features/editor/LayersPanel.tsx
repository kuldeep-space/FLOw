import { motion, AnimatePresence } from "framer-motion";
import { useEditor } from "./store";
import { Lock, Unlock, Eye, EyeOff, Trash2 } from "lucide-react";

const KIND_ICON: Record<string, string> = {
  rectangle: "▭",
  rounded: "▢",
  circle: "◯",
  ellipse: "◯",
  diamond: "◆",
  triangle: "△",
  hexagon: "⬡",
  pentagon: "⬠",
  star: "★",
  cylinder: "⛁",
  parallelogram: "▱",
  sticky: "🗒",
  text: "T",
  image: "🖼",
};

export function LayersPanel() {
  const show = useEditor((s) => s.showLayers);
  const nodes = useEditor((s) => s.nodes);
  const selectedNodeIds = useEditor((s) => s.selectedNodeIds);
  const setSelectedNodes = useEditor((s) => s.setSelectedNodes);
  const setNodes = useEditor((s) => s.setNodes);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleHidden = useEditor((s) => s.toggleHidden);
  const pushHistory = useEditor((s) => s.pushHistory);

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="glass-panel pointer-events-auto flex w-[240px] flex-col overflow-hidden rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-2.5">
            <div className="text-[12px] font-medium tracking-tight">Layers</div>
            <div className="text-[10px] tabular-nums text-muted-foreground">
              {nodes.length}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {nodes.length === 0 && (
              <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
                No layers yet. Drop a shape to begin.
              </div>
            )}
            {[...nodes].reverse().map((n) => {
              const selected = selectedNodeIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      setSelectedNodes([
                        ...new Set([...selectedNodeIds, n.id]),
                      ]);
                    } else {
                      setSelectedNodes([n.id]);
                    }
                    setNodes(
                      useEditor
                        .getState()
                        .nodes.map((x) => ({ ...x, selected: x.id === n.id })),
                    );
                  }}
                  className={`group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] ${
                    selected
                      ? "bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)]"
                      : "hover:bg-[var(--color-accent)]"
                  }`}
                >
                  <span className="w-4 text-center text-[11px] text-muted-foreground">
                    {KIND_ICON[n.data.kind] ?? "▭"}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{
                      color: n.data.hidden
                        ? "var(--color-muted-foreground)"
                        : undefined,
                    }}
                  >
                    {n.data.label || n.data.kind}
                  </span>
                  <button
                    className="opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      pushHistory();
                      toggleHidden(n.id);
                    }}
                    title={n.data.hidden ? "Show" : "Hide"}
                  >
                    {n.data.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    className="opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      pushHistory();
                      toggleLock(n.id);
                    }}
                    title={n.data.locked ? "Unlock" : "Lock"}
                  >
                    {n.data.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodes([n.id]);
                      useEditor.getState().deleteSelected();
                    }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
