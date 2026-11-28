import React from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useIsMobile } from '../../lib/useMediaQuery';
import './Stepper.css';

export interface StepperItem<T extends string> {
  id:    T;
  /** Nom court de l'étape, trois mots au plus. */
  label: string;
  icon:  LucideIcon;
  /**
   * Statut de l'étape dans le parcours (règle transverse 1) : terminée (vert, la coche remplace
   * l'icône), en cours (pétrole), à venir (gris, la valeur par défaut).
   */
  state?: StepState;
}

export type StepState = 'done' | 'current' | 'upcoming';

const STATE_SUFFIX: Record<StepState, string> = { done: ' (terminée)', current: ' (en cours)', upcoming: '' };

interface StepperProps<T extends string> {
  items:     ReadonlyArray<StepperItem<T>>;
  /** L'étape affichée (aria-current="step"). */
  value:     T;
  onSelect:  (id: T) => void;
  ariaLabel: string;
}

/**
 * Étapes d'un parcours (design system CX, fiche Stepper) : une carte qui chevauche le bandeau,
 * une icône par étape ; terminée en --success avec la coche, en cours en --primary, à venir en
 * gris. L'étape affichée (`value`) a son nom souligné et `aria-current`. Chaque étape est un
 * bouton : on les ouvre dans n'importe quel ordre. Sous 768 px, seuls les ronds restent et le
 * nom de l'étape affichée passe dessous.
 */
export function Stepper<T extends string>({ items, value, onSelect, ariaLabel }: StepperProps<T>) {
  const compact = useIsMobile();
  const current = items.find(i => i.id === value);
  return (
    <nav className={cn('parcours-stepper', compact && 'parcours-stepper--compact')} aria-label={ariaLabel}>
      <ol className="parcours-stepper__list" style={{ '--steps': items.length } as React.CSSProperties}>
        {items.map(item => {
          const shown = item.id === value;
          const state = item.state ?? 'upcoming';
          const Icon = state === 'done' ? Check : item.icon;
          return (
            <li key={item.id} className={cn(
              'parcours-stepper__step', `parcours-stepper__step--${state}`, shown && 'parcours-stepper__step--shown',
            )}>
              <button
                type="button"
                className="parcours-stepper__button"
                aria-current={shown ? 'step' : undefined}
                aria-label={state === 'upcoming' ? undefined : `${item.label}${STATE_SUFFIX[state]}`}
                onClick={() => onSelect(item.id)}
              >
                <span className="parcours-stepper__dot" aria-hidden="true"><Icon size={20} /></span>
                <span className={cn('parcours-stepper__label', compact && 'sr-only')}>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {compact && current && <p className="parcours-stepper__current" aria-hidden="true">{current.label}</p>}
    </nav>
  );
}
