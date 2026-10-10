import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { formatINR } from '@/core/format';
import { useGameStore } from '@/core/store';

const nav = [
  { to: '/', key: 'ui.nav.home', end: true },
  { to: '/portfolio', key: 'ui.nav.portfolio', end: false },
  { to: '/tools', key: 'ui.nav.tools', end: false },
  { to: '/glossary', key: 'ui.nav.glossary', end: false },
  { to: '/scam-shield', key: 'ui.nav.scamShield', end: false },
] as const;

export function Layout() {
  const { t } = useTranslation();
  const month = useGameStore((s) => s.game.month);
  const wallet = useGameStore((s) => s.game.buckets.wallet);
  const { pathname } = useLocation();
  // A new page starts at the top (the browser keeps the old scroll position otherwise).
  useEffect(() => {
    document.documentElement.scrollTop = 0;
  }, [pathname]);
  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <NavLink to="/" className="wordmark" aria-label={t('ui.app.name')}>
            Cap<b>ito</b>
          </NavLink>
          <span className="muted">
            {t('ui.month', { month })} · {t('ui.wallet')} <span className="num">{formatINR(wallet)}</span>
          </span>
          <nav className="app-nav" aria-label={t('ui.nav.main')}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {t(n.key)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">
        <div className="container">
          <p>{t('ui.footer.assumption')}</p>
          <p className="muted">{t('ui.footer.notAdvice')}</p>
        </div>
      </footer>
    </div>
  );
}
