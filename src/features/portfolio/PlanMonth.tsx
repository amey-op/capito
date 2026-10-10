import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { economy } from '@/core/economy.config';
import { defaultSplit } from '@/core/finance';
import { formatINR } from '@/core/format';
import type { Action, Effect, GameState, MonthPlan } from '@/core/types';
import { engine } from '@/engine';
import { dueThisMonth } from '@/engine/credit';
import { EffectList } from './EffectList';
import { RupeeField, SelectField } from './fields';
import { BUCKET_ORDER, isBucketOpen } from './keys';

interface PlanMonthProps {
  game: GameState;
  dispatch: (action: Action) => Effect[];
  /** Called with the month's effects once the month is closed. */
  onClosed: (effects: Effect[]) => void;
}

interface Deduction {
  label: string;
  amount: number;
}

/** What will leave automatically before the plan runs (EMIs → RD → SIP → premium → other charges). */
function deductionsFor(game: GameState, t: (key: string, params?: Record<string, unknown>) => string): Deduction[] {
  const out: Deduction[] = [];
  for (const l of game.loans) {
    if (l.status === 'active') out.push({ label: t(`portfolio.loan.kind.${l.kind}`), amount: dueThisMonth(l) });
  }
  for (const r of game.rds) {
    if (r.status === 'active' && r.paidMonths + r.missedMonths < r.months) {
      out.push({ label: t('portfolio.plan.rdInstalment'), amount: r.instalment });
    }
  }
  if (game.sip?.active) out.push({ label: t('portfolio.plan.sip'), amount: game.sip.monthly });
  if (game.insurance.health) out.push({ label: t('portfolio.plan.premium'), amount: economy.insurance.healthPremiumPerMonth });
  for (const c of game.recurring) out.push({ label: t(c.labelKey), amount: c.perMonth });
  return out;
}

/**
 * Plan the Month (MECHANICS §1.1): automatic deductions are listed first, then the player decides
 * the rest. The preview runs the real engine on a copy, so what is shown is what will happen.
 */
