import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useEditor } from "./store";
import { getFlowInstance } from "./Canvas";

export function Presentation() {
  const presenting = useEditor((s) => s.presenting);
  const setPresenting = useEditor((s) => s.setPresenting);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [laserOn, setLaserOn] = useState(true);

  useEffect(() => {
    if (!presenting) return;
    const rf = getFlowInstance();
    rf?.fitView({ padding: 0.15, duration: 400 });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      if (e.key.toLowerCase() === "l") setLaserOn((v) => !v);
    };
    const onMove = (e: MouseEvent) =>
      setPointer({ x: e.clientX, y: e.clientY });
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
    };
  }, [presenting, setPresenting]);

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
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Presenting
            </span>
            <div className="h-4 w-px bg-[var(--hairline)]" />
            <button
              onClick={() => setLaserOn((v) => !v)}
              className={`rounded-full px-2 py-0.5 text-[11px] ${laserOn ? "bg-red-500/20 text-red-300" : "text-muted-foreground"}`}
              title="Toggle laser pointer (L)"
            >
              Laser {laserOn ? "on" : "off"}
            </button>
            <button
              onClick={() => setPresenting(false)}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-2 py-1 text-[11px] hover:bg-primary hover:text-primary-foreground"
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
