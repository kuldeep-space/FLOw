import { getFreehandPath, getSimplePath } from "../features/editor/freehand";
import type { ShapeData, ShapeKind } from "../features/editor/types";

interface Props {
  kind: ShapeKind;
  width: number;
  height: number;
  data: ShapeData;
}

export function ShapeSVG({ kind, width: w, height: h, data }: Props) {
  const fill = data.fill;
  const stroke = data.stroke;
  const sw = data.strokeWidth;
  const dash = data.dashed ? "6 4" : undefined;
  const common = {
    fill,
    stroke,
    strokeWidth: sw,
    strokeDasharray: dash,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  if (kind === "sticky") {
    return (
      <div
        className="h-full w-full rounded-[6px]"
        style={{
          background: fill,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.35) inset, 0 12px 24px -8px rgba(0,0,0,0.35)",
        }}
      />
    );
  }
  if (kind === "text") return null;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="absolute inset-0"
      preserveAspectRatio="none"
      style={{
        overflow:
          kind === "draw" || kind === "pencil" || kind === "highlighter" ? "visible" : "hidden",
        mixBlendMode: kind === "highlighter" ? "multiply" : "normal",
      }}
    >
      {renderShape(kind, w, h, common, data)}
    </svg>
  );
}

type SvgAttrs = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "round";
  strokeLinejoin?: "round";
  vectorEffect?: "non-scaling-stroke";
};

function renderShape(
  kind: ShapeKind,
  w: number,
  h: number,
  p: SvgAttrs,
  data: ShapeData,
) {
  switch (kind) {
    case "pencil":
    case "draw": {
      const pts = (data.points as { x: number; y: number; pressure?: number }[]) || [];
      if (pts.length === 0) return null;
      
      const pathData = getSimplePath(pts);
      const isGlow = data.glowIntensity && data.glowIntensity > 0;
      const glowRadius = data.glowRadius || 10;
      const glowOpacity = data.glowOpacity ?? 1;
      const filterId = `neon-glow-${glowRadius}-${data.glowIntensity}-${glowOpacity}`;
      
      return (
        <g opacity={data.opacity ?? 1}>
          <path
            d={pathData}
            fill="none"
            stroke={p.stroke || "#000"}
            strokeWidth={p.strokeWidth || 4}
            strokeLinecap={data.lineCap || p.strokeLinecap || "round"}
            strokeLinejoin={data.lineJoin || p.strokeLinejoin || "round"}
            strokeDasharray={p.strokeDasharray}
            filter={isGlow ? `url(#${filterId})` : undefined}
          />
        </g>
      );
    }
    case "highlighter": {
      const pts =
        (data.points as { x: number; y: number; pressure?: number }[]) || [];
      if (pts.length === 0) return null;
      const pathData = getFreehandPath(pts, true, p.strokeWidth || 3);
      return <path d={pathData} fill={p.stroke || "#a78bfa"} opacity={data.opacity ?? 1} />;
    }
    case "rectangle":
      return <rect x={1} y={1} width={w - 2} height={h - 2} rx={12} {...p} />;
    case "rounded":
      return (
        <rect
          x={1}
          y={1}
          width={w - 2}
          height={h - 2}
          rx={Math.min(w, h) / 4}
          {...p}
        />
      );
    case "circle":
    case "ellipse":
      return (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} {...p} />
      );
    case "diamond":
      return (
        <polygon
          points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`}
          {...p}
        />
      );
    case "triangle":
      return (
        <polygon points={`${w / 2},1 ${w - 1},${h - 1} 1,${h - 1}`} {...p} />
      );
    case "hexagon": {
      const q = w * 0.2;
      return (
        <polygon
          points={`${q},1 ${w - q},1 ${w - 1},${h / 2} ${w - q},${h - 1} ${q},${h - 1} 1,${h / 2}`}
          {...p}
        />
      );
    }
    case "pentagon":
      return (
        <polygon
          points={`${w / 2},1 ${w - 1},${h * 0.4} ${w * 0.8},${h - 1} ${w * 0.2},${h - 1} 1,${h * 0.4}`}
          {...p}
        />
      );
    case "star": {
      const cx = w / 2;
      const cy = h / 2;
      const ro = Math.min(w, h) / 2 - 2;
      const ri = ro * 0.42;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? ro : ri;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return <polygon points={pts.join(" ")} {...p} />;
    }

    case "cylinder": {
      const ry = Math.min(h * 0.12, 18);
      return (
        <g {...p}>
          <path
            d={`M 1,${ry} C 1,1 ${w - 1},1 ${w - 1},${ry} L ${w - 1},${h - ry} C ${w - 1},${h - 1} 1,${h - 1} 1,${h - ry} Z`}
          />
          <path
            d={`M 1,${ry} C 1,${ry * 2} ${w - 1},${ry * 2} ${w - 1},${ry}`}
            fill="none"
          />
        </g>
      );
    }
    case "parallelogram": {
      const s = w * 0.15;
      return (
        <polygon
          points={`${s},1 ${w - 1},1 ${w - s},${h - 1} 1,${h - 1}`}
          {...p}
        />
      );
    }
    default:
      return null;
  }
}
