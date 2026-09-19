'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { useEditorStore } from '@/store/editorStore';
import { useBlockLayout, useIsBlockSelected } from '@/store/selectors';
import { ImageBlockView } from './ImageBlockView';
import { ShapeBlockView } from './ShapeBlockView';
import { TableBlockView } from './TableBlockView';
import { TextBlockView } from './TextBlockView';
import { useReadOnly } from './readOnly';

function BlockBody({
  kind,
  blockId,
}: {
  kind: NonNullable<ReturnType<typeof useBlockLayout>['kind']>;
  blockId: string;
}) {
  switch (kind) {
    case 'text':
      return <TextBlockView blockId={blockId} />;
    case 'table':
      return <TableBlockView blockId={blockId} />;
    case 'image':
      return <ImageBlockView blockId={blockId} />;
    case 'shape':
      return <ShapeBlockView blockId={blockId} />;
  }
}

function BlockFrameImpl({ blockId }: { blockId: string }) {
  const layout = useBlockLayout(blockId);
  const selected = useIsBlockSelected(blockId);
  const readOnly = useReadOnly();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId, disabled: readOnly });

  if (!layout.kind) return null;

  const wrapperStyle: React.CSSProperties = {
    width: `${layout.widthPercent}%`,
    paddingLeft: `${layout.indentLeft}px`,
    marginBottom: `${layout.marginBottom}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.65 : 1,
  };

  if (readOnly) {
    return (
      <div data-block-id={blockId} style={wrapperStyle}>
        <BlockBody kind={layout.kind} blockId={blockId} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-block-id={blockId}
      style={wrapperStyle}
      className="group relative"
    >
      <div
        role="presentation"
        onPointerDown={() => useEditorStore.getState().selectBlock(blockId)}
        className={`rounded-lg p-1 outline-offset-2 transition ${
          selected
            ? 'outline outline-2 outline-brand-500'
            : 'outline outline-1 outline-transparent hover:outline-brand-200'
        }`}
      >
        <BlockBody kind={layout.kind} blockId={blockId} />
      </div>

      <div
        data-editor-only="true"
        className={`absolute -left-7 top-1 flex flex-col gap-1 transition ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <button
          type="button"
          aria-label="Move block"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-line bg-white text-ink-400 shadow-sm hover:text-brand-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={13} />
        </button>
        <button
          type="button"
          aria-label="Delete block"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-ink-400 shadow-sm hover:border-red-200 hover:text-red-600"
          onClick={() => useEditorStore.getState().removeBlock(blockId)}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export const BlockFrame = memo(BlockFrameImpl);
