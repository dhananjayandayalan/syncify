import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchPlaylists, createPlaylist, deletePlaylist } from '../../store/playlists.slice';
import { fetchMe } from '../../store/auth.slice';
import { AppShell } from '../../components/AppShell/AppShell';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Modal } from '../../components/Modal/Modal';
import { Input } from '../../components/Input/Input';
import { ImportModal } from '../../components/ImportModal/ImportModal';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { MouseTooltip } from '../../components/MouseTooltip/MouseTooltip';
import { KeyboardShortcuts } from '../../components/KeyboardShortcuts/KeyboardShortcuts';
import { PlaylistHealth } from '../../types';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { items: playlists, loading } = useAppSelector((s) => s.playlists);
  const connections = useAppSelector((s) => s.auth.connections);
  const [params] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Mouse-tracking tooltip for truncated playlist names
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const tooltipPosRef = useRef({ x: 0, y: 0 });

  const handleNameEnter = (e: React.MouseEvent<HTMLSpanElement>, name: string) => {
    const el = e.currentTarget;
    if (el.scrollWidth > el.clientWidth) {
      tooltipPosRef.current = { x: e.clientX, y: e.clientY };
      setTooltip({ text: name, x: e.clientX, y: e.clientY });
    }
  };
  const handleNameMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    tooltipPosRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleNameLeave = () => setTooltip(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [oauthError, setOauthError] = useState(params.get('oauth_error') === '1');

  useEffect(() => {
    dispatch(fetchPlaylists());
    dispatch(fetchMe());
  }, [dispatch]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await dispatch(createPlaylist({ name: newName.trim(), description: newDesc.trim() || undefined })).unwrap();
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      toast.success('Playlist created');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const ok = await confirm({
      title: 'Delete playlist?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    dispatch(deletePlaylist(id));
    toast.success('Playlist deleted');
  };

  return (
    <AppShell>
      {oauthError && (
        <div className={styles.alert}>
          Failed to connect platform. Please try again.
          <button onClick={() => setOauthError(false)}>✕</button>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Playlists</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>Import playlist</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New playlist</Button>
        </div>

        {loading && <p className={styles.muted}>Loading...</p>}

        {!loading && playlists.length === 0 && (
          <div className={styles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <p className={styles.emptyTitle}>No playlists yet</p>
            <p className={styles.emptySubtitle}>Create a playlist or import one from Spotify or YouTube Music</p>
            <div className={styles.emptyCtas}>
              <Button size="sm" onClick={() => setShowCreate(true)}>Create playlist</Button>
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>Import</Button>
            </div>
          </div>
        )}

        <div className={styles.playlists}>
          {playlists.map((playlist) => (
            <Link key={playlist.id} to={`/playlists/${playlist.id}`} className={styles.playlistCard}>
              {playlist.coverImage ? (
                <img src={playlist.coverImage} alt="" className={styles.playlistThumb} />
              ) : (
                <div className={styles.playlistThumbPlaceholder}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
              )}
              <div className={styles.playlistInfo}>
                <span
                  className={styles.playlistName}
                  onMouseEnter={(e) => handleNameEnter(e, playlist.name)}
                  onMouseMove={handleNameMove}
                  onMouseLeave={handleNameLeave}
                >
                  {playlist.name}
                </span>
                {playlist.description && (
                  <span className={styles.playlistDesc}>{playlist.description}</span>
                )}
                <div className={styles.playlistMeta}>
                  {playlist.links.filter((l) => l.isActive).map((l) => (
                    <Badge key={l.platform} variant={l.platform === 'SPOTIFY' ? 'primary' : 'danger'}>
                      {l.platform === 'SPOTIFY' ? 'Spotify' : 'YouTube'}
                    </Badge>
                  ))}
                </div>
                {playlist.health && playlist.health.total > 0 && (
                  <HealthBar health={playlist.health} />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeletePlaylist(playlist.id, e)}
              >
                Delete
              </Button>
            </Link>
          ))}
        </div>
      </section>

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        connections={connections}
        onImported={() => { setShowImport(false); dispatch(fetchPlaylists()); toast.info('Importing… tracks will appear shortly'); }}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New playlist">
        <div className={styles.createForm}>
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <Input label="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button loading={creating} onClick={handleCreate}>Create</Button>
        </div>
      </Modal>
      <KeyboardShortcuts onNewPlaylist={() => setShowCreate(true)} />

      {tooltip && (
        <MouseTooltip
          text={tooltip.text}
          initialX={tooltip.x}
          initialY={tooltip.y}
          posRef={tooltipPosRef}
        />
      )}
    </AppShell>
  );
}

function HealthBar({ health }: { health: PlaylistHealth }) {
  const { total, synced, pending, failed } = health;
  const syncedPct = (synced / total) * 100;
  const pendingPct = (pending / total) * 100;
  const failedPct = (failed / total) * 100;

  const label = failed > 0
    ? `${failed} failed`
    : pending > 0
      ? `${pending} syncing`
      : `All synced`;

  return (
    <div className={styles.healthBar} title={`${synced} synced · ${pending} pending · ${failed} failed`}>
      <div className={styles.healthTrack}>
        <div className={styles.healthSynced} style={{ width: `${syncedPct}%` }} />
        <div className={styles.healthPending} style={{ width: `${pendingPct}%` }} />
        <div className={styles.healthFailed} style={{ width: `${failedPct}%` }} />
      </div>
      <span className={styles.healthLabel} style={{
        color: failed > 0 ? 'var(--color-danger)' : pending > 0 ? 'var(--color-warning)' : 'var(--color-success)',
      }}>
        {label}
      </span>
    </div>
  );
}
