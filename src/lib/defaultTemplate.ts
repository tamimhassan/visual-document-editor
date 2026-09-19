import { createId } from '@/lib/ids';
import type {
  Block,
  DocumentModel,
  ImageBlock,
  Page,
  ShapeBlock,
  TableBlock,
  TextBlock,
  TextStyle,
} from '@/lib/types';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="12" fill="#2563EB"/>
  <rect x="12" y="12" width="14" height="14" rx="4" fill="#FFFFFF"/>
  <rect x="22" y="22" width="14" height="14" rx="4" fill="#93C5FD"/>
</svg>`;

export const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  LOGO_SVG,
)}`;

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'inter',
  fontSize: 12,
  fontWeight: '400',
  color: '#1F2937',
  align: 'left',
  lineHeight: 1.5,
  letterSpacing: 0,
};

export function createTextBlock(partial: Partial<TextBlock> = {}): TextBlock {
  return {
    id: createId('text'),
    kind: 'text',
    widthPercent: 100,
    indentLeft: 0,
    marginBottom: 12,
    content: 'New text line',
    ...partial,
    style: { ...DEFAULT_TEXT_STYLE, ...partial.style },
  };
}

export function createTableBlock(
  partial: Partial<TableBlock> = {},
): TableBlock {
  const indexColumn = {
    id: createId('column'),
    label: '#',
    width: 44,
    align: 'center' as const,
    role: 'rowNumber' as const,
  };
  const itemColumn = {
    id: createId('column'),
    label: 'Item Detail',
    width: 300,
    align: 'left' as const,
    role: 'value' as const,
  };
  const amountColumn = {
    id: createId('column'),
    label: 'Amount',
    width: 110,
    align: 'right' as const,
    role: 'value' as const,
  };

  return {
    id: createId('table'),
    kind: 'table',
    widthPercent: 100,
    indentLeft: 0,
    marginBottom: 20,
    title: 'New Table',
    columns: [indexColumn, itemColumn, amountColumn],
    rows: [1, 2, 3].map(() => ({
      id: createId('row'),
      cells: {
        [itemColumn.id]: 'Item description',
        [amountColumn.id]: '$0.00',
      },
    })),
    style: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 10,
      rowSpacing: 2,
      headerBackground: '#EFF6FF',
      headerColor: '#1F2937',
      fontSize: 12,
      cellColor: '#1F2937',
      fontWeight: '400' as const,
      fontFamily: 'inter' as const,
    },
    ...partial,
  };
}

export function createImageBlock(
  partial: Partial<ImageBlock> = {},
): ImageBlock {
  return {
    id: createId('image'),
    kind: 'image',
    widthPercent: 40,
    indentLeft: 0,
    marginBottom: 12,
    src: LOGO_DATA_URI,
    alt: 'Placeholder image',
    height: 120,
    fit: 'contain',
    ...partial,
  };
}

export function createShapeBlock(
  partial: Partial<ShapeBlock> = {},
): ShapeBlock {
  return {
    id: createId('shape'),
    kind: 'shape',
    widthPercent: 100,
    indentLeft: 0,
    marginBottom: 16,
    shape: 'rectangle',
    fill: '#DBEAFE',
    height: 60,
    radius: 8,
    ...partial,
  };
}

