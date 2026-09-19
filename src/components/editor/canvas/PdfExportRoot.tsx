"use client";

import { CanvasSheet } from "./CanvasSheet";
import { ReadOnlyContext } from "./readOnly";
import { usePageIds } from "@/store/selectors";

/**
 * Off-screen but laid out: html2canvas needs real geometry, so this cannot be
 * `display: none`.
 */
export function PdfExportRoot() {
  const pageIds = usePageIds();

  return (
    <div
      id="pdf-export-root"
      aria-hidden
      className="pdf-capture pointer-events-none fixed top-0 -z-10 opacity-0"
      style={{ left: "-12000px" }}
    >
      <ReadOnlyContext.Provider value={true}>
        {pageIds.map((pageId) => (
          <CanvasSheet key={pageId} pageId={pageId} />
        ))}
      </ReadOnlyContext.Provider>
    </div>
  );
}
