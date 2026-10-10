import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Placeholder } from '@/app/Placeholder';
import { lessonById } from '@/content';

/** Owner: Amey (A1 replaces this with the LessonPlayer). */
export function LessonPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const lesson = lessonById.get(id);
  return (
    <Placeholder titleKey={lesson ? lesson.titleKey : 'ui.page.lesson'} owner="amey" wp="A1">
      <p className="muted">{t('ui.lesson.id', { id })}</p>
      <p>{lesson ? t(lesson.gutCheck.promptKey) : t('ui.lesson.missing')}</p>
    </Placeholder>
  );
}
