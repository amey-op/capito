import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Placeholder } from '@/app/Placeholder';
import { isToolId, parsePrefill } from '@/core/tools';
import { ToolEmbed } from '@/features/tools';

/** Owner: Aryan (R1 replaces this; `/tool/emi?principal=6000&ratePct=18&months=6` prefills inputs). */
export function ToolPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [search] = useSearchParams();
  return (
    <Placeholder titleKey="ui.page.tool" owner="aryan" wp="R1">
      <p className="muted">{t('ui.tool.id', { id })}</p>
      {isToolId(id) ? <ToolEmbed toolId={id} prefill={parsePrefill(search)} /> : <p>{t('ui.tool.unknown')}</p>}
    </Placeholder>
  );
}
