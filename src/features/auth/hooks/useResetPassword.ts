import { useState, useCallback } from 'react';
import { apiClient } from '../../../shared/lib/apiClient';

export function useResetPassword(token: string, onSuccess: () => void) {
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [done,            setDone]            = useState(false);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis « Mot de passe oublié ? ».');
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword, token, onSuccess]);

  return { password, setPassword, confirmPassword, setConfirmPassword, loading, error, done, submit };
}
