'use client';

import { useState } from 'react';

export function InlineText({
  value,
  onCommit,
  onEditStart,
  ariaLabel,
  placeholder,
  className,
  style,
}: {
  value: string;
  onCommit: (next: string) => void;
  onEditStart?: () => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Adopt external changes (selection switch, undo…) during render so the input never lags a frame.
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }

  const commit = (next: string): void => {
    if (next === value) return; // untouched, reverted, or manually retyped
    onEditStart?.();
    onCommit(next);
  };

  return (
    <input
      type='text'
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      style={style}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          event.currentTarget.value = value;
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
