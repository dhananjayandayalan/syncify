import { Track } from '../../types';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import styles from './TrackRow.module.css';

interface TrackRowProps {
  track: Track;
  onRemove: (trackId: string) => void;
  removing?: boolean;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  SYNCED: 'success',
  PENDING: 'warning',
  NOT_FOUND: 'danger',
  FAILED: 'danger',
};

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function TrackRow({ track, onRemove, removing }: TrackRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.position}>{track.position + 1}</div>
      <div className={styles.info}>
        <span className={styles.title}>{track.title}</span>
        <span className={styles.artist}>{track.artist}</span>
      </div>
      {track.durationMs && (
        <span className={styles.duration}>{formatDuration(track.durationMs)}</span>
      )}
      <div className={styles.statuses}>
        {track.platformTracks.map((pt) => (
          <Badge key={pt.platform} variant={STATUS_VARIANT[pt.status] ?? 'muted'}>
            {pt.platform === 'SPOTIFY' ? 'S' : 'YT'} {pt.status}
          </Badge>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(track.id)}
        loading={removing}
        className={styles.removeBtn}
      >
        ✕
      </Button>
    </div>
  );
}
