'use client';

import { current, isDraft, original } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { clone } from '@/lib/clone';
import {
  createDefaultDocument,
  createImageBlock,
  createPageBreakBlock,
  createShapeBlock,
  createTableBlock,
  createTextBlock,
} from '@/lib/defaultTemplate';
import { createId } from '@/lib/ids';
import { paginateWithCache } from '@/lib/pagination';
import { readTemplateStore, writeTemplateStore } from '@/lib/storage';
import type {
  Block,
  BlockKind,
  CellStyleOverride,
  DocumentModel,
  PageFragment,
  SavedTemplate,
  Tab,
  TableBlock,
  TableStyle,
  TextAlign,
  TextBlock,
  TextStyle,
} from '@/lib/types';

const HISTORY_LIMIT = 60;

/** Emitted whenever a save succeeds, so the UI can toast a confirmation. */
export interface SaveEvent {
  templateId: string;
  name: string;
  /** True when the save created a new template rather than updating one. */
  created: boolean;
  /** Increments per save so identical consecutive saves re-trigger toasts. */
  seq: number;
}

export interface EditorState {
  hydrated: boolean;
  tabs: Tab[];
  activeTabId: string;
  templates: SavedTemplate[];
  /** The template restored on launch; "" while no template is the default. */
  defaultTemplateId: string;
  zoom: number;
  previewOpen: boolean;
  exporting: boolean;
  /** Replaced on every successful save (see SaveEvent), or null initially. */
  lastSaveEvent: SaveEvent | null;

  hydrate: () => void;

  openNewTab: () => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setProjectName: (name: string) => void;

  /** "Add Page": inserts a manual page-break block at the selection (or the
   *  end of the active page's content) and lands on the page it opens. */
  insertPageBreak: () => void;
  setActivePage: (pageIndex: number) => void;
  /** Removes the page break that starts the given computed page (if any). */
  removePageBreak: (pageIndex: number) => void;
  /** Measured-pagination update: derived cache only, never undoable. */
  setComputedPages: (pages: PageFragment[][]) => void;

  addBlock: (kind: BlockKind) => void;
  removeBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  moveBlock: (activeId: string, overId: string) => void;
  updateBlockLayout: (
    blockId: string,
    patch: Partial<Pick<Block, 'widthPercent' | 'indentLeft' | 'marginBottom'>>,
  ) => void;

  updateTextContent: (blockId: string, content: string) => void;
  updateTextStyle: (blockId: string, patch: Partial<TextStyle>) => void;

  updateTableTitle: (blockId: string, title: string) => void;
  updateTableStyle: (blockId: string, patch: Partial<TableStyle>) => void;
  updateColumn: (
    blockId: string,
    columnId: string,
    patch: { label?: string; width?: number; align?: TextAlign },
  ) => void;
  updateCell: (
    blockId: string,
    rowId: string,
    columnId: string,
    value: string,
  ) => void;
  /** Merges a sparse per-cell format override (snapshot + equality guard inside). */
  updateCellStyle: (
    blockId: string,
    rowId: string,
    columnId: string,
    patch: CellStyleOverride,
  ) => void;
  /** Removes per-cell overrides: all of them, or just the given keys. */
  clearCellStyle: (
    blockId: string,
    rowId: string,
    columnId: string,
    keys?: (keyof CellStyleOverride)[],
  ) => void;
  addRow: (blockId: string) => void;
  deleteRow: (blockId: string, rowId?: string) => void;
  addColumn: (blockId: string) => void;
  deleteColumn: (blockId: string, columnId?: string) => void;
  moveRow: (blockId: string, activeId: string, overId: string) => void;
  selectCell: (blockId: string, rowId: string, columnId: string) => void;

  updateImage: (
    blockId: string,
    patch: { src?: string; alt?: string; height?: number },
  ) => void;
  updateShape: (
    blockId: string,
    patch: { fill?: string; height?: number; radius?: number },
  ) => void;

  /** Call before a burst of transient edits (typing) so undo has one entry. */
  beginEdit: () => void;
  undo: () => void;
  redo: () => void;

  saveActiveTab: (willBeDefaultTemplate?: boolean) => void;
  openTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  renameTemplate: (templateId: string, name: string) => void;
  setDefaultTemplate: (templateId: string) => void;

