# KnowDesk — front

## Règle absolue

**Vercel déploie `main` automatiquement en production.**

- On travaille uniquement sur des branches. Personne n'écrit directement sur `main`.
- Aucune fusion sans la validation explicite du propriétaire.
- Il n'y a pas d'environnement de prévisualisation utilisable : `VITE_API_URL` n'est posée qu'en Production, et le back n'accepte ni l'origine `*.vercel.app` ni ses cookies. On teste en local, contre le back local.
- Une fonctionnalité qui dépend d'une route du back n'est fusionnée qu'une fois cette route en production.

## Références

- Plan en cours : `onboarding-plan.md`, dans le dépôt privé **`KnowDesk-docs`**.
- Rétro-documentation, vérifiée sur le code : `retro/` dans `KnowDesk-docs`. `03b-architecture-frontend.md` décrit ce dépôt ; `06-dette-risques.md` donne les identifiants R/S/P/C/D/T/Q cités dans les commits.
- Contrat du back : son `CLAUDE.md` et les corps de ses PR (modules, codes d'erreur, routes en 204).
- L'ancien `CLAUDE.md` (mai 2026) est archivé dans `docs/archive/CLAUDE-2026-05.md`. Il est **périmé** : ne pas s'y fier.

## Stack

- React 18, TypeScript, Vite 5. Zustand (`src/store/authStore.ts`, persisté en `localStorage`). Sentry si `VITE_SENTRY_DSN`.
- Tests : vitest + jsdom + Testing Library, co-localisés (`x.test.ts` à côté de `x.ts`). Pas de CI : `npm run build` (qui lance `tsc`) et `npm test` doivent passer avant toute PR. `npm run lint` ne tourne pas (eslint absent, R5).
- Dépôts voisins : `BrieucLAX/KnowDesk` (back), `BrieucLAX/KnowDesk-pipeline`, `BrieucLAX/KnowDesk-docs`.

```bash
cp .env.example .env   # VITE_API_URL vers le back local
npm install && npm run dev
npm run build && npm test
```

## Conventions réelles (rétro `03b`)

- **Navigation** : pas de `<Routes>`. `App.tsx` tient un `useState<View>` synchronisé avec l'URL par `pathToView` / `viewToPath`, puis rend chaque écran par un bloc conditionnel. Tout nouvel écran passe par ces deux fonctions et par `screenModule` (`src/shared/lib/modules.ts`).
- **Modules par organisation** : `organization.enabledModules` (renvoyé par le login, l'OAuth et `/auth/me`) décide de ce qui est visible, via `hasModule`. Le back renvoie 404 sur un module absent ; le front masque l'entrée de navigation, l'écran **et** les appels en arrière-plan (notifications, recherche, événements). Une organisation de test n'a que `onboarding`.
- **Appels API** : toujours `apiClient` (cookie, rafraîchissement, `ApiError` avec `code`). Succès `{ data, error: null }`, erreur `{ data: null, error: { code, message } }`. Un 204 renvoie `undefined`. Les messages par code sont dans `src/shared/lib/apiErrors.ts`.
- **Erreurs** : action utilisateur ou chargement initial en échec → `toast.error()`. Un appel de fond non critique peut échouer en silence.
- **UI** : composants de `src/shared/components/ui/` (`Button`, `Input`, `Modal`, `ConfirmDialog`, `Skeleton`, `EmptyState`…) ; jamais `window.confirm()`. CSS co-localisé par feature, tokens de `src/styles/tokens.css` ; pas de `style={{}}` hors valeurs calculées.
- **Features** : `src/features/<feature>/{api,components,hooks,types}`. Attention : `features/onboarding/` est l'assistant de configuration historique des admins, sans rapport avec le module Onboarding des testeurs.
- Pas de `any` sauf nécessité. Aucune donnée client dans `console.*` ni dans Sentry.
