import React from 'react';
import { useToastList } from '../../lib/useToast';
import type { Toast }   from '../../lib/useToast';
import { StatusIcon }   from './StatusIcon';
import type { StatusTone } from './StatusIcon';
import './Toast.css';

const TONE: Record<Toast['variant'], StatusTone> = {
  success: 'success',
  error:   'danger',
  warning: 'warning',
  info:    'info',
};

export function ToastContainer() {
  const { toasts, remove } = useToastList();

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={remove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div className={`toast toast--${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'}>
      <StatusIcon tone={TONE[toast.variant]} className="toast__icon" />
      <span className="toast__message">{toast.message}</span>
      <button type="button" className="toast__dismiss" onClick={() => onDismiss(toast.id)} aria-label="Fermer">
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="11" y1="1" x2="1"  y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
