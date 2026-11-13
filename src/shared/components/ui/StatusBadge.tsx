import React from 'react';
import { StatusIcon, type StatusTone } from './StatusIcon';
import './StatusBadge.css';

type Status = 'draft' | 'published' | 'archived';

interface StatusBadgeProps {
  status: Status;
}

// Correspondance statut → variante de la fiche Badge : publié = success,
// brouillon et archivé = neutral (états sans enjeu). Les variantes success,
// warning et danger portent une icône de 14 px (fiche Badge).
const CONFIG: Record<Status, { label: string; className: string; tone?: StatusTone }> = {
  published: { label: 'Publié',    className: 'badge badge--success', tone: 'success' },
  draft:     { label: 'Brouillon', className: 'badge badge--neutral' },
  archived:  { label: 'Archivé',   className: 'badge badge--neutral' },
};

/**
 * Status badge — always shows text alongside color.
 * Never uses color alone to convey meaning (a11y rule).
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className, tone } = CONFIG[status];
  return (
    <span className={className}>
      {tone && <StatusIcon tone={tone} size={14} className="badge__icon" />}
      {label}
    </span>
  );
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  tone:      BadgeTone;
  title?:    string;
  children:  React.ReactNode;
}

/**
 * Badge d'état générique (fiche Badge) : les variantes success, warning et
 * danger portent leur icône de 14 px ; neutral, info et primary n'en ont pas.
 */
export function Badge({ tone, title, children }: BadgeProps) {
  const icon = tone === 'success' || tone === 'warning' || tone === 'danger' ? tone : null;
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {icon && <StatusIcon tone={icon} size={14} className="badge__icon" />}
      {children}
    </span>
  );
}
