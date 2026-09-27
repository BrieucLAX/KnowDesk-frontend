import React from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';
import type { LoginFormState, LoginFormErrors } from '../types';

interface LoginFormProps {
  values:       LoginFormState;
  errors:       LoginFormErrors;
  isLoading:    boolean;
  showPassword: boolean;
  onChange:     (field: keyof LoginFormState, value: string) => void;
  onBlur:       (field: keyof LoginFormState) => void;
  onSubmit:     (e: React.FormEvent) => void;
  onTogglePassword:    () => void;
  /** Absent : pas de lien « Créer un espace » (inscription fermée). */
  onSwitchToRegister?: () => void;
  onSwitchToForgot:   () => void;
}

/**
 * Pure presentation component — receives everything via props.
 * No state, no API calls. Easy to render in Storybook with any props.
 */
export function LoginForm({
  values, errors, isLoading, showPassword,
  onChange, onBlur, onSubmit, onTogglePassword, onSwitchToRegister, onSwitchToForgot,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="login-form">

      {/* General API error — shown above the fields */}
      {errors.general && (
        <div className="login-form__error" role="alert" aria-live="assertive">
          <span className="login-form__error-icon" aria-hidden="true">!</span>
          {errors.general}
        </div>
      )}

      <Input
        id="email"
        type="email"
        label="Adresse email"
        placeholder="vous@entreprise.fr"
        autoComplete="email"
        autoFocus
        required
        value={values.email}
        error={errors.email}
        onChange={e => onChange('email', e.target.value)}
        onBlur={() => onBlur('email')}
      />

      <div className="login-form__password-wrap">
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          label="Mot de passe"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          value={values.password}
          error={errors.password}
          onChange={e => onChange('password', e.target.value)}
          onBlur={() => onBlur('password')}
        />
        <button
          type="button"
          className="login-form__toggle-password"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? 'Masquer' : 'Afficher'}
        </button>
      </div>

      <div className="login-form__forgot">
<button type="button" className="login-form__link" onClick={onSwitchToForgot}>
  Mot de passe oublié ?
</button>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
      >
        {isLoading ? 'Connexion…' : 'Se connecter'}
      </Button>

      {onSwitchToRegister && (
      <p className="login-form__signup">
        Pas encore de compte ?{' '}
<button type="button" className="login-form__link" onClick={e => { e.stopPropagation(); onSwitchToRegister(); }}>
  Créer un espace
</button>
      </p>
      )}

    </form>
  );
}
