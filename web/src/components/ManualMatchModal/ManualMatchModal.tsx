import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../Modal/Modal';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import { searchApi } from '../../api/search.api';
import { Platform, SearchResult } from '../../types';
import styles from './ManualMatchModal.module.css';

interface ManualMatchModalProps {
  open: boolean;
  onClose: () => void;
  platform: Platform;
  trackTitle: string;
  trackArtist: string;
  onMatch: (platformTrackId: string) => Promise<void>;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  SPOTIFY: 'Spotify',
  YOUTUBE: 'YouTube Music',
};

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ManualMatchModal({ open, onClose, platform, trackTitle, trackArtist, onMatch }: ManualMatchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Pre-fill and auto-search when modal opens
  useEffect(() => {
    if (open) {
      const initial = `${trackTitle} ${trackArtist}`.trim();
      setQuery(initial);
      setSelectedId(null);
      setError(null);
      doSearch(initial);
    } else {
      setResults([]);
      setQuery('');
      setSelectedId(null);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.search(q.trim(), 10, 0, undefined, platform);
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [platform]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setSelectedId(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 400);
  };

  const handleApply = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await onMatch(selectedId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Find on ${PLATFORM_LABELS[platform]}`} width={560}>
      <p className={styles.subtitle}>
        Searching for: <strong>{trackTitle}</strong> — <span>{trackArtist}</span>
      </p>

      <Input
        placeholder={`Search ${PLATFORM_LABELS[platform]}…`}
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        autoFocus
      />

      <div className={styles.results}>
        {loading && <div className={styles.center}><Spinner /></div>}
        {!loading && error && <p className={styles.error}>{error}</p>}
        {!loading && !error && results.length === 0 && query.trim() && (
          <p className={styles.empty}>No results found</p>
        )}
        {results.map((r) => {
          const isSelected = selectedId === r.platformTrackId;
          return (
            <div
              key={r.platformTrackId}
              className={[styles.item, isSelected && styles.itemSelected].filter(Boolean).join(' ')}
              onClick={() => setSelectedId(r.platformTrackId)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setSelectedId(r.platformTrackId); }}
            >
              <div className={[styles.radio, isSelected && styles.radioSelected].filter(Boolean).join(' ')} />
              {r.imageUrl && <img src={r.imageUrl} alt="" className={styles.thumb} />}
              <div className={styles.info}>
                <span className={styles.title}>{r.title}</span>
                <span className={styles.artist}>
                  {r.artist}{r.album ? ` · ${r.album}` : ''}
                </span>
              </div>
              {r.durationMs && (
                <span className={styles.duration}>{formatDuration(r.durationMs)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button
          size="sm"
          disabled={!selectedId || saving}
          loading={saving}
          onClick={handleApply}
        >
          Use this match
        </Button>
      </div>
    </Modal>
  );
}
