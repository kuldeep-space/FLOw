import React from "react";
import { motion } from "framer-motion";
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Diamond,
  Triangle,
  Hexagon,
  Pentagon,
  Star,
  Database,
  StickyNote,
  Type,
  Minus,
  ArrowRight,
  MoveRight,
  Spline,
  Waves,
  CornerDownRight,
  RectangleHorizontal,
  ImageIcon,
  Slash,
  Pencil,
  Highlighter,
  Eraser,
} from "lucide-react";
import { useEditor, type Tool } from "./store";
import { importImageFile, openFileDialog } from "./exportImport";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ToolDef = {
  id: Tool;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  label: string;
  shortcut?: string;
};

const EllipseIcon = ({ size = 24, strokeWidth = 2, className }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <ellipse cx="12" cy="12" rx="10" ry="6" />
  </svg>
);

const groups: { label: string; tools: ToolDef[] }[] = [
  {
    label: "Selection",
    tools: [
      { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
      { id: "hand", icon: Hand, label: "Pan (Hold Space)", shortcut: "H" },
    ],
  },
  {
    label: "Shapes",
    tools: [
      { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
      { id: "rounded", icon: RectangleHorizontal, label: "Rounded rectangle" },
      { id: "circle", icon: Circle, label: "Circle" },
      { id: "ellipse", icon: EllipseIcon, label: "Ellipse" },
      { id: "triangle", icon: Triangle, label: "Triangle" },
      { id: "diamond", icon: Diamond, label: "Diamond" },
      { id: "hexagon", icon: Hexagon, label: "Hexagon" },
      { id: "pentagon", icon: Pentagon, label: "Pentagon" },
      { id: "star", icon: Star, label: "Star" },
      { id: "cylinder", icon: Database, label: "Database" },
    ],
  },
  {
    label: "Connectors",
    tools: [
      { id: "line", icon: Slash, label: "Straight line", shortcut: "L" },
      { id: "arrow", icon: MoveRight, label: "Arrow", shortcut: "A" },
      {
        id: "orthogonal",
        icon: CornerDownRight,
        label: "Orthogonal",
        shortcut: "O",
      },
      { id: "curved", icon: Spline, label: "Curved", shortcut: "C" },
    ],
  },
  {
    label: "Drawing",
    tools: [
      { id: "text", icon: Type, label: "Text", shortcut: "T" },
      { id: "sticky", icon: StickyNote, label: "Sticky note", shortcut: "S" },
      { id: "pencil", icon: Pencil, label: "Pencil", shortcut: "P" },
      {
        id: "highlighter",
        icon: Highlighter,
        label: "Highlighter",
        shortcut: "H",
      },
      { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
    ],
  },
];

// Kept in view for future parity; suppress unused warning.
void ArrowRight;
void Minus;

export function LeftToolbar() {
  const activeTool = useEditor((s) => s.activeTool);
  const setActiveTool = useEditor((s) => s.setActiveTool);
  const cursor = useEditor((s) => s.cursor);

  const openImageDialog = () => {
    openFileDialog("image/*", (file) => importImageFile(file, cursor));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl p-2 w-[5.5rem]"
    >
      {groups.map((group, gi) => (
        <React.Fragment key={group.label}>
          <div className="grid grid-cols-2 gap-1 w-full justify-items-center">
            {group.tools.map((t) => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              return (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTool(t.id)}
                      className={`tool-btn relative ${active ? "tool-btn-active" : ""}`}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    <p className="text-[11px] font-medium tracking-wide">
                      {t.label}
                      {t.shortcut ? ` (${t.shortcut})` : ""}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          {gi < groups.length - 1 && (
            <div className="h-px w-10 bg-[var(--hairline)]" />
          )}
        </React.Fragment>
      ))}
      <div className="h-px w-10 bg-[var(--hairline)]" />
      <div className="grid grid-cols-2 gap-1 w-full justify-items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="tool-btn" onClick={openImageDialog}>
              <ImageIcon size={16} strokeWidth={1.8} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="text-[11px] font-medium tracking-wide">
              Upload image
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}
