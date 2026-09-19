'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

import { useEditorStore } from '@/store/editorStore';
import { usePageIds } from '@/store/selectors';
import { CanvasSheet } from './canvas/CanvasSheet';
import { ReadOnlyContext } from './canvas/readOnly';

export function PreviewDialog() {
  const open = useEditorStore((state) => state.previewOpen);
  const pageIds = usePageIds();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape')
        useEditorStore.getState().setPreviewOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Document preview'
      className='fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-sm'
    >
      <div className='flex h-14 shrink-0 items-center justify-between px-6 text-white'>
        <h2 className='text-[14px] font-semibold'>Preview</h2>
        <button
          type='button'
          aria-label='Close preview'
          className='rounded-lg p-2 transition hover:bg-white/10'
          onClick={() => useEditorStore.getState().setPreviewOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      <div className='flex-1 overflow-auto px-6 pb-10'>
        <div className='mx-auto flex w-fit flex-col gap-6'>
          <ReadOnlyContext.Provider value={true}>
            {pageIds.map((pageId) => (
              <CanvasSheet key={pageId} pageId={pageId} />
            ))}
          </ReadOnlyContext.Provider>
        </div>
      </div>
    </div>
  );
}
