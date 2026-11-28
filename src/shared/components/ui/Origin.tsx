import React from 'react';
import { CircleCheck, Lock, Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import './Origin.css';

/*
 * Qui a fait quoi (design system CX, fiches KnowDeskContent, Badge et Card, lot 7a).
 * La prune (--accent) ne sert qu'ici : ce que KnowDesk a préparé, toujours avec
 * l'icône sparkles et une mention écrite qui nomme KnowDesk. Ce que l'utilisateur
 * a ajouté lui-même est en primary, jamais en prune.
 */

interface MentionProps {
  /** La mention : nomme KnowDesk, dit ce qu'il a fait et, si elle est connue, la source. */
  children:   React.ReactNode;
  className?: string;
}

/** Mention « Préparé par KnowDesk » (cx-kd) : en prune, avec l'icône sparkles. */
export function KnowDeskMention({ children, className }: MentionProps) {
  return (
    <span className={cn('kd-mention', className)}>
      <Sparkles size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

interface BlockProps {
  mention:    React.ReactNode;
  children?:  React.ReactNode;
  /** Le moyen de corriger, à côté du contenu : « Modifier », « Changer la réponse »… */
  actions?:   React.ReactNode;
  className?: string;
  as?:        'div' | 'section' | 'aside';
  'aria-label'?: string;
}

/** Encart d'un contenu préparé par KnowDesk (cx-kd-block) : fond accent-soft, la mention en tête. */
export function KnowDeskBlock({ mention, children, actions, className, as = 'div', ...rest }: BlockProps) {
  const Tag = as;
  return (
    <Tag className={cn('kd-block', className)} aria-label={rest['aria-label']}>
      <KnowDeskMention>{mention}</KnowDeskMention>
      {children}
      {actions && <div className="kd-block__actions">{actions}</div>}
    </Tag>
  );
}

/** Badge « Réglé automatiquement par KnowDesk » (cx-badge--accent), avec l'icône sparkles. */
export function KnowDeskBadge({ children, className }: MentionProps) {
  return (
    <span className={cn('badge badge--accent', className)}>
      <Sparkles size={14} className="badge__icon" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Picto « cercle coché » en prune d'une question réglée par KnowDesk (US 3.1) : à droite du
 * libellé, comme celui d'une question répondue (vert). Dit « Réglée par KnowDesk » aux lecteurs d'écran.
 */
export function KnowDeskCheck({ className }: { className?: string }) {
  return <CircleCheck size={16} className={cn('kd-check', className)} role="img" aria-label="Réglée par KnowDesk" />;
}

/** Badge primary de ce que l'utilisateur a ajouté (« Ajouté par vous ») ou modifié (« Modifié par vous »). */
export function ByYouBadge({ modified = false, className }: { modified?: boolean; className?: string }) {
  return <span className={cn('badge badge--primary', className)}>{modified ? 'Modifié par vous' : 'Ajouté par vous'}</span>;
}

interface InternalCardProps {
  children:   React.ReactNode;
  className?: string;
  /** Titre de la carte ; par défaut « Interne · réservé aux agents ». */
  title?:     React.ReactNode;
}

/** Bloc réservé aux agents (cx-card--internal) : fond surface, contour pointillé, icône lock. */
export function InternalCard({ children, className, title = 'Interne · réservé aux agents' }: InternalCardProps) {
  return (
    <div className={cn('internal-card', className)}>
      <p className="internal-card__title"><Lock size={16} aria-hidden="true" />{title}</p>
      {children}
    </div>
  );
}
