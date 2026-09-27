import React from 'react';
import { useAcceptInvitation } from '../hooks/useAcceptInvitation';
import '../invitation.css';
import { Button }   from '../../../shared/components/ui/Button';
import { Input }    from '../../../shared/components/ui/Input';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

interface AcceptInvitationPageProps {
  token:     string;
  onSuccess: () => void;  // redirige vers le login après acceptation
}

function Frame({ quote, children }: { quote: string; children: React.ReactNode }) {
  return (
    <div className="login-page">
      <aside className="login-page__brand" aria-hidden="true">
        <div className="login-page__brand-inner">
          <div className="login-page__logo">
            <span className="login-page__logo-mark">K</span>
          </div>
          <blockquote className="login-page__quote">
            <p>{quote}</p>
          </blockquote>
          <div className="login-page__brand-dots">
            <span /><span /><span />
          </div>
        </div>
      </aside>
      <main className="login-page__form-panel">
        <div className="login-page__form-container">{children}</div>
      </main>
    </div>
  );
}

/**
 * Acceptation d'une invitation. Un nouveau compte choisit son mot de passe ;
 * un compte existant saisit son mot de passe actuel, qui n'est pas modifié
 * (prérequis 18).
 */
export function AcceptInvitationPage({ token, onSuccess }: AcceptInvitationPageProps) {
  const {
    info, invalid, form, errors, isLoading, isSuccess, showPassword,
    handleChange, handleSubmit, togglePassword,
  } = useAcceptInvitation(token);

  // ── Lien invalide ou expiré ───────────────────────────────────
  if (invalid) {
    return (
      <Frame quote="Rejoignez votre équipe sur KnowDesk.">
        <div className="invitation-success">
          <h1 className="invitation-success__title">Invitation invalide</h1>
          <p className="invitation-success__desc" role="alert">{invalid}</p>
          <p className="invitation-success__desc">Demandez une nouvelle invitation à la personne qui vous a invité.</p>
          <Button variant="secondary" size="lg" fullWidth onClick={onSuccess}>Aller à la connexion</Button>
        </div>
      </Frame>
    );
  }

  if (!info) {
    return (
      <Frame quote="Rejoignez votre équipe sur KnowDesk.">
        <div aria-busy="true" className="invitation-loading">
          <Skeleton className="invitation-loading__line" />
          <Skeleton className="invitation-loading__block" />
        </div>
      </Frame>
    );
  }

  const existing = info.accountExists;

  // ── Succès ────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <Frame quote="Bienvenue dans votre base de connaissance.">
        <div className="invitation-success">
          <div className="invitation-success__icon" aria-hidden="true">✓</div>
          <h1 className="invitation-success__title">{existing ? `Vous avez rejoint ${info.orgName}` : 'Compte créé !'}</h1>
          <p className="invitation-success__desc">
            {existing
              ? 'Connectez-vous avec votre mot de passe habituel.'
              : 'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.'}
          </p>
          <Button variant="primary" size="lg" fullWidth onClick={onSuccess}>
            Se connecter
          </Button>
        </div>
      </Frame>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────
  return (
    <Frame quote="Rejoignez votre équipe sur KnowDesk.">
      <div className="login-page__header">
        <h1 className="login-page__title">{existing ? `Rejoindre ${info.orgName}` : 'Créer votre mot de passe'}</h1>
        <p className="login-page__subtitle">
          {existing
            ? <>Un compte existe déjà pour <strong>{info.email}</strong>. Saisissez son mot de passe actuel : il ne sera pas modifié.</>
            : <>Invitation à rejoindre <strong>{info.orgName}</strong> avec l'adresse <strong>{info.email}</strong>. Choisissez un mot de passe sécurisé.</>}
        </p>
      </div>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {errors.general && (
          <div className="login-form__error" role="alert">
            <span className="login-form__error-icon" aria-hidden="true">!</span>
            {errors.general}
          </div>
        )}

        <div className="login-form__password-wrap">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            label={existing ? 'Mot de passe actuel' : 'Mot de passe'}
            placeholder={existing ? undefined : 'Au moins 8 caractères'}
            autoComplete={existing ? 'current-password' : 'new-password'}
            autoFocus
            required
            value={form.password}
            error={errors.password}
            onChange={e => handleChange('password', e.target.value)}
          />
          <button
            type="button"
            className="login-form__toggle-password"
            onClick={togglePassword}
            aria-label={showPassword ? 'Masquer' : 'Afficher'}
          >
            {showPassword ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {!existing && (
          <Input
            id="password-confirm"
            type={showPassword ? 'text' : 'password'}
            label="Confirmer le mot de passe"
            placeholder="Répétez votre mot de passe"
            autoComplete="new-password"
            required
            value={form.passwordConfirm}
            error={errors.passwordConfirm}
            onChange={e => handleChange('passwordConfirm', e.target.value)}
          />
        )}

        {existing && (
          <p className="invitation-hint">
            Mot de passe oublié ? Utilisez « Mot de passe oublié » sur la page de connexion, puis rouvrez ce lien.
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
          {existing
            ? (isLoading ? 'Connexion à l\'espace…' : 'Rejoindre l\'espace')
            : (isLoading ? 'Création du compte…' : 'Créer mon compte')}
        </Button>
      </form>
    </Frame>
  );
}
