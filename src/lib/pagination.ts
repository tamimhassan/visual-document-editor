import type { Block, PageFragment, TableBlock, TextBlock } from '@/lib/types';

export const SHEET_WIDTH = 794;
export const SHEET_MIN_HEIGHT = 1123;
export const SHEET_PADDING = 48;

const MEASUREMENT_SLACK = 12;

export const PAGE_BUDGET =
  SHEET_MIN_HEIGHT - SHEET_PADDING * 2 - MEASUREMENT_SLACK;

const LINE_WIDTH_BUDGET = 100;
const LINE_WIDTH_EPSILON = 0.5;

const DEFAULT_BLOCK_HEIGHT = 48;

export interface TableChrome {
  start: number;
  contStart: number;
  header: number;
  end: number;
}

export interface TextLineBox {
  offset: number;
  height: number;
}

/** Everything pagination needs to know about a block's measured box. */
export interface BlockGeometry {
  height: number;
  rows?: number[];
  tableChrome?: TableChrome;
  textLines?: TextLineBox[];
}

const blockGeometryCache = new Map<string, BlockGeometry>();

export function setMeasuredGeometry(
  geometries: Map<string, BlockGeometry>,
): void {
  for (const [id, geometry] of geometries) blockGeometryCache.set(id, geometry);
}

export function getMeasuredGeometry(
  blockId: string,
): BlockGeometry | undefined {
  return blockGeometryCache.get(blockId);
}

interface FlexLine {
  ids: string[];
  /** max(member height + marginBottom) — what advancing to the next line costs. */
  height: number;
  /** True when this "line" is a single page-break marker. */
  isPageBreak: boolean;
}

function toFlexLines(
  blocks: Block[],
  geometries: Map<string, BlockGeometry>,
): FlexLine[] {
  const lines: FlexLine[] = [];
  let current: { ids: string[]; width: number; height: number } | null = null;

  const flush = (): void => {
    if (current && current.ids.length > 0) {
      lines.push({
        ids: current.ids,
        height: current.height,
        isPageBreak: false,
      });
    }
    current = null;
  };

  for (const block of blocks) {
    if (block.kind === 'pagebreak') {
      flush();
      // The break terminates its page; it carries no height of its own.
      lines.push({ ids: [block.id], height: 0, isPageBreak: true });
      continue;
    }

    const boxHeight =
      (geometries.get(block.id)?.height ?? DEFAULT_BLOCK_HEIGHT) +
      block.marginBottom;

    if (
      current &&
      current.width + block.widthPercent >
        LINE_WIDTH_BUDGET + LINE_WIDTH_EPSILON
    ) {
      flush();
    }

    if (!current) current = { ids: [], width: 0, height: 0 };
    current.ids.push(block.id);
    current.width += block.widthPercent;
    current.height = Math.max(current.height, boxHeight);
  }

  flush();
  return lines;
}

/** Number of rows from `start` whose cumulative height fits in `budget`. */
function countFitting(sizes: number[], start: number, budget: number): number {
  let count = 0;
  let sum = 0;
  for (let i = start; i < sizes.length; i += 1) {
    const height = sizes[i] ?? 0;
    if (sum + height > budget) break;
    sum += height;
    count += 1;
  }
  return count;
}

function placeTable(
  block: TableBlock,
  geometry: BlockGeometry,
  pages: PageFragment[][],
  firstBudget: number,
): number {
  const rows = geometry.rows ?? [];
  const chrome = geometry.tableChrome ?? {
    start: 0,
    contStart: 0,
    header: 0,
    end: 0,
  };
  let rowStart = 0;
  let isFirst = true;
  let usedOnLastPage = 0;

  while (rowStart < rows.length) {
    const budget = isFirst ? firstBudget : PAGE_BUDGET;
    const fixed = chrome.header + (isFirst ? chrome.start : chrome.contStart);

    let count = countFitting(rows, rowStart, budget - fixed);
    if (rowStart + count >= rows.length) {
      // Would be the last fragment: the trailing chrome must fit too, or the
      // tail moves to the next page so the sheet never stretches past A4.
      const withEnd = countFitting(
        rows,
        rowStart,
        budget - fixed - chrome.end - block.marginBottom,
      );
      if (rowStart + withEnd < rows.length) count = withEnd;
    }
    count = Math.max(count, 1); // degenerate guard: overflow beats an endless loop

    const rowEnd = rowStart + count;
    const isLast = rowEnd >= rows.length;
    let height = fixed;
    for (let i = rowStart; i < rowEnd; i += 1) height += rows[i] ?? 0;
    if (isLast) height += chrome.end + block.marginBottom;

    const page = pages[pages.length - 1];
    page?.push({
      blockId: block.id,
      kind: 'table',
      rowStart,
      // The final fragment is open-ended: rows appended after pagination stay
      // visible until the next measured repagination re-splits.
      rowEnd: isLast ? Infinity : rowEnd,
      isContinuation: !isFirst,
    });

    usedOnLastPage = height;
    if (!isLast) pages.push([]);
    rowStart = rowEnd;
    isFirst = false;
  }

  return usedOnLastPage;
}

