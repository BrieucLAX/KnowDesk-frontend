import React, { useEffect, useState } from 'react';
import { Button }  from '../../../shared/components/ui/Button';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useAuthStore } from '../../../store/authStore';
import '../auth.css';
import { CircleCheck } from 'lucide-react';

type Status = 'verifying' | 'success' | 'error';

/**
 * Page de confirmation atteinte via le lien magique reçu par email.
 * URL : /verify-email?token=<...>
 *
 * Appelle POST /auth/verify-email avec le token et affiche le résultat.
 * Pas besoin d'être loggé pour atteindre cette page (le user clique
 * peut-être depuis son client mail sur un autre navigateur).
 */
export function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const session = useAuthStore(s => s.session);
  const setSession = useAuthStore(s => s.setSession);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Ce lien est incomplet. Ouvrez de nouveau le lien reçu par e-mail.');
      return;
    }
    apiClient.post<{ verified: boolean }>('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        // Si l'utilisateur est loggé dans cette session, met à jour le store
        // pour faire disparaître le bandeau immédiatement.
        if (session) {
          setSession({
            ...session,
            user: { ...session.user, emailVerified: true },
          });
        }
      })
      .catch(err => {
        setStatus('error');
        setErrorMsg(err instanceof ApiError
          ? err.message
          : 'Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis le bandeau de vérification.');
      });
  }, [session, setSession]);

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <div className="login-page" style={{ gridTemplateColumns: '1fr' }}>
      <main className="login-page__form-panel">
        <div className="login-page__form-container" style={{ textAlign: 'center' }}>
          <div className="login-page__mobile-logo" aria-label="KnowDesk" style={{ justifyContent: 'center' }}>
            <span className="login-page__logo-mark login-page__logo-mark--sm">K</span>
            <span className="login-page__app-name">KnowDesk</span>
          </div>

          {status === 'verifying' && (
            <>
              <div className="login-page__header">
                <h1 className="login-page__title">Vérification…</h1>
                <p className="login-page__subtitle">Validation de votre lien en cours.</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="login-page__header">
                <h1 className="login-page__title icon-label"><CircleCheck size={24} className="login-page__title-icon" />Adresse e-mail vérifiée</h1>
                <p className="login-page__subtitle">
                  Votre adresse e-mail est confirmée. Vous pouvez maintenant utiliser KnowDesk pleinement.
                </p>
              </div>
              <Button variant="primary" size="md" fullWidth onClick={handleBack}>
                Retour à l'application
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="login-page__header">
                <h1 className="login-page__title">Lien invalide</h1>
                <p className="login-page__subtitle">{errorMsg}</p>
              </div>
              <Button variant="primary" size="md" fullWidth onClick={handleBack}>
                Retour à la connexion
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
