import React from 'react';
import { cn } from '../../lib/cn';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  /** Libellé masqué mais lu (contexte évident : recherche, filtre…). */
  labelHidden?: boolean;
  error?:      string;
  helperText?: string;
  leftIcon?:   React.ReactNode;
  /** Élément posé à droite, dans le champ (bouton « Afficher » d'un mot de passe…). */
  trailing?:   React.ReactNode;
  /** Pass a unique id — required when using label */
  id: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelHidden, error, helperText, leftIcon, trailing, id, className, ...rest }, ref) => {
    const errorId  = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="field">
        {label && (
          <label htmlFor={id} className={labelHidden ? 'sr-only' : 'field-label'}>
            {label}
            {rest.required && <span className="field-required" aria-hidden="true"> *</span>}
          </label>
        )}

        <div className={cn('field-wrap', leftIcon ? 'field-wrap--icon' : '', trailing ? 'field-wrap--trailing' : '')}>
          {leftIcon && (
            <span className="field-icon" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={cn('field-input', error && 'field-input--error', className)}
            aria-invalid={!!error}
            aria-describedby={cn(error && errorId, helperText && helperId) || undefined}
            {...rest}
          />
          {trailing && <span className="field-trailing">{trailing}</span>}
        </div>

        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="field-helper">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
