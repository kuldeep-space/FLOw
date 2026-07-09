import { Handle, Position } from "@xyflow/react";

export function AnchorNode() {
  return (
    <div
      className="anchor-node"
      style={{
        width: 1,
        height: 1,
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        id="center"
        style={{
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="center"
        style={{
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
