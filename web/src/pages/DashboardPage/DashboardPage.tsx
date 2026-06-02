import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchPlaylists, deletePlaylist } from '../../store/playlists.slice';
import { fetchMe } from '../../store/auth.slice';
import { AppShell } from '../../components/AppShell/AppShell';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { ImportModal } from '../../components/ImportModal/ImportModal';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { items: playlists, loading } = useAppSelector((s) => s.playlists);
  const connections = useAppSelector((s) => s.auth.connections);
  const [params] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();

  const [showImport, setShowImport] = useState(false);
  const [oauthError, setOauthError] = useState(params.get('oauth_error') === '1');

  useEffect(() => {
    dispatch(fetchPlaylists());
    dispatch(fetchMe());
  }, [dispatch]);

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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
              )}
              <div className={styles.playlistInfo}>
                <span className={styles.playlistName}>{playlist.name}</span>
                {playlist.description && (
                  <span className={styles.playlistDesc}>{playlist.description}</span>
                )}
                <div className={styles.playlistLinks}>
                  {playlist.links.map((l) => (
                    <Badge key={l.platform} variant={l.isActive ? 'primary' : 'muted'}>
                      {l.platform === 'SPOTIFY' ? 'Spotify' : 'YouTube'}
                    </Badge>
                  ))}
                </div>
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
        onImported={() => {
          setShowImport(false);
          dispatch(fetchPlaylists());
          toast.info('Importing… tracks will appear shortly');
        }}
      />
    </AppShell>
  );
}