function placeText(
  block: TextBlock,
  geometry: BlockGeometry,
  pages: PageFragment[][],
  firstBudget: number,
): number {
  const lines = geometry.textLines ?? [];
  const contentLength = block.content.length;
  let index = 0;
  let isFirst = true;
  let nextFrom = 0;
  let usedOnLastPage = 0;

  while (index < lines.length) {
    const budget = isFirst ? firstBudget : PAGE_BUDGET;

    // Greedy line fill; the first line always places, even when a single
    // oversized line exceeds the whole budget (overflow beats looping).
    let sum = 0;
    let end = index;
    while (end < lines.length) {
      const height = lines[end]?.height ?? 0;
      if (end > index && sum + height > budget) break;
      sum += height;
      end += 1;
    }

    const isLast = end >= lines.length;

    // A space or newline at a split point belongs to the line that just
    // ended (it hangs there invisibly), so the next slice starts at real
    // content and its first line re-wraps exactly like the original.
    let to: number;
    if (isLast) {
      to = Infinity;
    } else {
      to = lines[end]?.offset ?? Infinity;
      while (
        to < contentLength &&
        (block.content[to] === ' ' ||
          block.content[to] === '\t' ||
          block.content[to] === '\n')
      ) {
        to += 1;
      }
    }

    const page = pages[pages.length - 1];
    page?.push({ blockId: block.id, kind: 'text', from: nextFrom, to });

    usedOnLastPage = sum + (isLast ? block.marginBottom : 0);
    if (!isLast) pages.push([]);
    nextFrom = to;
    index = end;
    isFirst = false;
  }

  return usedOnLastPage;
}

export function paginate(
  blocks: Block[],
  geometries: Map<string, BlockGeometry>,
): PageFragment[][] {
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const lines = toFlexLines(blocks, geometries);
  const pages: PageFragment[][] = [[]];
  let used = 0;

  for (const line of lines) {
    if (line.isPageBreak) {
      // The break terminates the page it sits on, then a fresh page opens.
      const breakId = line.ids[0];
      const page = pages[pages.length - 1];
      if (page && breakId) page.push({ blockId: breakId, kind: 'whole' });
      pages.push([]);
      used = 0;
      continue;
    }

    // A lone splittable block that would not fit: fragment it across pages.
    if (line.ids.length === 1 && used + line.height > PAGE_BUDGET) {
      const block = byId.get(line.ids[0] ?? '');
      const geometry = block ? geometries.get(block.id) : undefined;
      if (block && geometry) {
        const budget = used > 0 ? PAGE_BUDGET - used : PAGE_BUDGET;
        if (block.kind === 'table' && (geometry.rows?.length ?? 0) > 0) {
          used = placeTable(block, geometry, pages, budget);
          continue;
        }
        if (block.kind === 'text' && (geometry.textLines?.length ?? 0) > 0) {
          used = placeText(block, geometry, pages, budget);
          continue;
        }
      }
    }

    if (used > 0 && used + line.height > PAGE_BUDGET) {
      pages.push([]);
      used = 0;
    }

    const page = pages[pages.length - 1];
    for (const id of line.ids) page?.push({ blockId: id, kind: 'whole' });
    used += line.height;
  }

  return pages;
}

/** paginate() against the session geometry cache — for synchronous store use. */
export function paginateWithCache(blocks: Block[]): PageFragment[][] {
  return paginate(blocks, blockGeometryCache);
}

function fragmentSignature(fragment: PageFragment): string {
  const base = `${fragment.blockId}:${fragment.kind}`;
  if (fragment.kind === 'table') {
    return `${base}:${fragment.rowStart}:${fragment.rowEnd}:${fragment.isContinuation ? 'c' : 'f'}`;
  }
  if (fragment.kind === 'text')
    return `${base}:${fragment.from}:${fragment.to}`;
  return base;
}

/** Stable signature so unchanged layouts are never re-dispatched. */
export function pagesSignature(pages: PageFragment[][]): string {
  return pages.map((page) => page.map(fragmentSignature).join('|')).join('/');
}

function sameFragment(a: PageFragment, b: PageFragment): boolean {
  if (a.blockId !== b.blockId || a.kind !== b.kind) return false;
  if (a.kind === 'table' && b.kind === 'table') {
    return (
      a.rowStart === b.rowStart &&
      a.rowEnd === b.rowEnd &&
      a.isContinuation === b.isContinuation
    );
  }
  if (a.kind === 'text' && b.kind === 'text') {
    return a.from === b.from && a.to === b.to;
  }
  return true;
}

export function reuseUnchangedPages(
  previous: PageFragment[][],
  next: PageFragment[][],
): PageFragment[][] {
  return next.map((page, index) => {
    const before = previous[index];
    if (
      before &&
      before.length === page.length &&
      before.every((fragment, i) => sameFragment(fragment, page[i] ?? fragment))
    ) {
      return before;
    }
    return page;
  });
}
