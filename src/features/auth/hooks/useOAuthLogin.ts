import { useCallback, useState } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import type { AuthSession } from '../types';

type Provider = 'google' | 'microsoft';

interface UseOAuthLoginReturn {
  signIn:    (provider: Provider, idToken: string) => Promise<void>;
  loading:   boolean;
  error:     string | null;
  clearError: () => void;
}

/**
 * Hook frontend qui prend un idToken déjà obtenu auprès d'un provider
 * (Google Identity Services ou MSAL) et le poste sur /auth/oauth.
 * Au succès : pose les cookies (côté backend) + appelle onSuccess avec
 * le shape AuthSession habituel.
 */
export function useOAuthLogin(onSuccess: (session: AuthSession) => void): UseOAuthLoginReturn {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const signIn = useCallback(async (provider: Provider, idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{
        accessToken:  string;
        user:         AuthSession['user'];
        organization: AuthSession['organization'];
      }>('/auth/oauth', { provider, idToken });
      onSuccess({
        accessToken:  data.accessToken,
        user:         data.user,
        organization: data.organization,
      });
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : (err instanceof Error ? err.message : 'La connexion n\'a pas abouti. Réessayez, ou connectez-vous avec votre adresse e-mail.'));
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { signIn, loading, error, clearError: () => setError(null) };
}
