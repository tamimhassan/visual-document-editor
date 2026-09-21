'use client';

import { AlertTriangle, CheckCircle2, TriangleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'warning' | 'error';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Auto-dismiss delay: long enough to read, short enough not to nag. */
const TOAST_DURATION_MS = 3500;

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; text: string; icon: ReactNode }
> = {
  success: {
    border: 'border-brand-200',
    text: 'text-ink-800',
    icon: <CheckCircle2 size={15} className="shrink-0 text-brand-600" />,
  },
  warning: {
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: <TriangleAlert size={15} className="shrink-0 text-amber-500" />,
  },
  error: {
    border: 'border-red-200',
    text: 'text-red-600',
    icon: <AlertTriangle size={15} className="shrink-0 text-red-500" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success'): void => {
      const id = nextId.current;
      nextId.current += 1;
      // Quick successive actions stack rather than replace each other.
      setToasts((current) => [...current, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((toast) => {
          const styles = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={`toast-in pointer-events-auto flex items-center gap-2 rounded-lg border bg-white
                px-3 py-2.5 text-[13px] shadow-lg ${styles.border} ${styles.text}`}
            >
              {styles.icon}
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-0.5 text-ink-400 transition hover:text-ink-800"
                onClick={() => dismiss(toast.id)}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
