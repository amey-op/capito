import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { allToolIds } from '@/core/tools';

/**
 * Tools index at /tools. A simple list of every tool that has a title; the tools hub
 * (grouped cards with a one-line purpose) replaces the body of this page.
 */
export function ToolsPage() {
  const { t, i18n } = useTranslation();
  const tools = allToolIds.filter((id) => i18n.exists(`tools.${id}.title`));
  return (
    <section className="stack" aria-labelledby="page-title">
      <h1 id="page-title">{t('ui.page.tools')}</h1>
      <p className="muted">{t('ui.tools.intro')}</p>
      <ul className="grid-cards-small" role="list">
        {tools.map((id) => (
          <li key={id} className="card-sm row" style={{ justifyContent: 'space-between', listStyle: 'none' }}>
            <strong>{t(`tools.${id}.title`)}</strong>
            <Link className="btn btn-secondary" to={`/tool/${id}`}>
              {t('ui.tools.open')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
