'use client';

import { memo } from 'react';

import { useImageBlock } from '@/store/selectors';

function ImageBlockViewImpl({ blockId }: { blockId: string }) {
  const block = useImageBlock(blockId);
  if (!block) return null;

  return (
    <img
      src={block.src}
      alt={block.alt}
      style={{ height: `${block.height}px`, objectFit: block.fit }}
      className="w-full"
      draggable={false}
    />
  );
}

export const ImageBlockView = memo(ImageBlockViewImpl);
