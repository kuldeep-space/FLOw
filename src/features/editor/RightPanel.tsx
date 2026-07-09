import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ChevronDown,
  ChevronsRight,
  X,
  FlipHorizontal,
  FlipVertical,
  PanelRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceAround,
  AlignVerticalJustifyEnd,
  ArrowLeftRight,
  ArrowUpDown,
} from "lucide-react";
import { useEditor } from "./store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EdgeKind, ShapeData } from "./types";

const SWATCHES = [
  "#a78bfa",
  "#60a5fa",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f472b6",
  "#e4e4e7",
  "#1c1917",
  "#ef4444",
  "#f97316",
  "#84cc16",
];

const EDGE_TYPES: { id: EdgeKind; label: string }[] = [
  { id: "smoothstep", label: "Orthogonal" },
  { id: "simplebezier", label: "Curve" },
  { id: "straight", label: "Straight" },
];

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--hairline)] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-[var(--color-accent)]"}`}
    >
      <span
        className="block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: `translateX(${value ? 18 : 2}px)` }}
      />
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-[6px] border border-[var(--hairline)] bg-[var(--color-accent)] px-1.5 font-mono text-[10px] text-foreground">
      {children}
    </span>
  );
}

function ShapeInspector({ id, data }: { id: string; data: ShapeData }) {
  const updateShape = useEditor((s) => s.updateShape);
  const pushHistory = useEditor((s) => s.pushHistory);
  const bringToFront = useEditor((s) => s.bringToFront);
  const sendToBack = useEditor((s) => s.sendToBack);
  const selectedNodeIds = useEditor((s) => s.selectedNodeIds);
  const alignNodes = useEditor((s) => s.alignNodes);
  const distributeNodes = useEditor((s) => s.distributeNodes);
  const set = (patch: Partial<ShapeData>) => updateShape(id, patch);

  const isImage = data.kind === "image";
  const isText = data.kind === "text";

  return (
    <>
      {selectedNodeIds.length >= 2 && (
        <Section title="Arrange">
          <Row label="Align">
            <div className="flex items-center gap-1">
              <button
                onClick={() => alignNodes("left")}
                className="tool-btn !h-6 !w-6"
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                onClick={() => alignNodes("center")}
                className="tool-btn !h-6 !w-6"
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                onClick={() => alignNodes("right")}
                className="tool-btn !h-6 !w-6"
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>
              <div className="w-px h-4 bg-[var(--hairline)] mx-1" />
              <button
                onClick={() => alignNodes("top")}
                className="tool-btn !h-6 !w-6"
                title="Align Top"
              >
                <AlignTop size={14} />
              </button>
              <button
                onClick={() => alignNodes("middle")}
                className="tool-btn !h-6 !w-6"
                title="Align Middle"
              >
                <AlignVerticalSpaceAround size={14} />
              </button>
              <button
                onClick={() => alignNodes("bottom")}
                className="tool-btn !h-6 !w-6"
                title="Align Bottom"
              >
                <AlignBottom size={14} />
              </button>
            </div>
          </Row>
          {selectedNodeIds.length >= 3 && (
            <Row label="Distribute">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => distributeNodes("horizontal")}
                  className="tool-btn !h-6 !w-6"
                  title="Distribute Horizontally"
                >
                  <ArrowLeftRight size={14} />
                </button>
                <button
                  onClick={() => distributeNodes("vertical")}
                  className="tool-btn !h-6 !w-6"
                  title="Distribute Vertically"
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </Row>
          )}
        </Section>
      )}

      <Section title="Shape">
        <Row label="Type">
          <span className="text-[12px] capitalize text-foreground">
            {data.kind}
          </span>
        </Row>
        {!isImage && (
          <Row label="Label">
            <input
              value={data.label}
              onChange={(e) => set({ label: e.target.value })}
              onFocus={pushHistory}
              className="w-40 rounded-md bg-[var(--color-accent)] px-2 py-1 text-[12px] outline-none focus:ring-1 focus:ring-primary"
            />
          </Row>
        )}
      </Section>

      {!isImage && (
        <>
          <Section title="Fill">
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    pushHistory();
                    set({ fill: c + "22", stroke: c });
                  }}
                  className="h-6 w-6 rounded-md border border-[var(--hairline)] transition-transform hover:scale-110"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={rgbToHex(data.fill)}
                onChange={(e) => set({ fill: e.target.value })}
                className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
              <input
                value={data.fill}
                onChange={(e) => set({ fill: e.target.value })}
                className="flex-1 rounded-md bg-[var(--color-accent)] px-2 py-1 font-mono text-[11px] outline-none"
              />
            </div>
          </Section>

          {!isText && (
            <Section title="Stroke">
              <Row label="Color">
                <input
                  type="color"
                  value={
                    data.stroke === "transparent" ? "#a78bfa" : data.stroke
                  }
                  onChange={(e) => set({ stroke: e.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
                />
              </Row>
              <Row label="Width">
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={0.5}
                  value={data.strokeWidth}
                  onChange={(e) => set({ strokeWidth: Number(e.target.value) })}
                  className="w-24 accent-[var(--color-primary)]"
                />
                <span className="w-6 text-right text-[11px] tabular-nums text-muted-foreground">
                  {data.strokeWidth}
                </span>
              </Row>
              <Row label="Dashed">
                <Toggle
                  value={!!data.dashed}
                  onChange={(v) => set({ dashed: v })}
                />
              </Row>
            </Section>
          )}

          <Section title="Typography">
            <Row label="Color">
              <input
                type="color"
                value={data.textColor}
                onChange={(e) => set({ textColor: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
            </Row>
            <Row label="Size">
              <input
                type="range"
                min={10}
                max={48}
                step={1}
                value={data.fontSize}
                onChange={(e) => set({ fontSize: Number(e.target.value) })}
                className="w-24 accent-[var(--color-primary)]"
              />
              <span className="w-6 text-right text-[11px] tabular-nums text-muted-foreground">
                {data.fontSize}
              </span>
            </Row>
            <Row label="Weight">
              <select
                value={data.fontWeight}
                onChange={(e) => set({ fontWeight: Number(e.target.value) })}
                className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-[12px] outline-none"
              >
                {[400, 500, 600, 700, 800].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Align">
              <div className="flex overflow-hidden rounded-md bg-[var(--color-accent)]">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => set({ fontAlign: a })}
                    className={`px-2 py-1 text-[11px] capitalize ${data.fontAlign === a ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Row>
          </Section>
        </>
      )}

      {isImage && (
        <Section title="Image">
          <Row label="Brightness">
            <input
              type="range"
              min={0}
              max={200}
              value={data.brightness ?? 100}
              onChange={(e) => set({ brightness: Number(e.target.value) })}
              className="w-24 accent-[var(--color-primary)]"
            />
            <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
              {data.brightness ?? 100}
            </span>
          </Row>
          <Row label="Contrast">
            <input
              type="range"
              min={0}
              max={200}
              value={data.contrast ?? 100}
              onChange={(e) => set({ contrast: Number(e.target.value) })}
              className="w-24 accent-[var(--color-primary)]"
            />
            <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
              {data.contrast ?? 100}
            </span>
          </Row>
          <Row label="Blur">
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={data.blur ?? 0}
              onChange={(e) => set({ blur: Number(e.target.value) })}
              className="w-24 accent-[var(--color-primary)]"
            />
            <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
              {data.blur ?? 0}
            </span>
          </Row>
          <Row label="Radius">
            <input
              type="range"
              min={0}
              max={64}
              value={data.radius ?? 8}
              onChange={(e) => set({ radius: Number(e.target.value) })}
              className="w-24 accent-[var(--color-primary)]"
            />
            <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
              {data.radius ?? 8}
            </span>
          </Row>
          <Row label="Flip">
            <button
              className={`tool-btn ${data.flipH ? "tool-btn-active" : ""}`}
              onClick={() => set({ flipH: !data.flipH })}
              title="Flip horizontal"
            >
              <FlipHorizontal size={14} />
            </button>
            <button
              className={`tool-btn ${data.flipV ? "tool-btn-active" : ""}`}
              onClick={() => set({ flipV: !data.flipV })}
              title="Flip vertical"
            >
              <FlipVertical size={14} />
            </button>
          </Row>
        </Section>
      )}

      <Section title="Effects">
        <Row label="Shadow">
          <Toggle value={!!data.shadow} onChange={(v) => set({ shadow: v })} />
        </Row>
        <Row label="Opacity">
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={data.opacity}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
            className="w-24 accent-[var(--color-primary)]"
          />
          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
            {Math.round(data.opacity * 100)}%
          </span>
        </Row>
        <Row label="Rotation">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={data.rotation}
            onChange={(e) => set({ rotation: Number(e.target.value) })}
            className="w-24 accent-[var(--color-primary)]"
          />
          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
            {data.rotation}°
          </span>
        </Row>
      </Section>

      <Section title="Arrange" defaultOpen={false}>
        <Row label="Order">
          <button
            className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-[11px] hover:bg-primary hover:text-primary-foreground"
            onClick={bringToFront}
          >
            Bring front
          </button>
          <button
            className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-[11px] hover:bg-primary hover:text-primary-foreground"
            onClick={sendToBack}
          >
            Send back
          </button>
        </Row>
        <Row label="Lock">
          <Toggle value={!!data.locked} onChange={(v) => set({ locked: v })} />
        </Row>
      </Section>
    </>
  );
}

function EdgeInspector({ id }: { id: string }) {
  const edge = useEditor((s) => s.edges.find((e) => e.id === id));
  const updateEdge = useEditor((s) => s.updateEdge);
  const updateEdgeExtras = useEditor((s) => s.updateEdgeExtras);
  if (!edge) return null;
  const extras = edge.data ?? {};

  return (
    <>
      <Section title="Connector">
        <Row label="Label">
          <input
            value={extras.label ?? ""}
            onChange={(e) => updateEdgeExtras(id, { label: e.target.value })}
            className="w-40 rounded-md bg-[var(--color-accent)] px-2 py-1 text-[12px] outline-none focus:ring-1 focus:ring-primary"
            placeholder="Add label"
          />
        </Row>
      </Section>

      <Section title="Stroke">
        <Row label="Color">
          <input
            type="color"
            value={extras.color ?? "#a78bfa"}
            onChange={(e) => updateEdgeExtras(id, { color: e.target.value })}
            className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent"
          />
        </Row>
        <Row label="Width">
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={extras.width ?? 2}
            onChange={(e) =>
              updateEdgeExtras(id, { width: Number(e.target.value) })
            }
            className="w-24 accent-[var(--color-primary)]"
          />
          <span className="w-6 text-right text-[11px] tabular-nums text-muted-foreground">
            {extras.width ?? 2}
          </span>
        </Row>
        <Row label="Dashed">
          <Toggle
            value={!!extras.dashed}
            onChange={(v) => updateEdgeExtras(id, { dashed: v, dotted: false })}
          />
        </Row>
        <Row label="Dotted">
          <Toggle
            value={!!extras.dotted}
            onChange={(v) => updateEdgeExtras(id, { dotted: v, dashed: false })}
          />
        </Row>
        <Row label="Animated">
          <Toggle
            value={!!extras.animated}
            onChange={(v) => updateEdgeExtras(id, { animated: v })}
          />
        </Row>
      </Section>

      <Section title="Arrowheads">
        <Row label="End">
          <Toggle
            value={extras.arrow !== false}
            onChange={(v) => updateEdgeExtras(id, { arrow: v })}
          />
        </Row>
        <Row label="Start">
          <Toggle
            value={!!extras.arrowStart}
            onChange={(v) => updateEdgeExtras(id, { arrowStart: v })}
          />
        </Row>
      </Section>
    </>
  );
}

function rgbToHex(v: string) {
  if (!v) return "#a78bfa";
  if (v.startsWith("#")) return v.slice(0, 7);
  return "#a78bfa";
}

function EmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center"
    >
      <div className="mb-3 text-[13px] font-medium text-foreground">
        Nothing selected
      </div>
      <div className="text-[11px] leading-relaxed text-muted-foreground">
        Pick a tool on the left, drop a shape on the canvas, then select a Connector tool (like Arrow)
        to reveal <span className="text-primary">magnetic anchors</span> on the shapes and drag to connect.
      </div>
      <div className="mt-6 grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
        <Kbd>V</Kbd>
        <span className="text-left">Select</span>
        <Kbd>R</Kbd>
        <span className="text-left">Rectangle</span>
        <Kbd>T</Kbd>
        <span className="text-left">Text</span>
        <Kbd>S</Kbd>
        <span className="text-left">Sticky</span>
        <Kbd>L</Kbd>
        <span className="text-left">Line</span>
        <Kbd>A</Kbd>
        <span className="text-left">Arrow</span>
        <Kbd>O</Kbd>
        <span className="text-left">Orthogonal</span>
        <Kbd>C</Kbd>
        <span className="text-left">Curved</span>
        <Kbd>P</Kbd>
        <span className="text-left">Pencil</span>
        <Kbd>E</Kbd>
        <span className="text-left">Eraser</span>
        <Kbd>⌘S</Kbd>
        <span className="text-left">Save</span>
        <Kbd>⌘D</Kbd>
        <span className="text-left">Duplicate</span>
        <Kbd>⌫</Kbd>
        <span className="text-left">Delete</span>
      </div>
    </motion.div>
  );
}

function CursorCoordinates() {
  const cursor = useEditor((s) => s.cursor);
  return (
    <div className="border-t border-[var(--hairline)] px-4 py-2 font-mono text-[10px] tabular-nums text-muted-foreground">
      x {Math.round(cursor.x)} · y {Math.round(cursor.y)}
    </div>
  );
}

export function RightPanel() {
  const selectedNode = useEditor((s) =>
    s.nodes.find((n) => s.selectedNodeIds.includes(n.id) && n.type === "shape"),
  ) as import("./store").ShapeNode | undefined;
  const selectedEdgeIds = useEditor((s) => s.selectedEdgeIds);
  const zoom = useEditor((s) => s.zoom);
  const showInspector = useEditor((s) => s.showInspector);
  const setShowInspector = useEditor((s) => s.setShowInspector);
  const inspectorCollapsed = useEditor((s) => s.inspectorCollapsed);
  const setInspectorCollapsed = useEditor((s) => s.setInspectorCollapsed);

  const selectedEdgeId = selectedEdgeIds[0];

  if (!showInspector) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowInspector(true)}
            className="glass-panel pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
          >
            <PanelRight size={15} />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          <p className="text-[11px] font-medium tracking-wide">
            Show inspector (Ctrl+])
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (inspectorCollapsed) {
    return (
      <motion.aside
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-panel pointer-events-auto flex w-11 flex-col items-center gap-1 rounded-2xl py-2"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="tool-btn"
              onClick={() => setInspectorCollapsed(false)}
            >
              <ChevronsRight size={14} className="rotate-180" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={12}>
            <p className="text-[11px] font-medium tracking-wide">
              Expand inspector
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="tool-btn"
              onClick={() => setShowInspector(false)}
            >
              <X size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={12}>
            <p className="text-[11px] font-medium tracking-wide">
              Hide inspector (Ctrl+])
            </p>
          </TooltipContent>
        </Tooltip>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel pointer-events-auto flex w-[264px] flex-col overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="text-[12px] font-medium tracking-tight">
            Inspector
          </div>
          <div className="text-[10px] tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--color-accent)] hover:text-foreground active:scale-95 transition-transform"
                onClick={() => setInspectorCollapsed(true)}
              >
                <ChevronsRight size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p className="text-[11px] font-medium tracking-wide">Collapse</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--color-accent)] hover:text-foreground active:scale-95 transition-transform"
                onClick={() => setShowInspector(false)}
              >
                <X size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              <p className="text-[11px] font-medium tracking-wide">
                Close (Ctrl+])
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedNode ? (
          <motion.div
            key={"n-" + selectedNode.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="flex-1 overflow-y-auto"
          >
            <ShapeInspector id={selectedNode.id} data={selectedNode.data} />
          </motion.div>
        ) : selectedEdgeId ? (
          <motion.div
            key={"e-" + selectedEdgeId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="flex-1 overflow-y-auto"
          >
            <EdgeInspector id={selectedEdgeId} />
          </motion.div>
        ) : (
          <EmptyState />
        )}
      </AnimatePresence>

      <CursorCoordinates />
    </motion.aside>
  );
}
