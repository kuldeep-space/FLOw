import { motion } from "framer-motion";
import {
  Undo2,
  Redo2,
  Grid3x3,
  Grid2x2,
  Magnet,
  Sun,
  Moon,
  Trash2,
  Play,
  Sparkles,
  Save,
  Search,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Layers as LayersIcon,
  Home,
} from "lucide-react";
import { useEditor } from "./store";
import { getFlowInstance } from "./Canvas";
import {
  exportPNG,
  exportSVG,
  exportPDF,
  exportJSON,
  copyPNGToClipboard,
  importJSONFile,
  openFileDialog,
} from "./exportImport";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function IconBtn({
  onClick,
  active,
  title,
  children,
  disabled,
  className = "",
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`tool-btn ${active ? "tool-btn-active" : ""} ${disabled ? "opacity-40" : ""} ${className}`}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <p className="text-[11px] font-medium tracking-wide">{title}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ExportMenu({ close }: { close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [close]);
  const item =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-[var(--color-accent)]";
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12 }}
      className="glass-panel absolute right-0 top-full z-30 mt-1 flex w-48 flex-col gap-0.5 rounded-xl p-1.5 text-foreground"
    >
      <button
        className={item}
        onClick={() => {
          exportPNG({ scale: 2 });
          close();
        }}
      >
        PNG (2×)
      </button>
      <button
        className={item}
        onClick={() => {
          exportPNG({ scale: 3, transparent: true });
          close();
        }}
      >
        PNG (3×, transparent)
      </button>
      <button
        className={item}
        onClick={() => {
          exportSVG();
          close();
        }}
      >
        SVG
      </button>
      <button
        className={item}
        onClick={() => {
          exportPDF();
          close();
        }}
      >
        PDF
      </button>
      <button
        className={item}
        onClick={() => {
          exportJSON();
          close();
        }}
      >
        JSON
      </button>
      <div className="my-1 h-px bg-[var(--hairline)]" />
      <button
        className={item}
        onClick={() => {
          copyPNGToClipboard();
          close();
        }}
      >
        Copy PNG to clipboard
      </button>
    </motion.div>
  );
}

