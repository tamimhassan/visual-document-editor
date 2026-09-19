"use client";

import { memo } from "react";

import { useShapeBlock } from "@/store/selectors";

function ShapeBlockViewImpl({ blockId }: { blockId: string }) {
  const block = useShapeBlock(blockId);
  if (!block) return null;

  return (
    <div
      aria-hidden
      style={{
        height: `${block.height}px`,
        background: block.fill,
        borderRadius:
          block.shape === "ellipse" ? "9999px" : `${block.radius}px`,
      }}
    />
  );
}

export const ShapeBlockView = memo(ShapeBlockViewImpl);
