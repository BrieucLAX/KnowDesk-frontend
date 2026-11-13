import React from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

/** Un picto par état, le même partout (docs/design-system/icons). */
export const STATUS_ICONS: Record<StatusTone, LucideIcon> = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger:  CircleAlert,
  info:    Info,
};

interface StatusIconProps {
  tone:       StatusTone;
  /** 20 px dans les encarts (fiche Alert), 16 px dans le texte, 14 px dans un badge. */
  size?:      number;
  className?: string;
}

/**
 * Icône d'état des encarts (toast, bandeaux) et des badges, en `currentColor` :
 * la couleur vient de la classe de l'encart (seule l'icône est colorée, fiche Alert).
 * Décorative : l'encart porte toujours un texte.
 */
export function StatusIcon({ tone, size = 20, className }: StatusIconProps) {
  const Icon = STATUS_ICONS[tone];
  return <Icon className={className} size={size} aria-hidden="true" focusable="false" />;
}
