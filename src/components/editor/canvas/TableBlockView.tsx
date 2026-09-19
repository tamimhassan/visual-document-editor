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

function TableBlockViewImpl({ blockId }: { blockId: string }) {
  const title = useTableTitle(blockId);
  const columns = useTableColumns(blockId);
  const style = useTableStyle(blockId);
  const rowIds = useTableRowIds(blockId);
  const startNumber = useTableStartNumber(blockId);
  const selectedRowId = useSelectedRowId();
  const readOnly = useReadOnly();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  if (!style) return null;

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
        <col data-editor-only="true" style={{ width: readOnly ? 0 : 28 }} />
        {columns.map((column) => (
          <col key={column.id} style={{ width: `${column.width}px` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th data-editor-only="true" style={{ borderBottom: headerBorder }} />
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
      <tbody style={{ counterReset: `row-num ${startNumber}` }}>
        {rowIds.map((rowId) => (
          <TableRowView
            key={rowId}
            blockId={blockId}
            rowId={rowId}
            columns={columns}
            style={style}
            selected={rowId === selectedRowId}
          />
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white">
            <Table2 size={15} />
          </span>
          {readOnly ? (
            <span className="truncate text-[13px] font-semibold tracking-wide text-ink-900">
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

      {!readOnly ? (
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
