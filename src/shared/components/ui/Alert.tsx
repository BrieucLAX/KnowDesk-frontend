import React from 'react';
import { cn } from '../../lib/cn';
import { StatusIcon, type StatusTone } from './StatusIcon';
import './Alert.css';

interface AlertProps {
  tone:       StatusTone;
  /** Par défaut : `alert` pour une erreur, `status` sinon (fiche Alert). `note` pour un avis permanent. */
  role?:      'status' | 'alert' | 'note';
  className?: string;
  children:   React.ReactNode;
}

/**
 * Encart d'alerte (fiche Alert du design system CX) : fond *-soft, texte
 * --ink, seule l'icône de 20 px prend la couleur d'état. Pas de bordure.
 */
export function Alert({ tone, role, className, children }: AlertProps) {
  return (
    <div className={cn('alert', `alert--${tone}`, className)} role={role ?? (tone === 'danger' ? 'alert' : 'status')}>
      <StatusIcon tone={tone} className="alert__icon" />
      <div className="alert__body">{children}</div>
    </div>
  );
}
