import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSession } from '../features/auth/types';
import { apiClient } from '../shared/lib/apiClient';

interface AuthState {
  session:        AuthSession | null;
  isLoaded:       boolean;
  onboardingDone: boolean;
  impersonating:  { orgName: string; saToken: string } | null;
  /** Pourquoi la session a été coupée par le serveur (ex. espace désactivé) ;
   *  affiché sur l'écran de connexion jusqu'à la prochaine connexion. */
  sessionEndedReason: string | null;
  setSession:        (session: AuthSession) => void;
  clearSession:      () => void;
  /** Coupe la session locale en gardant la raison à afficher. */
  endSession:        (reason: string) => void;
  /** Vraie déconnexion : POST /auth/logout (clear cookies serveur) puis clearSession. */
  logout:            () => Promise<void>;
  setOnboardingDone: () => void;
  resetOnboarding:   () => Promise<void>;
  setImpersonating:  (data: { orgName: string; saToken: string } | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session:        null,
      isLoaded:       false,
      onboardingDone: false,
      impersonating:  null,
      sessionEndedReason: null,

      setSession: (session) => set({
        session,
        isLoaded:       true,
        sessionEndedReason: null,
        onboardingDone: session.user.onboardingDone ?? get().onboardingDone,
      }),

      clearSession: () => set({ session: null, isLoaded: true, onboardingDone: false, impersonating: null, sessionEndedReason: null }),

      endSession: (reason) => set({ session: null, isLoaded: true, onboardingDone: false, impersonating: null, sessionEndedReason: reason }),

      logout: async () => {
        // POST /auth/logout pour invalider les cookies HTTP-only (access_token
        // + refresh_token) côté serveur. Sans ce call, le cookie reste valide
        // et un simple F5 / une visite sur /accept-invitation rehydratent la
        // session via /auth/me — l'utilisateur se retrouve « reconnecté ».
        // On tolère les erreurs réseau : on coupe la session locale dans tous
        // les cas (TTL backend du cookie expirera quoi qu'il arrive).
        try {
          await apiClient.post('/auth/logout', {});
        } catch (err) {
          console.warn('[authStore] /auth/logout failed:', (err as Error)?.message ?? err);
        }
        set({ session: null, isLoaded: true, onboardingDone: false, impersonating: null, sessionEndedReason: null });
      },

      setOnboardingDone: () => {
        set({ onboardingDone: true });
        // Cookie HTTP-only envoyé automatiquement par apiClient — credentials:include.
        apiClient
          .post('/account/onboarding-done', {})
          .catch(err => console.warn('[authStore] onboarding-done failed:', (err as Error)?.message ?? err));
      },

      resetOnboarding: async () => {
        await apiClient.post('/account/onboarding-reset', {});
        set({ onboardingDone: false });
      },

      setImpersonating: (data) => set({ impersonating: data }),
    }),
    {
      name:    'knowdesk-auth',
      // localStorage (et pas sessionStorage) pour que la session soit partagée
      // entre onglets — un onglet ouvert depuis l'extension Chrome OU un tab
      // ouvert via cmd+click depuis un autre tab démarre avec la session déjà
      // hydratée plutôt que de se retrouver redirigé vers /login. Le cookie
      // d'auth reste la source de vérité côté serveur (TTL 15 min, refresh
      // automatique via apiClient).
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoaded = true;
      },
    }
  )
);

export const selectUser         = (s: AuthState) => s.session?.user         ?? null;
export const selectOrganization = (s: AuthState) => s.session?.organization ?? null;
export const selectIsLoggedIn   = (s: AuthState) => s.session !== null;
export const selectUserRole     = (s: AuthState) => s.session?.user.role    ?? null;
