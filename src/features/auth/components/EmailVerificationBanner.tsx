import React, { useCallback, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useToast }     from '../../../shared/lib/useToast';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import './EmailVerificationBanner.css';
import { StatusIcon } from '../../../shared/components/ui/StatusIcon';
import { X } from 'lucide-react';

/**
 * Bandeau soft affiché en haut de l'app tant que l'utilisateur n'a pas
 * cliqué sur le lien de vérification d'email reçu au register.
 *
 * Mode soft : on n'empêche pas l'usage de l'app. Si jamais on veut
 * basculer en mode strict (bloquer login), c'est à faire dans
 * `auth.middleware` côté backend.
 */
export function EmailVerificationBanner() {
  const session = useAuthStore(s => s.session);
  const toast   = useToast();
  const [resending, setResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const emailVerified = session?.user.emailVerified ?? true;
  if (emailVerified || !session || dismissed) return null;

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', {});
      toast.success('Email envoyé. Vérifiez votre boîte de réception.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Impossible de renvoyer le lien.');
    } finally {
      setResending(false);
    }
  }, [toast]);

  return (
    <div className="email-verify-banner" role="status">
      <StatusIcon tone="warning" className="email-verify-banner__icon" />
      <span className="email-verify-banner__text">
        Vérifiez votre adresse <strong>{session.user.email}</strong> en cliquant sur le lien que nous vous avons envoyé.
      </span>
      <button
        type="button"
        className="email-verify-banner__action"
        onClick={handleResend}
        disabled={resending}
      >
        {resending ? 'Envoi…' : 'Renvoyer le lien'}
      </button>
      <button
        type="button"
        className="email-verify-banner__close"
        onClick={() => setDismissed(true)}
        aria-label="Masquer pour cette session"
        title="Masquer pour cette session"
      >
        <X size={16} />
      </button>
    </div>
  );
}
