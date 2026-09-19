'use client';

import { Columns3, Plus, Rows3, Table2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { ColorField } from '@/components/ui/ColorField';
import { Field, PanelSection } from '@/components/ui/Field';
import { NumberField } from '@/components/ui/NumberField';
import { SelectField } from '@/components/ui/SelectField';
import { ALIGNMENTS, WEIGHT_OPTIONS } from '@/components/ui/Typography';
import type { FontWeight } from '@/lib/types';
import { useEditorStore } from '@/store/editorStore';
import {
  useSelectedColumnId,
  useSelectedRowId,
  useTableColumns,
  useTableRowIds,
  useTableStyle,
} from '@/store/selectors';

const BORDER_PRESETS = [
  { value: '0|#E5E7EB', label: 'None' },
  { value: '1|#E5E7EB', label: '1px Solid #E5E7EB' },
  { value: '1|#CBD5E1', label: '1px Solid #CBD5E1' },
  { value: '2|#BFDBFE', label: '2px Solid #BFDBFE' },
];

export function TableSettings({ blockId }: { blockId: string }) {
  const style = useTableStyle(blockId);
  const columns = useTableColumns(blockId);
  const rowIds = useTableRowIds(blockId);
  const selectedColumnId = useSelectedColumnId();
  const selectedRowId = useSelectedRowId();

  const store = useEditorStore.getState;

  if (!style) return null;

  const editableColumns = columns.filter((column) => column.role === 'value');
  const targetColumn =
    editableColumns.find((column) => column.id === selectedColumnId) ??
    editableColumns[0];

  const rowIndex = selectedRowId ? rowIds.indexOf(selectedRowId) : -1;

  return (
    <>
      <PanelSection
        title="Table Settings"
        icon={<Table2 size={15} className="text-brand-600" />}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Width">
            <NumberField
              value={targetColumn?.width ?? 0}
              suffix="px"
              min={32}
              max={600}
              onCommit={(next) => {
                if (!targetColumn) return;
                store().updateColumn(blockId, targetColumn.id, { width: next });
              }}
            />
          </Field>

          <Field label="Borders">
            <SelectField
              value={`${style.borderWidth}|${style.borderColor}`}
              options={BORDER_PRESETS}
              onChange={(next) => {
                const [width, color] = next.split('|');
                store().updateTableStyle(blockId, {
                  borderWidth: Number(width ?? 1),
                  borderColor: color ?? '#E5E7EB',
                });
              }}
            />
          </Field>

          <Field label="Padding">
            <NumberField
              value={style.padding}
              suffix="px"
              min={0}
              max={40}
              onCommit={(next) =>
                store().updateTableStyle(blockId, { padding: next })
              }
            />
          </Field>

          <Field label="Row Spacing">
            <NumberField
              value={style.rowSpacing}
              suffix="px"
              min={0}
              max={24}
              onCommit={(next) =>
                store().updateTableStyle(blockId, { rowSpacing: next })
              }
            />
          </Field>

          <Field label="Font Weight">
            <SelectField
              value={style.fontWeight ?? '400'}
              options={WEIGHT_OPTIONS}
              onChange={(next) => {
                store().updateTableStyle(blockId, {
                  fontWeight: next as FontWeight,
                });
              }}
            />
          </Field>

          <Field label="Text Color">
            <ColorField
              value={style.cellColor ?? '#1F2937'}
              onCommit={(next) =>
                store().updateTableStyle(blockId, { cellColor: next })
              }
            />
          </Field>
        </div>

        <div className="mt-3">
          <span className="field-label">Column Alignment</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            {ALIGNMENTS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                aria-label={`Align column ${option.value}`}
                aria-pressed={targetColumn?.align === option.value}
                disabled={!targetColumn}
                className={`flex h-9 w-11 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-40 ${index > 0 ? 'border-l border-line' : ''} ${
                  targetColumn?.align === option.value
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-white text-ink-400 hover:text-ink-800'
                }`}
                onClick={() => {
                  if (!targetColumn) return;
                  store().updateColumn(blockId, targetColumn.id, {
                    align: option.value,
                  });
                }}
              >
                {option.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Header Background">
            <ColorField
              value={style.headerBackground}
              onCommit={(next) =>
                store().updateTableStyle(blockId, { headerBackground: next })
              }
            />
          </Field>

          <Field label="Header Text">
            <ColorField
              value={style.headerColor}
              onCommit={(next) =>
                store().updateTableStyle(blockId, { headerColor: next })
              }
            />
          </Field>
        </div>

        <p className="mt-3 text-[11px] text-ink-400">
          Width and alignment apply to{' '}
          {targetColumn ? `the “${targetColumn.label}” column` : 'no column'}.
          Click a cell to target a different one.
        </p>
      </PanelSection>

      <PanelSection
        title="Column Management"
        icon={<Columns3 size={15} className="text-brand-600" />}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            icon={<Plus size={14} />}
            onClick={() => store().addColumn(blockId)}
          >
            Add Column
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={14} />}
            disabled={editableColumns.length <= 1}
            onClick={() => store().deleteColumn(blockId, targetColumn?.id)}
          >
            Delete Column
          </Button>
        </div>
      </PanelSection>

      <PanelSection
        title="Row Management"
        icon={<Rows3 size={15} className="text-brand-600" />}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            icon={<Plus size={14} />}
            onClick={() => store().addRow(blockId)}
          >
            Add Row
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={14} />}
            disabled={rowIds.length === 0}
            onClick={() =>
              store().deleteRow(blockId, selectedRowId ?? undefined)
            }
          >
            Delete Row
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-ink-400">
          {rowIndex >= 0
            ? `Deletes row ${rowIndex + 1}.`
            : 'Deletes the last row unless you select a cell first.'}
        </p>
      </PanelSection>
    </>
  );
}
