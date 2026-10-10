import { useTranslation } from 'react-i18next';
import { economy } from '@/core/economy.config';
import { formatINR, formatPct } from '@/core/format';
import type { GameState, HealthInput } from '@/core/types';
import { engine } from '@/engine';
import { tWithMoney } from './EffectList';

const tone = (points: number): string => (points >= economy.health.pointsPerInput ? '' : points > 0 ? ' is-mid' : ' is-low');

function HealthRow({ label, input, value }: { label: string; input: HealthInput; value: string }) {
  return (
    <div className="pf-bar-row">
      <span>{label}</span>
      <span className={`pf-bar${tone(input.points)}`} aria-hidden="true">
        <span style={{ width: `${(input.points / economy.health.pointsPerInput) * 100}%` }} />
      </span>
      <span className="num">{value}</span>
    </div>
  );
}

/** Net worth, the Money Health Score with its five inputs, and the small meters. */
export function TopCard({ game }: { game: GameState }) {
  const { t } = useTranslation();
  const h = engine.health(game);
  return (
    <section className="card stack" aria-labelledby="pf-networth">
      <div>
        <span className="pf-label" id="pf-networth">
          {t('portfolio.netWorth')}
        </span>
        <p className="num pf-hero-number">{formatINR(engine.netWorth(game))}</p>
        <p className="muted">{t('portfolio.netWorthHint')}</p>
      </div>

      <div className="pf-meters">
        <div className="pf-meter">
          <span className="pf-label">{t('portfolio.month')}</span>
          <span className="num">{game.month}</span>
        </div>
        <div className="pf-meter">
          <span className="pf-label">{t('portfolio.bucket.wallet')}</span>
          <span className="num">{formatINR(game.buckets.wallet)}</span>
        </div>
        {economy.joy.enabled && (
          <div className="pf-meter is-purple">
            <span className="pf-label">{t('portfolio.joy')}</span>
            <span className="num">{game.joy}</span>
          </div>
        )}
        {game.creditScore !== null && (
          <div className="pf-meter is-purple">
            <span className="pf-label">{t('portfolio.creditScore')}</span>
            <span className="num">{game.creditScore}</span>
          </div>
        )}
        {game.shield.seen > 0 && (
          <div className="pf-meter">
            <span className="pf-label">{t('portfolio.shield')}</span>
            <span className="num">
              {game.shield.correct}/{game.shield.seen}
            </span>
          </div>
        )}
      </div>

      <hr className="pf-divider" />

      <div className="stack" aria-labelledby="pf-health">
        <div className="pf-item">
          <h2 id="pf-health">{t('portfolio.health.title')}</h2>
          <span className="num pf-hero-number" aria-label={t('portfolio.health.outOf100', { total: h.total })}>
            {h.total}
          </span>
        </div>
        <div className="pf-bars">
          <HealthRow label={t('portfolio.health.savingsRate')} input={h.savingsRate} value={formatPct(h.savingsRate.value, 0)} />
          <HealthRow label={t('portfolio.health.emergency')} input={h.emergency} value={t('portfolio.health.months', { n: h.emergency.value })} />
          <HealthRow label={t('portfolio.health.diversification')} input={h.diversification} value={String(h.diversification.value)} />
          <HealthRow label={t('portfolio.health.debtLoad')} input={h.debtLoad} value={formatPct(h.debtLoad.value, 0)} />
          <HealthRow label={t('portfolio.health.scamSafety')} input={h.scamSafety} value={game.shield.seen > 0 ? formatPct(h.scamSafety.value, 0) : '–'} />
        </div>
        <p className="pf-note">{tWithMoney(t, h.nextMoveKey, h.nextMoveParams)}</p>
      </div>
    </section>
  );
}
