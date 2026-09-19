"use client";

import { RotateCcw, Type } from "lucide-react";

import { ColorField } from "@/components/ui/ColorField";
import { Field, PanelSection } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { SelectField } from "@/components/ui/SelectField";
import { ALIGNMENTS, FAMILY_OPTIONS, WEIGHT_OPTIONS } from "@/components/ui/Typography";
import {
  FONT_STACKS,
  type CellStyleOverride,
  type FontFamilyId,
  type FontWeight,
} from "@/lib/types";
import { useEditorStore } from "@/store/editorStore";
import {
  useCellStyleOverride,
  useTableColumn,
  useTableStyle,
} from "@/store/selectors";

function ResetButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Reset to inherited"
      className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-line
                 bg-white text-ink-400 transition hover:text-brand-600"
      onClick={onClick}
    >
      <RotateCcw size={13} />
    </button>
  );
}

/**
 * Nested-focus panel for one table cell. Every control shows the EFFECTIVE
 * value (sparse override → column alignment → table style → hardcoded
 * defaults, the same cascade TableRowView renders), and a reset button
 * appears while a field is overridden — clearing it deletes the override key
 * so the cell inherits again.
 */
export function CellTextSettings({
  blockId,
  rowId,
  columnId,
}: {
  blockId: string;
  rowId: string;
  columnId: string;
}) {
  const style = useTableStyle(blockId);
  const column = useTableColumn(blockId, columnId);
  const override = useCellStyleOverride(blockId, rowId, columnId);
  const store = useEditorStore.getState;

  if (!style) return null;

  const effective = {
    fontFamily: override?.fontFamily ?? style.fontFamily ?? "inter",
    fontSize: override?.fontSize ?? style.fontSize,
    fontWeight: override?.fontWeight ?? style.fontWeight ?? "400",
    color: override?.color ?? style.cellColor ?? "#1F2937",
    align: override?.align ?? column?.align ?? "left",
  };

  const set = (patch: CellStyleOverride): void =>
    store().updateCellStyle(blockId, rowId, columnId, patch);
  const reset = (...keys: (keyof CellStyleOverride)[]): void =>
    store().clearCellStyle(blockId, rowId, columnId, keys);

  return (
    <PanelSection
      title="Cell Text"
      icon={<Type size={15} className="text-brand-600" />}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Font Family">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <SelectField
                value={effective.fontFamily}
                options={FAMILY_OPTIONS}
                style={{ fontFamily: FONT_STACKS[effective.fontFamily] }}
                onChange={(next) => set({ fontFamily: next as FontFamilyId })}
              />
            </div>
            {override?.fontFamily !== undefined ? (
              <ResetButton label="Reset font family" onClick={() => reset("fontFamily")} />
            ) : null}
          </div>
        </Field>

        <Field label="Font Size">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <NumberField
                value={effective.fontSize}
                suffix="px"
                min={6}
                max={72}
                onCommit={(next) => set({ fontSize: next })}
              />
            </div>
            {override?.fontSize !== undefined ? (
              <ResetButton label="Reset font size" onClick={() => reset("fontSize")} />
            ) : null}
          </div>
        </Field>

        <Field label="Font Weight">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <SelectField
                value={effective.fontWeight}
                options={WEIGHT_OPTIONS}
                onChange={(next) => set({ fontWeight: next as FontWeight })}
              />
            </div>
            {override?.fontWeight !== undefined ? (
              <ResetButton label="Reset font weight" onClick={() => reset("fontWeight")} />
            ) : null}
          </div>
        </Field>

        <Field label="Text Color">
          <div className="flex items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <ColorField
                value={effective.color}
                onCommit={(next) => set({ color: next })}
              />
            </div>
            {override?.color !== undefined ? (
              <ResetButton label="Reset text color" onClick={() => reset("color")} />
            ) : null}
          </div>
        </Field>
      </div>

      <div className="mt-3">
        <span className="field-label">Alignment</span>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            {ALIGNMENTS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                aria-label={`Align cell ${option.value}`}
                aria-pressed={effective.align === option.value}
                className={`flex h-9 w-11 items-center justify-center transition
                  ${index > 0 ? "border-l border-line" : ""}
                  ${
                    effective.align === option.value
                      ? "bg-brand-50 text-brand-700"
                      : "bg-white text-ink-400 hover:text-ink-800"
                  }`}
                onClick={() => set({ align: option.value })}
              >
                {option.icon}
              </button>
            ))}
          </div>
          {override?.align !== undefined ? (
            <ResetButton label="Reset alignment" onClick={() => reset("align")} />
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        Applies to the “{column?.label ?? "cell"}” cell only — other cells keep
        inheriting the table defaults. {override ? "A ↺ resets a field to inherited." : ""}
      </p>
    </PanelSection>
  );
}
