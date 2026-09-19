"use client";

import { useState } from "react";

/**
 * Borderless text input for in-place editing on the canvas (table titles,
 * column headers). Same local-draft discipline as NumberField: a half-typed
 * value never round-trips through the store, external changes (undo, tab
 * switch) are adopted during render, and the commit fires once on blur/Enter.
 * Escape reverts to the store value without committing.
 *
 * The commit reads the DOM value at blur time because blur() dispatched
 * synchronously inside the keydown handler runs before React re-renders, so a
 * state closure there could be stale. Escape reverts the DOM value first so
 * the blur that follows sees the reverted text and commits nothing.
 */
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
  /** Fired immediately before a real commit, for the undo snapshot. */
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
      type="text"
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      style={style}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          event.currentTarget.value = value;
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
