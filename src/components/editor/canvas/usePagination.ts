'use client';

import type { RefObject } from 'react';
import { useEffect } from 'react';

import {
  paginateWithCache,
  pagesSignature,
  reuseUnchangedPages,
  setMeasuredGeometry,
  type BlockGeometry,
  type TextLineBox,
} from '@/lib/pagination';
import { useEditorStore, type EditorState } from '@/store/editorStore';
import type { Block, TableBlock } from '@/lib/types';

const REFLOW_DELAY_MS = 400;
const FOCUS_RETRY_MS = 1500;

const LINE_TOP_EPSILON = 1.5;

const MAX_LINE_MEASURED_CHARS = 20_000;

export function usePagination(
  stackRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    let disposed = false;
    let timer = 0;
    let rafId = 0;

    const attempt = (): void => {
      if (disposed) return;
      const stack = stackRef.current;
      if (!stack) return;

      const state = useEditorStore.getState();
      if (state.exporting) return; // never mutate the DOM under html2canvas

      const tab = state.tabs.find((item) => item.id === state.activeTabId);
      if (!tab) return;

      const sheets = Array.from(
        stack.querySelectorAll<HTMLElement>('[data-pdf-page]'),
      );
      if (sheets.length !== tab.computedPages.length) return;

      const focused = document.activeElement;
      const holdsCaret =
        focused instanceof HTMLElement &&
        stack.contains(focused) &&
        (focused.tagName === 'INPUT' ||
          focused.tagName === 'TEXTAREA' ||
          focused.isContentEditable);
      if (holdsCaret) {
        window.setTimeout(attempt, FOCUS_RETRY_MS);
        return;
      }

      const geometries = measureGeometries(
        stack,
        tab.document.blocks,
        state.zoom || 1,
      );
      setMeasuredGeometry(geometries);

      const next = reuseUnchangedPages(
        tab.computedPages,
        paginateWithCache(tab.document.blocks),
      );
      if (pagesSignature(next) !== pagesSignature(tab.computedPages)) {
        state.setComputedPages(next);

        schedule();
      }
    };

    // A burst of mutations restarts the timer; only the last change is measured.
    const schedule = (): void => {
      window.clearTimeout(timer);
      window.setTimeout(attempt, REFLOW_DELAY_MS);
    };

    rafId = window.requestAnimationFrame(() => attempt());
    document.fonts?.ready.then(() => {
      if (!disposed) schedule();
    });

    const activeDocument = (state: EditorState) =>
      state.tabs.find((item) => item.id === state.activeTabId)?.document;
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (activeDocument(state) !== activeDocument(previous)) schedule();
    });

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [stackRef]);
}

/**
 * Measures split-relevant geometry for every rendered block. A split block
 * renders one wrapper per fragment, all carrying the same data-block-id; DOM
 * order equals fragment order, so wrappers[0] carries the leading chrome and
 * the last wrapper the trailing chrome.
 */
function measureGeometries(
  stack: HTMLDivElement,
  blocks: Block[],
  scale: number,
): Map<string, BlockGeometry> {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const wrappersByBlock = new Map<string, HTMLElement[]>();
  for (const node of stack.querySelectorAll<HTMLElement>(
    '[data-block-id]:not([data-page-break])',
  )) {
    const id = node.dataset.blockId;
    if (!id) continue;
    const list = wrappersByBlock.get(id);
    if (list) list.push(node);
    else wrappersByBlock.set(id, [node]);
  }

  const geometries = new Map<string, BlockGeometry>();
  for (const [id, wrappers] of wrappersByBlock) {
    const block = byId.get(id);
    if (!block) continue;
    if (block.kind === 'table') {
      geometries.set(id, measureTable(block, wrappers, scale));
    } else if (block.kind === 'text') {
      geometries.set(id, measureText(wrappers, scale));
    } else {
      const rect = wrappers[0]?.getBoundingClientRect();
      if (rect) {
        geometries.set(id, { height: (rect.bottom - rect.top) / scale });
      }
    }
  }
  return geometries;
}

