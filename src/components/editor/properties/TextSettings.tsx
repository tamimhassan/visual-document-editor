"use client";

import { Type } from "lucide-react";

import { ColorField } from "@/components/ui/ColorField";
import { Field, PanelSection } from "@/components/ui/Field";
import { NumberField } from "@/components/ui/NumberField";
import { SelectField } from "@/components/ui/SelectField";
import { ALIGNMENTS, FAMILY_OPTIONS, WEIGHT_OPTIONS } from "@/components/ui/Typography";
import { FONT_STACKS, type FontFamilyId, type FontWeight } from "@/lib/types";
import { useEditorStore } from "@/store/editorStore";
import { useTextStyle } from "@/store/selectors";

export function TextSettings({ blockId }: { blockId: string }) {
  const style = useTextStyle(blockId);
  if (!style) return null;

  const store = useEditorStore.getState;

  return (
    <PanelSection
      title="Text Settings"
      icon={<Type size={15} className="text-brand-600" />}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Font Family">
          <SelectField
            value={style.fontFamily}
            options={FAMILY_OPTIONS}
            style={{ fontFamily: FONT_STACKS[style.fontFamily] }}
            onChange={(next) => {
              store().updateTextStyle(blockId, {
                fontFamily: next as FontFamilyId,
              });
            }}
          />
        </Field>

        <Field label="Font Size">
          <NumberField
            value={style.fontSize}
            suffix="px"
            min={6}
            max={120}
            onCommit={(next) =>
              store().updateTextStyle(blockId, { fontSize: next })
            }
          />
        </Field>

        <Field label="Font Weight">
          <SelectField
            value={style.fontWeight}
            options={WEIGHT_OPTIONS}
            onChange={(next) => {
              store().updateTextStyle(blockId, {
                fontWeight: next as FontWeight,
              });
            }}
          />
        </Field>

        <Field label="Text Color">
          <ColorField
            value={style.color}
            onCommit={(next) =>
              store().updateTextStyle(blockId, { color: next })
            }
          />
        </Field>
      </div>

      <div className="mt-3">
        <span className="field-label">Alignment</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {ALIGNMENTS.map((option, index) => (
            <button
              key={option.value}
              type="button"
              aria-label={`Align ${option.value}`}
              aria-pressed={style.align === option.value}
              className={`flex h-9 w-11 items-center justify-center transition
                ${index > 0 ? "border-l border-line" : ""}
                ${
                  style.align === option.value
                    ? "bg-brand-50 text-brand-700"
                    : "bg-white text-ink-400 hover:text-ink-800"
                }`}
              onClick={() => {
                store().updateTextStyle(blockId, { align: option.value });
              }}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>
    </PanelSection>
  );
}
