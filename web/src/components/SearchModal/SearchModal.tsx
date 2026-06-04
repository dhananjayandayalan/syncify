import { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from '../Modal/Modal';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import { searchApi } from '../../api/search.api';
import { tracksApi } from '../../api/tracks.api';
import { Platform, PlatformConnection, SearchResult } from '../../types';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  playlistId: string;
  connections: PlatformConnection[];
  onTrackAdded: () => void;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
  APPLE_MUSIC: 'Apple Music',
};

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function SearchModal({ open, onClose, playlistId, connections, onTrackAdded }: SearchModalProps) {
  const connectedPlatforms = new Set(connections.map((c) => c.platform));
  const defaultPlatform: Platform = connectedPlatforms.has('SPOTIFY')
    ? 'SPOTIFY'
    : connectedPlatforms.has('YOUTUBE')
    ? 'YOUTUBE'
    : 'APPLE_MUSIC';

  const [platform, setPlatform] = useState<Platform>(defaultPlatform);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string, p: Platform) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.search(q.trim(), 20, 0, undefined, p);
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleSearch = useCallback((q: string, p: Platform) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(q, p), 400);
  }, [doSearch]);

  useEffect(() => { scheduleSearch(query, platform); }, [query, platform, scheduleSearch]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(new Set());
      setError(null);
      setPlatform(defaultPlatform);
    }
  }, [open]);

  useEffect(() => { setSelected(new Set()); }, [results]);

  const toggleSelect = (r: SearchResult) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(r.platformTrackId) ? next.delete(r.platformTrackId) : next.add(r.platformTrackId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const toAdd = results.filter((r) => selected.has(r.platformTrackId));
    if (!toAdd.length) return;
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        toAdd.map((r) =>
          tracksApi.add(playlistId, {
            title: r.title,
            artist: r.artist,
            album: r.album,
            isrc: r.isrc,
            durationMs: r.durationMs,
            spotifyTrackId: r.platformTrackId,
          }),
        ),
      );
      onTrackAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add tracks');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlatformSwitch = (p: Platform) => {
    setPlatform(p);
    setResults([]);
    setSelected(new Set());
  };

  return (
    <Modal open={open} onClose={onClose} title="Add tracks" width={600}>
      {/* Platform toggle */}
      <div className={styles.platformTabs}>
        {(['SPOTIFY', 'YOUTUBE'] as Platform[]).map((p) => {
          const connected = connectedPlatforms.has(p);
          return (
            <button
              key={p}
              className={[styles.platformTab, platform === p && styles.platformTabActive, !connected && styles.platformTabDisabled].filter(Boolean).join(' ')}
              onClick={() => connected && handlePlatformSwitch(p)}
              disabled={!connected}
              title={!connected ? `Connect ${PLATFORM_LABELS[p]} to search` : undefined}
            >
              {PLATFORM_LABELS[p]}
              {!connected && <span className={styles.platformTabHint}> (not connected)</span>}
            </button>
          );
        })}
      </div>

      <Input
        placeholder={`Search on ${PLATFORM_LABELS[platform]}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.results}>
        {loading && <div className={styles.center}><Spinner /></div>}
        {!loading && !error && results.length === 0 && query.trim() && (
          <p className={styles.empty}>No results found on {PLATFORM_LABELS[platform]}</p>
        )}
        {results.map((r) => {
          const isSelected = selected.has(r.platformTrackId);
          return (
            <div
              key={r.platformTrackId}
              className={[styles.item, isSelected && styles.itemSelected].filter(Boolean).join(' ')}
              onClick={() => toggleSelect(r)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') toggleSelect(r); }}
            >
              <div className={[styles.checkbox, isSelected && styles.checkboxChecked].filter(Boolean).join(' ')}>
                {isSelected && <span className={styles.checkmark}>✓</span>}
              </div>
              {r.imageUrl && <img src={r.imageUrl} alt="" className={styles.thumb} />}
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{r.title}</span>
                <span className={styles.itemArtist}>{r.artist}{r.album ? ` · ${r.album}` : ''}</span>
              </div>
              {r.durationMs && <span className={styles.itemDuration}>{formatDuration(r.durationMs)}</span>}
            </div>
          );
        })}
      </div>
      {results.length > 0 && (
        <div className={styles.footer}>
          <span className={styles.footerCount}>
            {selected.size > 0 ? `${selected.size} selected` : 'Click tracks to select'}
          </span>
          <Button size="sm" disabled={selected.size === 0} loading={submitting} onClick={handleAddSelected}>
            Add {selected.size > 0 ? `${selected.size} track${selected.size > 1 ? 's' : ''}` : 'tracks'}
          </Button>
        </div>
      )}
    </Modal>
  );
}
