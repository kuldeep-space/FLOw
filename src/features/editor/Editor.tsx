import { useEffect, useRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Toaster, toast } from "sonner";
import { Canvas, getFlowInstance } from "./Canvas";
import { LeftToolbar } from "./LeftToolbar";
import { TopBar } from "./TopBar";
import { RightPanel } from "./RightPanel";
import { LayersPanel } from "./LayersPanel";
import { SearchPalette } from "./SearchPalette";
import { Presentation } from "./Presentation";
import { useEditor, type Tool } from "./store";
import {
  exportPNG,
  exportJSON,
  importImageFile,
  importJSONFile,
  openFileDialog,
} from "./exportImport";
import { ContextMenu } from "./ContextMenu";

const shortcutMap: Record<string, Tool> = {
  v: "select",
  r: "rectangle",
  t: "text",
  s: "sticky",
  l: "line",
  a: "arrow",
  o: "orthogonal",
  c: "curved",
  p: "pencil",
  h: "highlighter",
  e: "eraser",
};

function EditorInner() {
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const copySelected = useEditor((s) => s.copySelected);
  const paste = useEditor((s) => s.paste);
  const selectAll = useEditor((s) => s.selectAll);
  const setShowSearch = useEditor((s) => s.setShowSearch);
  const setPresenting = useEditor((s) => s.setPresenting);
  const presenting = useEditor((s) => s.presenting);
  const isDirty = useEditor((s) => s.isDirty);

  const seededRef = useRef(false);
  const theme = useEditor((s) => s.theme);

  // Sync theme class with document root on mount/change
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // Autosave every 4s when dirty
  useEffect(() => {
    const t = setInterval(() => {
      if (useEditor.getState().isDirty) {
        useEditor.getState().saveProject();
      }
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;

      // Presentation exit handled in Presentation component
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        paste();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        useEditor.getState().saveProject();
        toast.success("Saved");
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (e.shiftKey) exportJSON();
        else exportPNG({ scale: 2 });
        return;
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFileDialog(".json,application/json", (f) => importJSONFile(f));
        return;
      }
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPresenting(true);
        return;
      }
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        getFlowInstance()?.zoomIn({ duration: 160 });
        return;
      }
      if (mod && e.key === "-") {
        e.preventDefault();
        getFlowInstance()?.zoomOut({ duration: 160 });
        return;
      }
      if (mod && e.key === "0") {
        e.preventDefault();
        getFlowInstance()?.fitView({ padding: 0.3, duration: 240 });
        return;
      }
      if (mod && e.key === "]") {
        e.preventDefault();
        useEditor.getState().toggleInspector();
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        useEditor.getState().toggleLeftToolbar();
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        useEditor.getState().setPendingConnectSource(null);
        useEditor.getState().closeContextMenu();
        setActiveTool("select");
        return;
      }
      const t2 = shortcutMap[e.key.toLowerCase()];
      if (t2) setActiveTool(t2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    setActiveTool,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    copySelected,
    paste,
    selectAll,
    setShowSearch,
    setPresenting,
  ]);

  // Paste image from clipboard directly onto the canvas
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const rf = getFlowInstance();
          const center = rf
            ? rf.screenToFlowPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
              })
            : { x: 0, y: 0 };
          await importImageFile(file, center);
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Warn on unload if dirty
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% -10%, rgba(139,92,246,0.14), transparent 60%), radial-gradient(900px 500px at 110% 110%, rgba(34,211,238,0.10), transparent 60%)",
        }}
      />
      <Canvas />

      {!presenting && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
            <TopBar />
          </div>
          <ConditionalLeftToolbar />
          <div className="pointer-events-none absolute right-3 top-16 bottom-14 z-20 flex">
            <RightPanel />
          </div>
          <div className="pointer-events-none absolute left-16 top-16 bottom-14 z-20 flex">
            <LayersPanel />
          </div>
          <StatusBar />
        </>
      )}

      <SearchPalette />
      <Presentation />
      <ContextMenu />
      <Toaster
        position="bottom-center"
        theme="dark"
        toastOptions={{
          style: {
            background:
              "color-mix(in oklab, var(--surface-elevated) 90%, transparent)",
            border: "1px solid var(--hairline)",
            color: "var(--color-foreground)",
            backdropFilter: "blur(20px)",
          },
        }}
      />
    </div>
  );
}

function StatusBar() {
  const zoom = useEditor((s) => s.zoom);
  const nodeCount = useEditor((s) => s.nodes.length);
  const selNodes = useEditor((s) => s.selectedNodeIds.length);
  const selEdges = useEditor((s) => s.selectedEdgeIds.length);
  const activeTool = useEditor((s) => s.activeTool);
  const isDirty = useEditor((s) => s.isDirty);
  const magneticSnap = useEditor((s) => s.magneticSnap);
  const gridSnap = useEditor((s) => s.gridSnap);
  const showGrid = useEditor((s) => s.showGrid);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
      <div className="glass-panel pointer-events-auto flex items-center gap-3 rounded-full px-3.5 py-1.5 text-[11px] tabular-nums text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isDirty ? "bg-amber-400" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"}`}
          />
          {isDirty ? "Unsaved changes" : "Saved locally"}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="capitalize">
          Tool: <span className="text-foreground">{activeTool}</span>
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span>{nodeCount} objects</span>
        <span className="text-muted-foreground/50">·</span>
        <span>{selNodes + selEdges} selected</span>
        <span className="text-muted-foreground/50">·</span>
        <span title="Grid">G {showGrid ? "on" : "off"}</span>
        <span title="Grid snap">S {gridSnap ? "on" : "off"}</span>
        <span title="Magnetic snap">M {magneticSnap ? "on" : "off"}</span>
        <span className="text-muted-foreground/50">·</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

function ConditionalLeftToolbar() {
  const show = useEditor((s) => s.showLeftToolbar);
  const toggle = useEditor((s) => s.toggleLeftToolbar);
  if (!show) {
    return (
      <button
        onClick={toggle}
        className="glass-panel pointer-events-auto absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
        title="Show tools (Ctrl+B)"
      >
        <span className="text-[13px]">›</span>
      </button>
    );
  }
  return (
    <div className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2">
      <LeftToolbar />
    </div>
  );
}

export function Editor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
