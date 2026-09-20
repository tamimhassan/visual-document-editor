'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, X } from 'lucide-react';
import { memo } from 'react';

import type { PageFragment } from '@/lib/types';
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
  fragment,
}: {
  kind: NonNullable<ReturnType<typeof useBlockLayout>['kind']>;
  blockId: string;
  fragment?: PageFragment;
}) {
  switch (kind) {
    case 'text':
      return (
        <TextBlockView
          blockId={blockId}
          fragment={fragment?.kind === 'text' ? fragment : undefined}
        />
      );
    case 'table':
      return (
        <TableBlockView
          blockId={blockId}
          fragment={fragment?.kind === 'table' ? fragment : undefined}
        />
      );
    case 'image':
      return <ImageBlockView blockId={blockId} />;
    case 'shape':
      return <ShapeBlockView blockId={blockId} />;
    case 'pagebreak':
      return null;
  }
}

/**
 * The edit-canvas visualisation of a manual page break: a labelled dashed
 * rule with a remove button. It carries no printable height — measurement
 * skips it via [data-page-break] and read-only surfaces render nothing.
 */
function PageBreakIndicator({ blockId }: { blockId: string }) {
  const selected = useIsBlockSelected(blockId);

  return (
    <div
      data-editor-only="true"
      className={`group relative my-3 flex w-full items-center gap-2 ${
        selected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
      }`}
    >
      <span className="h-0 flex-1 border-t-2 border-dashed border-brand-400" />
      <span className="whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
        Page break
      </span>
      <button
        type="button"
        aria-label="Remove page break"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-ink-400 transition hover:border-red-200 hover:text-red-600"
        onClick={() => useEditorStore.getState().removeBlock(blockId)}
      >
        <X size={11} />
      </button>
      <span className="h-0 flex-1 border-t-2 border-dashed border-brand-400" />
    </div>
  );
}

function BlockFrameImpl({
  blockId,
  fragment,
}: {
  blockId: string;
  fragment?: PageFragment;
}) {
  const layout = useBlockLayout(blockId);
  const selected = useIsBlockSelected(blockId);
  const readOnly = useReadOnly();

  // Split pieces: block-level chrome (title bar, margin-below, drag handles)
  // belongs to the boundary pieces only; the outline shows on every piece so a
  // selection is visible wherever the block's content continues.
  const isFirstPiece =
    !fragment ||
    fragment.kind === 'whole' ||
    (fragment.kind === 'table' && !fragment.isContinuation) ||
    (fragment.kind === 'text' && fragment.from === 0);
  const isLastPiece =
    !fragment ||
    fragment.kind === 'whole' ||
    (fragment.kind === 'table' && fragment.rowEnd === Infinity) ||
    (fragment.kind === 'text' && fragment.to === Infinity);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId, disabled: readOnly || !isFirstPiece });

  if (!layout.kind) return null;

  const wrapperStyle: React.CSSProperties = {
    width: `${layout.widthPercent}%`,
    paddingLeft: `${layout.indentLeft}px`,
    marginBottom: isLastPiece ? `${layout.marginBottom}px` : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.65 : 1,
  };

  if (layout.kind === 'pagebreak') {
    // A page break is a marker, not content: nothing in read-only/PDF, a
    // draggable labelled rule in the edit canvas. data-page-break excludes
    // the wrapper from height measurement (it renders at no printable cost).
    if (readOnly) return null;
    return (
      <div
        ref={setNodeRef}
        data-block-id={blockId}
        data-page-break="true"
        style={wrapperStyle}
        className="group relative w-full"
      >
        <div
          role="presentation"
          onPointerDown={() => useEditorStore.getState().selectBlock(blockId)}
        >
          <PageBreakIndicator blockId={blockId} />
        </div>
        <div
          data-editor-only="true"
          className={`absolute -left-7 top-1 flex flex-col gap-1 transition ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <button
            type="button"
            aria-label="Move page break"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-line bg-white text-ink-400 shadow-sm hover:text-brand-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete page break"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-ink-400 shadow-sm hover:border-red-200 hover:text-red-600"
            onClick={() => useEditorStore.getState().removeBlock(blockId)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div data-block-id={blockId} style={wrapperStyle}>
        <BlockBody kind={layout.kind} blockId={blockId} fragment={fragment} />
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
        className={`rounded-lg outline-offset-2 transition ${
          selected
            ? 'outline outline-2 outline-brand-500'
            : 'outline outline-1 outline-transparent hover:outline-brand-200'
        }`}
      >
        <BlockBody kind={layout.kind} blockId={blockId} fragment={fragment} />
      </div>

      {isFirstPiece ? (
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
      ) : null}
    </div>
  );
}

export const BlockFrame = memo(BlockFrameImpl);
