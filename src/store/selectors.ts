'use client';

import { useShallow } from 'zustand/react/shallow';

import { useEditorStore } from '@/store/editorStore';
import type {
  Block,
  CellStyleOverride,
  ImageBlock,
  PageFragment,
  ShapeBlock,
  TableColumn,
  TableRow,
  TableBlock,
  Tab,
  TextBlock,
} from '@/lib/types';

export function findActiveTab(
  tabs: Tab[],
  activeTabId: string,
): Tab | undefined {
  return tabs.find((tab) => tab.id === activeTabId);
}

export function useActiveTab<T>(selector: (tab: Tab | undefined) => T): T {
  return useEditorStore((state) =>
    selector(findActiveTab(state.tabs, state.activeTabId)),
  );
}

/** Flat-list block lookup — pages are computed, blocks are the stored truth. */
function findBlock(tab: Tab | undefined, blockId: string): Block | undefined {
  if (!tab) return undefined;
  return tab.document.blocks.find((item) => item.id === blockId);
}

export function useBlock(blockId: string): Block | undefined {
  return useActiveTab((tab) => findBlock(tab, blockId));
}

export function useTextBlock(blockId: string): TextBlock | undefined {
  const block = useBlock(blockId);
  return block && block.kind === 'text' ? block : undefined;
}

export function useTableBlock(blockId: string): TableBlock | undefined {
  const block = useBlock(blockId);
  return block && block.kind === 'table' ? block : undefined;
}

export function useImageBlock(blockId: string): ImageBlock | undefined {
  const block = useBlock(blockId);
  return block && block.kind === 'image' ? block : undefined;
}

export function useShapeBlock(blockId: string): ShapeBlock | undefined {
  const block = useBlock(blockId);
  return block && block.kind === 'shape' ? block : undefined;
}

export function useIsBlockSelected(blockId: string): boolean {
  return useActiveTab((tab) => tab?.selection.blockId === blockId);
}

export function useSelectedBlockId(): string | null {
  return useActiveTab((tab) => tab?.selection.blockId ?? null);
}

export function useSelectedRowId(): string | null {
  return useActiveTab((tab) => tab?.selection.rowId ?? null);
}

/** Row-number offset carried by split-era continuation tables (migrated data). */
export function useTableStartNumber(blockId: string): number {
  return useActiveTab((tab) => findTable(tab, blockId)?.startNumber ?? 0);
}

export function useSelectedColumnId(): string | null {
  return useActiveTab((tab) => tab?.selection.columnId ?? null);
}

export function useSelectedBlock(): Block | undefined {
  return useActiveTab((tab) =>
    tab?.selection.blockId ? findBlock(tab, tab.selection.blockId) : undefined,
  );
}

export function useTableRow(
  blockId: string,
  rowId: string,
): Record<string, string> | undefined {
  return useActiveTab((tab) =>
    findTable(tab, blockId)?.rows.find((row) => row.id === rowId)?.cells,
  );
}

export function useTableRowData(
  blockId: string,
  rowId: string,
): TableRow | undefined {
  return useActiveTab((tab) =>
    findTable(tab, blockId)?.rows.find((row) => row.id === rowId),
  );
}

/** Sparse per-cell override for one cell; undefined = fully inherited. */
export function useCellStyleOverride(
  blockId: string,
  rowId: string,
  columnId: string,
): CellStyleOverride | undefined {
  return useActiveTab((tab) =>
    findTable(tab, blockId)?.rows.find((row) => row.id === rowId)?.cellStyles?.[
      columnId
    ],
  );
}

export function useTableColumn(
  blockId: string,
  columnId: string,
): TableColumn | undefined {
  return useActiveTab((tab) =>
    findTable(tab, blockId)?.columns.find((col) => col.id === columnId),
  );
}

const EMPTY_COLUMNS: TableBlock['columns'] = [];

function findTable(
  tab: Tab | undefined,
  blockId: string,
): TableBlock | undefined {
  const block = findBlock(tab, blockId);
  return block && block.kind === 'table' ? block : undefined;
}

export function useTableRowIds(blockId: string): string[] {
  return useEditorStore(
    useShallow((state) => {
      const table = findTable(
        findActiveTab(state.tabs, state.activeTabId),
        blockId,
      );
      return table ? table.rows.map((row) => row.id) : [];
    }),
  );
}

export function useTableColumns(blockId: string): TableBlock['columns'] {
  return useActiveTab(
    (tab) => findTable(tab, blockId)?.columns ?? EMPTY_COLUMNS,
  );
}

export function useTableStyle(
  blockId: string,
): TableBlock['style'] | undefined {
  return useActiveTab((tab) => findTable(tab, blockId)?.style);
}

export function useTableTitle(blockId: string): string {
  return useActiveTab((tab) => findTable(tab, blockId)?.title ?? '');
}

export interface BlockLayoutSlice {
  kind: Block['kind'] | null;
  widthPercent: number;
  indentLeft: number;
  marginBottom: number;
}

export function useBlockLayout(blockId: string): BlockLayoutSlice {
  return useEditorStore(
    useShallow((state) => {
      const tab = findActiveTab(state.tabs, state.activeTabId);
      const target = findBlock(tab, blockId);
      return {
        kind: target?.kind ?? null,
        widthPercent: target?.widthPercent ?? 100,
        indentLeft: target?.indentLeft ?? 0,
        marginBottom: target?.marginBottom ?? 0,
      };
    }),
  );
}

/** How many computed pages the active document currently paginates into. */
export function useComputedPageCount(): number {
  return useActiveTab((tab) => tab?.computedPages.length ?? 0);
}

/** Block fragments of one computed page, by index. Reference-stable per page. */
export function usePageFragments(pageIndex: number): PageFragment[] {
  return useEditorStore(
    useShallow((state) => {
      const tab = findActiveTab(state.tabs, state.activeTabId);
      return tab?.computedPages[pageIndex] ?? [];
    }),
  );
}

/** True when the given computed page starts with an explicit page break. */
export function usePageStartsWithBreak(pageIndex: number): boolean {
  return useEditorStore((state) => {
    const tab = findActiveTab(state.tabs, state.activeTabId);
    if (!tab || pageIndex <= 0) return false;
    const previous = tab.computedPages[pageIndex - 1];
    const lastId = previous?.[previous.length - 1]?.blockId;
    if (!lastId) return false;
    return findBlock(tab, lastId)?.kind === 'pagebreak';
  });
}

export function useSelectedBlockKind(): Block['kind'] | null {
  return useActiveTab((tab) => {
    if (!tab?.selection.blockId) return null;
    return findBlock(tab, tab.selection.blockId)?.kind ?? null;
  });
}

export function useTextStyle(blockId: string): TextBlock['style'] | undefined {
  return useActiveTab((tab) => {
    const block = findBlock(tab, blockId);
    return block && block.kind === 'text' ? block.style : undefined;
  });
}
