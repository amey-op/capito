import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CardInteraction } from '@/core/content-schema';
import { ToolEmbed } from '@/features/tools';

type TapSortDef = Extract<CardInteraction, { type: 'tapSort' }>;
type RevealDef = Extract<CardInteraction, { type: 'reveal' }>;

/** Sort each item into a pile; instant right/wrong colour, then the card's feedback line. */
export function TapSort({ def }: { def: TapSortDef }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<Record<string, string>>({});
  const done = def.items.every((i) => picked[i.id]);
  return (
    <div className="lp-interaction stack">
      <p>
        <strong>{t(def.promptKey)}</strong>
      </p>
      <ul className="lp-sort" role="list">
        {def.items.map((item) => {
          const choice = picked[item.id];
          const right = choice === item.category;
          return (
            <li key={item.id} className={`card-sm lp-sort-item${choice ? (right ? ' verdict-good' : ' verdict-bad') : ''}`}>
              <span>{t(item.labelKey)}</span>
              <span className="row lp-sort-buttons" role="group" aria-label={t(item.labelKey)}>
                {def.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn btn-secondary lp-small${choice === c.id ? ' is-picked' : ''}`}
                    aria-pressed={choice === c.id}
                    disabled={Boolean(choice)}
                    onClick={() => setPicked({ ...picked, [item.id]: c.id })}
                  >
                    {t(c.labelKey)}
                  </button>
                ))}
              </span>
              {choice && (
                <span className={right ? 'text-good' : 'text-bad'} role="status">
                  {right ? t('ui.lesson.sortRight') : t('ui.lesson.sortWrong', { answer: t(def.categories.find((c) => c.id === item.category)!.labelKey) })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {done && def.feedbackKey && <p className="card-sm panel-blue">{t(def.feedbackKey)}</p>}
    </div>
  );
}

export function Reveal({ def }: { def: RevealDef }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  return (
    <div className="lp-interaction stack">
      <p>
        <strong>{t(def.promptKey)}</strong>
      </p>
      {shown ? (
        <p className="card-sm sticky" role="status">
          {t(def.answerKey)}
        </p>
      ) : (
        <div>
          <button type="button" className="btn btn-secondary" onClick={() => setShown(true)}>
            {t('ui.lesson.reveal')}
          </button>
        </div>
      )}
    </div>
  );
}

/** A tool inside a card, opened on demand so the card stays short. */
export function CardTool({ toolId, prefill }: { toolId: Extract<CardInteraction, { type: 'tool' }>['toolId']; prefill?: Record<string, number> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-interaction stack">
      {open ? (
        <ToolEmbed toolId={toolId} prefill={prefill} onClose={() => setOpen(false)} />
      ) : (
        <div>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            {t('ui.lesson.tryTool')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Interaction({ def }: { def: CardInteraction }) {
  switch (def.type) {
    case 'tapSort':
      return <TapSort def={def} />;
    case 'reveal':
      return <Reveal def={def} />;
    case 'tool':
      return <CardTool toolId={def.toolId} prefill={def.prefill} />;
  }
}
