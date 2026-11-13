import React from 'react';
import type { SaveStatus } from '../types';
import { Check } from 'lucide-react';

interface SaveIndicatorProps {
  status:      SaveStatus;
  lastSavedAt: Date | null;
}

const CONFIG: Record<SaveStatus, { text: string; className: string }> = {
  idle:    { text: '',                        className: '' },
  saving:  { text: 'Sauvegarde…',             className: 'save-indicator--saving'  },
  saved:   { text: 'Sauvegardé',              className: 'save-indicator--saved'   },
  error:   { text: 'Échec de la sauvegarde',  className: 'save-indicator--error'   },
  offline: { text: 'Hors ligne — contenu conservé localement', className: 'save-indicator--offline' },
};

export function SaveIndicator({ status, lastSavedAt }: SaveIndicatorProps) {
  const { text, className } = CONFIG[status];

  if (status === 'idle' && !lastSavedAt) return null;

  const label = status === 'idle' && lastSavedAt
    ? `Sauvegardé à ${lastSavedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : text;

  return (
    <span
      className={`save-indicator ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {status === 'saving' && <span className="save-indicator__spinner" aria-hidden="true" />}
      {status === 'saved'  && <Check size={16} className="save-indicator__check" aria-hidden="true" />}
      {label}
    </span>
  );
}
