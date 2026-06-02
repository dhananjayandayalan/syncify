import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchPlaylist, linkPlatform, unlinkPlatform } from '../../store/playlists.slice';
import { tracksApi } from '../../api/tracks.api';
import { syncApi } from '../../api/sync.api';
import { logsApi } from '../../api/logs.api';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { TrackRow } from '../../components/TrackRow/TrackRow';
import { SearchModal } from '../../components/SearchModal/SearchModal';
import { Spinner } from '../../components/Spinner/Spinner';
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
  const navigate = useNavigate();
  const playlist = useAppSelector((s) => s.playlists.current);
  const connections = useAppSelector((s) => s.auth.connections);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logsTab, setLogsTab] = useState<Platform | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchPlaylist(id));
    loadTracks();
    // Trigger a background sync on page open so latest platform changes are fetched
    syncApi.trigger(id).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  async function loadTracks() {
    if (!id) return;
    setTracksLoading(true);
    try {
      const data = await tracksApi.list(id);
      setTracks(data.tracks);
    } finally {
      setTracksLoading(false);
    }
  }

  async function loadLogs(platform: Platform) {
    if (!id) return;
    setLogsLoading(true);
    try {
      const data = await logsApi.list(id, platform);
      setLogs(data.logs);
    } finally {
      setLogsLoading(false);
    }
  }

  const handleTabChange = (platform: Platform) => {
    setLogsTab(platform);
    loadLogs(platform);
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!id) return;
    setRemovingId(trackId);
    try {
      await tracksApi.remove(id, trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } finally {
      setRemovingId(null);
    }
  };

  function startPolling() {
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
          setSyncMsg(allResolved ? null : 'Sync complete');
          setTimeout(() => setSyncMsg(null), 2000);
          return;
        }
      }
    }, 5000);
  }

  const handleSync = async () => {
    if (!id) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      await syncApi.trigger(id);
      setSyncMsg('Syncing...');
      startPolling();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkPlatform = async (platform: Platform) => {
    if (!id) return;
    await dispatch(linkPlatform({ id, platform })).unwrap();
    await loadTracks();
    dispatch(fetchPlaylist(id));
    setSyncMsg('Syncing existing tracks...');
    startPolling();
  };

  const handleUnlinkPlatform = async (platform: Platform) => {
    if (!id) return;
    await dispatch(unlinkPlatform({ id, platform })).unwrap();
    await loadTracks();
    dispatch(fetchPlaylist(id));
  };

  if (!playlist) {
    return (
      <Layout>
        <div className={styles.center}><Spinner /></div>
      </Layout>
    );
  }

  const linkedPlatforms = new Set(playlist.links.map((l) => l.platform));
  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  return (
    <Layout>
      <div className={styles.breadcrumb}>
        <Link to="/">Dashboard</Link>
        <span>/</span>
        <span>{playlist.name}</span>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{playlist.name}</h1>
          {playlist.description && <p className={styles.desc}>{playlist.description}</p>}
        </div>
        <div className={styles.actions}>
          {syncMsg && <span className={styles.syncMsg}>{syncMsg}</span>}
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
                <button
                  className={styles.toggleBtn}
                  onClick={() => handleUnlinkPlatform(p)}
                >
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
        onTrackAdded={() => { loadTracks(); setSearchOpen(false); }}
      />
    </Layout>
  );
}
