import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Placeholder } from '@/app/Placeholder';
import { lessons } from '@/content';
import { curriculum } from '@/content/curriculum';

/** Owner: Amey (A3 replaces this with the level map, progress and milestones). */
export function HomePage() {
  const { t } = useTranslation();
  const first = lessons[0];
  return (
    <Placeholder titleKey="ui.page.home" owner="amey" wp="A3">
      <p>{t('ui.home.lessonsReady', { count: lessons.length, total: curriculum.length })}</p>
      {first && (
        <div>
          <Link className="btn btn-primary" to={`/lesson/${first.id}`}>
            {t('ui.home.start', { id: first.id })}
          </Link>
        </div>
      )}
    </Placeholder>
  );
}
