"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

import type { PageLayoutEntry, TableBlock } from "@/lib/types";
import { useEditorStore, type EditorState } from "@/store/editorStore";
import { SHEET_MIN_HEIGHT, SHEET_PADDING } from "./CanvasSheet";

/**
 * Automatic A4 pagination.
 *
 * When a page's content grows past the sheet's printable height, the trailing
 * content flows onto the next page — appending a page when none exists. Tables
 * taller than the remaining space are split at a row boundary: the head stays,
 * and the tail becomes a continuation table on the next page (cloned by the
 * store, numbering continued). The reflow is overflow-only by design: it never
 * pulls content back onto earlier pages and never drops pages, so a manually
 * added page keeps its meaning as a deliberate break.
 *
 * Block heights cannot be known from the model (text wraps, tables grow), so
 * the planner measures the rendered canvas: blocks that share a top edge form
 * one flex line ("row"), and lines move wholesale unless a line holds exactly
 * one splittable table. Used only by the edit canvas; preview and the PDF
 * export root simply render the reflowed pages.
 */

/** Wait for the typing/layout to settle before moving content between pages. */
const REFLOW_DELAY_MS = 400;
/** Retry cadence while a reflow is pending but a field inside the canvas has focus. */
const FOCUS_RETRY_MS = 1500;
/**
 * The edit DOM wraps every block in an outline/padding frame the read-only
 * render lacks, and the split point must not sit right at the boundary.
 */
const MEASUREMENT_SLACK = 12;
/** Printable height of a sheet: A4 minus its padding, plus slack. */
const PAGE_BUDGET = SHEET_MIN_HEIGHT - SHEET_PADDING * 2 - MEASUREMENT_SLACK;
/** Blocks whose tops are within this distance share a flex line. */
const SAME_ROW_EPSILON = 2;

interface TableGeometry {
  /** Height above the first row: title bar, header, wrapper padding. */
  chromeTop: number;
  /** Height below the last row: Add Row control, wrapper padding, margin. */
  chromeBottom: number;
  rowIds: string[];
  rowHeights: number[];
}

interface PlannedItem {
  blockId: string;
  height: number;
  /** Measured gap to the next item on the same sheet; 0 when unknown. */
  gapBelow: number;
  /** Present when the item is a single-block line with a splittable table. */
  table?: TableGeometry;
}

/** Groups a sheet's blocks into flex lines and measures them, tables inside. */
function measureItems(
  sheet: HTMLElement,
  scale: number,
  tables: Map<string, TableBlock>,
): PlannedItem[] {
  const sheetRect = sheet.getBoundingClientRect();
  const sheetTop = sheetRect.top;
  const nodes = Array.from(
    sheet.querySelectorAll<HTMLElement>("[data-block-id]"),
  );
  const items: PlannedItem[] = [];

  interface Line {
    nodes: HTMLElement[];
    top: number;
    bottom: number;
  }
  const lines: Line[] = [];

  for (const node of nodes) {
    const id = node.dataset.blockId;
    if (!id) continue;
    // Undo the canvas zoom transform so budgets stay in sheet pixels.
    const rect = node.getBoundingClientRect();
    const top = (rect.top - sheetTop) / scale;
    const bottom = (rect.bottom - sheetTop) / scale;

    const current = lines[lines.length - 1];
    if (current && Math.abs(current.top - top) <= SAME_ROW_EPSILON) {
      current.nodes.push(node);
      current.bottom = Math.max(current.bottom, bottom);
    } else {
      lines.push({ nodes: [node], top, bottom });
    }
  }

  for (const [index, line] of lines.entries()) {
    const next = lines[index + 1];
    const gapBelow = next ? Math.max(0, next.top - line.bottom) : 0;
    const height = line.bottom - line.top;

    // A table can only be split when its line holds nothing else beside it.
    const first = line.nodes[0];
    const blockId = first?.dataset.blockId;
    if (line.nodes.length === 1 && blockId && tables.has(blockId) && first) {
      const block = tables.get(blockId);
      const rows = Array.from(first.querySelectorAll<HTMLElement>("tbody tr"));
      if (block && block.rows.length >= 2 && rows.length === block.rows.length) {
        const rowHeights: number[] = [];
        let firstTop = Infinity;
        let lastBottom = -Infinity;
        for (const row of rows) {
          const rect = row.getBoundingClientRect();
          const top = (rect.top - sheetTop) / scale;
          const bottom = (rect.bottom - sheetTop) / scale;
          rowHeights.push(bottom - top);
          firstTop = Math.min(firstTop, top);
          lastBottom = Math.max(lastBottom, bottom);
        }
        // DOM rows and model rows are in the same order; the count check
        // above guarantees a one-to-one mapping.
        const rowIds = block.rows.map((row) => row.id);
        const blockRect = first.getBoundingClientRect();
        const itemTop = (blockRect.top - sheetTop) / scale;
        const itemBottom = (blockRect.bottom - sheetTop) / scale;
        items.push({
          blockId,
          height,
          gapBelow,
          table: {
            chromeTop: Math.max(0, firstTop - itemTop),
            chromeBottom: Math.max(0, itemBottom - lastBottom),
            rowIds,
            rowHeights,
          },
        });
        continue;
      }
    }

    // Plain line: one entry per block (side-by-side blocks become separate
    // entries; the planner places them together because they share a line,
    // which the store preserves by keeping their order).
    for (const node of line.nodes) {
      const id = node.dataset.blockId;
      if (!id) continue;
      items.push({ blockId: id, height, gapBelow });
    }
  }

  return items;
}

