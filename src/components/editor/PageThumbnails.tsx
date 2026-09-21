'use client';

import { Plus, X } from 'lucide-react';
import { memo } from 'react';

import { SHEET_MIN_HEIGHT, SHEET_WIDTH } from '@/lib/pagination';
import { useEditorStore } from '@/store/editorStore';
import {
  useActiveTab,
  useComputedPageCount,
  usePageStartsWithBreak,
} from '@/store/selectors';
import { CanvasSheet } from './canvas/CanvasSheet';
import { ReadOnlyContext } from './canvas/readOnly';

const THUMB_WIDTH = 96;
const THUMB_SCALE = THUMB_WIDTH / SHEET_WIDTH;
const THUMB_HEIGHT = Math.round(SHEET_MIN_HEIGHT * THUMB_SCALE);

const PageThumb = memo(function PageThumb({
  index,
  active,
  removable,
}: {
  index: number;
  active: boolean;
  removable: boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Go to page ${index + 1}`}
        aria-current={active}
        className={`block overflow-hidden rounded-md border-2 bg-white transition ${active ? 'border-brand-500' : 'border-white/20 hover:border-white/50'}`}
        style={{ width: `${THUMB_WIDTH}px`, height: `${THUMB_HEIGHT}px` }}
        onClick={() => useEditorStore.getState().setActivePage(index)}
      >
        <div
          aria-hidden
          className="pointer-events-none"
          style={{
            width: `${SHEET_WIDTH}px`,
            transform: `scale(${THUMB_SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          <ReadOnlyContext.Provider value={true}>
            <CanvasSheet pageIndex={index} />
          </ReadOnlyContext.Provider>
        </div>
      </button>

      <span
        className={`absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-ink-600'}`}
      >
        {index + 1}
      </span>

      {removable ? (
        <button
          type="button"
          aria-label={`Remove page break before page ${index + 1}`}
          title="Remove the page break that starts this page"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-shell-800 text-white/70 transition hover:text-white"
          onClick={() => useEditorStore.getState().removePageBreak(index)}
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
});

/** Only pages that start with an explicit break can be "removed". */
const PageThumbWithBreak = memo(function PageThumbWithBreak({
  index,
  active,
}: {
  index: number;
  active: boolean;
}) {
  const startsWithBreak = usePageStartsWithBreak(index);
  return (
    <PageThumb index={index} active={active} removable={startsWithBreak} />
  );
});

export function PageThumbnails() {
  const pageCount = useComputedPageCount();
  const activePageIndex = useActiveTab((tab) => tab?.activePageIndex ?? 0);

  return (
    <div className="border-t border-white/10 pt-5">
      <h2 className="mb-3 text-[15px] font-semibold">Pages</h2>

      <div className="flex flex-col gap-3">
        {Array.from({ length: pageCount }, (_, index) => (
          <PageThumbWithBreak
            key={index}
            index={index}
            active={index === activePageIndex}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5 text-[13px] font-medium text-white transition hover:bg-white/10"
        onClick={() => useEditorStore.getState().insertPageBreak()}
      >
        <Plus size={15} /> Add Page
      </button>
    </div>
  );
}
