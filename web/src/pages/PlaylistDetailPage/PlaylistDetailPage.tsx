import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchPlaylist, linkPlatform, unlinkPlatform } from '../../store/playlists.slice';
import { tracksApi } from '../../api/tracks.api';
import { syncApi } from '../../api/sync.api';
import { logsApi } from '../../api/logs.api';
import { playlistsApi } from '../../api/playlists.api';
import { AppShell } from '../../components/AppShell/AppShell';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { TrackRow } from '../../components/TrackRow/TrackRow';
import { SearchModal } from '../../components/SearchModal/SearchModal';
import { ImageCropModal } from '../../components/ImageCropModal/ImageCropModal';
import { Spinner } from '../../components/Spinner/Spinner';
import { useToast } from '../../contexts/ToastContext';
import { Platform, Track, SyncLog } from '../../types';
import styles from './PlaylistDetailPage.module.css';

const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
};
const ALL_PLATFORMS: Platform[] = ['SPOTIFY', 'YOUTUBE'];

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const playlist = useAppSelector((s) => s.playlists.current);
  const connections = useAppSelector((s) => s.auth.connections);
  const toast = useToast();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [coverSaving, setCoverSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logsTab, setLogsTab] = useState<Platform | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const linkedPlatforms = useMemo(
    () => new Set(playlist?.links.map((l) => l.platform) ?? []),
    [playlist?.links],
  );
  const connectedPlatforms = useMemo(
    () => new Set(connections.map((c) => c.platform)),
    [connections],
  );

  const loadTracks = useCallback(async () => {
    if (!id) return;
    setTracksLoading(true);
    try {
      const data = await tracksApi.list(id);
      setTracks(data.tracks);
    } finally {
      setTracksLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchPlaylist(id));
    loadTracks();
    syncApi.trigger(id).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id, dispatch, loadTracks]);

  const startPolling = useCallback(
    (dismissLoadingToast: () => void) => {
      if (pollRef.current) clearInterval(pollRef.current);
      let ticks = 0;
      pollRef.current = setInterval(async () => {
        ticks++;
        const data = await tracksApi.list(id!).catch(() => null);
        if (data) {
          setTracks(data.tracks);
          const allResolved = data.tracks.every((t) =>
            t.platformTracks.every((pt) => pt.status !== 'PENDING'),
          );
          if (allResolved || ticks >= 8) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            dismissLoadingToast();
            if (allResolved) toast.success('Sync complete');
          }
        }
      }, 5000);
    },
    [id, toast],
  );

  const handleSync = useCallback(async () => {
    if (!id) return;
    setSyncing(true);
    try {
      await syncApi.trigger(id);
      const dismissLoading = toast.loading('Syncing…');
      startPolling(dismissLoading);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [id, toast, startPolling]);

  const handleLinkPlatform = useCallback(
    async (platform: Platform) => {
      if (!id) return;
      await dispatch(linkPlatform({ id, platform })).unwrap();
      await loadTracks();
      dispatch(fetchPlaylist(id));
      toast.success(`${PLATFORM_LABELS[platform]} linked`);
      const dismissLoading = toast.loading('Syncing existing tracks…');
      startPolling(dismissLoading);
    },
    [id, dispatch, loadTracks, toast, startPolling],
  );

  const handleUnlinkPlatform = useCallback(
    async (platform: Platform) => {
      if (!id) return;
      await dispatch(unlinkPlatform({ id, platform })).unwrap();
      await loadTracks();
      dispatch(fetchPlaylist(id));
      toast.info(`${PLATFORM_LABELS[platform]} unlinked`);
    },
    [id, dispatch, loadTracks, toast],
  );

  const handleRemoveTrack = useCallback(
    async (trackId: string) => {
      if (!id) return;
      setRemovingId(trackId);
      try {
        await tracksApi.remove(id, trackId);
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      } finally {
        setRemovingId(null);
      }
    },
    [id],
  );

  const handleCoverApply = useCallback(
    async (dataUrl: string) => {
      if (!id) return;
      setCoverSaving(true);
      try {
        await playlistsApi.update(id, { coverImage: dataUrl });
        dispatch(fetchPlaylist(id));
        toast.success('Cover updated');
      } finally {
        setCoverSaving(false);
      }
    },
    [id, dispatch, toast],
  );

  const loadLogs = useCallback(async (platform: Platform) => {
    if (!id) return;
    setLogsLoading(true);
    try {
      const data = await logsApi.list(id, platform);
      setLogs(data.logs);
    } finally {
      setLogsLoading(false);
    }
  }, [id]);

  const handleTabChange = useCallback(
    (platform: Platform) => {
      setLogsTab(platform);
      loadLogs(platform);
    },
    [loadLogs],
  );

  if (!playlist) {
    return (
      <AppShell>
        <div className={styles.center}><Spinner /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className={styles.breadcrumb}>
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <span>{playlist.name}</span>
      </div>

      <div className={styles.header}>
        <div className={styles.coverWrapper}>
          {playlist.coverImage ? (
            <img src={playlist.coverImage} alt="" className={styles.cover} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
          <button
            className={styles.coverEditBtn}
            onClick={() => setCropOpen(true)}
            title="Change cover"
            disabled={coverSaving}
          >
            {coverSaving ? '…' : 'Edit'}
          </button>
        </div>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{playlist.name}</h1>
          {playlist.description && <p className={styles.desc}>{playlist.description}</p>}
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={handleSync} loading={syncing}>
            Sync now
          </Button>
          <Button size="sm" onClick={() => setSearchOpen(true)}>+ Add tracks</Button>
        </div>
      </div>

      <div className={styles.platforms}>
        <span className={styles.platformsLabel}>Platforms:</span>
        {ALL_PLATFORMS.map((p) => {
          const isLinked = linkedPlatforms.has(p);
          const isConnected = connectedPlatforms.has(p);
          return (
            <div key={p} className={styles.platformToggle}>
              <Badge variant={isLinked ? 'primary' : 'muted'}>{PLATFORM_LABELS[p]}</Badge>
              {isLinked ? (
                <button className={styles.toggleBtn} onClick={() => handleUnlinkPlatform(p)}>
                  Unlink
                </button>
              ) : (
                <button
                  className={styles.toggleBtn}
                  disabled={!isConnected}
                  onClick={() => isConnected && handleLinkPlatform(p)}
                  title={!isConnected ? 'Connect this platform first' : ''}
                >
                  Link
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.tracksSection}>
        <h2 className={styles.sectionTitle}>Tracks ({tracks.length})</h2>
        {tracksLoading ? (
          <div className={styles.center}><Spinner /></div>
        ) : tracks.length === 0 ? (
          <p className={styles.empty}>No tracks yet. Add some songs to get started.</p>
        ) : (
          <div className={styles.trackList}>
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                onRemove={handleRemoveTrack}
                removing={removingId === track.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.logsSection}>
        <h2 className={styles.sectionTitle}>Sync Logs</h2>
        <div className={styles.logsTabs}>
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
            <button
              key={p}
              className={[styles.logsTab, logsTab === p && styles.activeTab].filter(Boolean).join(' ')}
              onClick={() => handleTabChange(p)}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        {logsTab && (
          <div className={styles.logsList}>
            {logsLoading ? (
              <div className={styles.center}><Spinner /></div>
            ) : logs.length === 0 ? (
              <p className={styles.empty}>No logs yet</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={styles.logEntry}>
                  <Badge
                    variant={
                      log.status === 'SUCCESS'
                        ? 'success'
                        : log.status === 'NOT_FOUND'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {log.action} {log.status}
                  </Badge>
                  <div className={styles.logInfo}>
                    {log.trackTitle && (
                      <span className={styles.logTrack}>
                        {log.trackTitle} — {log.trackArtist}
                      </span>
                    )}
                    {log.message && <span className={styles.logMsg}>{log.message}</span>}
                  </div>
                  <span className={styles.logDate}>
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        playlistId={playlist.id}
        onTrackAdded={() => { loadTracks(); setSearchOpen(false); toast.success('Tracks added'); }}
      />

      <ImageCropModal
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        onCrop={handleCoverApply}
      />
    </AppShell>
  );
}
