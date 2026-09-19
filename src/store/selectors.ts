'use client';

import { useShallow } from 'zustand/react/shallow';

import { useEditorStore } from '@/store/editorStore';
import type {
  Block,
  CellStyleOverride,
  ImageBlock,
  Page,
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

export function useActivePage(): Page | undefined {
  return useActiveTab((tab) =>
    tab?.document.pages.find((page) => page.id === tab.activePageId),
  );
}

export function useBlockIds(): string[] {
  return useEditorStore(
    useShallow((state) => {
      const tab = findActiveTab(state.tabs, state.activeTabId);
      const page = tab?.document.pages.find(
        (item) => item.id === tab.activePageId,
      );
      return page ? page.blocks.map((block) => block.id) : [];
    }),
  );
}

export function useBlock(blockId: string): Block | undefined {
  return useActiveTab((tab) => {
    if (!tab) return undefined;
    for (const page of tab.document.pages) {
      const block = page.blocks.find((item) => item.id === blockId);
      if (block) return block;
    }
    return undefined;
  });
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

/** Row-number offset of a (possibly split) table, for continuing numbering. */
export function useTableStartNumber(blockId: string): number {
  return useActiveTab((tab) => findTable(tab, blockId)?.startNumber ?? 0);
}

export function useSelectedColumnId(): string | null {
  return useActiveTab((tab) => tab?.selection.columnId ?? null);
}

export function useSelectedBlock(): Block | undefined {
  return useActiveTab((tab) => {
    if (!tab || !tab.selection.blockId) return undefined;
    for (const page of tab.document.pages) {
      const block = page.blocks.find(
        (item) => item.id === tab.selection.blockId,
      );
      if (block) return block;
    }
    return undefined;
  });
}

export function useTableRow(
  blockId: string,
  rowId: string,
): Record<string, string> | undefined {
  return useActiveTab((tab) => {
    if (!tab) return undefined;
    for (const page of tab.document.pages) {
      const block = page.blocks.find((item) => item.id === blockId);
      if (block && block.kind === 'table') {
        return block.rows.find((row) => row.id === rowId)?.cells;
      }
    }
    return undefined;
  });
}

export function useTableRowData(
  blockId: string,
  rowId: string,
): TableRow | undefined {
  return useActiveTab((tab) => {
    if (!tab) return undefined;
    for (const page of tab.document.pages) {
      const block = page.blocks.find((item) => item.id === blockId);
      if (block && block.kind === 'table') {
        return block.rows.find((row) => row.id === rowId);
      }
    }
    return undefined;
  });
}

/** Sparse per-cell override for one cell; undefined = fully inherited. */
export function useCellStyleOverride(
  blockId: string,
  rowId: string,
  columnId: string,
): CellStyleOverride | undefined {
  return useActiveTab((tab) => {
    if (!tab) return undefined;
    for (const page of tab.document.pages) {
      const block = page.blocks.find((item) => item.id === blockId);
      if (block && block.kind === 'table') {
        return block.rows.find((row) => row.id === rowId)?.cellStyles?.[
          columnId
        ];
      }
    }
    return undefined;
  });
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
  if (!tab) return undefined;
  for (const page of tab.document.pages) {
    const block = page.blocks.find((item) => item.id === blockId);
    if (block && block.kind === 'table') return block;
  }
  return undefined;
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
      let target: Block | undefined;
      if (tab) {
        for (const page of tab.document.pages) {
          const found = page.blocks.find((item) => item.id === blockId);
          if (found) {
            target = found;
            break;
          }
        }
      }
      return {
        kind: target?.kind ?? null,
        widthPercent: target?.widthPercent ?? 100,
        indentLeft: target?.indentLeft ?? 0,
        marginBottom: target?.marginBottom ?? 0,
      };
    }),
  );
}

export function usePageBlockIds(pageId: string): string[] {
  return useEditorStore(
    useShallow((state) => {
      const tab = findActiveTab(state.tabs, state.activeTabId);
      const page = tab?.document.pages.find((item) => item.id === pageId);
      return page ? page.blocks.map((block) => block.id) : [];
    }),
  );
}

export function usePageIds(): string[] {
  return useEditorStore(
    useShallow((state) => {
      const tab = findActiveTab(state.tabs, state.activeTabId);
      return tab ? tab.document.pages.map((page) => page.id) : [];
    }),
  );
}

/** Block kinds only — enough to paint a page thumbnail without re-rendering it on every keystroke. */
export function usePageBlockKinds(pageId: string): Block['kind'][] {
  return useEditorStore(
    useShallow((state) => {
      const tab = findActiveTab(state.tabs, state.activeTabId);
      const page = tab?.document.pages.find((item) => item.id === pageId);
      return page ? page.blocks.map((block) => block.kind) : [];
    }),
  );
}

export function useSelectedBlockKind(): Block['kind'] | null {
  return useActiveTab((tab) => {
    if (!tab || !tab.selection.blockId) return null;
    for (const page of tab.document.pages) {
      const block = page.blocks.find(
        (item) => item.id === tab.selection.blockId,
      );
      if (block) return block.kind;
    }
    return null;
  });
}

export function useTextStyle(blockId: string): TextBlock['style'] | undefined {
  return useActiveTab((tab) => {
    if (!tab) return undefined;
    for (const page of tab.document.pages) {
      const block = page.blocks.find((item) => item.id === blockId);
      if (block && block.kind === 'text') return block.style;
    }
    return undefined;
  });
}
