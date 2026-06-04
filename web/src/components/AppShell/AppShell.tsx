import { ReactNode, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { DevPanel } from '../DevPanel/DevPanel';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout, removeConnection } from '../../store/auth.slice';
import { createPlaylist } from '../../store/playlists.slice';
import { authApi } from '../../api/auth.api';
import { Button } from '../Button/Button';
import { Modal } from '../Modal/Modal';
import { Input } from '../Input/Input';
import { Platform } from '../../types';
import styles from './AppShell.module.css';

const BASE_PLATFORMS: Platform[] = ['SPOTIFY', 'YOUTUBE'];
const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
  APPLE_MUSIC: 'Apple Music',
};
const PLATFORM_COLOR: Record<Platform, string> = {
  SPOTIFY: 'var(--color-spotify)',
  YOUTUBE: 'var(--color-youtube)',
  APPLE_MUSIC: 'var(--color-apple-music)',
};

export function AppShell({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const connections = useAppSelector((s) => s.auth.connections);
  const appleMusicEnabled = useAppSelector((s) => s.auth.appleMusicEnabled);
  const playlists = useAppSelector((s) => s.playlists.items);
  const platforms: Platform[] = appleMusicEnabled ? [...BASE_PLATFORMS, 'APPLE_MUSIC'] : BASE_PLATFORMS;

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const handleConnect = async (platform: Platform) => {
    try {
      if (platform === 'APPLE_MUSIC') {
        await connectAppleMusic();
        return;
      }
      const data =
        platform === 'SPOTIFY'
          ? await authApi.getSpotifyAuthUrl()
          : await authApi.getYoutubeAuthUrl();
      window.location.href = data.url;
    } catch {
      // ignore
    }
  };

  const connectAppleMusic = async () => {
    const { developerToken } = await authApi.getAppleMusicDeveloperToken();

    // Load MusicKit JS on demand from Apple CDN
    if (!window.MusicKit) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MusicKit JS'));
        document.head.appendChild(script);
      });
    }

    await window.MusicKit.configure({
      developerToken,
      app: { name: 'Syncify', build: '1.0.0' },
    });

    const musicUserToken = await window.MusicKit.getInstance().authorize();
    await authApi.connectAppleMusic(musicUserToken);
    // Refresh connections from server
    window.location.reload();
  };

  const handleDisconnect = async (platform: Platform) => {
    try {
      await authApi.disconnectPlatform(platform);
      dispatch(removeConnection(platform));
    } catch {
      // ignore
    }
  };

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

  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.logo}>Syncify</Link>

        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => [styles.navItem, isActive ? styles.navActive : ''].join(' ')}>
            Dashboard
          </NavLink>
        </nav>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Playlists</span>
          <div className={styles.playlistList}>
            {playlists.map((p) => (
              <NavLink
                key={p.id}
                to={`/playlists/${p.id}`}
                className={({ isActive }) => [styles.playlistItem, isActive ? styles.navActive : ''].join(' ')}
                title={p.name}
              >
                {p.name}
              </NavLink>
            ))}
          </div>
          <button className={styles.newBtn} onClick={() => setShowCreate(true)}>+ New</button>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionLabel}>Platforms</span>
          {platforms.map((p) => {
            const connected = connectedPlatforms.has(p);
            return (
              <button
                key={p}
                className={styles.platformRow}
                onClick={() => connected ? handleDisconnect(p) : handleConnect(p)}
                title={connected ? `Disconnect ${PLATFORM_LABELS[p]}` : `Connect ${PLATFORM_LABELS[p]}`}
              >
                <span
                  className={styles.dot}
                  style={{ background: connected ? PLATFORM_COLOR[p] : 'var(--color-text-subtle)' }}
                />
                <span className={styles.platformName}>{PLATFORM_LABELS[p]}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          {user && <span className={styles.userName}>{user.name}</span>}
          <button className={styles.signOutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
      <DevPanel />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New playlist">
        <div className={styles.createForm}>
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <Input label="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button loading={creating} onClick={handleCreate}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}
