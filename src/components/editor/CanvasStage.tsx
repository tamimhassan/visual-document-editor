"use client";

import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { useEditorStore } from "@/store/editorStore";
import { useActiveTab, usePageIds } from "@/store/selectors";
import { CanvasSheet, SHEET_MIN_HEIGHT, SHEET_WIDTH } from "./canvas/CanvasSheet";
import { useAutoReflow } from "./canvas/useAutoReflow";

const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5].map((value) => ({
  value: String(value),
  label: `${Math.round(value * 100)}%`,
}));

const PAGE_GAP = 24;

export function CanvasStage() {
  const pageIds = usePageIds();
  const activePageId = useActiveTab((tab) => tab?.activePageId ?? "");
  const zoom = useEditorStore((state) => state.zoom);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<string, HTMLDivElement>());
  const [stackHeight, setStackHeight] = useState(SHEET_MIN_HEIGHT);

  useAutoReflow(stackRef);

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
    const node = activePageId ? pageRefs.current.get(activePageId) : null;
    if (!container || !node) return;

    const containerRect = container.getBoundingClientRect();
    const pageRect = node.getBoundingClientRect();
    const visible =
      pageRect.top >= containerRect.top - 4 &&
      pageRect.bottom <= containerRect.bottom + 4;
    if (!visible) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePageId]);

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
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white
                     text-ink-600 transition hover:text-brand-600"
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
              transformOrigin: "top left",
            }}
          >
            {pageIds.map((pageId) => (
              <div
                key={pageId}
                ref={(node) => {
                  if (node) pageRefs.current.set(pageId, node);
                  else pageRefs.current.delete(pageId);
                }}
                className={
                  pageId === activePageId && pageIds.length > 1
                    ? "rounded-xl ring-4 ring-brand-200"
                    : undefined
                }
              >
                <CanvasSheet pageId={pageId} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