  setZoom: (zoom: number) => void;
  setPreviewOpen: (open: boolean) => void;
  setExporting: (exporting: boolean) => void;
}

function createTab(document: DocumentModel, title: string): Tab {
  return {
    id: createId('tab'),
    title,
    templateId: null,
    document,
    activePageIndex: 0,
    computedPages: paginateWithCache(document.blocks),
    selection: { blockId: null, rowId: null, columnId: null },
    past: [],
    future: [],
    dirty: false,
  };
}

const INITIAL_TAB = createTab(createDefaultDocument(), 'New-Template');

type Draft = EditorState;

function getTab(state: Draft): Tab | undefined {
  return state.tabs.find((tab) => tab.id === state.activeTabId);
}

function getBlock(tab: Tab, blockId: string): Block | undefined {
  return tab.document.blocks.find((block) => block.id === blockId);
}

function repaginate(tab: Tab): void {
  tab.computedPages = paginateWithCache(tab.document.blocks);
}

/** Keeps activePageIndex inside the computed page list. */
function clampActivePage(tab: Tab): void {
  const last = tab.computedPages.length - 1;
  if (tab.activePageIndex > last) tab.activePageIndex = Math.max(0, last);
}

/** The page a fragment list puts the given block on, or -1. */
function pageIndexOfBlock(pages: PageFragment[][], blockId: string): number {
  return pages.findIndex((page) =>
    page.some((fragment) => fragment.blockId === blockId),
  );
}

/** Index just past the active page's last content block (its trailing page
 *  break excluded), for "insert at end of page" semantics. */
function endOfActivePageInsertIndex(tab: Tab): number {
  const blocks = tab.document.blocks;
  const fragments = tab.computedPages[tab.activePageIndex] ?? [];
  for (let i = fragments.length - 1; i >= 0; i -= 1) {
    const id = fragments[i]?.blockId;
    const block = id ? blocks.find((item) => item.id === id) : undefined;
    if (block && block.kind !== 'pagebreak') {
      return blocks.indexOf(block) + 1;
    }
  }
  return blocks.length;
}

function getTextBlock(tab: Tab, blockId: string): TextBlock | undefined {
  const block = getBlock(tab, blockId);
  return block && block.kind === 'text' ? block : undefined;
}

function getTableBlock(tab: Tab, blockId: string): TableBlock | undefined {
  const block = getBlock(tab, blockId);
  return block && block.kind === 'table' ? block : undefined;
}

function snapshot(tab: Tab): void {
  tab.past.push(original(tab.document) ?? current(tab.document));
  if (tab.past.length > HISTORY_LIMIT) tab.past.shift();
  tab.future = [];
  tab.dirty = true;
}

function markDirty(tab: Tab): void {
  tab.dirty = true;
}

function patchChanged<T extends object>(target: T, patch: Partial<T>): boolean {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && target[key as keyof T] !== value) return true;
  }
  return false;
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}

function persist(state: Draft): void {
  // Guard with isDraft so an action that (mistakenly) replaces a branch with
  // a plain value cannot crash the whole set() here.
  const templates = isDraft(state.templates)
    ? current(state.templates)
    : state.templates;
  writeTemplateStore({
    defaultTemplateId: state.defaultTemplateId,
    templates: clone(templates),
  });
}

// First save of a tab is "template1", then template2, template3... The name
// must not collide with a surviving (or renamed) template after deletes.
function nextTemplateName(templates: SavedTemplate[]): string {
  const taken = new Set(
    templates.map((template) => template.name.toLowerCase()),
  );
  let n = templates.length + 1;
  while (taken.has(`template${n}`)) n += 1;
  return `template${n}`;
}

