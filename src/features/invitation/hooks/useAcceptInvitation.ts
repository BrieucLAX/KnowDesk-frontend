import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../shared/lib/apiClient';
import type { AcceptInvitationForm, AcceptInvitationErrors, InvitationInfo } from '../types';

function validate(form: AcceptInvitationForm, accountExists: boolean): AcceptInvitationErrors {
  const errors: AcceptInvitationErrors = {};
  if (!form.password || form.password.length < 8)
    errors.password = accountExists
      ? 'Saisissez le mot de passe de votre compte.'
      : 'Le mot de passe doit contenir au moins 8 caractères.';
  // Compte existant : son mot de passe actuel, pas de confirmation.
  if (!accountExists && form.password !== form.passwordConfirm)
    errors.passwordConfirm = 'Les mots de passe ne correspondent pas.';
  return errors;
}

/**
 * Acceptation d'une invitation. Deux cas, selon GET /members/invitations/:token :
 *   - nouveau compte : on choisit un mot de passe (et on le confirme) ;
 *   - compte existant : on saisit son mot de passe actuel, qui n'est pas
 *     modifié (prérequis 18) ; le compte rejoint l'espace.
 */
export function useAcceptInvitation(token: string) {
  const [info,        setInfo]        = useState<InvitationInfo | null>(null);
  const [invalid,     setInvalid]     = useState<string | null>(null);
  const [form,        setForm]        = useState<AcceptInvitationForm>({ password: '', passwordConfirm: '' });
  const [errors,      setErrors]      = useState<AcceptInvitationErrors>({});
  const [isLoading,   setIsLoading]   = useState(false);
  const [isSuccess,   setIsSuccess]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let alive = true;
    apiClient.get<InvitationInfo>(`/members/invitations/${token}`)
      .then(data => { if (alive) setInfo(data); })
      .catch(err => { if (alive) setInvalid(err instanceof Error ? err.message : 'Invitation invalide ou expirée.'); });
    return () => { alive = false; };
  }, [token]);

  const handleChange = useCallback((field: keyof AcceptInvitationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    const errs = validate(form, info.accountExists);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsLoading(true);
    setErrors({});
    try {
      await apiClient.post(`/members/invitations/${token}/accept`, {
        password: form.password,
      });
      setIsSuccess(true);
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Lien invalide ou expiré.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [form, token, info]);

  return {
    info, invalid, form, errors, isLoading, isSuccess, showPassword,
    handleChange, handleSubmit,
    togglePassword: () => setShowPassword(p => !p),
  };
}
