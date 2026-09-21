'use client';

import { memo, useEffect, useRef } from 'react';

import type { TextFragment } from '@/lib/types';
import { FONT_STACKS } from '@/lib/types';
import { useEditorStore } from '@/store/editorStore';
import { useTextBlock } from '@/store/selectors';
import { useReadOnly } from './readOnly';

function TextBlockViewImpl({
  blockId,
  fragment,
}: {
  blockId: string;
  /** Character-range slice when pagination split this block across pages. */
  fragment?: TextFragment;
}) {
  const block = useTextBlock(blockId);
  const readOnly = useReadOnly();
  const ref = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  const content = block?.content ?? '';
  const from = fragment?.from ?? 0;
  const to = fragment?.to ?? Infinity;
  const slice = content.slice(from, to);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (document.activeElement === element) return;

    element.innerText = slice;
  }, [slice]);

  if (!block) return null;

  if (fragment && from > 0 && slice === '') return null;

  const commit = (text: string): void => {
    const merged = fragment
      ? content.slice(0, from) + text + content.slice(to)
      : text;
    useEditorStore.getState().updateTextContent(blockId, merged);
  };

  const style: React.CSSProperties = {
    fontFamily: FONT_STACKS[block.style.fontFamily],
    fontSize: `${block.style.fontSize}px`,
    fontWeight: Number(block.style.fontWeight),
    color: block.style.color,
    textAlign: block.style.align,
    lineHeight: block.style.lineHeight,
    letterSpacing: `${block.style.letterSpacing}px`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  if (readOnly) {
    return (
      <div data-fragment-from={from} style={style}>
        {slice}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-fragment-from={from}
      role="textbox"
      tabIndex={0}
      aria-label="Editable text"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className="rounded-[4px] outline-none focus:bg-brand-50/60"
      style={style}
      onFocus={() => {
        touched.current = false;
      }}
      onInput={() => {
        if (touched.current) return;
        touched.current = true;
        useEditorStore.getState().beginEdit();
      }}
      onBlur={(event) => {
        commit(event.currentTarget.innerText);
      }}
    />
  );
}

export const TextBlockView = memo(TextBlockViewImpl);