export function TopBar() {
  const navigate = useNavigate();
  const projectName = useEditor((s) => s.projectName);
  const setProjectName = useEditor((s) => s.setProjectName);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const showGrid = useEditor((s) => s.showGrid);
  const setShowGrid = useEditor((s) => s.setShowGrid);
  const gridSnap = useEditor((s) => s.gridSnap);
  const setGridSnap = useEditor((s) => s.setGridSnap);
  const snapGridSize = useEditor((s) => s.snapGridSize);
  const setSnapGridSize = useEditor((s) => s.setSnapGridSize);
  const magneticSnap = useEditor((s) => s.magneticSnap);
  const setMagneticSnap = useEditor((s) => s.setMagneticSnap);
  const theme = useEditor((s) => s.theme);
  const toggleTheme = useEditor((s) => s.toggleTheme);
  const clear = useEditor((s) => s.clear);
  const showLayers = useEditor((s) => s.showLayers);
  const setShowLayers = useEditor((s) => s.setShowLayers);
  const setShowSearch = useEditor((s) => s.setShowSearch);
  const setPresenting = useEditor((s) => s.setPresenting);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const past = useEditor((s) => s.past.length);
  const future = useEditor((s) => s.future.length);
  const isDirty = useEditor((s) => s.isDirty);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const [exportOpen, setExportOpen] = useState(false);

  const handleImport = () => {
    openFileDialog(".json,application/json", (file) => importJSONFile(file));
  };

  const handleZoom = (delta: number) => {
    const rf = getFlowInstance();
    if (!rf) return;
    if (delta === 0) rf.fitView({ padding: 0.3, duration: 250 });
    else if (delta > 0) rf.zoomIn({ duration: 180 });
    else rf.zoomOut({ duration: 180 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel pointer-events-auto flex items-center gap-1.5 rounded-2xl px-2 py-1.5"
    >
      <div className="flex items-center gap-2 pr-1">
        <IconBtn
          onClick={() => {
            useEditor.getState().saveProject();
            navigate({ to: "/" });
          }}
          title="Back to Dashboard"
        >
          <Home size={16} strokeWidth={1.8} />
        </IconBtn>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_20px_-4px_rgba(167,139,250,0.6)]">
          <Sparkles size={14} strokeWidth={2.2} />
        </div>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-40 rounded-md bg-transparent px-1 text-[13px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground focus:bg-[var(--color-accent)]"
        />
      </div>
      <div className="h-5 w-px bg-[var(--hairline)]" />

      <IconBtn onClick={undo} title="Undo (⌘Z)" disabled={past === 0}>
        <Undo2 size={16} strokeWidth={1.8} />
      </IconBtn>
      <IconBtn onClick={redo} title="Redo (⇧⌘Z)" disabled={future === 0}>
        <Redo2 size={16} strokeWidth={1.8} />
      </IconBtn>
      <IconBtn onClick={() => setShowSearch(true)} title="Search (⌘K)">
        <Search size={16} strokeWidth={1.8} />
      </IconBtn>

      <div className="h-5 w-px bg-[var(--hairline)]" />

      <IconBtn onClick={() => handleZoom(-1)} title="Zoom out">
        <ZoomOut size={16} strokeWidth={1.8} />
      </IconBtn>
      <IconBtn onClick={() => handleZoom(1)} title="Zoom in">
        <ZoomIn size={16} strokeWidth={1.8} />
      </IconBtn>
      <IconBtn onClick={() => handleZoom(0)} title="Fit view">
        <Maximize2 size={16} strokeWidth={1.8} />
      </IconBtn>

      <div className="h-5 w-px bg-[var(--hairline)]" />

      <IconBtn
        onClick={() => setShowGrid(!showGrid)}
        active={showGrid}
        title="Toggle grid"
      >
        <Grid3x3 size={16} strokeWidth={1.8} />
      </IconBtn>
      <div className="flex items-center gap-0">
        <IconBtn
          onClick={() => setGridSnap(!gridSnap)}
          active={gridSnap}
          title="Snap to grid"
          className="rounded-r-none border-r-0"
        >
          <Grid2x2 size={16} strokeWidth={1.8} />
        </IconBtn>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex h-8 items-center justify-center rounded-r-md border border-[var(--hairline)] bg-[color-mix(in_oklab,var(--surface-elevated)_70%,transparent)] px-2 text-[10px] font-semibold tracking-wide text-muted-foreground hover:bg-[var(--color-accent)] hover:text-foreground outline-none transition-colors border-l-0"
              title="Change snap size"
            >
              {snapGridSize}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-panel border-[var(--hairline)] min-w-[5.5rem] p-1">
            {[8, 16, 32, 64, 128].map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => setSnapGridSize(size)}
                className="text-[11px] font-medium tracking-tight rounded-md cursor-pointer hover:bg-[var(--color-accent)] hover:text-foreground py-1 px-1.5 flex items-center justify-between"
              >
                <span>{size} px</span>
                {snapGridSize === size && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <IconBtn
        onClick={() => setMagneticSnap(!magneticSnap)}
        active={magneticSnap}
        title="Magnetic snap"
      >
        <Magnet size={16} strokeWidth={1.8} />
      </IconBtn>

      <div className="h-5 w-px bg-[var(--hairline)]" />

      <div className="relative">
        <IconBtn
          onClick={() => setExportOpen((v) => !v)}
          active={exportOpen}
          title="Export (⌘E)"
        >
          <Download size={16} strokeWidth={1.8} />
        </IconBtn>
        {exportOpen && <ExportMenu close={() => setExportOpen(false)} />}
      </div>

      <div className="flex-1" />

      <IconBtn onClick={toggleTheme} title="Toggle theme">
        {theme === "dark" ? (
          <Sun size={16} strokeWidth={1.8} />
        ) : (
          <Moon size={16} strokeWidth={1.8} />
        )}
      </IconBtn>

      <button
        onClick={() => setPresenting(true)}
        className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground shadow-[0_0_20px_-6px_rgba(167,139,250,0.6)] transition-transform hover:scale-[1.02]"
        title="Presentation mode (⌘P)"
      >
        <Play size={13} strokeWidth={2.2} fill="currentColor" />
        Present
      </button>
    </motion.div>
  );
}
