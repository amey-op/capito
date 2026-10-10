import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { lessonById, termKey, terms } from '@/content';
import { searchWords, wordBank } from '@/features/glossary/wordBank';
import '@/features/glossary/glossary.css';

/** Word Bank: every term from the lessons that exist, searchable. */
export function GlossaryPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const all = useMemo(() => wordBank(terms, lessonById, (k) => (i18n.exists(k) ? t(k) : undefined)), [t, i18n]);
  const shown = searchWords(all, query);

  return (
    <section className="stack wb" aria-labelledby="page-title">
      <div>
        <span className="eyebrow e-blue">{t('ui.wordBank.eyebrow')}</span>
        <h1 id="page-title">{t('ui.page.glossary')}</h1>
        <p className="muted">{t('ui.wordBank.intro')}</p>
      </div>

      <label className="stack wb-search" htmlFor="wb-q">
        <span className="wb-label">{t('ui.wordBank.search')}</span>
        <input
          id="wb-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ui.wordBank.placeholder')}
          autoComplete="off"
        />
      </label>
      <p className="muted" role="status" aria-live="polite">
        {t('ui.wordBank.count', { count: shown.length })}
      </p>

      {shown.length === 0 ? (
        <p className="card-sm">{t('ui.wordBank.none', { query: query.trim() })}</p>
      ) : (
        <ul className="wb-list" role="list">
          {shown.map((e) => (
            <li key={e.id} className="card-sm wb-item">
              <div className="row wb-head">
                <h2 className="wb-name">{e.name}</h2>
                <span className="wb-from">{t('ui.wordBank.from', { id: e.lessonId })}</span>
              </div>
              <p>{e.simple}</p>
              {e.life && (
                <p className="wb-life">
                  <span className="wb-label">{t('ui.lesson.layer.life')}</span> {e.life}
                </p>
              )}
              {e.core && i18n.exists(termKey(e.id, 'real')) && (
                <details className="wb-real">
                  <summary>{t('ui.lesson.layer.real')}</summary>
                  <p>{t(termKey(e.id, 'real'))}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
