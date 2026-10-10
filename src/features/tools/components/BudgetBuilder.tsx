import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { economy } from '@/core/economy.config';
import { clamp, defaultSplit } from '@/core/finance';
import { formatINR } from '@/core/format';
import type { ToolPrefill } from '@/core/tools';
import '../tools.css';

/** Surprise expenses, drawn in this order (no dice, so the same choices always teach the same thing). */
export const surprises = [
  { id: 'screen', cost: 1200 },
  { id: 'cycle', cost: 600 },
  { id: 'gift', cost: 800 },
  { id: 'form', cost: 1500 },
] as const;

const STEP = 100;
const MIN_MONEY = 1000;
const MAX_MONEY = 10000;

interface BudgetBuilderProps {
  prefill?: ToolPrefill;
}

/**
 * Split a month's practice money between wants and savings, then draw a surprise expense and see
 * whether the savings side can take the hit.
 */
export function BudgetBuilder({ prefill = {} }: BudgetBuilderProps) {
  const { t } = useTranslation();
  const moneyId = useId();
  const wantsId = useId();
  const savingsId = useId();
  const [money, setMoney] = useState(() => clamp(prefill.income ?? prefill.amount ?? 4000, MIN_MONEY, MAX_MONEY));
  const [savings, setSavings] = useState(() => Math.round(defaultSplit(money).savings / STEP) * STEP);
  const [drawn, setDrawn] = useState<number | null>(null);

  const wants = money - savings;
  const savingsPct = money > 0 ? Math.round((savings / money) * 100) : 0;
  const surprise = drawn === null ? null : surprises[drawn % surprises.length]!;
  const left = surprise ? savings - surprise.cost : 0;

  const changeMoney = (next: number) => {
    const m = clamp(Math.round(next / STEP) * STEP, MIN_MONEY, MAX_MONEY);
    // Keep the same share going to savings when the amount changes.
    setSavings(Math.round((m * (money > 0 ? savings / money : economy.split.savingsPct / 100)) / STEP) * STEP);
    setMoney(m);
  };

  return (
    <section className="card stack tl-tool" data-tool-id="budgetBuilder">
      <h2>{t('tools.budgetBuilder.title')}</h2>
      <p>{t('tools.budgetBuilder.intro')}</p>

      <div className="tl-input">
        <div className="tl-input-top">
          <label htmlFor={moneyId}>{t('tools.budgetBuilder.money')}</label>
          <span className="tl-number">
            <span aria-hidden="true">₹</span>
            <input
              id={moneyId}
              className="num"
              type="number"
              inputMode="numeric"
              min={MIN_MONEY}
              max={MAX_MONEY}
              step={STEP}
              value={money}
              onChange={(e) => changeMoney(Number(e.target.value) || MIN_MONEY)}
            />
          </span>
        </div>
      </div>

      <div className="tl-split" aria-hidden="true">
        <span className="tl-split-wants" style={{ width: `${100 - savingsPct}%` }} />
        <span className="tl-split-savings" style={{ width: `${savingsPct}%` }} />
      </div>

      <div className="tl-inputs">
        <div className="tl-input">
          <div className="tl-input-top">
            <label htmlFor={wantsId}>{t('tools.budgetBuilder.wants')}</label>
            <span className="num">{formatINR(wants)}</span>
          </div>
          <input
            id={wantsId}
            className="tl-range tl-range-wants"
            type="range"
            min={0}
            max={money}
            step={STEP}
            value={wants}
            onChange={(e) => setSavings(money - Number(e.target.value))}
          />
          <span className="muted">{t('tools.budgetBuilder.share', { pct: 100 - savingsPct })}</span>
        </div>
        <div className="tl-input">
          <div className="tl-input-top">
            <label htmlFor={savingsId}>{t('tools.budgetBuilder.savings')}</label>
            <span className="num">{formatINR(savings)}</span>
          </div>
          <input
            id={savingsId}
            className="tl-range tl-range-savings"
            type="range"
            min={0}
            max={money}
            step={STEP}
            value={savings}
            onChange={(e) => setSavings(Number(e.target.value))}
          />
          <span className="muted">{t('tools.budgetBuilder.share', { pct: savingsPct })}</span>
        </div>
      </div>

      {surprise ? (
        <div className={`card-sm stack ${left >= 0 ? 'verdict-good' : 'verdict-bad'}`} role="status">
          <span className="tl-label">{t('tools.budgetBuilder.surprise')}</span>
          <strong>{t(`tools.budgetBuilder.surprise.${surprise.id}`, { cost: formatINR(surprise.cost) })}</strong>
          <p>
            {left >= 0
              ? t('tools.budgetBuilder.covered', { left: formatINR(left) })
              : t('tools.budgetBuilder.short', { short: formatINR(-left), savings: formatINR(savings) })}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary tl-btn" onClick={() => setDrawn((d) => (d ?? 0) + 1)}>
              {t('tools.budgetBuilder.drawAgain')}
            </button>
            <button type="button" className="btn btn-secondary tl-btn" onClick={() => setDrawn(null)}>
              {t('tools.budgetBuilder.changeSplit')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setDrawn(0)}>
          {t('tools.budgetBuilder.draw')}
        </button>
      )}

      <p className="tl-foot muted">{t('tools.budgetBuilder.note')}</p>
    </section>
  );
}
