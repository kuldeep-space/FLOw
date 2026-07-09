import re

with open('src/edges/SmartEdge.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'ShapeRegistry' not in content:
    content = content.replace('import { useEditor } from', 'import { ShapeRegistry } from "@/features/editor/shapes";\nimport { useEditor } from')

# Modify handlePointerMove to include snapping
pointer_move_replacement = '''
    const handlePointerMove = (eMove: PointerEvent) => {
      let pos = screenToFlowPosition({ x: eMove.clientX, y: eMove.clientY }, { snapToGrid: false });
      
      // Magnetic snapping
      const storeNodes = useEditor.getState().nodes;
      let closestPoint = null;
      let minDist = 20;

      for (const n of storeNodes) {
        if (n.type === "anchor") continue;
        const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
        const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
        const shapeDef = ShapeRegistry.get((n.data as any)?.kind) ?? ShapeRegistry.get("rectangle");
        if (shapeDef) {
          const pts = shapeDef.getConnectionPoints(nw, nh);
          pts.forEach((pt, i) => {
            const gx = n.position.x + pt.x;
            const gy = n.position.y + pt.y;
            const dist = Math.hypot(pos.x - gx, pos.y - gy);
            if (dist < minDist) {
              minDist = dist;
              closestPoint = { nodeId: n.id, pointIndex: i, x: gx, y: gy };
            }
          });
        }
      }

      if (closestPoint) {
        pos = { x: closestPoint.x, y: closestPoint.y };
        useEditor.getState().setMagneticSnapPoint({ nodeId: closestPoint.nodeId, pointIndex: closestPoint.pointIndex });
      } else {
        useEditor.getState().setMagneticSnapPoint(null);
      }

      setDragState((prev) => (prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null));
    };
'''

content = re.sub(
    r'const handlePointerMove = \(eMove: PointerEvent\) => \{.*?setDragState\(\(prev\) => \(prev \? \{ \.\.\.prev, currentX: pos\.x, currentY: pos\.y \} : null\)\);\n\s*\};',
    pointer_move_replacement.strip(),
    content,
    flags=re.DOTALL
)

# Modify handlePointerUp to use snap point
pointer_up_replacement = '''
    const handlePointerUp = (eUp: PointerEvent) => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const snapPoint = useEditor.getState().magneticSnapPoint;
      useEditor.getState().setMagneticSnapPoint(null);
      
      const dropPos = screenToFlowPosition({ x: eUp.clientX, y: eUp.clientY }, { snapToGrid: false });
      setDragState(null);
      setInteractionState("IDLE");

      if (snapPoint) {
        updateEdge(id, { [handle]: snapPoint.nodeId, [handle + "Handle"]: `point-${snapPoint.pointIndex}` });
      } else {
        const storeNodes = useEditor.getState().nodes;
        let hitNode = null;
        for (const n of storeNodes) {
          if (n.type === "anchor") continue;
          const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
          const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
          if (
            dropPos.x >= n.position.x &&
            dropPos.x <= n.position.x + nw &&
            dropPos.y >= n.position.y &&
            dropPos.y <= n.position.y + nh
          ) {
            hitNode = n;
            break;
          }
        }

        if (hitNode) {
          updateEdge(id, { [handle]: hitNode.id, [handle + "Handle"]: undefined });
        } else {
          const anchorId = `anchor-${Date.now()}`;
          useEditor.setState((s) => ({
            nodes: [...s.nodes, { id: anchorId, type: "anchor", position: dropPos, data: {} }],
            isDirty: true
          }));
          updateEdge(id, { [handle]: anchorId, [handle + "Handle"]: undefined });
        }
      }

      useEditor.getState().cleanupOrphanAnchors();
    };
'''

content = re.sub(
    r'const handlePointerUp = \(eUp: PointerEvent\) => \{.*?useEditor\.getState\(\)\.cleanupOrphanAnchors\(\);\n\s*\};',
    pointer_up_replacement.strip(),
    content,
    flags=re.DOTALL
)


# Modify render logic for points
render_logic = '''
    if (sourceNode.type !== "anchor") {
      if (sourceHandleId?.startsWith("point-")) {
        const idx = parseInt(sourceHandleId.replace("point-", ""));
        const shapeDef = ShapeRegistry.get((sourceNode.data as any)?.kind) ?? ShapeRegistry.get("rectangle");
        if (shapeDef) {
          const pts = shapeDef.getConnectionPoints(sw, sh);
          if (pts[idx]) {
            sx = sourceNode.position.x + pts[idx].x;
            sy = sourceNode.position.y + pts[idx].y;
          }
        }
      } else if (!sourceHandleId?.startsWith("anchor-")) {
        const p = getIntersection(sourceNode.position, sw, sh, { x: tcx, y: tcy }, (sourceNode.data as any)?.kind);
        sx = p.x;
        sy = p.y;
      }
    }

    if (targetNode.type !== "anchor") {
      if (targetHandleId?.startsWith("point-")) {
        const idx = parseInt(targetHandleId.replace("point-", ""));
        const shapeDef = ShapeRegistry.get((targetNode.data as any)?.kind) ?? ShapeRegistry.get("rectangle");
        if (shapeDef) {
          const pts = shapeDef.getConnectionPoints(tw, th);
          if (pts[idx]) {
            tx = targetNode.position.x + pts[idx].x;
            ty = targetNode.position.y + pts[idx].y;
          }
        }
      } else if (!targetHandleId?.startsWith("anchor-")) {
        // Use the optionally overridden sx, sy here
        const p = getIntersection(targetNode.position, tw, th, { x: scx, y: scy }, (targetNode.data as any)?.kind);
        tx = p.x;
        ty = p.y;
      }
    }
'''

content = re.sub(
    r'if \(sourceNode\.type !== "anchor" && !sourceHandleId\?\.startsWith\("anchor-"\)\) \{.*?\n\s*\}\n\s*if \(targetNode\.type !== "anchor" && !targetHandleId\?\.startsWith\("anchor-"\)\) \{.*?\n\s*\}',
    render_logic.strip(),
    content,
    flags=re.DOTALL
)

with open('src/edges/SmartEdge.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
