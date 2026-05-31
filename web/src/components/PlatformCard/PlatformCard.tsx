import { Platform, PlatformConnection } from '../../types';
import { Button } from '../Button/Button';
import styles from './PlatformCard.module.css';

const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
};

interface PlatformCardProps {
  platform: Platform;
  connection?: PlatformConnection;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
}

export function PlatformCard({ platform, connection, onConnect, onDisconnect }: PlatformCardProps) {
  const label = PLATFORM_LABELS[platform];
  const connected = !!connection;

  return (
    <div className={[styles.card, connected && styles.connected].filter(Boolean).join(' ')}>
      <div className={[styles.icon, styles[platform.toLowerCase()]].join(' ')}>
        {platform === 'SPOTIFY' ? '♫' : '▶'}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{label}</span>
        {connected && (
          <span className={styles.userId}>@{connection.platformUserId}</span>
        )}
      </div>
      <div className={styles.action}>
        {connected ? (
          <Button variant="secondary" size="sm" onClick={() => onDisconnect(platform)}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={() => onConnect(platform)}>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
