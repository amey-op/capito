import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { lessonById } from '@/content';
import { LessonPlayer } from '@/features/lessons';

export function LessonPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const lesson = lessonById.get(id);
  if (!lesson) {
    return (
      <section className="stack" aria-labelledby="page-title">
        <h1 id="page-title">{t('ui.page.lesson')}</h1>
        <p>{t('ui.lesson.missing')}</p>
        <div>
          <Link className="btn btn-secondary" to="/">
            {t('ui.back.home')}
          </Link>
        </div>
      </section>
    );
  }
  // key: opening a different lesson starts the player fresh
  return <LessonPlayer key={lesson.id} lesson={lesson} />;
}