/** Per-row heights plus the fixed chrome around them (see TableChrome). */
function measureTable(
  block: TableBlock,
  wrappers: HTMLElement[],
  scale: number,
): BlockGeometry {
  const rowIndex = new Map(block.rows.map((row, index) => [row.id, index]));
  const rows = new Array<number>(block.rows.length).fill(0);
  let start = 0;
  let contStart = 0;
  let header = 0;
  let end = 0;

  wrappers.forEach((wrapper, index) => {
    const wrapperRect = wrapper.getBoundingClientRect();
    const thead = wrapper.querySelector<HTMLElement>('[data-table-header]');
    const tbody = wrapper.querySelector<HTMLElement>('[data-table-body]');
    const isContinuation = !wrapper.querySelector('[data-table-title]');

    if (thead) {
      const theadRect = thead.getBoundingClientRect();
      header = (theadRect.bottom - theadRect.top) / scale;
      const lead = (theadRect.top - wrapperRect.top) / scale;
      if (isContinuation) contStart = lead;
      else start = lead;
    }

    // The trailing chrome (Add Row button, shell padding) sits under the last
    // row of the last wrapper only.
    if (tbody && index === wrappers.length - 1) {
      const bodyRect = tbody.getBoundingClientRect();
      end = (wrapperRect.bottom - bodyRect.bottom) / scale;
    }

    for (const rowNode of wrapper.querySelectorAll<HTMLElement>(
      '[data-row-id]',
    )) {
      const position = rowIndex.get(rowNode.dataset.rowId ?? '');
      if (position === undefined) continue;
      const rowRect = rowNode.getBoundingClientRect();
      rows[position] = (rowRect.bottom - rowRect.top) / scale;
    }
  });

  const height = rows.reduce((sum, value) => sum + value, 0);
  return {
    height: start + header + height + end,
    rows,
    tableChrome: { start, contStart, header, end },
  };
}

interface RawLine {
  /** Character index within the fragment's innerText-order char array. */
  start: number;
  top: number;
  bottom: number;
}

function measureFragmentLines(
  element: HTMLElement,
  scale: number,
): { lines: TextLineBox[]; charCount: number } {
  const chars: { top: number; bottom: number }[] = [];
  const range = document.createRange();

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i += 1) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getClientRects()[0];
        chars.push(
          rect
            ? { top: rect.top, bottom: rect.bottom }
            : { top: Number.NaN, bottom: Number.NaN },
        );
      }
      return;
    }
    if (node.nodeName === 'BR') {
      const rect = (node as HTMLElement).getBoundingClientRect();
      chars.push(
        rect.height > 0 || rect.width > 0
          ? { top: rect.top, bottom: rect.bottom }
          : { top: Number.NaN, bottom: Number.NaN },
      );
      return;
    }
    for (const child of Array.from(node.childNodes)) walk(child);
  };
  for (const child of Array.from(element.childNodes)) walk(child);

  // Characters without a rect (collapsed newlines) inherit the current line.
  const raw: RawLine[] = [];
  let lineStart = -1;
  let lineTop = 0;
  let lineBottom = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    if (!char || Number.isNaN(char.top)) continue;
    if (lineStart === -1) {
      lineStart = i;
      lineTop = char.top;
      lineBottom = char.bottom;
      continue;
    }
    if (Math.abs(char.top - lineTop) > LINE_TOP_EPSILON) {
      raw.push({ start: lineStart, top: lineTop, bottom: lineBottom });
      lineStart = i;
      lineTop = char.top;
      lineBottom = char.bottom;
    } else {
      lineBottom = Math.max(lineBottom, char.bottom);
    }
  }
  if (lineStart !== -1) {
    raw.push({ start: lineStart, top: lineTop, bottom: lineBottom });
  }

  const elementBottom = element.getBoundingClientRect().bottom;
  const lines: TextLineBox[] = raw.map((line, index) => {
    const nextTop = raw[index + 1]?.top;
    const glyph = (line.bottom - line.top) / scale;
    const advance =
      nextTop !== undefined
        ? (nextTop - line.top) / scale
        : Math.max((elementBottom - line.top) / scale, glyph);
    return { offset: line.start, height: Math.max(advance, glyph) };
  });

  return { lines, charCount: chars.length };
}

function measureText(wrappers: HTMLElement[], scale: number): BlockGeometry {
  const textLines: TextLineBox[] = [];
  let frameChrome = 0;
  for (const wrapper of wrappers) {
    const element = wrapper.querySelector<HTMLElement>('[data-fragment-from]');
    if (!element) continue;
    const wrapperRect = wrapper.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    frameChrome +=
      (wrapperRect.bottom -
        wrapperRect.top -
        (elementRect.bottom - elementRect.top)) /
      scale;

    const from = Number(element.dataset.fragmentFrom ?? '0') || 0;
    const measured = measureFragmentLines(element, scale);
    if (measured.charCount > MAX_LINE_MEASURED_CHARS) {
      // Too large to probe character-by-character: keep the block atomic.
      return { height: (wrapperRect.bottom - wrapperRect.top) / scale };
    }
    for (const line of measured.lines) {
      textLines.push({ offset: from + line.offset, height: line.height });
    }
  }

  return {
    height: textLines.reduce((sum, line) => sum + line.height, 0) + frameChrome,
    textLines,
  };
}
