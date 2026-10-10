import { useTranslation } from 'react-i18next';
import { ToolsHub } from '@/features/tools';

/** Tools index at /tools: every calculator and practice tool, grouped by the question it answers. */
export function ToolsPage() {
  const { t } = useTranslation();
  return (
    <section className="stack" aria-labelledby="page-title">
      <h1 id="page-title">{t('ui.page.tools')}</h1>
      <p className="muted">{t('ui.tools.intro')}</p>
      <ToolsHub />
    </section>
  );
}
