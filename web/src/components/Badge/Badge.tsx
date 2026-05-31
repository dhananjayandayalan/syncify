import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'muted' | 'primary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'muted', children }: BadgeProps) {
  return <span className={[styles.badge, styles[variant]].join(' ')}>{children}</span>;
}
