'use client';

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Table2, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { InlineText } from '@/components/ui/InlineText';
import type { TableFragment } from '@/lib/types';
import { useEditorStore } from '@/store/editorStore';
import {
  useSelectedRowId,
  useTableColumns,
  useTableRowIds,
  useTableStartNumber,
  useTableStyle,
  useTableTitle,
} from '@/store/selectors';
import { TableRowView } from './TableRowView';
import { useReadOnly } from './readOnly';

function TableBlockViewImpl({
  blockId,
  fragment,
}: {
  blockId: string;
  /** Row-range slice when pagination split this table across pages. */
  fragment?: TableFragment;
}) {
  const title = useTableTitle(blockId);
  const columns = useTableColumns(blockId);
  const style = useTableStyle(blockId);
  const allRowIds = useTableRowIds(blockId);
  const startNumber = useTableStartNumber(blockId);
  const selectedRowId = useSelectedRowId();
  const readOnly = useReadOnly();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  if (!style) return null;

  // A stale continuation whose rows were deleted: nothing left to show here.
  if (fragment?.isContinuation && fragment.rowStart >= allRowIds.length) {
    return null;
  }

  // Infinity end = open final fragment; slice clamps itself.
  const rowIds = fragment
    ? allRowIds.slice(fragment.rowStart, fragment.rowEnd)
    : allRowIds;
  // Title/column chrome rides the first fragment; Add Row rides the last.
  const showHeader = !fragment?.isContinuation;
  const showFooter =
    !fragment ||
    fragment.rowEnd === Infinity ||
    fragment.rowEnd >= allRowIds.length;

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    useEditorStore
      .getState()
      .moveRow(blockId, String(active.id), String(over.id));
  };

  const headerBorder = `${style.borderWidth}px solid ${style.borderColor}`;

  const table = (
    <table
      className="w-full border-collapse"
      style={{ tableLayout: 'fixed' }}
      cellPadding={0}
      cellSpacing={0}
    >
      <colgroup>
        {!readOnly ? <col style={{ width: 28 }} /> : null}
        {columns.map((column) => (
          <col key={column.id} style={{ width: `${column.width}px` }} />
        ))}
      </colgroup>
      <thead data-table-header="true">
        <tr>
          {!readOnly ? <th style={{ borderBottom: headerBorder }} /> : null}
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              style={{
                background: style.headerBackground,
                color: style.headerColor,
                borderBottom: headerBorder,
                borderRight: headerBorder,
                padding: `${style.padding}px`,
                textAlign: column.align,
                fontSize: `${style.fontSize}px`,
                fontWeight: 600,
                verticalAlign: 'middle',
                lineHeight: 1.4,
              }}
            >
              {readOnly || column.role === 'rowNumber' ? (
                column.label
              ) : (
                <InlineText
                  value={column.label}
                  ariaLabel={`Rename ${column.label} column`}
                  className="w-full rounded-sm bg-transparent outline-none transition hover:bg-white/10 focus:bg-white/20 focus:ring-2 focus:ring-white/40"
                  style={{
                    color: 'inherit',
                    fontWeight: 600,
                    textAlign: column.align,
                  }}
                  onCommit={(next) =>
                    useEditorStore
                      .getState()
                      .updateColumn(blockId, column.id, { label: next })
                  }
                />
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody data-table-body="true">
        {rowIds.map((rowId, index) => (
          <TableRowView
            key={rowId}
            blockId={blockId}
            rowId={rowId}
            displayNumber={startNumber + (fragment?.rowStart ?? 0) + index + 1}
            columns={columns}
            style={style}
            selected={rowId === selectedRowId}
          />
        ))}
      </tbody>
    </table>
  );

  return (
    <div
      className="border border-line bg-white p-4"
      style={{ borderRadius: '12px', overflow: 'visible' }}
    >
      {showHeader ? (
        <div
          data-table-title="true"
          className="mb-3 flex items-center justify-between"
          style={{ alignItems: 'center' }}
        >
          <div
            className="flex flex-1 items-center"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center bg-brand-600 text-white"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: '#2563EB',
                color: '#ffffff',
              }}
            >
              <Table2 size={15} />
            </span>
            {readOnly ? (
              <span
                className="text-[13px] font-semibold tracking-wide text-ink-900"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  overflow: 'visible',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </span>
            ) : (
              <InlineText
                value={title}
                ariaLabel="Table title"
                className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-0.5 text-[13px] font-semibold tracking-wide text-ink-900 outline-none transition hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-brand-100"
                onCommit={(next) =>
                  useEditorStore.getState().updateTableTitle(blockId, next)
                }
              />
            )}
          </div>

          {!readOnly ? (
            <div
              className="flex shrink-0 items-center gap-2"
              data-editor-only="true"
            >
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[12px] font-medium text-brand-700 transition hover:bg-brand-100"
                onClick={() => useEditorStore.getState().addColumn(blockId)}
              >
                <Plus size={13} /> Add Column
              </button>
              <button
                type="button"
                aria-label="Delete column"
                className="rounded-lg border border-line p-1.5 text-ink-400 transition hover:border-red-200 hover:text-red-600"
                onClick={() => useEditorStore.getState().deleteColumn(blockId)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        {readOnly ? (
          table
        ) : (
          <DndContext
            // Deterministic id keeps dnd-kit's aria-describedby stable (no hydration mismatch).
            id={`table-rows-${blockId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              {table}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {!readOnly && showFooter ? (
        <div className="mt-3" data-editor-only="true">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[12px] font-medium text-brand-700 transition hover:bg-brand-100"
            onClick={() => useEditorStore.getState().addRow(blockId)}
          >
            <Plus size={14} /> Add Row
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const TableBlockView = memo(TableBlockViewImpl);
