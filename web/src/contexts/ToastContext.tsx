import { createContext, useContext, useRef, useState, ReactNode, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  removing?: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
  success: (message: string) => () => void;
  error: (message: string) => () => void;
  warning: (message: string) => () => void;
  info: (message: string) => () => void;
  loading: (message: string) => () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

function genId() {
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pausedRef = useRef(false);
  const pendingTimers = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
  }, []);

  const clearTimer = useCallback((id: string) => {
    const t = timerRefs.current.get(id);
    if (t) { clearTimeout(t); timerRefs.current.delete(id); }
  }, []);

  const scheduleRemove = useCallback(
    (id: string, delay = AUTO_DISMISS_MS) => {
      clearTimer(id);
      if (pausedRef.current) {
        pendingTimers.current.set(id, delay);
        return;
      }
      timerRefs.current.set(id, setTimeout(() => removeToast(id), delay));
    },
    [clearTimer, removeToast],
  );

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      pendingTimers.current.delete(id);
      removeToast(id);
    },
    [clearTimer, removeToast],
  );

  const add = useCallback(
    (variant: ToastVariant, message: string): (() => void) => {
      const id = genId();
      setToasts((prev) => {
        const next = [...prev, { id, variant, message }];
        if (next.length > MAX_TOASTS) {
          const dropped = next.splice(0, next.length - MAX_TOASTS);
          dropped.forEach((t) => clearTimer(t.id));
        }
        return next;
      });
      if (variant !== 'loading') scheduleRemove(id);
      return () => dismiss(id);
    },
    [clearTimer, dismiss, scheduleRemove],
  );

  const handleMouseEnter = useCallback(() => {
    pausedRef.current = true;
    timerRefs.current.forEach((timer, id) => {
      clearTimeout(timer);
      timerRefs.current.delete(id);
      pendingTimers.current.set(id, AUTO_DISMISS_MS);
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    pausedRef.current = false;
    pendingTimers.current.forEach((delay, id) => {
      scheduleRemove(id, delay);
    });
    pendingTimers.current.clear();
  }, [scheduleRemove]);

  const value: ToastContextValue = {
    toasts,
    dismiss,
    success: (m) => add('success', m),
    error: (m) => add('error', m),
    warning: (m) => add('warning', m),
    info: (m) => add('info', m),
    loading: (m) => add('loading', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {toasts.map((t) => (
        <ToastItemView key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const VARIANT_COLORS: Record<ToastVariant, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  loading: 'var(--color-primary)',
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  loading: '',
};

function ToastItemView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const color = VARIANT_COLORS[toast.variant];
  const icon = VARIANT_ICONS[toast.variant];

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px 10px 0',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-strong)',
        borderLeft: `4px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        minWidth: '280px',
        maxWidth: '380px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        animation: toast.removing
          ? 'toastOut 0.2s ease-in forwards'
          : 'toastIn 0.2s ease-out',
      }}
    >
      <div style={{ width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {toast.variant === 'loading' ? (
          <span
            style={{
              width: '14px',
              height: '14px',
              border: `2px solid ${color}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        ) : (
          <span style={{ color, fontWeight: 700, fontSize: '14px' }}>{icon}</span>
        )}
      </div>
      <span style={{ flex: 1, fontSize: '13px', lineHeight: '1.4', color: 'var(--color-text)' }}>
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontSize: '14px',
          padding: '0 8px',
          lineHeight: 1,
          cursor: 'pointer',
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
      <style>{`
        @keyframes toastIn { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toastOut { to { opacity: 0; transform: translateY(4px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
