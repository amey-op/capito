import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Placeholder } from '@/app/Placeholder';

/** Owner: Nipun (N3 replaces this with choices, outcome card, what-if and try again). */
export function EventPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  return (
    <Placeholder titleKey="ui.page.event" owner="nipun" wp="N3">
      <p className="muted">{t('ui.event.id', { id })}</p>
    </Placeholder>
  );
}
