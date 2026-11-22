import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import './IconTile.css';

export type IconTileVariant = 'done' | 'current' | 'optional';

interface IconTileProps {
  icon:       LucideIcon;
  /** Absent : neutre (fond --primary-soft). */
  variant?:   IconTileVariant;
  className?: string;
}

/**
 * Pastille d'icône d'une rubrique (design system CX, fiche IconTile) : 48 px, icône de 24 px.
 * Décorative : le statut s'écrit aussi en toutes lettres à côté, la pastille ne suffit pas.
 */
export function IconTile({ icon: Icon, variant, className }: IconTileProps) {
  return (
    <span className={cn('icontile', variant && `icontile--${variant}`, className)} aria-hidden="true">
      <Icon size={24} />
    </span>
  );
}
