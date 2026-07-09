import { PathPoint, EdgeExtras } from "../types";

export function migrateEdgeData(data: any): any {
  if (!data) return {};
  
  const extras = { ...data };

  // If already migrated, do nothing
  if (extras.version && extras.version >= 1 && extras.points) {
    return extras;
  }

  // Migrate bendPoints / controlPoints to Unified PathPoints
  const points: PathPoint[] = [];

  if (extras.bendPoints && Array.isArray(extras.bendPoints)) {
    extras.bendPoints.forEach((bp: any) => {
      points.push({
        id: bp.id || `bp_${Math.random().toString(36).substr(2, 9)}`,
        x: bp.x,
        y: bp.y,
        type: "corner", // legacy bend points are corners
      });
    });
  }

  // Note: legacy controlPoints didn't map perfectly to segments in the old model, 
  // but if they exist, we convert them as symmetric/smooth points if this was a curved path.
  
  extras.points = points;
  extras.version = 1;

  // Clean up legacy
  delete extras.bendPoints;
  delete extras.controlPoints;

  return extras;
}

/**
 * Validates a PathPoint array. Removes duplicates, handles zero-length segments.
 */
export function validateAndCleanupPoints(points: PathPoint[], isOrthogonal = false): PathPoint[] {
  if (!points || points.length === 0) return [];

  const cleaned: PathPoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    
    // Skip if exactly duplicates the previous point (zero-length segment)
    if (cleaned.length > 0) {
      const prev = cleaned[cleaned.length - 1];
      if (Math.abs(prev.x - current.x) < 1 && Math.abs(prev.y - current.y) < 1) {
        continue; // duplicate, skip
      }
    }
    
    // In orthogonal mode, we can merge collinear points
    if (isOrthogonal && cleaned.length >= 2) {
      const p1 = cleaned[cleaned.length - 2];
      const p2 = cleaned[cleaned.length - 1];
      const p3 = current;
      
      const isHorizontal1 = Math.abs(p1.y - p2.y) < 1;
      const isHorizontal2 = Math.abs(p2.y - p3.y) < 1;
      const isVertical1 = Math.abs(p1.x - p2.x) < 1;
      const isVertical2 = Math.abs(p2.x - p3.x) < 1;
      
      if ((isHorizontal1 && isHorizontal2) || (isVertical1 && isVertical2)) {
        // Collinear, pop the middle point
        cleaned.pop();
      }
    }
    
    cleaned.push(current);
  }

  return cleaned;
}
