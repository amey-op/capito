import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './ngo.css';

/** Shell for the NGO view: its own header (no student wallet or nav) and a sample-data label. */
export function NgoLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.scrollTop = 0;
  }, [pathname]);
  return (
    <div className="app ngo">
      <header className="app-header">
        <div className="container ngo-header">
          <Link to="/ngo" className="wordmark" aria-label={t('ngo.header.title')}>
            Cap<b>ito</b>
          </Link>
          <span className="ngo-header-title">{t('ngo.header.title')}</span>
          <span className="ngo-chip">{t('ngo.header.sample')}</span>
          <Link to="/" className="btn btn-secondary ngo-header-link">
            {t('ngo.header.studentApp')}
          </Link>
        </div>
      </header>
      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">
        <div className="container">
          <p className="muted">{t('ngo.footer')}</p>
        </div>
      </footer>
    </div>
  );
}
