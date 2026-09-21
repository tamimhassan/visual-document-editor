'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { memo, useRef } from 'react';

import type { TableColumn, TableStyle } from '@/lib/types';
import { FONT_STACKS } from '@/lib/types';
import { useEditorStore } from '@/store/editorStore';
import { useTableRowData } from '@/store/selectors';
import { useReadOnly } from './readOnly';

export interface TableRowViewProps {
  blockId: string;
  rowId: string;
  displayNumber: number;
  columns: TableColumn[];
  style: TableStyle;
  selected: boolean;
}

function TableRowViewImpl({
  blockId,
  rowId,
  displayNumber,
  columns,
  style,
  selected,
}: TableRowViewProps) {
  const row = useTableRowData(blockId, rowId);
  const readOnly = useReadOnly();
  const touched = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId, disabled: readOnly });

  if (!row) return null;

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 20 : undefined,
    background: selected ? '#F8FAFF' : '#FFFFFF',
  };

  const cellBorder = `${style.borderWidth}px solid ${style.borderColor}`;

  return (
    <tr ref={setNodeRef} data-row-id={rowId} style={rowStyle}>
      {!readOnly ? (
        <td className="w-7 align-middle" style={{ borderBottom: cellBorder }}>
          <button
            type="button"
            aria-label="Reorder row"
            className="flex h-full w-7 cursor-grab items-center justify-center text-ink-400 transition hover:text-brand-600 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        </td>
      ) : null}

      {columns.map((column) => {
        const override = row.cellStyles?.[column.id];
        const fontFamily = override?.fontFamily ?? style.fontFamily ?? 'inter';
        const align = override?.align ?? column.align;

        const shared: React.CSSProperties = {
          borderBottom: cellBorder,
          borderRight: cellBorder,
          padding: `${style.padding}px`,
          paddingTop: `${style.padding + style.rowSpacing}px`,
          paddingBottom: `${style.padding + style.rowSpacing}px`,
          textAlign: align,
          verticalAlign: 'middle',
          lineHeight: 1.4,
          fontSize: `${override?.fontSize ?? style.fontSize}px`,
          fontFamily: FONT_STACKS[fontFamily],
          color: override?.color ?? style.cellColor ?? '#1F2937',
          fontWeight: override?.fontWeight ?? style.fontWeight ?? '400',
        };

        if (column.role === 'rowNumber') {
          return (
            <td key={column.id} style={shared}>
              {displayNumber}
            </td>
          );
        }

        const value = row.cells[column.id] ?? '';

        if (readOnly) {
          return (
            <td key={column.id} style={shared}>
              {value}
            </td>
          );
        }

        return (
          <td key={column.id} style={shared}>
            <input
              className="w-full rounded-md bg-slate-50/80 px-2 py-1 text-inherit outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-100"
              style={{ textAlign: align }}
              value={value}
              aria-label={column.label}
              onFocus={() => {
                touched.current = false;
                useEditorStore.getState().selectCell(blockId, rowId, column.id);
              }}
              onChange={(event) => {
                const store = useEditorStore.getState();
                if (!touched.current) {
                  touched.current = true;
                  store.beginEdit();
                }
                store.updateCell(blockId, rowId, column.id, event.target.value);
              }}
            />
          </td>
        );
      })}
    </tr>
  );
}

export const TableRowView = memo(TableRowViewImpl);
