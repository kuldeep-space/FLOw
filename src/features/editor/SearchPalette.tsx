import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useEditor } from "./store";
import { getFlowInstance } from "./Canvas";

export function SearchPalette() {
  const show = useEditor((s) => s.showSearch);
  const setShow = useEditor((s) => s.setShowSearch);
  const nodes = useEditor((s) => s.nodes);
  const setSelectedNodes = useEditor((s) => s.setSelectedNodes);
  const setNodes = useEditor((s) => s.setNodes);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [show]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const shapeNodes = nodes.filter(
      (n) => n.type === "shape",
    ) as import("./store").ShapeNode[];
    if (!query) return shapeNodes.slice(0, 20);
    return shapeNodes
      .filter(
        (n) =>
          n.data.label.toLowerCase().includes(query) ||
          n.data.kind.toLowerCase().includes(query),
      )
      .slice(0, 20);
  }, [q, nodes]);

  const jumpTo = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    setSelectedNodes([id]);
    setNodes(nodes.map((x) => ({ ...x, selected: x.id === id })));
    const rf = getFlowInstance();
    const w = (n as import("./store").ShapeNode).width ?? 180;
    const h = (n as import("./store").ShapeNode).height ?? 100;
    rf?.setCenter(n.position.x + w / 2, n.position.y + h / 2, {
      zoom: 1.2,
      duration: 320,
    });
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel w-[520px] max-w-[90vw] overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search shapes and labels…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShow(false);
                  if (e.key === "Enter" && results[0]) jumpTo(results[0].id);
                }}
              />
              <kbd className="rounded-md border border-[var(--hairline)] bg-[var(--color-accent)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Esc
              </kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-1">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                  No matches
                </div>
              ) : (
                results.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => jumpTo(n.id)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-[12px] hover:bg-[var(--color-accent)]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: n.data.stroke }}
                    />
                    <span className="flex-1 truncate">
                      {n.data.label || "(untitled)"}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {n.data.kind}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
