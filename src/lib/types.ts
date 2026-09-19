/**
 * Domain model for the document editor.
 *
 * A saved template is just a serialised `DocumentModel`, so the same shape is
 * used by the canvas, the history stack and localStorage.
 */

export type BlockKind = "text" | "table" | "image" | "shape";

export type TextAlign = "left" | "center" | "right";

export type FontWeight = "300" | "400" | "500" | "600" | "700";

export type FontFamilyId =
  | "inter"
  | "georgia"
  | "times"
  | "arial"
  | "courier";

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
  /** Percentage of the sheet width the block occupies; blocks flow and wrap. */
  widthPercent: number;
  /** Left indent inside the block's slot, in px. */
  indentLeft: number;
  /** Space below the block, in px. */
  marginBottom: number;
}

export interface TextBlock extends BlockBase {
  kind: "text";
  /** Newlines are preserved and rendered as line breaks. */
  content: string;
  style: TextStyle;
}

export type ColumnRole = "rowNumber" | "value";

export interface TableColumn {
  id: string;
  label: string;
  /** Rendered width in px; the table distributes remaining space. */
  width: number;
  align: TextAlign;
  role: ColumnRole;
}

export interface TableRow {
  id: string;
  /** columnId -> cell text. Missing keys render as empty cells. */
  cells: Record<string, string>;
  /**
   * Sparse per-cell format overrides (columnId -> override). An absent key (or
   * an absent field inside an override) inherits: column alignment, then the
   * table style, then hardcoded defaults. Old templates predate this field and
   * simply render fully inherited.
   */
  cellStyles?: Record<string, CellStyleOverride>;
}

/**
 * Per-cell text formatting on top of the table defaults. Every field is
 * optional; each overrides exactly one level of the cascade in TableRowView.
 */
export type CellStyleOverride = Partial<
  Pick<
    TextStyle,
    "fontFamily" | "fontSize" | "fontWeight" | "color" | "align"
  >
>;

export interface TableStyle {
  borderWidth: number;
  borderColor: string;
  padding: number;
  rowSpacing: number;
  headerBackground: string;
  headerColor: string;
  fontSize: number;
  /**
   * Cell text colour, weight and family. Older saved templates predate these
   * fields, so renderers and the properties panel fall back to the defaults
   * when they are undefined.
   */
  cellColor: string;
  fontWeight: FontWeight;
  fontFamily: FontFamilyId;
}

export interface TableBlock extends BlockBase {
  kind: "table";
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  style: TableStyle;
  /**
   * Row-number offset for continuation chunks created when the A4 reflow
   * splits a table across pages, so numbering continues instead of restarting.
   */
  startNumber?: number;
}

export interface ImageBlock extends BlockBase {
  kind: "image";
  /** Data URI or remote URL. */
  src: string;
  alt: string;
  height: number;
  fit: "contain" | "cover";
}

export type ShapeVariant = "rectangle" | "ellipse" | "line";

export interface ShapeBlock extends BlockBase {
  kind: "shape";
  shape: ShapeVariant;
  fill: string;
  height: number;
  radius: number;
}

export type Block = TextBlock | TableBlock | ImageBlock | ShapeBlock;

export interface Page {
  id: string;
  blocks: Block[];
}

export interface DocumentModel {
  projectName: string;
  pages: Page[];
}

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  document: DocumentModel;
}

/**
 * One block's placement in a reflowed page layout (see applyPageLayout).
 * `rowIds` is present when a table block is split across pages: the subset of
 * rows that stays with this entry. The first occurrence keeps the original
 * block; later occurrences of the same id become cloned continuation tables.
 */
export interface PageLayoutEntry {
  blockId: string;
  rowIds?: string[];
}

/** What the properties panel is currently pointed at. */
export interface Selection {
  blockId: string | null;
  rowId: string | null;
  columnId: string | null;
}

export interface Tab {
  id: string;
  title: string;
  /** Set once the tab has been saved, so later saves overwrite the template. */
  templateId: string | null;
  document: DocumentModel;
  activePageId: string;
  selection: Selection;
  past: DocumentModel[];
  future: DocumentModel[];
  dirty: boolean;
}

export const FONT_STACKS: Record<FontFamilyId, string> = {
  inter: "var(--font-inter), system-ui, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  times: "'Times New Roman', Times, serif",
  arial: "Arial, Helvetica, sans-serif",
  courier: "'Courier New', Courier, monospace",
};

export const FONT_LABELS: Record<FontFamilyId, string> = {
  inter: "Inter",
  georgia: "Georgia",
  times: "Times New Roman",
  arial: "Arial",
  courier: "Courier New",
};

export const FONT_WEIGHT_LABELS: Record<FontWeight, string> = {
  "300": "Light",
  "400": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
};
