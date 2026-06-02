import { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from '../Modal/Modal';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import { useAppDispatch, useAppSelector } from '../../store';
import { searchTracks, clearResults } from '../../store/search.slice';
import { tracksApi } from '../../api/tracks.api';
import { SearchResult } from '../../types';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  playlistId: string;
  onTrackAdded: () => void;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function SearchModal({ open, onClose, playlistId, onTrackAdded }: SearchModalProps) {
  const dispatch = useAppDispatch();
  const { results, loading, error } = useAppSelector((s) => s.search);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback(
    (q: string) => {
      clearTimeout(debounceRef.current);
      if (!q.trim()) { dispatch(clearResults()); return; }
      debounceRef.current = setTimeout(() => {
        dispatch(searchTracks({ q: q.trim() }));
      }, 400);
    },
    [dispatch],
  );

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected(new Set());
      setAddError(null);
      dispatch(clearResults());
    }
  }, [open, dispatch]);

  // Clear selection when results change (new search)
  useEffect(() => {
    setSelected(new Set());
  }, [results]);

  const toggleSelect = (r: SearchResult) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(r.platformTrackId)) next.delete(r.platformTrackId);
      else next.add(r.platformTrackId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const toAdd = results.filter((r) => selected.has(r.platformTrackId));
    if (!toAdd.length) return;
    setSubmitting(true);
    setAddError(null);
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
      setAddError(e instanceof Error ? e.message : 'Failed to add tracks');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add tracks" width={600}>
      <Input
        placeholder="Search for songs..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {addError && <p className={styles.error}>{addError}</p>}
      <div className={styles.results}>
        {loading && (
          <div className={styles.center}><Spinner /></div>
        )}
        {!loading && error && <p className={styles.error}>{error}</p>}
        {!loading && results.length === 0 && query.trim() && (
          <p className={styles.empty}>No results found</p>
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
              {r.imageUrl && (
                <img src={r.imageUrl} alt="" className={styles.thumb} />
              )}
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{r.title}</span>
                <span className={styles.itemArtist}>{r.artist}{r.album ? ` · ${r.album}` : ''}</span>
              </div>
              <span className={styles.itemDuration}>{formatDuration(r.durationMs)}</span>
            </div>
          );
        })}
      </div>
      {results.length > 0 && (
        <div className={styles.footer}>
          <span className={styles.footerCount}>
            {selected.size > 0 ? `${selected.size} selected` : 'Click tracks to select'}
          </span>
          <Button
            size="sm"
            disabled={selected.size === 0}
            loading={submitting}
            onClick={handleAddSelected}
          >
            Add {selected.size > 0 ? `${selected.size} track${selected.size > 1 ? 's' : ''}` : 'tracks'}
          </Button>
        </div>
      )}
    </Modal>
  );
}
