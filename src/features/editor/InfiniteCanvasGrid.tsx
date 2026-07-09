import React, { useEffect, useRef, useLayoutEffect } from "react";
import { useViewport } from "@xyflow/react";
import { useEditor } from "./store";

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function InfiniteCanvasGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { x, y, zoom } = useViewport();

  const theme = useEditor((s) => s.theme);
  const isDragging = useEditor((s) => s.isDragging);
  const isResizing = useEditor((s) => s.isResizing);
  const nodeCount = useEditor((s) => s.nodes.length);
  const presenting = useEditor((s) => s.presenting);
  const showGrid = useEditor((s) => s.showGrid);

  // Resize handler
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Drawing loop triggered on viewport or state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showGrid) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);

    // Calculate viewport bounds in flow space coordinates
    const leftFlow = -x / zoom;
    const rightFlow = (width - x) / zoom;
    const topFlow = -y / zoom;
    const bottomFlow = (height - y) / zoom;

    const isDark = theme === "dark";

    // 1. Grid level opacities
    let microFade = smoothstep(0.8, 1.0, zoom);
    let minorFade = smoothstep(0.25, 0.45, zoom);
    let majorFade = smoothstep(0.08, 0.25, zoom);

    // Dynamic scale reduction for low zooms on major grid
    if (zoom < 0.08) {
      majorFade = 0;
    }

    // 2. Global modifiers
    let globalMultiplier = 1.0;

    // Brighten during dragging or resizing
    if (isDragging) {
      globalMultiplier *= 1.35;
    } else if (isResizing) {
      globalMultiplier *= 1.5;
    }

    // Fade in presentation mode
    if (presenting) {
      globalMultiplier *= 0.15; // fade grid to almost invisible
    }

    // Node density fading: fade grid when there are many objects
    const nodeDensityFade = Math.max(0.35, 1.0 - Math.min(120, nodeCount) / 180);
    globalMultiplier *= nodeDensityFade;

    // Grid color bases
    const majorBaseOpacity = isDark ? 0.085 : 0.075;
    const minorBaseOpacity = isDark ? 0.035 : 0.032;
    const microBaseOpacity = isDark ? 0.015 : 0.012;

    const gridColorBase = isDark ? "255, 255, 255" : "0, 0, 0";

    const majorOpacity = majorBaseOpacity * majorFade * globalMultiplier;
    const minorOpacity = minorBaseOpacity * minorFade * globalMultiplier;
    const microOpacity = microBaseOpacity * microFade * globalMultiplier;

    // Origin axis opacity (center lines X=0 and Y=0)
    const originBaseOpacity = isDark ? 0.35 : 0.30;
    const originOpacity = originBaseOpacity * globalMultiplier;

    // Render helper function for pixel-perfect lines
    const drawGridLevel = (spacing: number, opacity: number, lineWidth: number) => {
      if (opacity <= 0.001) return;

      ctx.strokeStyle = `rgba(${gridColorBase}, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      // Vertical lines
      const startX = Math.floor(leftFlow / spacing) * spacing;
      const endX = Math.ceil(rightFlow / spacing) * spacing;
      for (let gx = startX; gx <= endX; gx += spacing) {
        // Skip origin axis lines to render them separately
        if (Math.abs(gx) < 0.01) continue;

        const sx = Math.round(gx * zoom + x);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }

      // Horizontal lines
      const startY = Math.floor(topFlow / spacing) * spacing;
      const endY = Math.ceil(bottomFlow / spacing) * spacing;
      for (let gy = startY; gy <= endY; gy += spacing) {
        if (Math.abs(gy) < 0.01) continue;

        const sy = Math.round(gy * zoom + y);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }

      ctx.stroke();
    };

    // Draw grid levels in ascending order of visibility/hierarchy (Micro -> Minor -> Major)
    // 3. Micro Grid (8px spacing)
    drawGridLevel(8, microOpacity, 1.0);

    // 4. Minor Grid (32px spacing)
    drawGridLevel(32, minorOpacity, 1.0);

    // 5. Major Grid (160px spacing)
    drawGridLevel(160, majorOpacity, 1.5);

    // 6. Origin Axis (X=0, Y=0)
    if (originOpacity > 0.001) {
      ctx.strokeStyle = `rgba(${gridColorBase}, ${originOpacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      // Vertical Y-axis (X=0)
      if (leftFlow <= 0 && rightFlow >= 0) {
        const sx = Math.round(x);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }

      // Horizontal X-axis (Y=0)
      if (topFlow <= 0 && bottomFlow >= 0) {
        const sy = Math.round(y);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }

      ctx.stroke();
    }

    ctx.restore();
  }, [x, y, zoom, theme, isDragging, isResizing, nodeCount, presenting, showGrid]);

  if (!showGrid) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{
        background: theme === "dark" ? "#111315" : "#FAFAFB",
        transition: "background-color 0.25s ease",
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
