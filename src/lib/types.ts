export type BlockKind = 'text' | 'table' | 'image' | 'shape';

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

export interface PageLayoutEntry {
  /** id of the block that this pagelayoutentry refers to. */
  blockId: string;
  /** list of row id's that belong to this block. */
  rowIds?: string[];
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
  activePageId: string;
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
