import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatINR } from '@/core/format';
import type { Action, GameState, Want } from '@/core/types';
import { RupeeField, SelectField } from './fields';
import { DEPRECIATION_CATEGORIES } from './keys';

type Dispatch = (action: Action) => unknown;
const GOAL_MONTHS = [3, 6, 9, 12] as const;

/** "Add a want" is always available (MECHANICS §1.2). The name is the only free text in the game. */
export function AddWant({ dispatch }: { dispatch: Dispatch }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [kind, setKind] = useState<Want['kind']>('item');
  const [category, setCategory] = useState<(typeof DEPRECIATION_CATEGORIES)[number]>('other');
  const ready = name.trim().length > 0 && price > 0;
  return (
    <form
      className="card-sm pf-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        dispatch({ type: 'ADD_WANT', want: { name, price, kind, ...(kind === 'item' ? { category } : {}) } });
        setName('');
        setPrice(0);
      }}
    >
      <h3>{t('portfolio.wants.add')}</h3>
      <div className="pf-fields">
        <div className="pf-field">
          <label className="pf-label" htmlFor="want-name">
            {t('portfolio.wants.name')}
          </label>
          <input id="want-name" type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <RupeeField id="want-price" label={t('portfolio.wants.price')} value={price} onChange={setPrice} step={50} />
        <SelectField
          id="want-kind"
          label={t('portfolio.wants.kind')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'item', label: t('portfolio.wants.kind.item') },
            { value: 'experience', label: t('portfolio.wants.kind.experience') },
          ]}
        />
        {kind === 'item' && (
          <SelectField
            id="want-category"
            label={t('portfolio.wants.category')}
            value={category}
            onChange={setCategory}
            options={DEPRECIATION_CATEGORIES.map((c) => ({ value: c, label: t(`portfolio.category.${c}`) }))}
          />
        )}
      </div>
      <p className="muted">{t('portfolio.wants.privacy')}</p>
      <button type="submit" className="btn btn-primary pf-btn" disabled={!ready}>
        {t('portfolio.wants.addButton')}
      </button>
    </form>
  );
}

function WantRow({ game, want, dispatch }: { game: GameState; want: Want; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const [months, setMonths] = useState<number>(6);
  const [promoting, setPromoting] = useState(false);
  return (
    <li className="card-sm stack">
      <div className="pf-item">
        <span>
          <strong>{want.name}</strong> <span className="num">{formatINR(want.price)}</span>
          <span className="muted"> · {t(`portfolio.wants.kind.${want.kind}`)}</span>
        </span>
        <span className="row">
          {want.status === 'open' && (
            <button type="button" className="btn btn-secondary pf-btn" aria-expanded={promoting} onClick={() => setPromoting((p) => !p)}>
              {t('portfolio.wants.makeGoal')}
            </button>
          )}
          <button type="button" className="btn btn-ghost pf-btn" onClick={() => dispatch({ type: 'DROP_WANT', wantId: want.id })}>
            {t('portfolio.wants.drop')}
          </button>
        </span>
      </div>
      {promoting && want.status === 'open' && (
        <div className="pf-form">
          <SelectField
            id={`goal-months-${want.id}`}
            label={t('portfolio.goals.deadline')}
            value={months}
            onChange={setMonths}
            options={GOAL_MONTHS.map((m) => ({ value: m, label: t('portfolio.goals.inMonths', { n: m }) }))}
          />
          <p className="muted">{t('portfolio.goals.perMonth', { amount: formatINR(want.price / months) })}</p>
          <button
            type="button"
            className="btn btn-primary pf-btn"
            onClick={() => {
              dispatch({ type: 'PROMOTE_GOAL', wantId: want.id, amount: want.price, deadlineMonth: game.month + months });
              setPromoting(false);
            }}
          >
            {t('portfolio.goals.set')}
          </button>
        </div>
      )}
    </li>
  );
}

/** My Wants and Goals: the player's own list, with progress toward each goal. */
export function WantsGoals({ game, dispatch }: { game: GameState; dispatch: Dispatch }) {
  const { t } = useTranslation();
  const wants = game.wants.filter((w) => w.status === 'open' || w.status === 'goal');
  return (
    <section className="stack" aria-labelledby="pf-wants">
      <h2 id="pf-wants">{t('portfolio.wants.title')}</h2>

      {game.goals.length > 0 && (
        <ul className="pf-list">
          {game.goals.map((g) => (
            <li key={g.id} className="card-sm stack">
              <div className="pf-item">
                <strong>{g.name}</strong>
                <span className="num">
                  {formatINR(g.saved)} / {formatINR(g.amount)}
                </span>
              </div>
              <span className="pf-bar is-info" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (g.saved / g.amount) * 100)}%` }} />
              </span>
              <div className="pf-item">
                <span className="muted">
                  {t(`portfolio.goals.status.${g.status}`)} · {t('portfolio.goals.byMonth', { month: g.deadlineMonth })}
                </span>
                {g.status === 'missed' && (
                  <button
                    type="button"
                    className="btn btn-secondary pf-btn"
                    onClick={() => dispatch({ type: 'EXTEND_GOAL', goalId: g.id, deadlineMonth: game.month + 3 })}
                  >
                    {t('portfolio.goals.extend')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {wants.length > 0 ? (
        <ul className="pf-list">
          {wants.map((w) => (
            <WantRow key={w.id} game={game} want={w} dispatch={dispatch} />
          ))}
        </ul>
      ) : (
        <p className="muted">{t('portfolio.wants.empty')}</p>
      )}

      <AddWant dispatch={dispatch} />
    </section>
  );
}
