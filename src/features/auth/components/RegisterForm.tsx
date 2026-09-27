import React from 'react';
import { Input }  from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { PasswordStrengthMeter } from '../../../shared/components/ui/PasswordStrengthMeter';

interface RegisterFormProps {
  form: {
    firstName: string; lastName: string;
    orgName: string; email: string;
    password: string; confirmPassword: string;
    gdprAccepted: boolean;
  };
  errors: {
    firstName?: string; lastName?: string;
    orgName?: string; email?: string;
    password?: string; confirmPassword?: string;
    gdprAccepted?: string;
    general?: string;
  };
  isLoading:        boolean;
  showPassword:     boolean;
  onChange:         (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit:         (e: React.FormEvent) => void;
  onTogglePassword: () => void;
  onSwitchToLogin:  () => void;
}

export function RegisterForm({
  form, errors, isLoading, showPassword,
  onChange, onSubmit, onTogglePassword, onSwitchToLogin,
}: RegisterFormProps) {
  return (
    <form className="login-form" onSubmit={onSubmit} noValidate>
      {errors.general && (
        <div className="login-form__error" role="alert">{errors.general}</div>
      )}

      <div className="login-form__row">
        <Input
          id="firstName"
          name="firstName"
          type="text"
          label="Prénom"
          placeholder="Jean"
          value={form.firstName}
          onChange={onChange}
          error={errors.firstName}
          autoComplete="given-name"
          autoFocus
        />
        <Input
          id="lastName"
          name="lastName"
          type="text"
          label="Nom"
          placeholder="Dupont"
          value={form.lastName}
          onChange={onChange}
          error={errors.lastName}
          autoComplete="family-name"
        />
      </div>

      <Input
        id="orgName"
        name="orgName"
        type="text"
        label="Nom de l'organisation"
        placeholder="Acme Service Client"
        value={form.orgName}
        onChange={onChange}
        error={errors.orgName}
        autoComplete="organization"
      />

      <Input
        id="email"
        name="email"
        type="email"
        label="Adresse email"
        placeholder="vous@exemple.fr"
        value={form.email}
        onChange={onChange}
        error={errors.email}
        autoComplete="email"
      />

      <div className="login-form__password-wrap">
        <Input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Mot de passe"
          placeholder="8 caractères minimum"
          value={form.password}
          onChange={onChange}
          error={errors.password}
          autoComplete="new-password"
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
      <PasswordStrengthMeter password={form.password} />

      <div className="login-form__password-wrap">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          label="Confirmer le mot de passe"
          placeholder="Répétez le mot de passe"
          value={form.confirmPassword}
          onChange={onChange}
          error={errors.confirmPassword}
          autoComplete="new-password"
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

      <label className="login-form__gdpr">
        <input
          type="checkbox"
          name="gdprAccepted"
          checked={form.gdprAccepted}
          onChange={onChange}
          aria-invalid={!!errors.gdprAccepted}
        />
        <span>
          J'accepte la{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</a>.
        </span>
      </label>
      {errors.gdprAccepted && (
        <p className="field-error" role="alert">{errors.gdprAccepted}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isLoading}
        fullWidth
      >
        {isLoading ? 'Création…' : 'Créer mon espace'}
      </Button>

      <p className="login-form__signup">
        Déjà un compte ?{' '}
        <button
          type="button"
          className="login-form__link"
          onClick={onSwitchToLogin}
        >
          Se connecter
        </button>
      </p>
    </form>
  );
}
