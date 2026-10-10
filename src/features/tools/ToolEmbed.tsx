import { useTranslation } from 'react-i18next';
import type { ToolEmbedProps } from '@/core/tools';

/** Placeholder from A0. R1 replaces it with the real tools (config calculators and bespoke builds). */
export function ToolEmbed({ toolId }: ToolEmbedProps) {
  const { t } = useTranslation();
  return (
    <div className="card-sm" data-tool-id={toolId}>
      {t('ui.tool.placeholder', { id: toolId })}
    </div>
  );
}
