import React from 'react';
import { useToastList } from '../../lib/useToast';
import type { Toast }   from '../../lib/useToast';
import { StatusIcon }   from './StatusIcon';
import type { StatusTone } from './StatusIcon';
import './Toast.css';
import { X } from 'lucide-react';

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
        <X size={16} />
      </button>
    </div>
  );
}
