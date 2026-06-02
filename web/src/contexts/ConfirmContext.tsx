import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { Modal } from '../components/Modal/Modal';
import { Button } from '../components/Button/Button';
import styles from '../components/ConfirmDialog/ConfirmDialog.module.css';

export interface ConfirmProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}

type ConfirmContextValue = (props: ConfirmProps) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmProps & { open: boolean }) | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((props: ConfirmProps): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...props, open: true });
    });
  }, []);

  const handleResolve = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal open={state.open} onClose={() => handleResolve(false)} title={state.title} width={400}>
          <div className={styles.body}>
            {state.message && <p className={styles.message}>{state.message}</p>}
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => handleResolve(false)}>
                Cancel
              </Button>
              <Button
                variant={state.variant === 'danger' ? 'danger' : 'primary'}
                onClick={() => handleResolve(true)}
              >
                {state.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
