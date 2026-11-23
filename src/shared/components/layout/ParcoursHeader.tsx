import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/cn';
import './ParcoursHeader.css';

interface ParcoursHeaderProps {
  /** Le titre `display` : le nom de l'étape ou de l'écran, un seul par écran. */
  title:      React.ReactNode;
  /** Le contexte en petites capitales (nom du projet). */
  eyebrow?:   React.ReactNode;
  /** Une phrase qui dit ce que l'utilisateur fait sur l'écran. */
  lead?:      React.ReactNode;
  /** Le lien de retour (« Tous les projets »). */
  back?:      { label: string; onClick: () => void };
  /** Un Stepper suit et chevauche le bandeau. */
  overlap?:   boolean;
  className?: string;
}

/**
 * En-tête d'un écran de parcours (design system CX, fiche PageHeader) : bandeau --primary avec le
 * retour, l'eyebrow, le titre et une phrase d'introduction. Jamais de bouton d'action dans le
 * bandeau : l'action principale est dans la barre d'action.
 */
export function ParcoursHeader({ title, eyebrow, lead, back, overlap = false, className }: ParcoursHeaderProps) {
  return (
    <header className={cn('parcours-head', overlap && 'parcours-head--overlap', className)}>
      {back && (
        <button type="button" className="parcours-head__back" onClick={back.onClick}>
          <ArrowLeft size={16} aria-hidden="true" />{back.label}
        </button>
      )}
      {eyebrow && <p className="parcours-head__eyebrow">{eyebrow}</p>}
      <h1 className="parcours-head__title">{title}</h1>
      {lead && <p className="parcours-head__lead">{lead}</p>}
    </header>
  );
}