/**
 * Fits as many items as possible on one page. The first item always places
 * (splitting a table at one row if it must), so planning always makes progress.
 */
function planPage(items: PlannedItem[]): {
  entries: PageLayoutEntry[];
  rest: PlannedItem[];
} {
  const entries: PageLayoutEntry[] = [];
  let cursor = 0;
  let index = 0;

  while (index < items.length) {
    const item = items[index];
    if (!item) break;
    const available = PAGE_BUDGET - cursor;

    if (item.height <= available) {
      entries.push(toEntry(item));
      cursor += item.height + item.gapBelow;
      index += 1;
      continue;
    }

    // Does not fit. Try splitting a table at a row boundary.
    const table = item.table;
    if (table && table.rowIds.length >= 2) {
      let kept = 0;
      let used = 0;
      for (let row = 0; row < table.rowIds.length - 1; row += 1) {
        const height = table.rowHeights[row] ?? 0;
        if (
          table.chromeTop + used + height + table.chromeBottom <=
          available
        ) {
          used += height;
          kept = row + 1;
        } else {
          break;
        }
      }
      if (kept === 0 && cursor === 0) kept = 1; // never emit an empty page

      if (kept > 0) {
        entries.push({
          blockId: item.blockId,
          rowIds: table.rowIds.slice(0, kept),
        });
        const restHeights = table.rowHeights.slice(kept);
        const restItem: PlannedItem = {
          blockId: item.blockId,
          height:
            table.chromeTop +
            restHeights.reduce((sum, value) => sum + value, 0) +
            table.chromeBottom,
          gapBelow: item.gapBelow,
          table: {
            ...table,
            rowIds: table.rowIds.slice(kept),
            rowHeights: restHeights,
          },
        };
        // The continuation leads the next page, followed by whatever came
        // after the original table.
        return { entries, rest: [restItem, ...items.slice(index + 1)] };
      }
    }

    if (cursor === 0) {
      // First item on the page is oversized and unsplittable: it overflows
      // rather than cascading into an empty loop.
      entries.push(toEntry(item));
      index += 1;
      continue;
    }

    // Unsplittable overflow moves wholesale to the next page.
    return { entries, rest: items.slice(index) };
  }

  return { entries, rest: [] };
}

function toEntry(item: PlannedItem): PageLayoutEntry {
  return item.table
    ? { blockId: item.blockId, rowIds: item.table.rowIds }
    : { blockId: item.blockId };
}

