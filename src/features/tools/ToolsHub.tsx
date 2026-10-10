import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ToolId } from '@/core/tools';
import './tools.css';

interface HubItem {
  id: string;
  to: string;
  titleKey: string;
}

const tool = (id: ToolId, titleKey = `tools.${id}.title`): HubItem => ({ id, to: `/tool/${id}`, titleKey });

/** Every tool that works today, grouped by the question it answers. */
export const hubGroups: Array<{ id: string; items: HubItem[] }> = [
  { id: 'plan', items: [tool('budgetBuilder'), tool('leakFinder'), tool('goalPlanner'), tool('depreciation')] },
  { id: 'save', items: [tool('rd'), tool('fd'), tool('inflation')] },
  { id: 'borrow', items: [tool('emi')] },
  { id: 'grow', items: [tool('timeMachine'), tool('sip'), tool('lumpsum'), tool('goalSip'), tool('feeLens'), tool('goldCompare'), tool('badYear')] },
  { id: 'earn', items: [tool('takeHome'), tool('slab')] },
  {
    id: 'safe',
    items: [
      { id: 'scamShield', to: '/scam-shield', titleKey: 'scamshield.ui.title' },
      tool('upiPractice'),
      tool('checkIt', 'scamshield.checkIt.title'),
      tool('nowWhat', 'scamshield.nowWhat.title'),
    ],
  },
];

/** The tools hub: grouped cards, each with a one-line purpose. The whole card is the link. */
export function ToolsHub() {
  const { t } = useTranslation();
  return (
    <div className="stack">
      {hubGroups.map((group) => (
        <section key={group.id} className="stack" aria-labelledby={`tl-hub-${group.id}`}>
          <div>
            <h2 id={`tl-hub-${group.id}`}>{t(`tools.hub.group.${group.id}`)}</h2>
            <p className="muted">{t(`tools.hub.group.${group.id}.hint`)}</p>
          </div>
          <ul className="tl-hub" role="list">
            {group.items.map((item) => (
              <li key={item.id}>
                <Link className="card-sm tl-hub-card" to={item.to}>
                  <strong>{t(item.titleKey)}</strong>
                  <span>{t(`tools.hub.${item.id}`)}</span>
                  <span className="tl-hub-open">{t('tools.hub.open')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted">{t('tools.hub.note')}</p>
    </div>
  );
}
