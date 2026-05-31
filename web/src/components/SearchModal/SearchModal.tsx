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
  const [adding, setAdding] = useState<string | null>(null);
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
      setAddError(null);
      dispatch(clearResults());
    }
  }, [open, dispatch]);

  const handleAdd = async (result: SearchResult) => {
    setAdding(result.platformTrackId);
    setAddError(null);
    try {
      await tracksApi.add(playlistId, {
        title: result.title,
        artist: result.artist,
        album: result.album,
        isrc: result.isrc,
        durationMs: result.durationMs,
        spotifyTrackId: result.platformTrackId,
      });
      onTrackAdded();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add track');
    } finally {
      setAdding(null);
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
        {results.map((r) => (
          <div key={r.platformTrackId} className={styles.item}>
            {r.imageUrl && (
              <img src={r.imageUrl} alt="" className={styles.thumb} />
            )}
            <div className={styles.itemInfo}>
              <span className={styles.itemTitle}>{r.title}</span>
              <span className={styles.itemArtist}>{r.artist} · {r.album}</span>
            </div>
            <span className={styles.itemDuration}>{formatDuration(r.durationMs)}</span>
            <Button
              size="sm"
              loading={adding === r.platformTrackId}
              onClick={() => handleAdd(r)}
            >
              Add
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
