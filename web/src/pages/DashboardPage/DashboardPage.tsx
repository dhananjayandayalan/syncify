import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchPlaylists, createPlaylist, deletePlaylist } from '../../store/playlists.slice';
import { fetchMe, removeConnection } from '../../store/auth.slice';
import { authApi } from '../../api/auth.api';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { Input } from '../../components/Input/Input';
import { PlatformCard } from '../../components/PlatformCard/PlatformCard';
import { Badge } from '../../components/Badge/Badge';
import { ImportModal } from '../../components/ImportModal/ImportModal';
import { Platform } from '../../types';
import styles from './DashboardPage.module.css';

const PLATFORMS: Platform[] = ['SPOTIFY', 'YOUTUBE'];

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { items: playlists, loading } = useAppSelector((s) => s.playlists);
  const connections = useAppSelector((s) => s.auth.connections);
  const [params] = useSearchParams();

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (platform: Platform) => {
    try {
      const data =
        platform === 'SPOTIFY'
          ? await authApi.getSpotifyAuthUrl()
          : await authApi.getYoutubeAuthUrl();
      window.location.href = data.url;
    } catch {
      // ignore
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    try {
      await authApi.disconnectPlatform(platform);
      dispatch(removeConnection(platform));
    } catch {
      // ignore
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this playlist?')) return;
    dispatch(deletePlaylist(id));
  };

  const getConnectionForPlatform = (platform: Platform) =>
    connections.find((c) => c.platform === platform);

  return (
    <Layout>
      {oauthError && (
        <div className={styles.alert}>
          Failed to connect platform. Please try again.
          <button onClick={() => setOauthError(false)}>✕</button>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Connected Platforms</h2>
        <div className={styles.platforms}>
          {PLATFORMS.map((p) => (
            <PlatformCard
              key={p}
              platform={p}
              connection={getConnectionForPlatform(p)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Playlists</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>Import playlist</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New playlist</Button>
        </div>

        {loading && <p className={styles.muted}>Loading...</p>}

        {!loading && playlists.length === 0 && (
          <p className={styles.muted}>No playlists yet. Create one to get started.</p>
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
                <span className={styles.playlistName}>{playlist.name}</span>
                {playlist.description && (
                  <span className={styles.playlistDesc}>{playlist.description}</span>
                )}
              </div>
              <div className={styles.playlistLinks}>
                {playlist.links.map((l) => (
                  <Badge key={l.platform} variant={l.isActive ? 'primary' : 'muted'}>
                    {l.platform === 'SPOTIFY' ? 'Spotify' : 'YouTube'}
                  </Badge>
                ))}
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
        onImported={() => { setShowImport(false); dispatch(fetchPlaylists()); }}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New playlist">
        <div className={styles.createForm}>
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <Input label="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button loading={creating} onClick={handleCreate}>Create</Button>
        </div>
      </Modal>
    </Layout>
  );
}
