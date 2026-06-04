import { useState } from 'react';
import { useAppDispatch } from '../../store';
import { importPlaylist } from '../../store/playlists.slice';
import { playlistsApi } from '../../api/playlists.api';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import { Platform, PlatformPlaylistOption, PlatformConnection } from '../../types';
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
  APPLE_MUSIC: 'Apple Music',
};

export function ImportModal({ open, onClose, connections, onImported }: ImportModalProps) {
  const dispatch = useAppDispatch();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [platformPlaylists, setPlatformPlaylists] = useState<PlatformPlaylistOption[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  const handlePickPlatform = async (p: Platform) => {
    setPlatform(p);
    setSelectedId(null);
    setFetchError(null);
    setPlatformPlaylists([]);
    setLoadingPlaylists(true);
    try {
      const data = await playlistsApi.getPlatformPlaylists(p);
      setPlatformPlaylists(data.playlists);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load playlists');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleImport = async () => {
    if (!platform || !selectedId) return;
    const pl = platformPlaylists.find((p) => p.platformPlaylistId === selectedId);
    if (!pl) return;
    setImporting(true);
    setImportError(null);
    try {
      await dispatch(importPlaylist({ platform, platformPlaylistId: selectedId, name: pl.name })).unwrap();
      onImported();
      handleClose();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setPlatform(null);
    setPlatformPlaylists([]);
    setSelectedId(null);
    setFetchError(null);
    setImportError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import playlist" width={560}>
      <div className={styles.platformRow}>
        {(['SPOTIFY', 'YOUTUBE'] as Platform[]).map((p) => {
          const connected = connectedPlatforms.has(p);
          return (
            <button
              key={p}
              className={[
                styles.platformBtn,
                platform === p && styles.platformBtnActive,
                !connected && styles.platformBtnDisabled,
              ].filter(Boolean).join(' ')}
              onClick={() => connected && handlePickPlatform(p)}
              disabled={!connected}
              title={!connected ? `Connect ${PLATFORM_LABELS[p]} first` : `Import from ${PLATFORM_LABELS[p]}`}
            >
              {PLATFORM_LABELS[p]}
              {!connected && <span className={styles.notConnected}> (not connected)</span>}
            </button>
          );
        })}
      </div>

      {platform && (
        <div className={styles.playlistSection}>
          {loadingPlaylists && (
            <div className={styles.center}><Spinner /></div>
          )}
          {fetchError && <p className={styles.error}>{fetchError}</p>}
          {!loadingPlaylists && !fetchError && platformPlaylists.length === 0 && (
            <p className={styles.empty}>No playlists found on {PLATFORM_LABELS[platform]}</p>
          )}
          {!loadingPlaylists && platformPlaylists.length > 0 && (
            <div className={styles.list}>
              {platformPlaylists.map((pl) => (
                <div
                  key={pl.platformPlaylistId}
                  className={[
                    styles.listItem,
                    selectedId === pl.platformPlaylistId && styles.listItemSelected,
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedId(pl.platformPlaylistId)}
                  role="radio"
                  aria-checked={selectedId === pl.platformPlaylistId}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setSelectedId(pl.platformPlaylistId); }}
                >
                  <div className={[
                    styles.radio,
                    selectedId === pl.platformPlaylistId && styles.radioSelected,
                  ].filter(Boolean).join(' ')} />
                  <div className={styles.listItemInfo}>
                    <span className={styles.listItemName}>{pl.name}</span>
                    <span className={styles.listItemCount}>{pl.trackCount} track{pl.trackCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {importError && <p className={styles.error}>{importError}</p>}

      <div className={styles.footer}>
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
        <Button
          size="sm"
          disabled={!selectedId || importing}
          loading={importing}
          onClick={handleImport}
        >
          Import playlist
        </Button>
      </div>
    </Modal>
  );
}
