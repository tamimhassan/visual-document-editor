"use client";

import { Plus, X } from "lucide-react";
import { memo } from "react";

import { useEditorStore } from "@/store/editorStore";
import { useActiveTab, usePageBlockKinds, usePageIds } from "@/store/selectors";

const BAR_HEIGHT: Record<string, number> = {
  text: 5,
  table: 26,
  image: 12,
  shape: 3,
};

/**
 * Thumbnails paint a schematic of the page rather than a scaled clone of the
 * canvas: they subscribe to block kinds only, so typing never repaints them.
 */
const PageThumb = memo(function PageThumb({
  pageId,
  index,
  active,
  removable,
}: {
  pageId: string;
  index: number;
  active: boolean;
  removable: boolean;
}) {
  const kinds = usePageBlockKinds(pageId);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Go to page ${index + 1}`}
        aria-current={active}
        className={`h-[124px] w-[96px] overflow-hidden rounded-md border-2 bg-white p-2 text-left transition
          ${active ? "border-brand-500" : "border-white/20 hover:border-white/50"}`}
        onClick={() => useEditorStore.getState().setActivePage(pageId)}
      >
        <div className="flex flex-col gap-[3px]">
          {kinds.slice(0, 12).map((kind, position) => (
            <span
              key={`${kind}-${position}`}
              className={`block rounded-[2px] ${
                kind === "table" ? "bg-brand-100" : "bg-slate-200"
              }`}
              style={{
                height: `${BAR_HEIGHT[kind] ?? 5}px`,
                width: kind === "text" && position % 3 === 0 ? "60%" : "100%",
              }}
            />
          ))}
        </div>
      </button>

      <span
        className={`absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold
          ${active ? "bg-brand-600 text-white" : "bg-slate-200 text-ink-600"}`}
      >
        {index + 1}
      </span>

      {removable ? (
        <button
          type="button"
          aria-label={`Delete page ${index + 1}`}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full
                     border border-white/20 bg-shell-800 text-white/70 transition hover:text-white"
          onClick={() => useEditorStore.getState().removePage(pageId)}
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
});

export function PageThumbnails() {
  const pageIds = usePageIds();
  const activePageId = useActiveTab((tab) => tab?.activePageId ?? "");

  return (
    <div className="border-t border-white/10 pt-5">
      <h2 className="mb-3 text-[15px] font-semibold">Pages</h2>

      <div className="flex flex-col gap-3">
        {pageIds.map((pageId, index) => (
          <PageThumb
            key={pageId}
            pageId={pageId}
            index={index}
            active={pageId === activePageId}
            removable={pageIds.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5
                   text-[13px] font-medium text-white transition hover:bg-white/10"
        onClick={() => useEditorStore.getState().addPage()}
      >
        <Plus size={15} /> Add Page
      </button>
    </div>
  );
}
