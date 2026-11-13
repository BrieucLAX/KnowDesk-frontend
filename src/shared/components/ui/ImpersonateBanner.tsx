import React from 'react';
import { useAuthStore } from '../../../store/authStore';
import { Button } from './Button';
import { StatusIcon } from './StatusIcon';
import './ImpersonateBanner.css';

export function ImpersonateBanner() {
  const impersonating    = useAuthStore(s => s.impersonating);
  const setImpersonating = useAuthStore(s => s.setImpersonating);
  const setSession       = useAuthStore(s => s.setSession);
  const clearSession     = useAuthStore(s => s.clearSession);

  if (!impersonating) return null;

const handleReturn = async () => {
  const saToken = impersonating.saToken;
  // CRUCIAL : appelle le backend pour clear le cookie HTTP-only access_token.
  // Sans ça, le cookie d'impersonation reste valide 1h et toutes les actions
  // suivantes (même en compte admin classique) sont attribuées au superadmin
  // dans l'audit log via metadata.impersonatedBy.
  try {
    const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
    await fetch(`${apiBase}/superadmin/impersonate/stop`, {
      method:      'POST',
      credentials: 'include',
    });
  } catch { /* best-effort, on continue le flow même en cas d'échec */ }
  setImpersonating(null);
  // Efface la session impersonnifiée sans toucher au store superadmin
  clearSession();
  // Stocke le token SA en sessionStorage pour que SuperadminApp le récupère
  sessionStorage.setItem('sa_token', saToken);
  window.location.href = '/?superadmin';
};

  return (
    <div className="impersonate-banner" role="status">
      <StatusIcon tone="warning" className="impersonate-banner__icon" />
      <span className="impersonate-banner__text">
        Mode impersonnification — Espace : <strong>{impersonating.orgName}</strong>
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="impersonate-banner__quit"
        onClick={handleReturn}
      >
        Quitter
      </Button>
    </div>
  );
}