function quotationTable(): TableBlock {
  const columns = [
    {
      id: 'col_index',
      label: '#',
      width: 44,
      align: 'center' as const,
      role: 'rowNumber' as const,
    },
    {
      id: 'col_item',
      label: 'Item Detail',
      width: 290,
      align: 'left' as const,
      role: 'value' as const,
    },
    {
      id: 'col_qty',
      label: 'Qty',
      width: 70,
      align: 'center' as const,
      role: 'value' as const,
    },
    {
      id: 'col_price',
      label: 'Unit Price',
      width: 100,
      align: 'right' as const,
      role: 'value' as const,
    },
    {
      id: 'col_amount',
      label: 'Amount',
      width: 100,
      align: 'right' as const,
      role: 'value' as const,
    },
  ];

  const seed: ReadonlyArray<[string, string, string, string]> = [
    ['Product A', '2', '$10.00', '$20.00'],
    ['Product B', '3', '$10.00', '$45.00'],
    ['Product B', '1', '$15.00', '$45.00'],
    ['Product C', '1', '$50.00', '$50.00'],
    ['Product D', '5', '$8.00', '$40.00'],
  ];

  return {
    id: 'block_quotation',
    kind: 'table',
    widthPercent: 100,
    indentLeft: 0,
    marginBottom: 24,
    title: 'QUOTATION ITEMS',
    columns,
    rows: seed.map(([item, qty, price, amount], index) => ({
      id: `row_seed_${index + 1}`,
      cells: {
        col_item: item,
        col_qty: qty,
        col_price: price,
        col_amount: amount,
      },
    })),
    style: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 10,
      rowSpacing: 2,
      headerBackground: '#EFF6FF',
      headerColor: '#1F2937',
      fontSize: 12,
      cellColor: '#1F2937',
      fontWeight: '400' as const,
      fontFamily: 'inter' as const,
    },
  };
}

function defaultBlocks(): Block[] {
  return [
    {
      id: 'block_logo',
      kind: 'image',
      widthPercent: 7,
      indentLeft: 0,
      marginBottom: 0,
      src: LOGO_DATA_URI,
      alt: 'Company logo',
      height: 44,
      fit: 'contain',
    },
    createTextBlock({
      id: 'block_company',
      widthPercent: 45,
      indentLeft: 12,
      marginBottom: 0,
      content: 'Your Company',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 19,
        fontWeight: '700',
        color: '#1F2937',
      },
    }),
    createTextBlock({
      id: 'block_doc_title',
      widthPercent: 48,
      indentLeft: 0,
      marginBottom: 4,
      content: 'VISUAL DOCUMENT',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 23,
        fontWeight: '700',
        color: '#0F172A',
        align: 'right',
        letterSpacing: 0.4,
      },
    }),
    createTextBlock({
      id: 'block_tagline',
      widthPercent: 60,
      indentLeft: 61,
      marginBottom: 14,
      content: 'Better Documents, Better Business',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 11,
        color: '#6B7280',
      },
    }),
    {
      id: 'block_rule',
      kind: 'shape',
      shape: 'line',
      widthPercent: 100,
      indentLeft: 0,
      marginBottom: 18,
      fill: '#93C5FD',
      height: 2,
      radius: 2,
    },
    createTextBlock({
      id: 'block_issuer',
      widthPercent: 33,
      indentLeft: 0,
      marginBottom: 22,
      content: 'ISSUER/\nIssuer Details',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 12,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 1.6,
      },
    }),
    createTextBlock({
      id: 'block_client',
      widthPercent: 34,
      indentLeft: 0,
      marginBottom: 22,
      content: 'Client Details',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        lineHeight: 1.6,
      },
    }),
    createTextBlock({
      id: 'block_meta',
      widthPercent: 33,
      indentLeft: 0,
      marginBottom: 22,
      content: 'No/Date:  C-2026-061\n2026-09-14',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 11,
        fontWeight: '600',
        color: '#374151',
        align: 'right',
        lineHeight: 1.6,
      },
    }),
    quotationTable(),
    {
      id: 'block_footer_rule',
      kind: 'shape',
      shape: 'line',
      widthPercent: 100,
      indentLeft: 0,
      marginBottom: 10,
      fill: '#E5E7EB',
      height: 1,
      radius: 1,
    },
    createTextBlock({
      id: 'block_note',
      widthPercent: 100,
      indentLeft: 0,
      marginBottom: 0,
      content: 'Note: Full PDF layout rendered only upon export.',
      style: {
        ...DEFAULT_TEXT_STYLE,
        fontSize: 10,
        color: '#6B7280',
      },
    }),
  ];
}

export function createEmptyPage(): Page {
  return { id: createId('page'), blocks: [] };
}

/** The document shown the very first time the app is opened. */
export function createDefaultDocument(): DocumentModel {
  return {
    projectName: 'Document Project V1',
    pages: [{ id: 'page_default', blocks: defaultBlocks() }],
  };
}
