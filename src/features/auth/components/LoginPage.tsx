import React, { useState, useCallback } from 'react';
import { LoginForm }    from './LoginForm';
import '../auth.css';
import { RegisterForm } from './RegisterForm';
import { OAuthButtons } from './OAuthButtons';
import { useLogin }     from '../hooks/useLogin';
import { useRegister }  from '../hooks/useRegister';
import { useToast }     from '../../../shared/lib/useToast';
import { useAuthStore } from '../../../store/authStore';
import type { AuthSession } from '../types';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm }  from './ResetPasswordForm';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const toast = useToast();
  // Session coupée par le serveur (ex. ORG_DISABLED en cours de navigation).
  const sessionEndedReason = useAuthStore(s => s.sessionEndedReason);

  // Détection du token de reset dans l'URL
const resetToken = new URLSearchParams(window.location.search).get('reset_token');
React.useEffect(() => {
  if (resetToken) setMode('reset');
}, [resetToken]);

  const handleLoginSuccess = useCallback((session: AuthSession) => {
    onLoginSuccess(session);
  }, [onLoginSuccess]);

  const handleRegisterSuccess = useCallback((session: AuthSession) => {
    toast.success(`Bienvenue sur KnowDesk, ${session.user.firstName ?? ''} !`.trim());
    onLoginSuccess(session);
  }, [onLoginSuccess, toast]);

  const login = useLogin(handleLoginSuccess);
  const register = useRegister(handleRegisterSuccess);

  return (
    <div className="login-page">
      {/* Left panel — branding */}
      <aside className="login-page__brand" aria-hidden="true">
        <div className="login-page__brand-inner">
          <div className="login-page__logo">
            <span className="login-page__logo-mark">K</span>
          </div>
          <blockquote className="login-page__quote">
            <p>"La bonne réponse, au bon moment, pour chaque client."</p>
          </blockquote>
          <div className="login-page__brand-dots">
            <span /><span /><span />
          </div>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className="login-page__form-panel">
        <div className="login-page__form-container">
          <div className="login-page__mobile-logo" aria-label="KnowDesk">
            <span className="login-page__logo-mark login-page__logo-mark--sm">K</span>
            <span className="login-page__app-name">KnowDesk</span>
          </div>

          {mode === 'login' && (
  <>
    <div className="login-page__header">
      <h1 className="login-page__title">Connexion</h1>
      <p className="login-page__subtitle">
        Accédez à la base de connaissance de votre équipe.
      </p>
    </div>
    {sessionEndedReason && (
      <p className="login-page__notice" role="alert">{sessionEndedReason}</p>
    )}
    <OAuthButtons mode="login" onSuccess={handleLoginSuccess} />
    <LoginForm
      values={login.values}
      errors={login.errors}
      isLoading={login.isLoading}
      showPassword={login.showPassword}
      onChange={login.handleChange}
      onBlur={login.handleBlur}
      onSubmit={login.handleSubmit}
      onTogglePassword={login.togglePassword}
      onSwitchToRegister={() => setMode('register')}
      onSwitchToForgot={() => setMode('forgot')}
    />
  </>
)}
{mode === 'register' && (
  <>
    <div className="login-page__header">
      <h1 className="login-page__title">Créer un espace</h1>
      <p className="login-page__subtitle">
        Configurez votre base de connaissance en quelques secondes.
      </p>
    </div>
    <OAuthButtons mode="register" onSuccess={handleRegisterSuccess} />
    <RegisterForm
      form={register.form}
      errors={register.errors}
      isLoading={register.isLoading}
      showPassword={register.showPassword}
      onChange={register.handleChange}
      onSubmit={register.handleSubmit}
      onTogglePassword={register.togglePassword}
      onSwitchToLogin={() => setMode('login')}
    />
  </>
)}
{mode === 'forgot' && (
  <>
    <div className="login-page__header">
      <h1 className="login-page__title">Mot de passe oublié</h1>
      <p className="login-page__subtitle">
        Saisis ton email et on t'envoie un lien de réinitialisation.
      </p>
    </div>
    <ForgotPasswordForm onBack={() => setMode('login')} />
  </>
)}
{mode === 'reset' && (
  <>
    <div className="login-page__header">
      <h1 className="login-page__title">Nouveau mot de passe</h1>
      <p className="login-page__subtitle">
        Choisis un mot de passe sécurisé d'au moins 8 caractères.
      </p>
    </div>
    <ResetPasswordForm
      token={resetToken ?? ''}
      onBack={() => setMode('login')}
    />
  </>
)}
        </div>

        <footer className="login-page__footer">
          <a href="/terms"   className="login-page__footer-link">CGU</a>
          <a href="/privacy" className="login-page__footer-link">Confidentialité</a>
          <span className="login-page__footer-copy">© 2025 KnowDesk</span>
        </footer>
      </main>
    </div>
  );
}
