'use client';

import { CanvasSheet } from './CanvasSheet';
import { ReadOnlyContext } from './readOnly';
import { useComputedPageCount } from '@/store/selectors';

export function PdfExportRoot() {
  const pageCount = useComputedPageCount();

  return (
    <div
      id="pdf-export-root"
      aria-hidden
      // IMPORTANT: do NOT use a large negative `left` offset here.
      // html2canvas clips content at x=0 when an element is positioned far to
      // the left (e.g. left:-12000px), cutting off the first ~12000px of each
      // page. A large negative `top` offset is safe because html2canvas
      // captures the element's own bounding rect, not the viewport origin.
      className="pdf-capture pointer-events-none fixed left-0 -z-10 opacity-0"
      style={{ top: '-99999px' }}
    >
      <ReadOnlyContext.Provider value={true}>
        {Array.from({ length: pageCount }, (_, index) => (
          <CanvasSheet key={index} pageIndex={index} />
        ))}
      </ReadOnlyContext.Provider>
    </div>
  );
}
