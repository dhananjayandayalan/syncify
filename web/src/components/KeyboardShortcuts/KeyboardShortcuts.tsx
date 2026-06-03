import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import styles from './KeyboardShortcuts.module.css';

interface ShortcutAction {
  key: string;
  description: string;
  action: () => void;
}

interface KeyboardShortcutsProps {
  onNewPlaylist?: () => void;
  onSearch?: () => void;
  onSync?: () => void;
}

const SHORTCUT_DOCS = [
  { key: 'N', description: 'New playlist' },
  { key: '/', description: 'Search tracks (on playlist page)' },
  { key: 'S', description: 'Sync now (on playlist page)' },
  { key: 'G D', description: 'Go to Dashboard' },
  { key: '?', description: 'Show / hide this panel' },
  { key: 'Esc', description: 'Close any modal or panel' },
];

export function KeyboardShortcuts({ onNewPlaylist, onSearch, onSync }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [gPressed, setGPressed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      // ? toggles the help overlay (always)
      if (e.key === '?' && !isEditing) {
        setShowHelp((v) => !v);
        return;
      }

      if (e.key === 'Escape') {
        setShowHelp(false);
        setGPressed(false);
        return;
      }

      if (isEditing) return;

      // G-chord navigation
      if (e.key === 'g' || e.key === 'G') {
        setGPressed(true);
        setTimeout(() => setGPressed(false), 1000);
        return;
      }
      if (gPressed) {
        if (e.key === 'd' || e.key === 'D') navigate('/');
        setGPressed(false);
        return;
      }

      // Single-key shortcuts
      if (e.key === 'n' || e.key === 'N') onNewPlaylist?.();
      if (e.key === '/' || e.key === 'f' || e.key === 'F') { e.preventDefault(); onSearch?.(); }
      if (e.key === 's' || e.key === 'S') onSync?.();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gPressed, navigate, onNewPlaylist, onSearch, onSync]);

  if (!showHelp) return null;

  return createPortal(
    <div className={styles.overlay} onClick={() => setShowHelp(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Keyboard shortcuts</span>
          <button className={styles.closeBtn} onClick={() => setShowHelp(false)}>✕</button>
        </div>
        <div className={styles.list}>
          {SHORTCUT_DOCS.map((s) => (
            <div key={s.key} className={styles.row}>
              <div className={styles.keys}>
                {s.key.split(' ').map((k) => (
                  <kbd key={k} className={styles.kbd}>{k}</kbd>
                ))}
              </div>
              <span className={styles.desc}>{s.description}</span>
            </div>
          ))}
        </div>
        <p className={styles.hint}>Press <kbd className={styles.kbd}>?</kbd> anytime to toggle this panel</p>
      </div>
    </div>,
    document.body,
  );
}
