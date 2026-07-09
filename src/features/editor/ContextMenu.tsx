import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  BringToFront,
  SendToBack,
  ChevronRight,
  Plus,
  MessageSquare,
  Palette,
  Paintbrush,
  Type,
} from "lucide-react";
import { useEditor } from "./store";

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

function ColorRow({ title, value, onChange, icon: Icon, openLeft }: { title: string, value: string, onChange: (c: string) => void, icon?: any, openLeft?: boolean }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div 
      className="relative flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--color-accent)] cursor-pointer rounded-md transition-colors w-full text-left"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {Icon && <Icon size={13} />}
      <span className="flex-1 text-[12px]">{title}</span>
      <ChevronRight size={13} className="text-muted-foreground" />
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: openLeft ? 5 : -5, y: "-50%" }}
            animate={{ opacity: 1, x: 0, y: "-50%" }}
            exit={{ opacity: 0, x: openLeft ? 5 : -5, y: "-50%" }}
            transition={{ duration: 0.1 }}
            className={`absolute ${openLeft ? "right-full mr-1" : "left-full ml-1"} top-1/2 z-50 glass-panel rounded-xl p-1.5 flex gap-1 flex-wrap shadow-xl border border-[var(--hairline)]`}
            style={{ width: "136px" }}
          >
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                className="h-5 w-5 rounded-md border border-black/10 dark:border-white/10 transition-transform hover:scale-110"
                style={{ background: c }}
                onClick={(e) => { e.stopPropagation(); onChange(c); }}
              />
            ))}
            <input
              type="color"
              value={value.startsWith("#") ? value.slice(0, 7) : "#a78bfa"}
              onChange={(e) => onChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="ml-1 h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Item =
  | { kind: "sep" }
  | {
      kind: "item";
      icon?: React.ComponentType<{ size?: number }>;
      label: string;
      shortcut?: string;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | {
      kind: "custom";
      render: () => React.ReactNode;
    };

export function ContextMenu() {
  const menu = useEditor((s) => s.contextMenu);
  const close = useEditor((s) => s.closeContextMenu);
  const nodes = useEditor((s) => s.nodes);
  const copySelected = useEditor((s) => s.copySelected);
  const paste = useEditor((s) => s.paste);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const bringToFront = useEditor((s) => s.bringToFront);
  const sendToBack = useEditor((s) => s.sendToBack);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleHidden = useEditor((s) => s.toggleHidden);
  const setSelectedNodes = useEditor((s) => s.setSelectedNodes);
  const setSelectedEdges = useEditor((s) => s.setSelectedEdges);
  const setSelectedBendPointId = useEditor((s) => s.setSelectedBendPointId);
  const updateBendPoint = useEditor((s) => s.updateBendPoint);
  const removeBendPoint = useEditor((s) => s.removeBendPoint);
  const updateEdge = useEditor((s) => s.updateEdge);
  const updateEdgeExtras = useEditor((s) => s.updateEdgeExtras);
  const edges = useEditor((s) => s.edges);
  const updateShape = useEditor((s) => s.updateShape);

  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [openSubmenuLeft, setOpenSubmenuLeft] = useState(false);

  useLayoutEffect(() => {
    if (menu && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      let x = menu.x;
      let y = menu.y;

      if (x + rect.width > window.innerWidth - 15) {
        x = window.innerWidth - rect.width - 15;
      }
      if (y + rect.height > window.innerHeight - 15) {
        y = window.innerHeight - rect.height - 15;
      }

      x = Math.max(15, x);
      y = Math.max(15, y);

      setOpenSubmenuLeft(x + rect.width > window.innerWidth - 150);

      setPos({ x, y });
    } else {
      setPos(null);
    }
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, close]);

  if (!menu) return null;

  const targetNode = menu.nodeId
    ? nodes.find((n) => n.id === menu.nodeId)
    : null;

  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const onTarget = !!menu.nodeId || !!menu.edgeId;

  // Ensure target is selected before action
  const ensureSelected = () => {
    if (menu.nodeId) {
      setSelectedNodes([menu.nodeId]);
      setSelectedEdges([]);
    } else if (menu.edgeId) {
      if (menu.bendPointId) {
        setSelectedBendPointId({
          edgeId: menu.edgeId,
          pointId: menu.bendPointId,
        });
      } else {
        setSelectedEdges([menu.edgeId]);
        setSelectedNodes([]);
      }
    }
  };

  let items: Item[] = onTarget
    ? [
        {
          kind: "item",
          icon: Scissors,
          label: "Cut",
          shortcut: "⌘X",
          onClick: () => {
            ensureSelected();
            copySelected();
            deleteSelected();
          },
        },
        {
          kind: "item",
          icon: Copy,
          label: "Copy",
          shortcut: "⌘C",
          onClick: () => {
            ensureSelected();
            copySelected();
          },
        },
        {
          kind: "item",
          icon: ClipboardPaste,
          label: "Paste",
          shortcut: "⌘V",
          onClick: () => paste(),
        },
        {
          kind: "item",
          icon: Copy,
          label: "Duplicate",
          shortcut: "⌘D",
          onClick: () => {
            ensureSelected();
            duplicateSelected();
          },
        },
        ...(targetNode
          ? [
              { kind: "sep" as const },
              {
                kind: "custom" as const,
                render: () => (
                  <div className="flex flex-col p-0.5">
                    <ColorRow
                      title="Fill Color"
                      icon={Palette}
                      value={targetNode.data.fill || "#a78bfa22"}
                      onChange={(c) => updateShape(targetNode.id, { fill: c + "33", stroke: c })}
                      openLeft={openSubmenuLeft}
                    />
                    <ColorRow
                      title="Stroke Color"
                      icon={Paintbrush}
                      value={targetNode.data.stroke || "#a78bfa"}
                      onChange={(c) => updateShape(targetNode.id, { stroke: c })}
                      openLeft={openSubmenuLeft}
                    />
                    <ColorRow
                      title="Text Color"
                      icon={Type}
                      value={targetNode.data.textColor || "#000000"}
                      onChange={(c) => updateShape(targetNode.id, { textColor: c })}
                      openLeft={openSubmenuLeft}
                    />
                  </div>
                ),
              },
              { kind: "sep" as const },
            ]
          : []),
        {
          kind: "item",
          icon: BringToFront,
          label: "Bring to front",
          shortcut: "]",
          onClick: () => {
            ensureSelected();
            bringToFront();
          },
        },
        {
          kind: "item",
          icon: SendToBack,
          label: "Send to back",
          shortcut: "[",
          onClick: () => {
            ensureSelected();
            sendToBack();
          },
        },
        { kind: "sep" },
        {
          kind: "item",
          icon: targetNode?.data.locked ? Unlock : Lock,
          label: targetNode?.data.locked ? "Unlock" : "Lock",
          onClick: () => menu.nodeId && toggleLock(menu.nodeId),
          disabled: !menu.nodeId,
        },
        {
          kind: "item",
          icon: targetNode?.data.hidden ? Eye : EyeOff,
          label: targetNode?.data.hidden ? "Show" : "Hide",
          onClick: () => menu.nodeId && toggleHidden(menu.nodeId),
          disabled: !menu.nodeId,
        },
        { kind: "sep" },
        {
          kind: "item",
          icon: Trash2,
          label: "Delete",
          shortcut: "⌫",
          danger: true,
          onClick: () => {
            ensureSelected();
            deleteSelected();
          },
        },
      ]
    : [];

  if (menu.bendPointId && menu.edgeId) {
    items = [
      {
        kind: "item",
        icon: Trash2,
        label: "Delete Point",
        shortcut: "⌫",
        danger: true,
        onClick: run(() => {
          removeBendPoint(menu.edgeId!, menu.bendPointId!);
        }),
      },
    ];
  } else if (menu.edgeId) {
    const edge = edges.find((e) => e.id === menu.edgeId);
    if (edge) {
      const extras = edge.data ?? {};
      items = [
        {
          kind: "custom",
          render: () => (
            <div className="flex flex-col gap-2 p-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">
                Edge Style
              </div>
              <div className="flex overflow-hidden rounded-md bg-[var(--color-accent)] mb-1">
                {[
                  { id: "straight", label: "Line" },
                  { id: "step", label: "Ortho" },
                  { id: "simplebezier", label: "Curve" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => updateEdge(menu.edgeId!, { type: p.id })}
                    className={`flex-1 px-1 py-1 text-[10px] font-medium transition-colors ${
                      (edge.type ?? "smoothstep") === p.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="flex flex-1 h-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-muted-foreground hover:bg-[var(--color-accent)]/80 hover:text-foreground transition-colors"
                  title="Toggle start arrow"
                  onClick={() =>
                    updateEdgeExtras(menu.edgeId!, {
                      arrowStart: !extras.arrowStart,
                    })
                  }
                >
                  <span className="text-[10px] font-bold">←</span>
                </button>
                <button
                  className="flex flex-1 h-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-muted-foreground hover:bg-[var(--color-accent)]/80 hover:text-foreground transition-colors"
                  title="Toggle end arrow"
                  onClick={() =>
                    updateEdgeExtras(menu.edgeId!, {
                      arrow: extras.arrow === false,
                    })
                  }
                >
                  <span className="text-[10px] font-bold">→</span>
                </button>
                <button
                  className="flex flex-1 h-7 items-center justify-center rounded-md bg-[var(--color-accent)] text-muted-foreground hover:bg-[var(--color-accent)]/80 hover:text-foreground transition-colors"
                  title="Toggle dashed"
                  onClick={() =>
                    updateEdgeExtras(menu.edgeId!, {
                      dashed: !extras.dashed,
                      dotted: false,
                    })
                  }
                >
                  <span className="text-[10px] font-bold">--</span>
                </button>
              </div>
              <div className="px-1 mt-1">
                <input
                  placeholder="Label..."
                  value={extras.label || ""}
                  onChange={(e) =>
                    updateEdgeExtras(menu.edgeId!, { label: e.target.value })
                  }
                  className="w-full rounded-md bg-[var(--color-accent)] px-2 py-1.5 text-[11px] outline-none border border-transparent focus:border-[var(--color-primary)] transition-colors"
                  onClick={(e) => e.stopPropagation()} // Prevent closing context menu
                  onKeyDown={(e) => e.stopPropagation()} // Prevent key events propagating
                />
              </div>
            </div>
          ),
        },
        { kind: "sep" },
        {
          kind: "item",
          icon: Trash2,
          label: "Delete Edge",
          shortcut: "⌫",
          danger: true,
          onClick: run(() => {
            ensureSelected();
            deleteSelected();
          }),
        },
      ];
    }
  }
  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className="glass-panel pointer-events-auto fixed z-50 min-w-[220px] rounded-xl p-1 text-[12px]"
        style={{ left: pos?.x ?? menu.x, top: pos?.y ?? menu.y, visibility: pos ? "visible" : "hidden" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((it, idx) => {
          if (it.kind === "sep") {
            return <div key={idx} className="my-1 h-px bg-[var(--hairline)]" />;
          }
          if (it.kind === "custom") {
            return <div key={idx}>{it.render()}</div>;
          }
          const Icon = it.icon ?? ChevronRight;
          return (
            <button
              key={idx}
              disabled={it.disabled}
              onClick={run(it.onClick)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                it.disabled
                  ? "opacity-40"
                  : it.danger
                    ? "hover:bg-red-500/15 hover:text-red-400"
                    : "hover:bg-[var(--color-accent)]"
              }`}
            >
              <Icon size={13} />
              <span className="flex-1">{it.label}</span>
              {it.shortcut && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {it.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
