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
      className="pdf-capture pointer-events-none fixed top-0 -z-10 opacity-0"
      style={{ left: '-12000px' }}
    >
      <ReadOnlyContext.Provider value={true}>
        {Array.from({ length: pageCount }, (_, index) => (
          <CanvasSheet key={index} pageIndex={index} />
        ))}
      </ReadOnlyContext.Provider>
    </div>
  );
}
