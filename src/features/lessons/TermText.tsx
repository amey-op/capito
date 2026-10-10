import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { termKey } from '@/content';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Lesson text with its Word Bank terms highlighted. Tapping a term opens its card below the
 * text with the three layers: say it simply, see it in life, say the real word.
 */
export function TermText({ text, terms = [] }: { text: string; terms?: string[] }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);

  const parts = useMemo(() => {
    const names = terms
      .map((id) => ({ id, name: t(`term.${id}.name`) }))
      .filter((n) => i18n.exists(`term.${n.id}.name`))
      .sort((a, b) => b.name.length - a.name.length);
    if (names.length === 0) return [text];
    const re = new RegExp(`\\b(${names.map((n) => escape(n.name)).join('|')})(s|es)?\\b`, 'gi');
    const out: Array<string | { id: string; label: string }> = [];
    let last = 0;
    const seen = new Set<string>();
    for (const m of text.matchAll(re)) {
      const hit = names.find((n) => n.name.toLowerCase() === m[1]!.toLowerCase());
      if (!hit || seen.has(hit.id)) continue; // highlight the first mention of each term only
      seen.add(hit.id);
      out.push(text.slice(last, m.index), { id: hit.id, label: m[0] });
      last = m.index! + m[0].length;
    }
    out.push(text.slice(last));
    return out;
  }, [text, terms, t, i18n]);

  return (
    <>
      <p className="lp-text">
        {parts.map((p, i) =>
          typeof p === 'string' ? (
            <Fragment key={i}>{p}</Fragment>
          ) : (
            <button
              key={i}
              type="button"
              className={`lp-term${open === p.id ? ' is-open' : ''}`}
              aria-expanded={open === p.id}
              onClick={() => setOpen(open === p.id ? null : p.id)}
            >
              {p.label}
            </button>
          ),
        )}
      </p>
      {open && <WordCard id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function WordCard({ id, onClose }: { id: string; onClose?: () => void }) {
  const { t, i18n } = useTranslation();
  const layers = (['simple', 'life', 'real'] as const).filter((l) => i18n.exists(termKey(id, l)));
  return (
    <aside className="card-sm lp-word" aria-label={t('ui.lesson.wordBank')}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow e-blue">{t('ui.lesson.wordBank')}</span>
        {onClose && (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('ui.lesson.close')}
          </button>
        )}
      </div>
      <h3>{t(`term.${id}.name`)}</h3>
      <dl className="lp-layers">
        {layers.map((l) => (
          <div key={l}>
            <dt className="muted">{t(`ui.lesson.layer.${l}`)}</dt>
            <dd>{t(termKey(id, l))}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
