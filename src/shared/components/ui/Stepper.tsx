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
  /** Terminée : la coche remplace l'icône. Absent ou faux : étape neutre. */
  done?: boolean;
}

interface StepperProps<T extends string> {
  items:     ReadonlyArray<StepperItem<T>>;
  /** L'étape affichée (aria-current="step"). */
  value:     T;
  onSelect:  (id: T) => void;
  ariaLabel: string;
}

/**
 * Étapes d'un parcours (design system CX, fiche Stepper) : une carte qui chevauche le bandeau,
 * une icône par étape, coche sur une étape terminée, étape affichée en --primary. Chaque étape
 * est un bouton : on les ouvre dans n'importe quel ordre. Sous 768 px, seuls les ronds restent
 * et le nom de l'étape affichée passe dessous.
 */
export function Stepper<T extends string>({ items, value, onSelect, ariaLabel }: StepperProps<T>) {
  const compact = useIsMobile();
  const current = items.find(i => i.id === value);
  return (
    <nav className={cn('parcours-stepper', compact && 'parcours-stepper--compact')} aria-label={ariaLabel}>
      <ol className="parcours-stepper__list" style={{ '--steps': items.length } as React.CSSProperties}>
        {items.map(item => {
          const isCurrent = item.id === value;
          const Icon = item.done ? Check : item.icon;
          return (
            <li key={item.id} className={cn('parcours-stepper__step', item.done && 'parcours-stepper__step--done', isCurrent && 'parcours-stepper__step--current')}>
              <button
                type="button"
                className="parcours-stepper__button"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={item.done ? `${item.label} (terminée)` : undefined}
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
