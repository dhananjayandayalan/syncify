import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import styles from './DevPanel.module.css';

// Visible when running `vite dev` OR when manually enabled in any env via localStorage.
// To enable on staging: open browser console and run: localStorage.setItem('syncify-devtools', 'true')
const isEnabled = import.meta.env.DEV || localStorage.getItem('syncify-devtools') === 'true';

interface QueueCounts { waiting: number; active: number; completed: number; failed: number; delayed: number }
interface JobSummary { id?: string; playlistId: string; triggeredBy: string; reason?: string; attemptsMade?: number; failedAt?: string | null; startedAt?: string | null; addedAt?: string | null }
interface ErrorLog { id: string; platform: string; status: string; message: string | null; trackTitle: string | null; trackArtist: string | null; triggeredBy: string; createdAt: string; playlist: { id: string; name: string } }
interface Diagnostics {
  queue: { counts: QueueCounts; active: JobSummary[]; waiting: JobSummary[]; failed: JobSummary[] };
  errorLogs: ErrorLog[];
  platforms: { connections: Array<{ platform: string; total: number }>; expiringSoon: Array<{ platform: string; expiresAt: string }> };
}

type Tab = 'queue' | 'errors' | 'platforms';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('queue');
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Diagnostics>('/api/v1/dev/diagnostics');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
      intervalRef.current = setInterval(fetchData, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [open]);

  const handleRetryAll = async () => {
    setRetrying(true);
    try {
      await api.post('/api/v1/dev/retry-failed', {});
      await fetchData();
    } finally {
      setRetrying(false);
    }
  };

  const handleClearFailed = async () => {
    await api.delete('/api/v1/dev/failed-jobs');
    await fetchData();
  };

  if (!isEnabled) return null;

  const counts = data?.queue.counts;
  const hasFailed = (counts?.failed ?? 0) > 0;
  const hasActive = (counts?.active ?? 0) > 0;

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={[styles.trigger, hasFailed ? styles.triggerAlert : hasActive ? styles.triggerActive : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen((o) => !o)}
        title="Syncify DevTools"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z" />
          <line x1="12" y1="12" x2="12" y2="16" />
        </svg>
        DevTools
        {hasFailed && <span className={styles.badge}>{counts!.failed}</span>}
      </button>

      {/* Panel drawer */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
              DevTools
            </span>
            <div className={styles.headerRight}>
              {loading && <span className={styles.refreshing}>↻</span>}
              <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          <div className={styles.tabs}>
            {(['queue', 'errors', 'platforms'] as Tab[]).map((t) => (
              <button
                key={t}
                className={[styles.tab, tab === t && styles.tabActive].filter(Boolean).join(' ')}
                onClick={() => setTab(t)}
              >
                {t === 'queue' && (hasFailed ? '🔴 ' : hasActive ? '🟡 ' : '🟢 ')}
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'errors' && data && data.errorLogs.length > 0 && (
                  <span className={styles.tabBadge}>{data.errorLogs.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.body}>
            {error && <div className={styles.errorBanner}>{error}</div>}
            {!data && !error && <div className={styles.loading}>Loading diagnostics…</div>}

            {data && tab === 'queue' && (
              <div className={styles.section}>
                <div className={styles.counters}>
                  <Stat label="Active" value={counts!.active} color={counts!.active > 0 ? 'yellow' : 'dim'} />
                  <Stat label="Waiting" value={counts!.waiting} color={counts!.waiting > 0 ? 'yellow' : 'dim'} />
                  <Stat label="Failed" value={counts!.failed} color={counts!.failed > 0 ? 'red' : 'dim'} />
                  <Stat label="Done" value={counts!.completed} color="green" />
                </div>

                {data.queue.active.length > 0 && (
                  <>
                    <div className={styles.sectionLabel}>Running</div>
                    {data.queue.active.map((j) => (
                      <JobRow key={j.id} job={j} variant="active" />
                    ))}
                  </>
                )}

                {data.queue.waiting.length > 0 && (
                  <>
                    <div className={styles.sectionLabel}>Queued</div>
                    {data.queue.waiting.map((j) => (
                      <JobRow key={j.id} job={j} variant="waiting" />
                    ))}
                  </>
                )}

                {data.queue.failed.length > 0 && (
                  <>
                    <div className={styles.sectionLabelRow}>
                      <span className={styles.sectionLabel}>Failed jobs</span>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} onClick={handleRetryAll} disabled={retrying}>
                          {retrying ? '…' : 'Retry all'}
                        </button>
                        <button className={styles.actionBtnDanger} onClick={handleClearFailed}>
                          Clear
                        </button>
                      </div>
                    </div>
                    {data.queue.failed.map((j) => (
                      <JobRow key={j.id} job={j} variant="failed" />
                    ))}
                  </>
                )}

                {data.queue.failed.length === 0 && data.queue.active.length === 0 && data.queue.waiting.length === 0 && (
                  <p className={styles.empty}>Queue is healthy ✓</p>
                )}
              </div>
            )}

            {data && tab === 'errors' && (
              <div className={styles.section}>
                {data.errorLogs.length === 0 ? (
                  <p className={styles.empty}>No errors in recent sync history ✓</p>
                ) : (
                  data.errorLogs.map((log) => (
                    <div key={log.id} className={styles.logEntry}>
                      <div className={styles.logHeader}>
                        <span className={[styles.logStatus, log.status === 'FAILED' ? styles.statusFailed : styles.statusNotFound].join(' ')}>
                          {log.status}
                        </span>
                        <span className={styles.logPlatform}>{log.platform}</span>
                        <span className={styles.logTime}>{timeAgo(log.createdAt)}</span>
                      </div>
                      {log.trackTitle && (
                        <div className={styles.logTrack}>{log.trackTitle} — {log.trackArtist}</div>
                      )}
                      <div className={styles.logPlaylist}>
                        Playlist: <span>{log.playlist.name}</span>
                      </div>
                      {log.message && (
                        <div className={styles.logMessage}>{log.message}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {data && tab === 'platforms' && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Connected accounts</div>
                {data.platforms.connections.length === 0 ? (
                  <p className={styles.empty}>No platform connections</p>
                ) : (
                  data.platforms.connections.map((c) => (
                    <div key={c.platform} className={styles.platformRow}>
                      <span className={styles.platformDot} style={{ background: c.platform === 'SPOTIFY' ? 'var(--color-spotify)' : 'var(--color-youtube)' }} />
                      <span className={styles.platformName}>{c.platform}</span>
                      <span className={styles.platformCount}>{c.total} user{c.total !== 1 ? 's' : ''}</span>
                    </div>
                  ))
                )}

                {data.platforms.expiringSoon.length > 0 && (
                  <>
                    <div className={styles.sectionLabel} style={{ marginTop: 16, color: 'var(--color-warning)' }}>
                      ⚠ Tokens expiring soon
                    </div>
                    {data.platforms.expiringSoon.map((c, i) => (
                      <div key={i} className={styles.expiryRow}>
                        <span>{c.platform}</span>
                        <span className={styles.expiryTime}>
                          {new Date(c.expiresAt) < new Date() ? 'Expired' : `Expires ${timeAgo(c.expiresAt)}`}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className={styles.panelFooter}>
            Auto-refreshes every 5s · <button className={styles.refreshBtn} onClick={fetchData}>Refresh now</button>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'red' | 'yellow' | 'green' | 'dim' }) {
  const colors = { red: 'var(--color-danger)', yellow: 'var(--color-warning)', green: 'var(--color-success)', dim: 'var(--color-text-subtle)' };
  return (
    <div className={styles.stat}>
      <span className={styles.statValue} style={{ color: colors[color] }}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function JobRow({ job, variant }: { job: JobSummary; variant: 'active' | 'waiting' | 'failed' }) {
  const variantStyle = variant === 'failed' ? styles.jobFailed : variant === 'active' ? styles.jobActive : styles.jobWaiting;
  return (
    <div className={[styles.jobRow, variantStyle].join(' ')}>
      <div className={styles.jobId}>{job.id ?? job.playlistId.slice(0, 12)}</div>
      <div className={styles.jobMeta}>
        <span>{job.triggeredBy}</span>
        {variant === 'failed' && job.failedAt && <span>· failed {timeAgo(job.failedAt)}</span>}
        {variant === 'active' && job.startedAt && <span>· started {timeAgo(job.startedAt)}</span>}
        {variant === 'waiting' && job.addedAt && <span>· queued {timeAgo(job.addedAt)}</span>}
        {variant === 'failed' && job.attemptsMade != null && <span>· {job.attemptsMade} attempt{job.attemptsMade !== 1 ? 's' : ''}</span>}
      </div>
      {job.reason && <div className={styles.jobReason}>{job.reason}</div>}
    </div>
  );
}
