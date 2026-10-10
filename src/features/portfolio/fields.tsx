import type { ReactNode } from 'react';

interface RupeeFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  max?: number;
  hint?: ReactNode;
}

/** A labelled whole-rupee input. Empty or invalid input counts as 0. */
export function RupeeField({ id, label, value, onChange, step = 100, max, hint }: RupeeFieldProps) {
  return (
    <div className="pf-field">
      <label className="pf-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={step}
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          onChange(Number.isFinite(n) && n > 0 ? n : 0);
        }}
      />
      {hint && <span className="muted">{hint}</span>}
    </div>
  );
}

interface SelectFieldProps<T extends string | number> {
  id: string;
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function SelectField<T extends string | number>({ id, label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <div className="pf-field">
      <label className="pf-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
