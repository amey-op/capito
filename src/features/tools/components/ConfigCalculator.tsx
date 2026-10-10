import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clamp } from '@/core/finance';
import { formatINR, formatPct } from '@/core/format';
import type { ToolDef, ToolInput, ToolPrefill, ToolResult, ToolTone, ToolUnit } from '@/core/tools';
import { ToolChart } from './ToolChart';
import '../tools.css';

interface ConfigCalculatorProps {
  toolDef: ToolDef;
  prefill?: ToolPrefill;
  onClose?: () => void;
}

const toneClass: Record<ToolTone, string> = {
  good: 'verdict-good',
  mixed: 'verdict-mixed',
  bad: 'verdict-bad',
  neutral: '',
};

const oneDecimal = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

/** One result as text: rupees through formatINR, the rest with its unit word. */
export function formatToolValue(value: number, unit: ToolUnit, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!Number.isFinite(value)) return '–';
  if (unit === 'inr') return formatINR(value);
  if (unit === 'pct') return formatPct(value);
  if (unit === 'count') return oneDecimal.format(value);
  return t(`tools.common.unit.${unit}`, { n: oneDecimal.format(value) });
}

const clampInput = (input: ToolInput, raw: number) => clamp(Number.isFinite(raw) ? raw : input.min, input.min, input.max);

function Field({ input, value, onChange }: { input: ToolInput; value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  const id = useId();
  // The text box keeps what the student types; the calculator always gets a clamped number.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="tl-input">
      <div className="tl-input-top">
        <label htmlFor={id}>{t(input.labelKey)}</label>
        <span className="tl-number">
          {input.unit === 'inr' && <span aria-hidden="true">₹</span>}
          <input
            id={id}
            className="num"
            type="number"
            inputMode="decimal"
            value={draft ?? String(value)}
            min={input.min}
            max={input.max}
            step={input.step}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value.trim() !== '') onChange(clampInput(input, Number(e.target.value)));
            }}
            onBlur={() => setDraft(null)}
          />
          {input.unit !== 'inr' && input.unit !== 'count' && (
            <span className="muted">{t(`tools.common.suffix.${input.unit}`)}</span>
          )}
        </span>
      </div>
      <input
        className="tl-range"
        type="range"
        aria-label={t(input.labelKey)}
        min={input.min}
        max={input.max}
        step={input.step}
        value={value}
        onChange={(e) => {
          setDraft(null);
          onChange(clampInput(input, Number(e.target.value)));
        }}
      />
    </div>
  );
}

function ResultCard({ result }: { result: ToolResult }) {
  const { t } = useTranslation();
  return (
    <div className={`card-sm tl-result ${toneClass[result.tone ?? 'neutral']}`}>
      <span className="tl-label">{t(result.labelKey)}</span>
      <span className="num">{formatToolValue(result.value, result.unit, t)}</span>
    </div>
  );
}

/** One generic calculator: inputs with sliders, a headline line, result cards and an optional chart. */
export function ConfigCalculator({ toolDef, prefill = {}, onClose }: ConfigCalculatorProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(toolDef.inputs.map((input) => [input.id, clampInput(input, prefill[input.id] ?? input.default)])),
  );
  const output = useMemo(() => toolDef.compute(values), [toolDef, values]);
  const lines = output.series?.[0]
    ? Object.keys(output.series[0])
        .filter((k) => k !== 'x')
        .map((key) => ({ key, label: t(`tools.${toolDef.id}.${key}`) }))
    : [];

  return (
    <section className="card stack tl-tool" data-tool-id={toolDef.id}>
      <div className="tl-head">
        <h2>{t(toolDef.titleKey)}</h2>
        {onClose && (
          <button type="button" className="btn btn-ghost tl-btn" onClick={onClose}>
            {t('tools.common.close')}
          </button>
        )}
      </div>

      <div className="tl-inputs">
        {toolDef.inputs.map((input) => (
          <Field
            key={input.id}
            input={input}
            value={values[input.id] ?? input.default}
            onChange={(v) => setValues((prev) => ({ ...prev, [input.id]: v }))}
          />
        ))}
      </div>

      {output.shocker && (
        <p className="card-sm tl-shocker" role="status">
          {t(`tools.${toolDef.id}.shocker`, output.shocker)}
        </p>
      )}

      <div className="tl-results">
        {output.results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>

      {output.series && lines.length > 0 && (
        <ToolChart data={output.series} xKey="x" lines={lines} xLabel={t('tools.common.year')} />
      )}

      {output.warnings?.map((warning) => (
        <p key={warning} className="tl-note">
          {t(warning)}
        </p>
      ))}

      {(toolDef.hasReturns || toolDef.approximate) && (
        <div className="tl-foot muted stack">
          {toolDef.hasReturns && <p>{t('tools.common.notAPromise')}</p>}
          {toolDef.approximate && <p>{t('tools.common.approximate')}</p>}
        </div>
      )}
    </section>
  );
}
