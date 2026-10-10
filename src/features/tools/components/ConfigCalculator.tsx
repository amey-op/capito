import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ToolDef, ToolPrefill } from '../../../core/tools';
import { economy } from '../../../core/economy.config';

interface ConfigCalculatorProps {
  toolDef: ToolDef;
  prefill?: ToolPrefill;
}

export function ConfigCalculator({ toolDef, prefill = {} }: ConfigCalculatorProps) {
  const { t } = useTranslation();

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    toolDef.inputs.forEach((input) => {
      init[input.id] = prefill[input.id] ?? input.default;
    });
    return init;
  });

  const handleChange = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }));
  };

  const output = useMemo(() => toolDef.compute(values), [toolDef, values]);

  return (
    <div className="config-calculator p-4" style={{ maxWidth: '360px', margin: '0 auto' }}>
      <h2 className="text-xl font-bold mb-4">{t(toolDef.titleKey)}</h2>

      <div className="inputs-section space-y-4 mb-6">
        {toolDef.inputs.map((input) => {
          const val = values[input.id];
          return (
            <div key={input.id} className="input-group">
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-sm">{t(input.labelKey)}</label>
                <div className="flex items-center gap-1">
                  {input.unit === 'inr' && <span>₹</span>}
                  <input
                    type="number"
                    value={val}
                    min={input.min}
                    max={input.max}
                    step={input.step}
                    onChange={(e) => handleChange(input.id, Number(e.target.value))}
                    className="border-2 border-black px-1 py-0.5 w-20 text-right shadow-[2px_2px_0px_rgba(0,0,0,1)] outline-none focus:ring-2 ring-purple-400"
                  />
                  {input.unit === 'pct' && <span>%</span>}
                  {input.unit === 'years' && <span className="text-sm">Y</span>}
                  {input.unit === 'months' && <span className="text-sm">M</span>}
                  {input.unit === 'days' && <span className="text-sm">D</span>}
                </div>
              </div>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step}
                value={val}
                onChange={(e) => handleChange(input.id, Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          );
        })}
      </div>

      {output.shocker && (
        <div className="shocker-banner bg-yellow-100 border-2 border-black p-3 mb-6 font-bold shadow-[3px_3px_0px_rgba(0,0,0,1)] -rotate-1">
          {t(`tools.${toolDef.id}.shocker`, output.shocker)}
        </div>
      )}

      <div className="results-section grid grid-cols-2 gap-3 mb-6">
        {output.results.map((res) => {
          const bgColors = {
            good: 'bg-green-100',
            bad: 'bg-red-100',
            mixed: 'bg-yellow-100',
            neutral: 'bg-gray-100',
          };
          const bgClass = res.tone ? bgColors[res.tone] : bgColors.neutral;

          return (
            <div key={res.id} className={`result-card p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] ${bgClass}`}>
              <div className="text-xs font-semibold opacity-80">{t(res.labelKey)}</div>
              <div className="text-lg font-bold">
                {res.unit === 'inr' && '₹'}
                {Number(res.value.toFixed(2)).toLocaleString('en-IN')}
                {res.unit === 'pct' && '%'}
                {res.unit === 'years' && ' Y'}
                {res.unit === 'months' && ' M'}
              </div>
            </div>
          );
        })}
      </div>

      {output.series && output.series.length > 0 && (
        <div className="chart-section mb-6 h-48 w-full border-2 border-black p-2 bg-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={output.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
              {Object.keys(output.series[0]).filter(k => k !== 'x').map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={i === 0 ? '#2563eb' : i === 1 ? '#16a34a' : '#dc2626'} strokeWidth={3} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {output.warnings && output.warnings.map(warn => (
        <div key={warn} className="text-sm text-red-600 mb-2 font-semibold">⚠️ {t(warn)}</div>
      ))}

      <div className="footer text-xs text-gray-600 italic">
        {toolDef.hasReturns && <p>{t('ui.disclaimer.notAPromise', 'This is your assumption, not a promise. Real returns change and can be negative.')}</p>}
        {toolDef.approximate && <p>{t('ui.disclaimer.approximate', `Approximate. ${economy.taxSlabs.label}`)}</p>}
      </div>
    </div>
  );
}
