import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../../components/Spinner/Spinner';
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
      <Spinner size={32} />
      <p className={styles.label}>Connecting your account...</p>
    </div>
  );
}
