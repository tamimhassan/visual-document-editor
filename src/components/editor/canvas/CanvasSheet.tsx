'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { memo } from 'react';

import { useEditorStore } from '@/store/editorStore';
import { usePageBlockIds } from '@/store/selectors';
import { BlockFrame } from './BlockFrame';
import { useReadOnly } from './readOnly';

// A4 at 96dpi, so the exported PDF matches what is on screen.
export const SHEET_WIDTH = 794;
export const SHEET_MIN_HEIGHT = 1123;
export const SHEET_PADDING = 48;

function CanvasSheetImpl({ pageId }: { pageId: string }) {
  const blockIds = usePageBlockIds(pageId);
  const readOnly = useReadOnly();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    useEditorStore.getState().moveBlock(String(active.id), String(over.id));
  };

  const content = (
    <div className="flex flex-wrap items-start">
      {blockIds.map((blockId) => (
        <BlockFrame key={blockId} blockId={blockId} />
      ))}

      {blockIds.length === 0 && !readOnly ? (
        <p className="w-full py-24 text-center text-[13px] text-ink-400">
          This page is empty. Add a text block or a table from the left panel.
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      data-pdf-page={pageId}
      className="relative bg-white shadow-sheet"
      style={{
        width: `${SHEET_WIDTH}px`,
        minHeight: `${SHEET_MIN_HEIGHT}px`,
        padding: `${SHEET_PADDING}px`,
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          useEditorStore.getState().selectBlock(null);
        }
      }}
    >
      {readOnly ? (
        content
      ) : (
        <DndContext
          // Deterministic id keeps dnd-kit's aria-describedby stable (no hydration mismatch).
          id={`canvas-${pageId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blockIds} strategy={rectSortingStrategy}>
            {content}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export const CanvasSheet = memo(CanvasSheetImpl);
