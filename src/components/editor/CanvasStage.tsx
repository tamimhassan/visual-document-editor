'use client';

import { Maximize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { SHEET_MIN_HEIGHT, SHEET_WIDTH } from '@/lib/pagination';
import { SelectField } from '@/components/ui/SelectField';
import { useEditorStore } from '@/store/editorStore';
import { useActiveTab, useComputedPageCount } from '@/store/selectors';
import { CanvasSheet } from './canvas/CanvasSheet';
import { usePagination } from './canvas/usePagination';

const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5].map((value) => ({
  value: String(value),
  label: `${Math.round(value * 100)}%`,
}));

const PAGE_GAP = 24;

export function CanvasStage() {
  const pageCount = useComputedPageCount();
  const activePageIndex = useActiveTab((tab) => tab?.activePageIndex ?? 0);
  const zoom = useEditorStore((state) => state.zoom);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const [stackHeight, setStackHeight] = useState(SHEET_MIN_HEIGHT);

  usePagination(stackRef);

  // The pages are scaled with a transform, which does not affect layout, so
  // the scroll container is given the scaled height explicitly.
  useEffect(() => {
    const node = stackRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setStackHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Follow the active page (thumbnail click, Add Page, undo, tab switch) —
  // scrolling only when it is not already on screen.
  useEffect(() => {
    const container = scrollRef.current;
    const node = pageRefs.current.get(activePageIndex);
    if (!container || !node) return;

    const containerRect = container.getBoundingClientRect();
    const pageRect = node.getBoundingClientRect();
    const visible =
      pageRect.top >= containerRect.top - 4 &&
      pageRect.bottom <= containerRect.bottom + 4;
    if (!visible) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activePageIndex]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <div className="flex h-[52px] shrink-0 items-center justify-end gap-2 px-6">
        <div className="w-[104px]">
          <SelectField
            value={String(zoom)}
            options={ZOOM_OPTIONS}
            onChange={(next) => useEditorStore.getState().setZoom(Number(next))}
          />
        </div>
        <button
          type="button"
          aria-label="Open full preview"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-600 transition hover:text-brand-600"
          onClick={() => useEditorStore.getState().setPreviewOpen(true)}
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto px-6 pb-10">
        <div
          className="mx-auto"
          style={{
            width: `${SHEET_WIDTH * zoom}px`,
            height: `${stackHeight * zoom}px`,
          }}
        >
          <div
            ref={stackRef}
            data-canvas-stack="true"
            className="flex flex-col"
            style={{
              width: `${SHEET_WIDTH}px`,
              gap: `${PAGE_GAP}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {Array.from({ length: pageCount }, (_, index) => (
              <div
                key={index}
                ref={(node) => {
                  if (node) pageRefs.current.set(index, node);
                  else pageRefs.current.delete(index);
                }}
                className={
                  index === activePageIndex && pageCount > 1
                    ? 'rounded-xl ring-4 ring-brand-200'
                    : undefined
                }
              >
                <CanvasSheet pageIndex={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
