import { apiClient } from './apiClient';
import { hasModule } from './modules';
import { useAuthStore } from '../../store/authStore';

/**
 * Envoie un événement d'analytics au backend en mode fire-and-forget.
 * N'attend pas la réponse, ignore silencieusement les erreurs — un
 * échec de tracking ne doit jamais casser l'UX.
 */
export function trackEvent(
  type: string,
  opts?: { targetType?: string; targetId?: string; payload?: Record<string, unknown> },
): void {
  // POST /events est derrière le module analytics côté back (404 sinon).
  if (!hasModule(useAuthStore.getState().session?.organization, 'analytics')) return;
  apiClient.post('/events', { type, ...opts }).catch(() => { /* ignore */ });
}
