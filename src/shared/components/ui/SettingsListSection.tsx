import React from 'react';
import { Button }   from './Button';
import { Skeleton } from './Skeleton';
import { Plus } from 'lucide-react';

export interface SettingsListSectionProps<T> {
  title:          string;
  description?:   React.ReactNode;
  /** ID du h2 pour aria-labelledby. Optionnel. */
  titleId?:       string;
  /** Bouton de création optionnel à droite du header. */
  createCta?:     { label: string; onClick: () => void };
  loading:        boolean;
  /** Erreur à afficher en haut (sous le header). NULL = pas d'erreur. */
  error?:         string | null;
  items:          T[];
  /** Texte affiché quand `items` est vide (loading=false). */
  emptyMessage:   React.ReactNode;
  /** Doit retourner un `<li>` directement (avec sa propre classe).
   *  La key React est gérée par renderItem (cf. usage dans le map). */
  renderItem:     (item: T) => React.ReactNode;
  /** Classe CSS appliquée sur le <ul>. */
  listClassName?: string;
  /** Slot rendu après le header et avant la liste (ex: bandeau "nouvelle
   *  clé créée" pour ApiKeys). */
  beforeList?:    React.ReactNode;
  /** Slot rendu après la liste (ex: ConfirmDialog ou Modal de création). */
  children?:      React.ReactNode;
}

/**
 * Conteneur générique pour les sections settings de type "liste éditable" :
 * Synonymes, Tags, API keys. Mutualise le pattern header + loading skeletons
 * + EmptyState + <ul> + erreur inline.
 *
 * Les modales (création, édition, confirmation suppression) restent à la
 * charge du composant parent — elles sont passées via `children` et
 * rendues comme overlays par le navigateur (z-index gère le reste).
 */
export function SettingsListSection<T extends { id: string }>({
  title, description, titleId, createCta, loading, error,
  items, emptyMessage, renderItem,
  listClassName = 'settings-list',
  beforeList, children,
}: SettingsListSectionProps<T>) {
  return (
    <section className="settings-section" aria-labelledby={titleId}>
      <div className="settings-section__header">
        <div>
          <h2 id={titleId} className="settings-section__title">{title}</h2>
          {description && <p className="settings-section__desc">{description}</p>}
        </div>
        {createCta && (
          <Button variant="primary" size="sm" onClick={createCta.onClick} leftIcon={<Plus size={16} />}>
            {createCta.label}
          </Button>
        )}
      </div>

      {error && (
        <p className="field-error settings-section__error" role="alert">{error}</p>
      )}

      {beforeList}

      {loading ? (
        <div className={listClassName}>
          {[1, 2].map(i => <Skeleton key={i} className="sk-card" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="settings-list__empty">
          {typeof emptyMessage === 'string' ? <p>{emptyMessage}</p> : emptyMessage}
        </div>
      ) : (
        <ul className={listClassName}>
          {items.map(item => renderItem(item))}
        </ul>
      )}

      {children}
    </section>
  );
}
