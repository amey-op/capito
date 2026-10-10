import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import '@/features/ngo/ngo.css';

/** /start: two doors into Capito, one for students and one for a partner NGO. No student header. */
export function StartPage() {
  const { t } = useTranslation();
  return (
    <div className="start">
      <main className="start-main">
        <div className="container">
          <span className="wordmark" aria-hidden="true">
            Cap<b>ito</b>
          </span>
          <h1 className="ngo-sr">{t('ngo.start.title')}</h1>
          <p className="start-tagline">{t('ngo.start.tagline')}</p>
          <nav className="start-doors" aria-label={t('ngo.start.title')}>
            <Link to="/" className="card panel-green is-interactive start-door">
              <h2>{t('ngo.start.student.title')}</h2>
              <p>{t('ngo.start.student.body')}</p>
              <span className="start-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link to="/ngo" className="card panel-blue is-interactive start-door">
              <h2>{t('ngo.start.ngo.title')}</h2>
              <p>{t('ngo.start.ngo.body')}</p>
              <span className="start-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </nav>
        </div>
      </main>
      <footer className="app-footer">
        <div className="container">
          <p className="muted">{t('ngo.start.footer')}</p>
        </div>
      </footer>
    </div>
  );
}
