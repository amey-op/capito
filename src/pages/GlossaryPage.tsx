import { useTranslation } from 'react-i18next';
import { Placeholder } from '@/app/Placeholder';
import { termKey, terms } from '@/content';

/** Owner: Amey (A1 replaces this with the searchable Word Bank). */
export function GlossaryPage() {
  const { t } = useTranslation();
  return (
    <Placeholder titleKey="ui.page.glossary" owner="amey" wp="A1">
      <ul className="stack">
        {terms.map((term) => (
          <li key={term.id}>
            <strong>{t(`term.${term.id}.name`)}</strong>: {t(termKey(term.id, 'simple'))}
          </li>
        ))}
      </ul>
    </Placeholder>
  );
}
