"use client";

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
    <select
      className="field-control appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236B7280%22><path d=%22M5.5 7.5L10 12l4.5-4.5z%22/></svg>')] bg-[length:20px_20px] bg-[right_0.4rem_center] bg-no-repeat pr-8"
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
  );
}
