import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import './Select.css';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** `md` : 36 px (ligne de liste ou de tableau) ; `lg` : 48 px, aligné sur les champs de formulaire. */
  size?: 'md' | 'lg';
  /** Prend toute la largeur disponible. */
  block?: boolean;
  /** Classe de l'enveloppe `cx-select` (marges de l'écran). */
  wrapperClassName?: string;
}

/**
 * Sélecteur de la fiche Select (design system CX) : `<select>` natif dans l'enveloppe
 * `cx-select`, flèche `chevron-down` décorative. L'écran fournit un `<label>` visible
 * (qui l'entoure ou pointe sur son `id`) ou un `aria-label`.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', block = false, wrapperClassName, className, children, ...rest }, ref,
) {
  return (
    <span className={cn('cx-select', size === 'lg' && 'cx-select--lg', block && 'cx-select--block', wrapperClassName)}>
      <select ref={ref} className={className} {...rest}>{children}</select>
      <ChevronDown className="cx-icon" aria-hidden="true" focusable="false" />
    </span>
  );
});
