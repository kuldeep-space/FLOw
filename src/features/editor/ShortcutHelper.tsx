import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { label: "Pan Canvas", keys: ["Space", "Drag"] },
  { label: "Zoom In/Out", keys: ["Ctrl", "Scroll"] },
  { label: "Delete Selected", keys: ["Backspace"] },
  { label: "Duplicate", keys: ["Ctrl", "D"] },
  { label: "Undo", keys: ["Ctrl", "Z"] },
  { label: "Redo", keys: ["Ctrl", "Shift", "Z"] },
  { label: "Select All", keys: ["Ctrl", "A"] },
  { label: "Bring to Front", keys: ["Ctrl", "]"] },
  { label: "Send to Back", keys: ["Ctrl", "["] },
];

export function ShortcutHelper() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-md border border-[var(--hairline)] text-muted-foreground hover:text-foreground hover:scale-105 transition-all"
        title="Keyboard Shortcuts"
      >
        <HelpCircle size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed bottom-16 right-4 z-50 w-72 overflow-hidden rounded-xl bg-background shadow-2xl border border-[var(--hairline)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3 bg-[var(--color-accent)]/50">
                <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 hover:bg-[var(--color-accent)] text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {SHORTCUTS.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--color-accent)]"
                  >
                    <span className="text-[12px] text-muted-foreground font-medium">
                      {s.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span
                          key={j}
                          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-[4px] border border-[var(--hairline)] bg-[var(--color-accent)] px-1.5 font-mono text-[10px] shadow-sm"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