function newBlock(kind: BlockKind): Block {
  switch (kind) {
    case 'text':
      return createTextBlock();
    case 'table':
      return createTableBlock();
    case 'image':
      return createImageBlock();
    case 'shape':
      return createShapeBlock();
    case 'pagebreak':
      return createPageBreakBlock();
  }
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    hydrated: false,
    tabs: [INITIAL_TAB],
    activeTabId: INITIAL_TAB.id,
    templates: [],
    defaultTemplateId: '',
    zoom: 1,
    previewOpen: false,
    exporting: false,
    lastSaveEvent: null,

    hydrate: () =>
      set((state) => {
        if (state.hydrated) return;

        const store = readTemplateStore();
        state.templates = store.templates;
        state.defaultTemplateId = store.defaultTemplateId;
        state.hydrated = true;

        // Requirement: reopening the app restores the default template (set
        // explicitly, or the first one ever saved) instead of the built-in
        // document. readTemplateStore self-heals a dangling default id.
        const restored =
          store.templates.find(
            (template) => template.id === store.defaultTemplateId,
          ) ?? null;
        const tab = getTab(state);
        if (!restored || !tab) return;

        tab.document = clone(restored.document);
        tab.templateId = restored.id;
        tab.title = restored.name;
        tab.activePageIndex = 0;
        tab.computedPages = paginateWithCache(tab.document.blocks);
        tab.past = [];
        tab.future = [];
        tab.dirty = false;
      }),

    openNewTab: () =>
      set((state) => {
        // Unsaved tabs default to "New-Template"; extra ones number off it so
        // two "+" clicks never produce indistinguishable tabs.
        const base = 'New-Template';
        let title = base;
        let n = 2;
        while (
          state.tabs.some(
            (tab) => tab.title.toLowerCase() === title.toLowerCase(),
          )
        ) {
          title = `${base}-${n}`;
          n += 1;
        }
        const tab = createTab(createDefaultDocument(), title);
        state.tabs.push(tab);
        state.activeTabId = tab.id;
      }),

    closeTab: (tabId) =>
      set((state) => {
        if (state.tabs.length === 1) return;

        const index = state.tabs.findIndex((tab) => tab.id === tabId);
        if (index === -1) return;

        state.tabs.splice(index, 1);
        if (state.activeTabId === tabId) {
          const fallback = state.tabs[Math.max(0, index - 1)];
          if (fallback) state.activeTabId = fallback.id;
        }
      }),

    setActiveTab: (tabId) =>
      set((state) => {
        state.activeTabId = tabId;
      }),

    setProjectName: (name) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        tab.document.projectName = name;
        markDirty(tab);
      }),

    insertPageBreak: () =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        snapshot(tab);
        const pageBreak = createPageBreakBlock();
        const blocks = tab.document.blocks;
        const selectedId = tab.selection.blockId;
        const selectedIndex = selectedId
          ? blocks.findIndex((item) => item.id === selectedId)
          : -1;
        // At the selection when one exists; otherwise at the end of the
        // active page's content, so "Add Page" opens a page right after it.
        const insertAt =
          selectedIndex === -1
            ? endOfActivePageInsertIndex(tab)
            : selectedIndex + 1;
        blocks.splice(insertAt, 0, pageBreak);
        repaginate(tab);
        // Land on the page the break opens.
        const breakPage = pageIndexOfBlock(tab.computedPages, pageBreak.id);
        tab.activePageIndex =
          breakPage === -1
            ? tab.activePageIndex
            : Math.min(breakPage + 1, tab.computedPages.length - 1);
        tab.selection = { blockId: null, rowId: null, columnId: null };
      }),

    setActivePage: (pageIndex) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const last = tab.computedPages.length - 1;
        tab.activePageIndex = Math.max(0, Math.min(pageIndex, last));
        tab.selection = { blockId: null, rowId: null, columnId: null };
      }),

    removePageBreak: (pageIndex) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab || pageIndex <= 0) return;
        // The break that starts this page is the trailing block of the page
        // before it; removing it lets the content flow back together.
        const previousPage = tab.computedPages[pageIndex - 1];
        const lastId = previousPage?.[previousPage.length - 1]?.blockId;
        if (!lastId) return;
        const block = tab.document.blocks.find((item) => item.id === lastId);
        if (!block || block.kind !== 'pagebreak') return;

        snapshot(tab);
        tab.document.blocks = tab.document.blocks.filter(
          (item) => item.id !== lastId,
        );
        repaginate(tab);
        clampActivePage(tab);
      }),

    setComputedPages: (pages) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab || pages.length === 0) return;
        // Derived state: no snapshot, no dirty flag — pagination is re-derived
        // from measurements, deliberately outside undo (as it always was).
        tab.computedPages = pages;
        clampActivePage(tab);
      }),

    addBlock: (kind) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;

        snapshot(tab);
        const block = newBlock(kind);
        const blocks = tab.document.blocks;
        const selectedIndex = blocks.findIndex(
          (item) => item.id === tab.selection.blockId,
        );

        if (selectedIndex === -1) {
          // No selection: append at the end of the active page's content.
          const insertAt = endOfActivePageInsertIndex(tab);
          blocks.splice(insertAt, 0, block);
        } else {
          blocks.splice(selectedIndex + 1, 0, block);
        }

        repaginate(tab);
        // Keep the page rail in sync with where the new block landed.
        const pageIndex = pageIndexOfBlock(tab.computedPages, block.id);
        if (pageIndex !== -1) tab.activePageIndex = pageIndex;
        tab.selection = { blockId: block.id, rowId: null, columnId: null };
      }),

    removeBlock: (blockId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        snapshot(tab);

        tab.document.blocks = tab.document.blocks.filter(
          (block) => block.id !== blockId,
        );
        repaginate(tab);
        clampActivePage(tab);

        if (tab.selection.blockId === blockId) {
          tab.selection = { blockId: null, rowId: null, columnId: null };
        }
      }),

    selectBlock: (blockId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;

        if (
          tab.selection.blockId === blockId &&
          tab.selection.rowId === null &&
          tab.selection.columnId === null
        ) {
          return;
        }
        tab.selection = { blockId, rowId: null, columnId: null };

        if (blockId) {
          const pageIndex = pageIndexOfBlock(tab.computedPages, blockId);
          if (pageIndex !== -1) tab.activePageIndex = pageIndex;
        }
      }),

    moveBlock: (activeId, overId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;

        const blocks = tab.document.blocks;
        const from = blocks.findIndex((block) => block.id === activeId);
        const to = blocks.findIndex((block) => block.id === overId);
        if (from === -1 || to === -1 || from === to) return;

        snapshot(tab);
        tab.document.blocks = move(blocks, from, to);
        repaginate(tab);
      }),

    updateBlockLayout: (blockId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getBlock(tab, blockId);
        if (!block) return;

        const clamped: {
          widthPercent?: number;
          indentLeft?: number;
          marginBottom?: number;
        } = {};
        if (patch.widthPercent !== undefined) {
          clamped.widthPercent = Math.min(100, Math.max(5, patch.widthPercent));
        }
        if (patch.indentLeft !== undefined) {
          clamped.indentLeft = Math.max(0, patch.indentLeft);
        }
        if (patch.marginBottom !== undefined) {
          clamped.marginBottom = Math.max(0, patch.marginBottom);
        }
        if (!patchChanged(block, clamped)) return;

        snapshot(tab);
        Object.assign(block, clamped);
      }),

    updateTextContent: (blockId, content) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTextBlock(tab, blockId);
        if (!block || block.content === content) return;
        block.content = content;
        markDirty(tab);
      }),

    updateTextStyle: (blockId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTextBlock(tab, blockId);
        if (!block || !patchChanged(block.style, patch)) return;

        snapshot(tab);
        Object.assign(block.style, patch);
      }),

    updateTableTitle: (blockId, title) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block || block.title === title) return;

        snapshot(tab);
        block.title = title;
      }),

    updateTableStyle: (blockId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block || !patchChanged(block.style, patch)) return;

        snapshot(tab);
        Object.assign(block.style, patch);
      }),

    updateColumn: (blockId, columnId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;
        const column = block.columns.find((item) => item.id === columnId);
        if (!column) return;

        const clamped: {
          label?: string;
          width?: number;
          align?: TextAlign;
        } = {};
        if (patch.label !== undefined) clamped.label = patch.label;
        if (patch.width !== undefined) {
          clamped.width = Math.min(600, Math.max(32, patch.width));
        }
        if (
          patch.align === 'left' ||
          patch.align === 'center' ||
          patch.align === 'right'
        ) {
          clamped.align = patch.align;
        }
        if (!patchChanged(column, clamped)) return;

        snapshot(tab);
        Object.assign(column, clamped);
      }),

    updateCell: (blockId, rowId, columnId, value) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;
        const row = block.rows.find((item) => item.id === rowId);
        if (!row) return;
        row.cells[columnId] = value;
        markDirty(tab);
      }),

    updateCellStyle: (blockId, rowId, columnId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;
        const row = block.rows.find((item) => item.id === rowId);
        if (!row) return;

        const current = row.cellStyles?.[columnId] ?? {};
        if (!patchChanged(current, patch)) return;

        snapshot(tab);
        const styles = row.cellStyles ?? {};
        styles[columnId] = { ...current, ...patch };
        if (Object.keys(styles[columnId]).length === 0) {
          delete styles[columnId];
        }
        row.cellStyles = styles;
      }),

    clearCellStyle: (blockId, rowId, columnId, keys) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;
        const row = block.rows.find((item) => item.id === rowId);
        const styles = row?.cellStyles;
        const override = styles?.[columnId];
        if (!row || !styles || !override) return;

        snapshot(tab);
        if (!keys || keys.length === 0) {
          delete styles[columnId];
        } else {
          for (const key of keys) delete override[key];
          if (Object.keys(override).length === 0) {
            delete styles[columnId];
          }
        }
      }),

    addRow: (blockId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;

        snapshot(tab);
        const cells: Record<string, string> = {};
        for (const column of block.columns) {
          if (column.role === 'value') cells[column.id] = '';
        }
        block.rows.push({ id: createId('row'), cells });
      }),

    deleteRow: (blockId, rowId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;

        const targetId = rowId ?? tab.selection.rowId ?? block.rows.at(-1)?.id;
        if (!targetId) return;

        snapshot(tab);
        block.rows = block.rows.filter((row) => row.id !== targetId);
        if (tab.selection.rowId === targetId) tab.selection.rowId = null;
      }),

    addColumn: (blockId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;

        snapshot(tab);
        const column = {
          id: createId('column'),
          label: `Column ${block.columns.length}`,
          width: 100,
          align: 'left' as const,
          role: 'value' as const,
        };
        block.columns.push(column);
        for (const row of block.rows) {
          row.cells[column.id] = '';
        }
      }),

    deleteColumn: (blockId, columnId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;

        const targetId =
          columnId ??
          tab.selection.columnId ??
          [...block.columns].reverse().find((col) => col.role === 'value')?.id;
        if (!targetId) return;
        if (block.columns.filter((col) => col.role === 'value').length <= 1) {
          return;
        }

        snapshot(tab);
        block.columns = block.columns.filter((col) => col.id !== targetId);
        for (const row of block.rows) {
          delete row.cells[targetId];
          // Keep the sparse override map from accumulating orphaned keys.
          if (row.cellStyles) delete row.cellStyles[targetId];
        }
        if (tab.selection.columnId === targetId) tab.selection.columnId = null;
      }),

    moveRow: (blockId, activeId, overId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getTableBlock(tab, blockId);
        if (!block) return;

        const from = block.rows.findIndex((row) => row.id === activeId);
        const to = block.rows.findIndex((row) => row.id === overId);
        if (from === -1 || to === -1 || from === to) return;

        snapshot(tab);
        block.rows = move(block.rows, from, to);
      }),

    selectCell: (blockId, rowId, columnId) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        tab.selection = { blockId, rowId, columnId };
        // Keep the page rail in sync when a cell on another page is focused.
        const pageIndex = pageIndexOfBlock(tab.computedPages, blockId);
        if (pageIndex !== -1) tab.activePageIndex = pageIndex;
      }),

    updateImage: (blockId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getBlock(tab, blockId);
        if (!block || block.kind !== 'image') return;

        const clamped: { src?: string; alt?: string; height?: number } = {};
        if (patch.src !== undefined) clamped.src = patch.src;
        if (patch.alt !== undefined) clamped.alt = patch.alt;
        if (patch.height !== undefined) {
          clamped.height = Math.max(16, patch.height);
        }
        if (!patchChanged(block, clamped)) return;

        snapshot(tab);
        Object.assign(block, clamped);
      }),

    updateShape: (blockId, patch) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const block = getBlock(tab, blockId);
        if (!block || block.kind !== 'shape') return;

        const clamped: {
          fill?: string;
          height?: number;
          radius?: number;
        } = {};
        if (patch.fill !== undefined) clamped.fill = patch.fill;
        if (patch.height !== undefined) {
          clamped.height = Math.max(1, patch.height);
        }
        if (patch.radius !== undefined) {
          clamped.radius = Math.max(0, patch.radius);
        }
        if (!patchChanged(block, clamped)) return;

        snapshot(tab);
        Object.assign(block, clamped);
      }),

    beginEdit: () =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        snapshot(tab);
      }),

    undo: () =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const previous = tab.past.pop();
        if (!previous) return;

        // Same reference-sharing as snapshot(): the document has not been
        // reassigned in this action, so original() is the pre-undo state.
        tab.future.unshift(original(tab.document) ?? current(tab.document));
        tab.document = previous;
        repaginate(tab);
        clampActivePage(tab);
        tab.selection = { blockId: null, rowId: null, columnId: null };
        tab.dirty = true;
      }),

    redo: () =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;
        const next = tab.future.shift();
        if (!next) return;

        // Same reference-sharing as undo(): original() is the pre-redo state.
        tab.past.push(original(tab.document) ?? current(tab.document));
        tab.document = next;
        repaginate(tab);
        clampActivePage(tab);
        tab.selection = { blockId: null, rowId: null, columnId: null };
        tab.dirty = true;
      }),

    saveActiveTab: (willBeDefaultTemplate = false) =>
      set((state) => {
        const tab = getTab(state);
        if (!tab) return;

        const now = new Date().toISOString();
        const document = clone(current(tab.document));
        const existing = state.templates.find(
          (template) => template.id === tab.templateId,
        );
        const seq = (state.lastSaveEvent?.seq ?? 0) + 1;

        if (existing) {
          existing.document = document;
          existing.updatedAt = now;
          state.lastSaveEvent = {
            templateId: existing.id,
            name: existing.name,
            created: false,
            seq,
          };
          if (willBeDefaultTemplate) {
            state.defaultTemplateId = existing.id;
          }
        } else {
          const name = nextTemplateName(state.templates);
          const template: SavedTemplate = {
            id: createId('template'),
            name,
            createdAt: now,
            updatedAt: now,
            document,
          };
          // The first template ever saved becomes the default automatically —
          // there is nothing else it could point to. Every save after that
          // leaves the default untouched; only setDefaultTemplate changes it.
          const firstEver = state.templates.length === 0;
          state.templates.push(template);
          if (firstEver) state.defaultTemplateId = template.id;
          tab.templateId = template.id;
          tab.title = template.name;
          state.lastSaveEvent = {
            templateId: template.id,
            name,
            created: true,
            seq,
          };
          if (willBeDefaultTemplate) {
            state.defaultTemplateId = template.id;
          }
        }

        tab.dirty = false;
        persist(state);
      }),

    openTemplate: (templateId) =>
      set((state) => {
        const template = state.templates.find((item) => item.id === templateId);
        if (!template) return;

        const alreadyOpen = state.tabs.find(
          (tab) => tab.templateId === templateId,
        );
        if (alreadyOpen) {
          state.activeTabId = alreadyOpen.id;
          return;
        }

        const tab = createTab(clone(current(template.document)), template.name);
        tab.templateId = template.id;
        state.tabs.push(tab);
        state.activeTabId = tab.id;
      }),

    deleteTemplate: (templateId) =>
      set((state) => {
        // Splice in place: replacing state.templates with .filter() would drop
        // the immer draft, and persist()"s current() would throw.
        const index = state.templates.findIndex(
          (template) => template.id === templateId,
        );
        if (index === -1) return;
        state.templates.splice(index, 1);
        for (const tab of state.tabs) {
          if (tab.templateId === templateId) tab.templateId = null;
        }
        // Deleting the default reassigns it instead of leaving it dangling:
        // the first surviving template, or "" if that was the last one.
        if (state.defaultTemplateId === templateId) {
          state.defaultTemplateId = state.templates[0]?.id ?? '';
        }
        persist(state);
      }),

    renameTemplate: (templateId, name) =>
      set((state) => {
        const template = state.templates.find((item) => item.id === templateId);
        if (!template) return;
        template.name = name;
        template.updatedAt = new Date().toISOString();
        for (const tab of state.tabs) {
          if (tab.templateId === templateId) tab.title = name;
        }
        persist(state);
      }),

    setDefaultTemplate: (templateId) =>
      set((state) => {
        // The only manual way to change the default; saving never touches it.
        if (!state.templates.some((template) => template.id === templateId)) {
          return;
        }
        if (state.defaultTemplateId === templateId) return;
        state.defaultTemplateId = templateId;
        persist(state);
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = zoom;
      }),

    setPreviewOpen: (open) =>
      set((state) => {
        state.previewOpen = open;
      }),

    setExporting: (exporting) =>
      set((state) => {
        state.exporting = exporting;
      }),
  })),
);
