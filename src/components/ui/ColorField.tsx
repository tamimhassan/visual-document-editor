'use client';

import { useState } from 'react';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function ColorField({
  value,
  onCommit,
  onFocus,
}: {
  value: string;
  onCommit: (next: string) => void;
  onFocus?: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Adopt external changes (selection switch, undo…) during render so the input never lags a frame.
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }

  return (
    <div className='flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-white px-2'>
      <label className='relative h-5 w-5 shrink-0 overflow-hidden rounded-[5px] border border-line'>
        <span
          aria-hidden
          className='absolute inset-0'
          style={{ background: HEX.test(draft) ? draft : value }}
        />
        <input
          aria-label='Pick colour'
          className='absolute inset-0 cursor-pointer opacity-0'
          type='color'
          value={HEX.test(draft) ? draft : '#000000'}
          onFocus={onFocus}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (HEX.test(draft)) onCommit(draft);
          }}
        />
      </label>
      <input
        aria-label='Colour hex value'
        className='w-full bg-transparent text-[13px] uppercase text-ink-800 outline-none'
        value={draft}
        onFocus={onFocus}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (HEX.test(draft)) onCommit(draft);
          else setDraft(value);
        }}
      />
    </div>
  );
}
