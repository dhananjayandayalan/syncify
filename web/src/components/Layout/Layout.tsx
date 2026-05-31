import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/auth.slice';
import { Button } from '../Button/Button';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>Syncify</Link>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>Dashboard</Link>
        </nav>
        <div className={styles.right}>
          {user && <span className={styles.user}>{user.name}</span>}
          <Button variant="ghost" size="sm" onClick={handleLogout}>Sign out</Button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
