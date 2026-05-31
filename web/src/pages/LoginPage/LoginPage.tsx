import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store';
import { login } from '../../store/auth.slice';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.logo}>Syncify</h1>
        <p className={styles.tagline}>Sync your music everywhere</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
            Sign in
          </Button>
        </form>
        <p className={styles.footer}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
