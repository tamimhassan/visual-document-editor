'use client';

import { memo } from 'react';

import { useImageBlock } from '@/store/selectors';

function ImageBlockViewImpl({ blockId }: { blockId: string }) {
  const block = useImageBlock(blockId);
  if (!block) return null;

  return (
    <div
      role="img"
      aria-label={block.alt}
      className="w-full"
      style={{
        height: `${block.height}px`,
        backgroundImage: `url(${block.src})`,
        backgroundSize: block.fit, // "contain" | "cover" — same values as object-fit
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

export const ImageBlockView = memo(ImageBlockViewImpl);
