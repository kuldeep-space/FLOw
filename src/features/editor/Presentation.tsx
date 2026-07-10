import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, Pencil, Settings2 } from "lucide-react";
import { useEditor } from "./store";
import { getFlowInstance } from "./Canvas";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SWATCHES = [
  "#a78bfa", "#60a5fa", "#22d3ee", "#34d399",
  "#fbbf24", "#fb7185", "#f472b6", "#e4e4e7",
  "#1c1917", "#ef4444", "#f97316", "#84cc16",
];

const SWATCH_MAP: Record<string, string> = {
  "#a78bfa": "purple", "#60a5fa": "blue", "#22d3ee": "cyan",
  "#34d399": "emerald", "#fbbf24": "amber", "#fb7185": "rose",
  "#f472b6": "pink", "#e4e4e7": "zinc", "#1c1917": "stone",
  "#ef4444": "red", "#f97316": "orange", "#84cc16": "lime",
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : null;
};

const rgbToHex = (rgbString: string) => {
  if (rgbString.startsWith("#")) return rgbString;
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#a78bfa";
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

function CompactPencilSettings() {
  const drawSettings = useEditor((s) => s.drawSettings);
  const setDrawSettings = useEditor((s) => s.setDrawSettings);

  return (
    <div className="flex flex-col gap-4 p-1 w-52">
      <div>
        <div className="text-[11px] font-medium text-foreground mb-2">Color</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SWATCHES.map((c) => {
            const colorName = SWATCH_MAP[c] || "purple";
            return (
              <button
                key={c}
                onClick={() => setDrawSettings({ color: `var(--shape-stroke-${colorName})` })}
                className="h-5 w-5 rounded border border-[var(--hairline)] transition-transform hover:scale-110"
                style={{ background: c }}
                title={colorName}
              />
            );
          })}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="text-[11px] font-medium text-foreground">Thickness</div>
          <span className="text-[10px] tabular-nums text-muted-foreground">{drawSettings.thickness}</span>
        </div>
        <input
          type="range"
          min={1}
          max={32}
          step={1}
          value={drawSettings.thickness}
          onChange={(e) => setDrawSettings({ thickness: Number(e.target.value) })}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="text-[11px] font-medium text-foreground">Glow Intensity</div>
          <span className="text-[10px] tabular-nums text-muted-foreground">{drawSettings.glowIntensity}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={drawSettings.glowIntensity}
          onChange={(e) => setDrawSettings({ glowIntensity: Number(e.target.value) })}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="text-[11px] font-medium text-foreground">Glow Opacity</div>
          <span className="text-[10px] tabular-nums text-muted-foreground">{drawSettings.glowOpacity ?? 1}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={drawSettings.glowOpacity ?? 1}
          onChange={(e) => setDrawSettings({ glowOpacity: Number(e.target.value) })}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>
    </div>
  );
}

export function Presentation() {
  const presenting = useEditor((s) => s.presenting);
  const setPresenting = useEditor((s) => s.setPresenting);
  const activeTool = useEditor((s) => s.activeTool);
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  
  // In presentation mode, we either have Laser or Pencil
  const laserOn = activeTool !== "pencil";

  useEffect(() => {
    if (!presenting) return;
    const rf = getFlowInstance();
    rf?.fitView({ padding: 0.15, duration: 400 });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key.toLowerCase() === "l") {
        setActiveTool("select");
      }
      if (e.key.toLowerCase() === "p") {
        setActiveTool("pencil");
      }
    };
    const onMove = (e: MouseEvent) =>
      setPointer({ x: e.clientX, y: e.clientY });
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
    };
  }, [presenting, setPresenting, setActiveTool]);

  return (
    <AnimatePresence>
      {presenting && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="pointer-events-none fixed inset-0 z-40"
            style={{
              background:
                "radial-gradient(1400px 700px at 50% 0%, transparent 50%, rgba(0,0,0,0.35))",
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-panel pointer-events-auto fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-[12px]"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Presenting
            </span>
            <div className="h-4 w-px bg-[var(--hairline)]" />
            
            <button
              onClick={() => setActiveTool("select")}
              className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${laserOn ? "bg-red-500/20 text-red-400 font-medium" : "text-muted-foreground hover:bg-white/5"}`}
              title="Toggle laser pointer (L)"
            >
              Laser {laserOn ? "on" : "off"}
            </button>

            <div className="flex items-center">
              <button
                onClick={() => setActiveTool("pencil")}
                className={`rounded-l-full px-2.5 py-1 text-[11px] transition-colors flex items-center gap-1.5 ${!laserOn ? "bg-purple-500/20 text-purple-400 font-medium" : "text-muted-foreground hover:bg-white/5"}`}
                title="Toggle Pencil (P)"
              >
                <Pencil size={12} /> Pencil {!laserOn ? "on" : "off"}
              </button>
              
              {!laserOn && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="rounded-r-full px-2 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border-l border-purple-500/20">
                      <Settings2 size={12} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" sideOffset={8}>
                    <CompactPencilSettings />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="h-4 w-px bg-[var(--hairline)]" />
            
            <button
              onClick={() => setPresenting(false)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2 py-1 text-[11px] hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <X size={12} /> Exit (Esc)
            </button>
          </motion.div>
          {laserOn && pointer && (
            <div
              className="pointer-events-none fixed z-50"
              style={{
                left: pointer.x,
                top: pointer.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <span
                className="block h-3 w-3 rounded-full bg-red-500"
                style={{
                  boxShadow:
                    "0 0 0 4px rgba(239,68,68,0.35), 0 0 22px 6px rgba(239,68,68,0.55)",
                }}
              />
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

