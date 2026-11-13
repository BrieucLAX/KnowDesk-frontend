import React from 'react';
import './StatusBadge.css';

type Status = 'draft' | 'published' | 'archived';

interface StatusBadgeProps {
  status: Status;
}

// Correspondance statut → variante de la fiche Badge : publié = success,
// brouillon et archivé = neutral (états sans enjeu).
// TODO(lot 4, icônes) : icône de 14 px devant les statuts success / warning /
// danger, quand lucide-react sera installé.
const CONFIG: Record<Status, { label: string; className: string }> = {
  published: { label: 'Publié',    className: 'badge badge--success' },
  draft:     { label: 'Brouillon', className: 'badge badge--neutral' },
  archived:  { label: 'Archivé',   className: 'badge badge--neutral' },
};

/**
 * Status badge — always shows text alongside color.
 * Never uses color alone to convey meaning (a11y rule).
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = CONFIG[status];
  return <span className={className}>{label}</span>;
}
