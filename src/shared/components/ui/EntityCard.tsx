import React from 'react';
import './EntityCard.css';

interface EntityCardProps {
  /** Slot haut : badges (StatusBadge + chip catégorie + etc.) */
  badges?:      React.ReactNode;
  /** Titre principal h3 */
  title:        React.ReactNode;
  /** Description multi-lignes (optionnelle) */
  description?: React.ReactNode;
  /** Méta basse, gris clair (ex: « Modifié il y a 3 jours ») */
  meta?:        React.ReactNode;
  /** Actions admin (ex: Modifier / Aperçu / Publier / Supprimer) —
   *  rangée en bas, ne déclenche pas onClick principal. */
  actions?:     React.ReactNode;
  /** Clic sur la zone principale (ouverture du détail). */
  onClick?:     () => void;
  ariaLabel?:   string;
  className?:   string;
}

/**
 * Card riche pour entités avec description multi-lignes ET actions admin.
 * Utilisée pour les Processus guidés. Pour des entrées de liste denses
 * (1 ligne titre + 1 ligne meta), utiliser `<EntityRow>` à la place.
 */
export function EntityCard({
  badges, title, description, meta, actions, onClick, ariaLabel, className,
}: EntityCardProps) {
  return (
    <article
      className={`entity-card${onClick ? ' entity-card--clickable' : ''}${className ? ' ' + className : ''}`}
      aria-label={ariaLabel}
    >
      <div
        className={`entity-card__main${onClick ? ' entity-card__main--clickable' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }) : undefined}
      >
        {badges && <div className="entity-card__badges">{badges}</div>}
        <h3 className="entity-card__title">{title}</h3>
        {description && <p className="entity-card__description">{description}</p>}
        {meta && <div className="entity-card__meta">{meta}</div>}
      </div>
      {actions && (
        <div
          className="entity-card__actions"
          onClick={e => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </article>
  );
}
