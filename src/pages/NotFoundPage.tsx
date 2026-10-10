import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="stack">
      <h1>{t('ui.page.notFound')}</h1>
      <div>
        <Link className="btn btn-secondary" to="/">
          {t('ui.back.home')}
        </Link>
      </div>
    </section>
  );
}
