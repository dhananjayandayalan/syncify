import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../store';
import { fetchMe } from '../../store/auth.slice';
import { Spinner } from '../../components/Spinner/Spinner';
import styles from './OAuthCallbackPage.module.css';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const success = params.get('success') === 'true';
    if (success) {
      dispatch(fetchMe()).finally(() => navigate('/'));
    } else {
      navigate('/?oauth_error=1');
    }
  }, [params, navigate, dispatch]);

  return (
    <div className={styles.page}>
      <Spinner size={32} />
      <p className={styles.label}>Connecting your account...</p>
    </div>
  );
}
