import { memo } from 'react';
import { Platform, PlatformConnection } from '../../types';
import styles from './PlatformCard.module.css';

const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
};

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-spotify)">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.077-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.722a.78.78 0 01-1.072.257C14.1 12.112 10.26 11.7 7.337 12.56a.78.78 0 01-.455-1.49c3.312-.99 7.427-.51 10.249 1.16a.78.78 0 01.678.472zm.105-2.835C15.07 9.156 10.3 9 7.01 9.988a.936.936 0 11-.543-1.79C9.98 7.08 15.28 7.26 18.427 9.18a.937.937 0 01-.513 1.687z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-youtube)">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface PlatformCardProps {
  platform: Platform;
  connection?: PlatformConnection;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
}

export const PlatformCard = memo(function PlatformCard({
  platform,
  connection,
  onConnect,
  onDisconnect,
}: PlatformCardProps) {
  const label = PLATFORM_LABELS[platform];
  const connected = !!connection;

  return (
    <div className={[styles.card, connected ? styles.connected : ''].filter(Boolean).join(' ')}>
      <div className={styles.icon}>
        {platform === 'SPOTIFY' ? <SpotifyIcon /> : <YouTubeIcon />}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{label}</span>
        {connected && (
          <span className={styles.userId}>@{connection.platformUserId}</span>
        )}
      </div>
      <div className={styles.action}>
        {connected ? (
          <button className={styles.disconnectLink} onClick={() => onDisconnect(platform)}>
            Disconnect
          </button>
        ) : (
          <button className={styles.connectBtn} onClick={() => onConnect(platform)}>
            Connect
          </button>
        )}
      </div>
    </div>
  );
});
