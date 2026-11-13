import React from 'react';
import './EmptyState.css';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  title:       string;
  description: string;
  /** Action de création : le bouton porte l'icône `plus`. */
  ctaLabel?:   string;
  ctaHref?:    string;
  onCta?:      () => void;
}

export function EmptyState({ title, description, ctaLabel, ctaHref, onCta }: EmptyStateProps) {
  return (
    <div className="empty-state" role="region" aria-label={title}>
      <div className="empty-state__icon" aria-hidden="true">
        <Inbox size={24} />
      </div>
      <h3 className="empty-state__title">{title}</h3>
      <p  className="empty-state__desc">{description}</p>
      {ctaLabel && (
        onCta ? (
          <button type="button" onClick={onCta} className="empty-state__cta">
            <Plus size={20} />{ctaLabel}
          </button>
        ) : ctaHref ? (
          <a href={ctaHref} className="empty-state__cta">
            <Plus size={20} />{ctaLabel}
          </a>
        ) : null
      )}
    </div>
  );
}
