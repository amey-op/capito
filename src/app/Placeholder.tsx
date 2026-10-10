import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Owner } from '@/content/curriculum';

interface PlaceholderProps {
  titleKey: string;
  owner: Owner;
  wp: string;
  children?: ReactNode;
}

/** Phase 0 placeholder: says which lane and work package replaces the page. */
export function Placeholder({ titleKey, owner, wp, children }: PlaceholderProps) {
  const { t } = useTranslation();
  return (
    <section className="stack" aria-labelledby="page-title">
      <div>
        <span className="eyebrow">{t('ui.placeholder.eyebrow')}</span>
      </div>
      <h1 id="page-title">{t(titleKey)}</h1>
      <div className="card stack">
        <p>
          <strong>{t('ui.placeholder.owner', { owner: t(`ui.owner.${owner}`), wp })}</strong>
        </p>
        <p className="muted">{t('ui.placeholder.note')}</p>
        {children}
      </div>
    </section>
  );
}
