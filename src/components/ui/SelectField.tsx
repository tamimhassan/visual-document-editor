'use client';

import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  value,
  options,
  onChange,
  style,
}: {
  value: string;
  options: SelectOption[];
  onChange: (next: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="relative">
      <select
        className="field-control appearance-none pr-8"
        value={value}
        style={style}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}
