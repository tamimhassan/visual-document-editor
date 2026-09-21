export type BlockKind = 'text' | 'table' | 'image' | 'shape' | 'pagebreak';

export type TextAlign = 'left' | 'center' | 'right';

export type FontWeight = '300' | '400' | '500' | '600' | '700';

export type FontFamilyId = 'inter' | 'georgia' | 'times' | 'arial' | 'courier';

export interface TextStyle {
  fontFamily: FontFamilyId;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
}

export interface BlockBase {
  id: string;
  widthPercent: number;
  indentLeft: number;
  marginBottom: number;
}

export interface TextBlock extends BlockBase {
  kind: 'text';
  content: string;
  style: TextStyle;
}

export type ColumnRole = 'rowNumber' | 'value';

export interface TableColumn {
  id: string;
  label: string;
  width: number;
  align: TextAlign;
  role: ColumnRole;
}

export interface TableRow {
  id: string;
  /** columnId -> cell text. Missing keys render as empty cells. */
  cells: Record<string, string>;
  cellStyles?: Record<string, CellStyleOverride>;
}

export type CellStyleOverride = Partial<
  Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight' | 'color' | 'align'>
>;

export interface TableStyle {
  borderWidth: number;
  borderColor: string;
  padding: number;
  rowSpacing: number;
  headerBackground: string;
  headerColor: string;
  fontSize: number;
  cellColor: string;
  fontWeight: FontWeight;
  fontFamily: FontFamilyId;
}

export interface TableBlock extends BlockBase {
  kind: 'table';
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  style: TableStyle;
  startNumber?: number;
}

export interface ImageBlock extends BlockBase {
  kind: 'image';
  src: string;
  alt: string;
  height: number;
  fit: 'contain' | 'cover';
}

export type ShapeVariant = 'rectangle' | 'ellipse' | 'line';

export interface ShapeBlock extends BlockBase {
  kind: 'shape';
  shape: ShapeVariant;
  fill: string;
  height: number;
  radius: number;
}

/**
 * A manual page break: a zero-height marker in the content stream (the
 * document-editor equivalent of Ctrl+Enter in a word processor). Pagination
 * always starts a new page right after it; deleting it lets content flow
 * back together. Renders as nothing in read-only/PDF output.
 */
export interface PageBreakBlock extends BlockBase {
  kind: 'pagebreak';
}

export type Block =
  | TextBlock
  | TableBlock
  | ImageBlock
  | ShapeBlock
  | PageBreakBlock;

/**
 * One rendered piece of a block on a computed page. Most blocks place whole;
 * oversized tables and text blocks split across pages instead of jumping to a
 * fresh page and overflowing it (see lib/pagination.ts):
 * - table fragments carry a row range [rowStart, rowEnd); the header repeats
 *   on continuations and row numbers continue across fragments. The final
 *   fragment's rowEnd is Infinity ("everything from here"), so rows appended
 *   after pagination stay visible until the next measured repagination.
 * - text fragments carry a character range [from, to) whose boundaries fall on
 *   measured line starts, so each slice re-wraps identically at the same
 *   width. The final fragment's `to` is Infinity likewise.
 */
export type PageFragment =
  | { blockId: string; kind: 'whole' }
  | {
      blockId: string;
      kind: 'table';
      rowStart: number;
      rowEnd: number;
      isContinuation: boolean;
    }
  | { blockId: string; kind: 'text'; from: number; to: number };

/** The table fragment flavour of PageFragment (TableBlockView props). */
export type TableFragment = Extract<PageFragment, { kind: 'table' }>;

/** The text fragment flavour of PageFragment (TextBlockView props). */
export type TextFragment = Extract<PageFragment, { kind: 'text' }>;

/**
 * The stored document is ONE flat, ordered block list. Pages are never
 * stored — they are computed from this list plus measured block heights
 * (see lib/pagination.ts), the way a browser computes layout instead of
 * remembering pixel rows.
 */
export interface DocumentModel {
  projectName: string;
  blocks: Block[];
}

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  document: DocumentModel;
}

export interface Selection {
  blockId: string | null;
  rowId: string | null;
  columnId: string | null;
}

export interface Tab {
  id: string;
  title: string;
  templateId: string | null;
  document: DocumentModel;
  /** Index into the computed page list (see computedPages). */
  activePageIndex: number;
  /**
   * Derived pagination cache: the block fragments rendered on each computed
   * page, in order. Never persisted, never part of undo history — recomputed
   * from document.blocks plus measured block geometry whenever either changes.
   */
  computedPages: PageFragment[][];
  selection: Selection;
  past: DocumentModel[];
  future: DocumentModel[];
  dirty: boolean;
}

export const FONT_STACKS: Record<FontFamilyId, string> = {
  inter: 'var(--font-inter), system-ui, sans-serif',
  georgia: "Georgia, 'Times New Roman', serif",
  times: "'Times New Roman', Times, serif",
  arial: 'Arial, Helvetica, sans-serif',
  courier: "'Courier New', Courier, monospace",
};

export const FONT_LABELS: Record<FontFamilyId, string> = {
  inter: 'Inter',
  georgia: 'Georgia',
  times: 'Times New Roman',
  arial: 'Arial',
  courier: 'Courier New',
};

export const FONT_WEIGHT_LABELS: Record<FontWeight, string> = {
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'Semibold',
  '700': 'Bold',
};
