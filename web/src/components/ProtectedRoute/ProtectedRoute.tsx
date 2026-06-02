import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { silentRefresh } from '../../store/auth.slice';
import { Spinner } from '../Spinner/Spinner';
import styles from './ProtectedRoute.module.css';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);
  const isRefreshing = useAppSelector((s) => s.auth.isRefreshing);

  useEffect(() => {
    if (status === 'unknown' && !isRefreshing) {
      dispatch(silentRefresh());
    }
  }, [status, isRefreshing, dispatch]);

  if (status === 'unknown') {
    return (
      <div className={styles.center}>
        <Spinner size={32} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
