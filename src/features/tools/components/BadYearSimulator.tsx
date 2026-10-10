import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { economy, type ScenarioId } from '@/core/economy.config';
import { clamp } from '@/core/finance';
import { formatINR } from '@/core/format';
import { ToolChart } from './ToolChart';
import '../tools.css';

const assets = ['savings', 'fd', 'gold', 'mf', 'shares'] as const;
type Asset = (typeof assets)[number];
const scenarioIds: ScenarioId[] = ['steady', 'bumpy', 'crashYear'];
const tone: Record<ScenarioId, string> = { steady: 'verdict-good', bumpy: 'verdict-mixed', crashYear: 'verdict-bad' };
/** Same meaning as the result cards: green steady, yellow bumpy, red crash year. */
const lineColor: Record<ScenarioId, string> = { steady: '#16a34a', bumpy: '#ca8a04', crashYear: '#dc2626' };

const MAX_AMOUNT = 1_000_000;

/** Year-end values of a mix that is topped back to the same shares every year. */
export function mixPath(amount: number, sharePct: Record<Asset, number>, scenario: ScenarioId): number[] {
  const total = assets.reduce((sum, a) => sum + sharePct[a], 0);
  const years = economy.scenarios[scenario].savings.length;
  const path = [amount];
  for (let y = 0; y < years; y++) {
    const growthPct = total > 0 ? assets.reduce((sum, a) => sum + (sharePct[a] / total) * economy.scenarios[scenario][a][y]!, 0) : 0;
    path.push(path[y]! * (1 + growthPct / 100));
  }
  return path;
}

/** Try a mix of five kinds of holding across three pretend five-year markets. */
export function BadYearSimulator() {
  const { t } = useTranslation();
  const amountId = useId();
  const [amount, setAmount] = useState(10000);
  const [mix, setMix] = useState<Record<Asset, number>>({ savings: 20, fd: 20, gold: 20, mf: 20, shares: 20 });
  const totalPct = assets.reduce((sum, a) => sum + mix[a], 0);

  const paths = useMemo(
    () => Object.fromEntries(scenarioIds.map((id) => [id, mixPath(amount, mix, id)])) as Record<ScenarioId, number[]>,
    [amount, mix],
  );
  const data = paths.steady.map((_, year) => ({
    year,
    steady: Math.round(paths.steady[year]!),
    bumpy: Math.round(paths.bumpy[year]!),
    crashYear: Math.round(paths.crashYear[year]!),
  }));
  const lines = scenarioIds.map((id) => ({ key: id, label: t(`tools.badYear.${id}`), color: lineColor[id] }));
  const lowest = Math.min(...paths.crashYear, ...paths.bumpy);

  return (
    <section className="card stack tl-tool" data-tool-id="badYear">
      <div>
        <span className="eyebrow">{t('tools.badYear.pretend')}</span>
        <h2>{t('tools.badYear.title')}</h2>
      </div>
      <p>{t('tools.badYear.intro')}</p>

      <div className="tl-input">
        <div className="tl-input-top">
          <label htmlFor={amountId}>{t('tools.badYear.amount')}</label>
          <span className="tl-number">
            <span aria-hidden="true">₹</span>
            <input
              id={amountId}
              className="num"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_AMOUNT}
              step={500}
              value={amount}
              onChange={(e) => setAmount(clamp(Number(e.target.value) || 0, 0, MAX_AMOUNT))}
            />
          </span>
        </div>
      </div>

      <div className="card-sm stack">
        <h3>{t('tools.badYear.mix')}</h3>
        <div className="tl-mix">
          {assets.map((asset) => (
            <label key={asset} className="tl-mix-row">
              <span>{t(`tools.badYear.asset.${asset}`)}</span>
              <input
                className="tl-range"
                type="range"
                min={0}
                max={100}
                step={5}
                value={mix[asset]}
                onChange={(e) => setMix((prev) => ({ ...prev, [asset]: Number(e.target.value) }))}
              />
              <span className="num">{mix[asset]}%</span>
            </label>
          ))}
        </div>
        {totalPct !== 100 && (
          <p className="tl-note">{t(totalPct === 0 ? 'tools.badYear.mixEmpty' : 'tools.badYear.mixScaled', { total: totalPct })}</p>
        )}
      </div>

      <ToolChart data={data} xKey="year" lines={lines} xLabel={t('tools.common.year')} />

      <div className="tl-results">
        {scenarioIds.map((id) => (
          <div key={id} className={`card-sm tl-result ${tone[id]}`}>
            <span className="tl-label">{t('tools.badYear.after', { market: t(`tools.badYear.${id}`) })}</span>
            <span className="num">{formatINR(paths[id][paths[id].length - 1]!)}</span>
          </div>
        ))}
      </div>

      <p className="card-sm tl-shocker" role="status">
        {t(lowest < amount ? 'tools.badYear.dip' : 'tools.badYear.noDip', { lowest: formatINR(lowest), amount: formatINR(amount) })}
      </p>
      <p className="tl-foot muted">{t('tools.badYear.note')}</p>
    </section>
  );
}
