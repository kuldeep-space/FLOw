import { PathPoint } from "../types";

/**
 * Ensures the points array is a valid path.
 * 1. Removes any adjacent duplicate points.
 * 2. Merges collinear points if routing allows it (e.g., orthogonal).
 */
export function normalizePath(points: PathPoint[], isOrthogonal = false): PathPoint[] {
  if (!points || points.length === 0) return [];

  const cleaned: PathPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i];

    // Remove duplicates
    if (cleaned.length > 0) {
      const prev = cleaned[cleaned.length - 1];
      if (Math.abs(prev.x - current.x) < 1 && Math.abs(prev.y - current.y) < 1) {
        // Skip duplicate
        continue;
      }
    }

    // Merge collinear points for orthogonal
    if (isOrthogonal && cleaned.length >= 2) {
      const p1 = cleaned[cleaned.length - 2];
      const p2 = cleaned[cleaned.length - 1];
      const p3 = current;

      const isHorizontal1 = Math.abs(p1.y - p2.y) < 1;
      const isHorizontal2 = Math.abs(p2.y - p3.y) < 1;
      const isVertical1 = Math.abs(p1.x - p2.x) < 1;
      const isVertical2 = Math.abs(p2.x - p3.x) < 1;

      // If they are all on the same axis, pop the middle point
      if ((isHorizontal1 && isHorizontal2) || (isVertical1 && isVertical2)) {
        cleaned.pop();
      }
    }

    cleaned.push(current);
  }

  // Ensure start and end always exist if there were at least 2 points originally
  if (points.length >= 2 && cleaned.length < 2) {
    cleaned.push(points[points.length - 1]);
  }

  return cleaned;
}
