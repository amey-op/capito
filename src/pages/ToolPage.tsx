import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { parsePrefill, type ToolId } from '@/core/tools';
import { ToolEmbed } from '@/features/tools';

/** One tool on its own page: /tool/<id>?principal=6000 (the query fills the inputs). */
export function ToolPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn-secondary tl-btn" onClick={() => navigate(-1)}>
          {t('tools.common.back')}
        </button>
        <h1>{t('ui.page.tool')}</h1>
      </div>
      <ToolEmbed toolId={id as ToolId} prefill={parsePrefill(searchParams)} />
    </div>
  );
}