export function PlanMonth({ game, dispatch, onClosed }: PlanMonthProps) {
  const { t } = useTranslation();
  const [buy, setBuy] = useState<string[]>([]);
  const [earmark, setEarmark] = useState<Record<string, number>>({});
  const [to, setTo] = useState<Record<string, number>>({});
  const [rd, setRd] = useState({ instalment: 0, months: economy.clock.rdTenuresMonths[0] as number });
  const [fd, setFd] = useState({ principal: 0, months: economy.clock.fdTenuresMonths[1] as number });
  const [sip, setSip] = useState(0);
  const [insure, setInsure] = useState(false);

  const plan: MonthPlan = useMemo(
    () => ({
      buyWants: buy,
      earmark,
      toBuckets: to,
      ...(rd.instalment > 0 ? { startRd: rd } : {}),
      ...(fd.principal > 0 ? { openFd: fd } : {}),
      ...(sip > 0 ? { sip: { monthly: sip } } : {}),
      ...(insure ? { buyInsurance: true } : {}),
    }),
    [buy, earmark, to, rd, fd, sip, insure],
  );
  const preview = useMemo(() => engine.reduce(game, { type: 'PLAN_MONTH', plan }), [game, plan]);

  const deductions = deductionsFor(game, t);
  const split = defaultSplit(game.monthMoney);
  const wants = game.wants.filter((w) => w.status === 'open' || w.status === 'goal');
  const goals = game.goals.filter((g) => g.status === 'active');
  const open = (id: (typeof BUCKET_ORDER)[number]) => isBucketOpen(game, id);
  const has = (id: GameState['unlocked'][number]) => game.unlocked.includes(id);
  const previewNotes = preview.effects.filter((e) => e.kind === 'note' || e.kind === 'missedPayment');

  return (
    <section className="stack" aria-labelledby="pf-plan">
      <div>
        <span className="eyebrow e-blue">{t('portfolio.plan.eyebrow', { month: game.month })}</span>
      </div>
      <h1 id="pf-plan">{t('portfolio.plan.title')}</h1>

      <div className="card stack">
        <div className="pf-meters">
          <div className="pf-meter">
            <span className="pf-label">{t('portfolio.plan.thisMonth')}</span>
            <span className="num">{formatINR(game.monthMoney)}</span>
          </div>
          <div className="pf-meter">
            <span className="pf-label">{t('portfolio.bucket.wallet')}</span>
            <span className="num">{formatINR(game.buckets.wallet)}</span>
          </div>
        </div>
        <p className="pf-note">{t('portfolio.plan.needsCovered')}</p>
        <p className="muted">
          {t('portfolio.plan.split', {
            wantsPct: economy.split.wantsPct,
            savingsPct: economy.split.savingsPct,
            wants: formatINR(split.wants),
            savings: formatINR(split.savings),
          })}
        </p>
      </div>

      <div className="card-sm stack">
        <h2>{t('portfolio.plan.auto')}</h2>
        {deductions.length === 0 ? (
          <p className="muted">{t('portfolio.plan.autoNone')}</p>
        ) : (
          <ul className="pf-list">
            {deductions.map((d, i) => (
              <li key={i} className="pf-item">
                <span>{d.label}</span>
                <span className="num">{formatINR(-d.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">{t('portfolio.plan.autoHint')}</p>
      </div>

      <div className="card-sm stack">
        <h2>{t('portfolio.plan.yours')}</h2>

        {wants.length > 0 && (
          <fieldset className="pf-form" style={{ border: 0 }}>
            <legend className="pf-label">{t('portfolio.plan.buyWants')}</legend>
            {wants.map((w) => (
              <label key={w.id} className="pf-check">
                <input
                  type="checkbox"
                  checked={buy.includes(w.id)}
                  onChange={(e) => setBuy((b) => (e.target.checked ? [...b, w.id] : b.filter((id) => id !== w.id)))}
                />
                <span>
                  {w.name} <span className="num">{formatINR(w.price)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {goals.length > 0 && (
          <div className="pf-fields">
            {goals.map((g) => (
              <RupeeField
                key={g.id}
                id={`plan-goal-${g.id}`}
                label={t('portfolio.plan.toGoal', { name: g.name })}
                value={earmark[g.id] ?? 0}
                onChange={(v) => setEarmark((e) => ({ ...e, [g.id]: v }))}
                hint={t('portfolio.plan.goalLeft', { amount: formatINR(Math.max(0, g.amount - g.saved)) })}
              />
            ))}
          </div>
        )}

        <div className="pf-fields">
          {(['savings', 'emergency', 'gold', 'mf', 'shares'] as const)
            .filter(open)
            .map((b) => (
              <RupeeField
                key={b}
                id={`plan-to-${b}`}
                label={t(`portfolio.plan.to.${b}`)}
                value={to[b] ?? 0}
                onChange={(v) => setTo((x) => ({ ...x, [b]: v }))}
              />
            ))}
        </div>

        {open('rd') && (
          <div className="pf-fields">
            <RupeeField
              id="plan-rd"
              label={t('portfolio.plan.startRd')}
              value={rd.instalment}
              onChange={(v) => setRd((r) => ({ ...r, instalment: v }))}
              hint={t('portfolio.plan.rdHint')}
            />
            <SelectField
              id="plan-rd-months"
              label={t('portfolio.plan.tenure')}
              value={rd.months}
              onChange={(m) => setRd((r) => ({ ...r, months: m }))}
              options={economy.clock.rdTenuresMonths.map((m) => ({ value: m as number, label: t('portfolio.goals.inMonths', { n: m }) }))}
            />
          </div>
        )}

        {open('fd') && (
          <div className="pf-fields">
            <RupeeField
              id="plan-fd"
              label={t('portfolio.plan.openFd')}
              value={fd.principal}
              onChange={(v) => setFd((f) => ({ ...f, principal: v }))}
              hint={t('portfolio.plan.fdHint')}
            />
            <SelectField
              id="plan-fd-months"
              label={t('portfolio.plan.tenure')}
              value={fd.months}
              onChange={(m) => setFd((f) => ({ ...f, months: m }))}
              options={economy.clock.fdTenuresMonths.map((m) => ({ value: m as number, label: t('portfolio.goals.inMonths', { n: m }) }))}
            />
          </div>
        )}

        {open('mf') && (
          <RupeeField
            id="plan-sip"
            label={t(game.sip ? 'portfolio.plan.changeSip' : 'portfolio.plan.startSip')}
            value={sip}
            onChange={setSip}
            step={economy.sip.multipleOf}
            hint={t('portfolio.plan.sipHint', { step: formatINR(economy.sip.multipleOf) })}
          />
        )}

        {has('insurance') && !game.insurance.health && (
          <label className="pf-check">
            <input type="checkbox" checked={insure} onChange={(e) => setInsure(e.target.checked)} />
            <span>{t('portfolio.plan.insurance', { amount: formatINR(economy.insurance.healthPremiumPerMonth) })}</span>
          </label>
        )}

        {(open('gold') || open('mf') || open('shares')) && <p className="muted">{t('portfolio.notAdvice')}</p>}
      </div>

      <div className="card panel-blue stack" aria-live="polite">
        <h2>{t('portfolio.plan.preview')}</h2>
        <ul className="pf-list">
          {BUCKET_ORDER.filter(open).map((b) => (
            <li key={b} className="pf-item">
              <span>{t(`portfolio.bucket.${b}`)}</span>
              <span className="num">{formatINR(preview.state.buckets[b])}</span>
            </li>
          ))}
        </ul>
        <EffectList effects={previewNotes} />
        <p className="muted">{t('portfolio.plan.previewHint')}</p>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={() => onClosed(dispatch({ type: 'PLAN_MONTH', plan }))}>
        {t('portfolio.plan.close', { month: game.month })}
      </button>
    </section>
  );
}
