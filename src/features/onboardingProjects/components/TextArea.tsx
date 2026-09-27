import React from 'react';
import { cn } from '../../../shared/lib/cn';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id:     string;
  label:  string;
  error?: string;
}

/**
 * Champ texte sur plusieurs lignes, avec le balisage et l'accessibilité de
 * `<Input>` (label, aria-invalid, aria-describedby). Pas de composant partagé
 * équivalent aujourd'hui.
 */
export function TextArea({ id, label, error, className, ...rest }: TextAreaProps) {
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea
        id={id}
        className={cn('field-input', 'obp-textarea', error && 'field-input--error', className)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        rows={2}
        {...rest}
      />
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
