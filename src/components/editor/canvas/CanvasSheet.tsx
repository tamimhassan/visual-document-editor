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

import { SHEET_MIN_HEIGHT, SHEET_PADDING, SHEET_WIDTH } from '@/lib/pagination';
import { useEditorStore } from '@/store/editorStore';
import { usePageFragments } from '@/store/selectors';
import { BlockFrame } from './BlockFrame';
import { useReadOnly } from './readOnly';

function CanvasSheetImpl({ pageIndex }: { pageIndex: number }) {
  const fragments = usePageFragments(pageIndex);
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
      {fragments.map((fragment) => (
        <BlockFrame
          key={fragment.blockId}
          blockId={fragment.blockId}
          fragment={fragment}
        />
      ))}

      {fragments.length === 0 && !readOnly ? (
        <p className="w-full py-24 text-center text-[13px] text-ink-400">
          This page is empty. Add a text block or a table from the left panel.
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      data-pdf-page={`page-${pageIndex}`}
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
          id={`canvas-page-${pageIndex}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fragments.map((fragment) => fragment.blockId)}
            strategy={rectSortingStrategy}
          >
            {content}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export const CanvasSheet = memo(CanvasSheetImpl);