/** Stable signature so unchanged layouts are never re-dispatched. */
function layoutSignature(pages: PageLayoutEntry[][]): string {
  return pages
    .map((page) =>
      page
        .map((entry) =>
          entry.rowIds ? `${entry.blockId}:${entry.rowIds.length}` : entry.blockId,
        )
        .join("|"),
    )
    .join("/");
}

export function useAutoReflow(
  stackRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    let disposed = false;
    let timer = 0;

    const attempt = (): void => {
      if (disposed) return;
      const stack = stackRef.current;
      if (!stack) return;

      const state = useEditorStore.getState();
      if (state.exporting) return; // never mutate the DOM under html2canvas

      const tab = state.tabs.find((item) => item.id === state.activeTabId);
      if (!tab) return;

      const sheets = Array.from(
        stack.querySelectorAll<HTMLElement>("[data-pdf-page]"),
      );
      if (sheets.length !== tab.document.pages.length) return;

      // Don't yank the caret out of a field that is about to move; retry
      // until focus leaves the canvas. Buttons and handles keep focus after
      // a click but hold no caret, so they must not block the reflow.
      const focused = document.activeElement;
      const holdsCaret =
        focused instanceof HTMLElement &&
        stack.contains(focused) &&
        (focused.tagName === "INPUT" ||
          focused.tagName === "TEXTAREA" ||
          focused.isContentEditable);
      if (holdsCaret) {
        window.setTimeout(attempt, FOCUS_RETRY_MS);
        return;
      }

      // Every table in the document: whole-table entries need their row ids,
      // and splittable lines need the model's row order.
      const tables = new Map<string, TableBlock>();
      for (const page of tab.document.pages) {
        for (const block of page.blocks) {
          if (block.kind === "table") tables.set(block.id, block);
        }
      }
      const fullRowIds = (blockId: string): string[] =>
        tables.get(blockId)?.rows.map((row) => row.id) ?? [];

      const scale = state.zoom || 1;
      const layouts: PageLayoutEntry[][] = [];
      let carried: PlannedItem[] = [];

      for (const sheet of sheets) {
        const items = [
          ...carried,
          ...measureItems(sheet, scale, tables),
        ];
        const planned = planPage(items);
        layouts.push(planned.entries);
        carried = planned.rest;
      }
      while (carried.length > 0) {
        const planned = planPage(carried);
        if (planned.entries.length === 0) break; // safety; cannot happen
        layouts.push(planned.entries);
        carried = planned.rest;
      }

      // Table entries always carry their row subset so the signature is
      // comparable with the model (blocks do not know their placement).
      const normalised = layouts.map((page) =>
        page.map((entry) =>
          entry.rowIds === undefined && tables.has(entry.blockId)
            ? { blockId: entry.blockId, rowIds: fullRowIds(entry.blockId) }
            : entry,
        ),
      );

      const current = tab.document.pages.map((page) =>
        page.blocks.map((block) =>
          block.kind === "table"
            ? { blockId: block.id, rowIds: block.rows.map((row) => row.id) }
            : { blockId: block.id },
        ),
      );

      if (layoutSignature(normalised) !== layoutSignature(current)) {
        state.applyPageLayout(normalised);
      }
    };

    // A burst of mutations restarts the timer; only the last change is measured.
    const schedule = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(attempt, REFLOW_DELAY_MS);
    };

    // Measure the canvas as it mounted before reacting to any change.
    schedule();

    // Any document mutation produces a new document reference (immer), so the
    // debounced planner is re-armed from a plain store subscription. Going
    // through a hook selector instead would re-render CanvasStage — the canvas
    // root — on every keystroke, although the stage renders none of the content.
    const activeDocument = (state: EditorState) =>
      state.tabs.find((item) => item.id === state.activeTabId)?.document;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (activeDocument(state) !== activeDocument(previous)) schedule();
    });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [stackRef]);
}
