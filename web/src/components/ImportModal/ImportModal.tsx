import { useState, useEffect } from 'react';
import { useAppDispatch } from '../../store';
import { importPlaylist } from '../../store/playlists.slice';
import { playlistsApi } from '../../api/playlists.api';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import { Platform, PlatformConnection, PlatformPlaylistOption } from '../../types';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  connections: PlatformConnection[];
  onImported: () => void;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
};

export function ImportModal({ open, onClose, connections, onImported }: ImportModalProps) {
  const dispatch = useAppDispatch();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [playlists, setPlaylists] = useState<PlatformPlaylistOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedPlatform(null);
      setPlaylists([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!selectedPlatform) return;
    setLoading(true);
    setError(null);
    playlistsApi
      .getPlatformPlaylists(selectedPlatform)
      .then((data) => setPlaylists(data.playlists))
      .catch(() => setError('Failed to load playlists'))
      .finally(() => setLoading(false));
  }, [selectedPlatform]);

  const handleImport = async (option: PlatformPlaylistOption) => {
    if (!selectedPlatform) return;
    setImporting(option.platformPlaylistId);
    try {
      await dispatch(
        importPlaylist({
          platform: selectedPlatform,
          platformPlaylistId: option.platformPlaylistId,
          name: option.name,
        }),
      ).unwrap();
      onImported();
    } catch {
      setError('Import failed');
    } finally {
      setImporting(null);
    }
  };

  const connectedPlatforms = connections.map((c) => c.platform);

  return (
    <Modal open={open} onClose={onClose} title="Import playlist" width={520}>
      {connectedPlatforms.length === 0 ? (
        <p className={styles.empty}>Connect a platform first to import playlists.</p>
      ) : !selectedPlatform ? (
        <div className={styles.platformList}>
          <p className={styles.hint}>Choose a platform to import from:</p>
          {connectedPlatforms.map((p) => (
            <button key={p} className={styles.platformBtn} onClick={() => setSelectedPlatform(p)}>
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button className={styles.back} onClick={() => setSelectedPlatform(null)}>
            ← Back
          </button>
          <p className={styles.hint}>Select a playlist to import from {PLATFORM_LABELS[selectedPlatform]}:</p>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <div className={styles.center}><Spinner /></div>
          ) : playlists.length === 0 ? (
            <p className={styles.empty}>No playlists found.</p>
          ) : (
            <div className={styles.list}>
              {playlists.map((pl) => (
                <div key={pl.platformPlaylistId} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{pl.name}</span>
                    <span className={styles.itemCount}>{pl.trackCount} tracks</span>
                  </div>
                  <Button
                    size="sm"
                    loading={importing === pl.platformPlaylistId}
                    onClick={() => handleImport(pl)}
                  >
                    Import
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
