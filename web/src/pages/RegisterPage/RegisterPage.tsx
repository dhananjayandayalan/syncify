import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../store';
import { register } from '../../store/auth.slice';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import styles from './RegisterPage.module.css';

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(register({ name, email, password })).unwrap();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <svg className={styles.heroIcon} viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          <path d="M32 56V28l28-6v28" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="25" cy="56" r="7" stroke="#fff" strokeWidth="2.5" />
          <circle cx="53" cy="50" r="7" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <h1 className={styles.heroTitle}>Syncify</h1>
        <p className={styles.heroSubtitle}>Sync your music. Everywhere.</p>
      </div>
      <div className={styles.right}>
        <div className={styles.card}>
          <h2 className={styles.formTitle}>Create account</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <p className={styles.error}>{error}</p>}
            <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              Create account
            </Button>
          </form>
          <p className={styles.footer}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
