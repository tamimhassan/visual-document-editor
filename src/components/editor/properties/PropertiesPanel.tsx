'use client';

import {
  Frame,
  Image as ImageIcon,
  Shapes,
  SlidersHorizontal,
} from 'lucide-react';

import { ColorField } from '@/components/ui/ColorField';
import { Field, PanelSection } from '@/components/ui/Field';
import { NumberField } from '@/components/ui/NumberField';
import { useEditorStore } from '@/store/editorStore';
import {
  useBlockLayout,
  useImageBlock,
  useSelectedBlockId,
  useSelectedBlockKind,
  useSelectedColumnId,
  useSelectedRowId,
  useShapeBlock,
} from '@/store/selectors';
import { CellTextSettings } from './CellTextSettings';
import { TableSettings } from './TableSettings';
import { TextSettings } from './TextSettings';

function LayoutSettings({ blockId }: { blockId: string }) {
  const layout = useBlockLayout(blockId);
  const store = useEditorStore.getState;

  return (
    <PanelSection
      title="Layout"
      icon={<Frame size={15} className="text-brand-600" />}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Block Width">
          <NumberField
            value={layout.widthPercent}
            suffix="%"
            min={5}
            max={100}
            onCommit={(next) =>
              store().updateBlockLayout(blockId, { widthPercent: next })
            }
          />
        </Field>
        <Field label="Indent">
          <NumberField
            value={layout.indentLeft}
            suffix="px"
            min={0}
            max={400}
            onCommit={(next) =>
              store().updateBlockLayout(blockId, { indentLeft: next })
            }
          />
        </Field>
        <Field label="Space Below">
          <NumberField
            value={layout.marginBottom}
            suffix="px"
            min={0}
            max={120}
            onCommit={(next) =>
              store().updateBlockLayout(blockId, { marginBottom: next })
            }
          />
        </Field>
      </div>
    </PanelSection>
  );
}

function ImageSettings({ blockId }: { blockId: string }) {
  const block = useImageBlock(blockId);
  const store = useEditorStore.getState;
  if (!block) return null;

  const handleFile = (file: File | undefined): void => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      store().updateImage(blockId, { src: reader.result, alt: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <PanelSection
      title="Image Settings"
      icon={<ImageIcon size={15} className="text-brand-600" />}
    >
      <Field label="Height">
        <NumberField
          value={block.height}
          suffix="px"
          min={16}
          max={900}
          onCommit={(next) => store().updateImage(blockId, { height: next })}
        />
      </Field>

      <label className="mt-3 block">
        <span className="field-label">Replace image</span>
        <input
          type="file"
          accept="image/*"
          className="w-full text-[12px] text-ink-600 file:mr-3 file:rounded-lg file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-ink-800"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>
    </PanelSection>
  );
}

function ShapeSettings({ blockId }: { blockId: string }) {
  const block = useShapeBlock(blockId);
  const store = useEditorStore.getState;
  if (!block) return null;

  return (
    <PanelSection
      title="Shape Settings"
      icon={<Shapes size={15} className="text-brand-600" />}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fill">
          <ColorField
            value={block.fill}
            onCommit={(next) => store().updateShape(blockId, { fill: next })}
          />
        </Field>
        <Field label="Height">
          <NumberField
            value={block.height}
            suffix="px"
            min={1}
            max={600}
            onCommit={(next) => store().updateShape(blockId, { height: next })}
          />
        </Field>
        <Field label="Corner Radius">
          <NumberField
            value={block.radius}
            suffix="px"
            min={0}
            max={80}
            onCommit={(next) => store().updateShape(blockId, { radius: next })}
          />
        </Field>
      </div>
    </PanelSection>
  );
}

export function PropertiesPanel() {
  const blockId = useSelectedBlockId();
  const kind = useSelectedBlockKind();
  const selectedRowId = useSelectedRowId();
  const selectedColumnId = useSelectedColumnId();

  const cellSelected =
    kind === 'table' && selectedRowId !== null && selectedColumnId !== null;

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-line bg-white">
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line px-4">
        <SlidersHorizontal size={16} className="text-brand-600" />
        <h2 className="text-[14px] font-semibold text-ink-900">
          Properties &amp; Data
        </h2>
      </div>

      {!blockId || !kind ? (
        <p className="px-4 py-8 text-[13px] leading-relaxed text-ink-400">
          Select an element on the canvas to edit its type, style and spacing.
          Click a table cell to target a specific row or column.
        </p>
      ) : (
        <div className="flex-1">
          {cellSelected && selectedRowId && selectedColumnId ? (
            <CellTextSettings
              blockId={blockId}
              rowId={selectedRowId}
              columnId={selectedColumnId}
            />
          ) : null}
          {kind === 'text' ? <TextSettings blockId={blockId} /> : null}
          {kind === 'table' ? <TableSettings blockId={blockId} /> : null}
          {kind === 'image' ? <ImageSettings blockId={blockId} /> : null}
          {kind === 'shape' ? <ShapeSettings blockId={blockId} /> : null}
          <LayoutSettings blockId={blockId} />
        </div>
      )}
    </aside>
  );
}
