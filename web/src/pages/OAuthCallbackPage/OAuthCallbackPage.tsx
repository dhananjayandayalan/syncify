import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './OAuthCallbackPage.module.css';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const success = params.get('success') === 'true';
    navigate(success ? '/' : '/?oauth_error=1', { replace: true });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.logo}>
        <svg viewBox="0 0 40 40" fill="none" className={styles.logoIcon}>
          <path d="M16 30V14l20-4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="30" r="5" stroke="currentColor" strokeWidth="2" />
          <circle cx="29" cy="26" r="5" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className={styles.logoText}>Syncify</span>
      </div>
      <p className={styles.label}>Connecting your account</p>
      <div className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
