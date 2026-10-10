import { useTranslation } from 'react-i18next';
import { configToolIds, isToolId, type ConfigToolId, type ToolEmbedProps } from '@/core/tools';
import { CheckItTool, NowWhatTool } from '../../scamshield';
import { toolRegistry } from '../registry';
import { BadYearSimulator } from './BadYearSimulator';
import { BudgetBuilder } from './BudgetBuilder';
import { ConfigCalculator } from './ConfigCalculator';
import { UpiPractice } from './UpiPractice';
import '../tools.css';

const isConfigTool = (id: string): id is ConfigToolId => (configToolIds as readonly string[]).includes(id);

/** Renders any tool by id. Used by the tool page and inside lessons. */
export function ToolEmbed({ toolId, prefill, onClose }: ToolEmbedProps) {
  const { t } = useTranslation();

  if (isToolId(toolId)) {
    if (isConfigTool(toolId)) return <ConfigCalculator toolDef={toolRegistry[toolId]} prefill={prefill} onClose={onClose} />;
    if (toolId === 'checkIt') return <CheckItTool />;
    if (toolId === 'nowWhat') return <NowWhatTool />;
    if (toolId === 'budgetBuilder') return <BudgetBuilder />;
    if (toolId === 'upiPractice') return <UpiPractice />;
    if (toolId === 'badYear') return <BadYearSimulator />;
  }

  return (
    <section className="card-sm stack tl-tool" data-tool-id={toolId}>
      <p className="muted">{t(isToolId(toolId) ? 'tools.common.comingSoon' : 'tools.common.unknown')}</p>
      {onClose && (
        <div>
          <button type="button" className="btn btn-secondary tl-btn" onClick={onClose}>
            {t('tools.common.close')}
          </button>
        </div>
      )}
    </section>
  );
}
