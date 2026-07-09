import re

with open('src/features/editor/Canvas.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'ShapeRegistry' not in content:
    content = content.replace('import { ShapeNode } from "@/nodes/ShapeNode";', 'import { ShapeNode } from "@/nodes/ShapeNode";\nimport { ShapeRegistry } from "@/features/editor/shapes";')

# Modify onPointerMove
pointer_move_replacement = '''
      if (draftConnector) {
        let currentPos = pos;
        const storeNodes = useEditor.getState().nodes;
        let closestPoint: { nodeId: string; pointIndex: number; x: number; y: number } | null = null;
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
          const cp = closestPoint as any;
          currentPos = { x: cp.x, y: cp.y };
          useEditor.getState().setMagneticSnapPoint({ nodeId: cp.nodeId, pointIndex: cp.pointIndex });
        } else {
          useEditor.getState().setMagneticSnapPoint(null);
        }

        useEditor.setState((s) => ({
          nodes: s.nodes.map((n) =>
            n.id === draftConnector.targetId ? { ...n, position: currentPos } : n,
          ),
        }));
        return;
      }
'''

content = re.sub(
    r'if \(draftConnector\) \{.*?useEditor\.setState\(\(s\) => \(\{.*?nodes: s\.nodes\.map\(\(n\) =>.*?n\.id === draftConnector\.targetId \? \{ \.\.\.n, position: pos \} : n,.*?\),.*?return;\n\s*\}',
    pointer_move_replacement.strip(),
    content,
    flags=re.DOTALL
)

# Modify onPointerUp
pointer_up_replacement = '''
      if (draftConnector) {
        const state = useEditor.getState();
        const snapPoint = state.magneticSnapPoint;
        state.setMagneticSnapPoint(null);
        
        let snappedNodeId = null;
        let snappedPointIndex = undefined;

        if (snapPoint) {
            snappedNodeId = snapPoint.nodeId;
            snappedPointIndex = snapPoint.pointIndex;
        } else {
            const targetPos = state.nodes.find(
              (n) => n.id === draftConnector.targetId,
            )?.position;

            if (targetPos) {
              const hitNode = state.nodes.find((n) => {
                if (n.type === "anchor" || n.id === draftConnector.sourceId)
                  return false;
                const nw = n.measured?.width ?? (n.data as any)?.width ?? 180;
                const nh = n.measured?.height ?? (n.data as any)?.height ?? 100;
                return (
                  targetPos.x >= n.position.x &&
                  targetPos.x <= n.position.x + nw &&
                  targetPos.y >= n.position.y &&
                  targetPos.y <= n.position.y + nh
                );
              });
              if (hitNode) snappedNodeId = hitNode.id;
            }
        }

        if (snappedNodeId) {
          const edgeId = state.edges.find(
            (e) => e.target === draftConnector.targetId,
          )?.id;
          state.pushHistory();
          useEditor.setState((s) => ({
            nodes: s.nodes.filter((n) => n.id !== draftConnector.targetId),
            edges: s.edges.map((e) =>
              e.id === edgeId ? applyEdgeStyle({ ...e, target: snappedNodeId, targetHandle: snappedPointIndex !== undefined ? `point-${snappedPointIndex}` : undefined }) : e,
            ),
          }));
        } else {
          state.pushHistory();
        }
        setDraftConnector(null);
        if (!e.shiftKey) setActiveTool("select");
      }
'''

content = re.sub(
    r'if \(draftConnector\) \{.*?const targetPos = state\.nodes\.find\(.*?let snappedNodeId = null;.*?if \(targetPos\) \{.*?if \(hitNode\) snappedNodeId = hitNode\.id;.*?\}.*?if \(snappedNodeId\) \{.*?\} else \{.*?state\.pushHistory\(\);.*?setDraftConnector\(null\);.*?if \(!e\.shiftKey\) setActiveTool\("select"\);.*?\n\s*\}',
    pointer_up_replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/features/editor/Canvas.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
