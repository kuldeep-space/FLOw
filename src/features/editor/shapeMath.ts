export function getClosestPointOnSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number },
) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return { x: v.x, y: v.y };
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
}

export function getClosestPointOnPolygon(
  p: { x: number; y: number },
  vertices: { x: number; y: number }[],
) {
  let closest = { x: 0, y: 0 };
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % vertices.length];
    const pt = getClosestPointOnSegment(p, v1, v2);
    const dist = (p.x - pt.x) ** 2 + (p.y - pt.y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      closest = pt;
    }
  }
  return closest;
}

export function getClosestPointOnShape(
  shape: string,
  w: number,
  h: number,
  px: number,
  py: number,
): { x: number; y: number } {
  const cx = w / 2;
  const cy = h / 2;
  const p = { x: px, y: py };

  if (shape === "circle" || shape === "ellipse") {
    const rx = w / 2;
    const ry = h / 2;
    const angle = Math.atan2(py - cy, px - cx);
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  }

  if (shape === "diamond") {
    const vertices = [
      { x: cx, y: 0 },
      { x: w, y: cy },
      { x: cx, y: h },
      { x: 0, y: cy },
    ];
    return getClosestPointOnPolygon(p, vertices);
  }

  if (shape === "triangle") {
    const vertices = [
      { x: cx, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    return getClosestPointOnPolygon(p, vertices);
  }

  if (shape === "hexagon") {
    const qw = w / 4;
    const vertices = [
      { x: qw, y: 0 },
      { x: w - qw, y: 0 },
      { x: w, y: cy },
      { x: w - qw, y: h },
      { x: qw, y: h },
      { x: 0, y: cy },
    ];
    return getClosestPointOnPolygon(p, vertices);
  }

  if (shape === "pentagon") {
    const vertices = [
      { x: cx, y: 0 },
      { x: w, y: h * 0.38 },
      { x: w * 0.82, y: h },
      { x: w * 0.18, y: h },
      { x: 0, y: h * 0.38 },
    ];
    return getClosestPointOnPolygon(p, vertices);
  }

  if (shape === "star") {
    const ro = Math.min(w, h) / 2;
    const ri = ro * 0.42;
    const vertices = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? ro : ri;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      vertices.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return getClosestPointOnPolygon(p, vertices);
  }

  if (shape === "parallelogram") {
    const s = w * 0.15;
    const vertices = [
      { x: s, y: 0 },
      { x: w, y: 0 },
      { x: w - s, y: h },
      { x: 0, y: h },
    ];
    return getClosestPointOnPolygon(p, vertices);
  }

  // Fallback to bounding box (rectangle, sticky, text, database, cylinder)
  const vertices = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  return getClosestPointOnPolygon(p, vertices);
}
