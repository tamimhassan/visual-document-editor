'use client';

import { useState } from 'react';

export function NumberField({
  value,
  suffix,
  min,
  max,
  step = 1,
  onCommit,
  onFocus,
}: {
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onCommit: (next: number) => void;
  onFocus?: () => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  // Adopt external changes (selection switch, undo…) during render so the input never lags a frame.
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(String(value));
  }

  const commit = (raw: string): void => {
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    onCommit(parsed);
  };

  return (
    <div className='relative'>
      <input
        className='field-control pr-9'
        inputMode='decimal'
        type='number'
        min={min}
        max={max}
        step={step}
        value={draft}
        onFocus={onFocus}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {suffix ? (
        <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-400'>
          {suffix}
        </span>
      ) : null}
    </div>
  );
}
