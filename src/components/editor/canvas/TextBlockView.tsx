'use client';

import { memo, useEffect, useRef } from 'react';

import { FONT_STACKS } from '@/lib/types';
import { useEditorStore } from '@/store/editorStore';
import { useTextBlock } from '@/store/selectors';
import { useReadOnly } from './readOnly';

function TextBlockViewImpl({ blockId }: { blockId: string }) {
  const block = useTextBlock(blockId);
  const readOnly = useReadOnly();
  const ref = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  const content = block?.content ?? '';

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (document.activeElement === element) return;
    if (element.innerText === content) return;
    element.innerText = content;
  }, [content]);

  if (!block) return null;

  const style = {
    fontFamily: FONT_STACKS[block.style.fontFamily],
    fontSize: `${block.style.fontSize}px`,
    fontWeight: Number(block.style.fontWeight),
    color: block.style.color,
    textAlign: block.style.align,
    lineHeight: block.style.lineHeight,
    letterSpacing: `${block.style.letterSpacing}px`,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  };

  if (readOnly) {
    return <div style={style}>{content}</div>;
  }

  return (
    <div
      ref={ref}
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
        useEditorStore
          .getState()
          .updateTextContent(blockId, event.currentTarget.innerText);
      }}
    />
  );
}

export const TextBlockView = memo(TextBlockViewImpl);
