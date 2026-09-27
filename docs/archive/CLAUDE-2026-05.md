# KnowDesk — Guide Claude Code

> ⚙️ **Maintenance de ce fichier** : c'est le document de référence frontend, chargé automatiquement au démarrage de chaque session Claude Code. **À mettre à jour systématiquement à chaque évolution significative** : nouvelle feature, nouveau composant partagé, dépendance ajoutée, refacto important. Une feature qui n'est pas dans ce doc est invisible aux futures sessions. Même règle pour `~/KDProject/knowdesk-backend/CLAUDE.md` côté backend.

## Vue d'ensemble

KnowDesk est un SaaS de base de connaissance pour les équipes service client. Il permet aux conseillers de créer, organiser et consulter des articles et processus guidés (arbres de décision).

Le produit couvre désormais un second périmètre, **Brand Monitoring** (mai 2026) : module additionnel pour surveiller la visibilité d'une marque dans les LLM (Mistral, Perplexity) vs concurrents, avec dashboard part de voix, topics, sentiment, sources web et timeline. Pivot marché GEO (Generative Engine Optimization).

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite — déployé sur Vercel |
| Backend | Node.js + Express + TypeScript — déployé sur Railway |
| ORM | Kysely (query builder typé) |
| Base de données | PostgreSQL (Railway) |
| Cache / Queue | Redis + BullMQ (Railway) |
| Stockage fichiers | Cloudflare R2 (compatible S3) |
| Email | Resend SDK |
| Auth | JWT (access token 15min + refresh token) |

## Repos GitHub

- Backend : `BrieucLA/KnowDesk`
- Frontend : `BrieucLA/KnowDesk-frontend`

## URLs

- Production frontend : `https://app.knowdesk.fr` (Vercel — alias `know-desk-frontend.vercel.app` toujours actif comme filet pendant la transition)
- Production backend  : `https://api.knowdesk.fr`  (Railway — alias `knowdesk-production.up.railway.app` toujours actif)
- DB Railway (public) : voir variable `DATABASE_URL` dans Railway → service Postgres → onglet Variables. **Ne JAMAIS commit le mot de passe en clair** (cf incident sécurité — rotation effectuée).

## Structure des projets

### Backend (`~/KDProject/knowdesk-backend/`)

```
src/
  app.ts                          # Point d'entrée Express
  modules/
    auth/                         # Login, register, forgot/reset password
    articles/                     # CRUD articles + versioning
    categories/                   # CRUD catégories
    members/                      # Gestion membres + invitations
    notifications/                # Notifications in-app
    settings/                     # Paramètres org + danger zone
    account/                      # Profil utilisateur + onboarding
    trees/                        # Processus guidés (arbres de décision)
    superadmin/                   # Interface superadmin + impersonnification
    apikeys/                      # Génération/révocation clés API
    public/                       # Endpoints publics (X-API-Key)
    images/                       # Upload images vers R2
  middleware/
    auth.middleware.ts             # authenticate + requireRole
    apiKey.middleware.ts           # authenticateApiKey
  infrastructure/
    database/index.ts             # Kysely + types de toutes les tables
    email/index.ts                # Templates email Resend
    storage/r2.ts                 # Upload/delete Cloudflare R2
  shared/
    errors.ts                     # AppError, NotFoundError, ValidationError...
migrations/                       # node-pg-migrate (1_initial → 9_images)
```

### Frontend (`~/KDProject/knowdesk/`)

```
src/
  App.tsx                         # Router principal + guards
  store/
    authStore.ts                  # Zustand — session, onboardingDone, impersonating
  features/
    auth/                         # Login, register, forgot/reset password
    articles/                     # Liste + éditeur articles
    editor/                       # RichTextEditor custom (contenteditable)
    categories/                   # Gestion catégories
    members/                      # Équipe + invitations
    notifications/                # Panel notifications
    settings/                     # Paramètres (général, notifs, billing, API, danger)
    account/                      # Page Mon compte
    trees/                        # Processus guidés
    search/                       # Recherche globale
    help/                         # Centre d'aide contextuelle
    superadmin/                   # Interface superadmin (login, dashboard, impersonnification)
    apidocs/                      # Documentation API publique (?api-docs)
    invitation/                   # Acceptation d'invitation
    brandMonitoring/              # Brand Monitoring (mai 2026, pivot GEO)
      BrandMonitoringPage.tsx       # Orchestrateur tabs + onboarding (création projet)
      api/brandMonitoringApi.ts     # Wrapper apiClient (17 endpoints)
      types.ts                      # Miroir des types backend
      components/
        DashboardView.tsx           # Part de voix globale + par topic + actions run/cluster
        TimelineChart.tsx           # Line chart Recharts (évolution dans le temps)
        PromptsView.tsx             # CRUD prompts + modal Suggestions curated
        ResponsesView.tsx           # Drill-down réponses + modal détail + sources Perplexity
        SettingsView.tsx            # Mode LLM + secteur + sentiment + marques surveillées
  shared/
    components/
      layout/                     # AppLayout, SideNav, TopBar
      ui/                         # Button, Input, Skeleton, EmptyState, Toast, Modal, ConfirmDialog, ChipsInput, StatusBadge, ImpersonateBanner...
    lib/
      apiClient.ts                # Wrapper fetch avec auth automatique
      useToast.ts                 # Hook toasts
      formatDate.ts               # formatRelative
    types/index.ts                # User, Organization, UserRole
  styles/
    app.css                       # Design system tokens + composants de base
    sprint3.css                   # AppLayout, SideNav, TopBar, Dashboard...
    sprint4.css                   # Articles, éditeur, processus guidés...
    sprint5.css                   # Membres, settings, notifications, API keys, impersonnification...
```

## Comptes de test (local)

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@acme.fr | CqKnowdesk1! | Admin org Hubicus |
| brieuc@knowdesk.fr | SuperAdmin2025! | Superadmin |

## Commandes courantes

```bash
# Démarrer l'environnement local
cd ~/KDProject/knowdesk-backend && docker compose up -d   # PostgreSQL + Redis
cd ~/KDProject/knowdesk-backend && npm run dev             # Backend :3001
cd ~/KDProject/knowdesk && npm run dev                     # Frontend :5173

# Migrations
cd ~/KDProject/knowdesk-backend && npm run migrate         # Local
DATABASE_URL="postgresql://..." npm run migrate            # Production Railway

# Build
cd ~/KDProject/knowdesk && npm run build
cd ~/KDProject/knowdesk-backend && npm run build

# Tests frontend (vitest + jsdom)
cd ~/KDProject/knowdesk && npm test                        # run unique, exit propre
cd ~/KDProject/knowdesk && npm run test:watch              # mode watch (re-run sur save)

# Tests backend (vitest + supertest)
cd ~/KDProject/knowdesk-backend && npm test                # run unique
cd ~/KDProject/knowdesk-backend && npm run test:watch      # mode watch
```

## Conventions de code

### Backend

- Chaque module a son propre `router.ts` — jamais de logique métier dans `app.ts`
- Toutes les réponses API suivent le format `{ data: T | null, error: string | null }`
- Les erreurs passent par `next(err)` et sont gérées par le middleware global dans `app.ts`
- Kysely pour toutes les requêtes DB — jamais de SQL brut
- Les migrations sont dans `migrations/` avec le pattern `N_nom.js`
- Toujours ajouter les nouveaux types dans `src/infrastructure/database/index.ts`
- Variables d'environnement validées au démarrage via Zod dans `app.ts`

### Frontend

- Feature-based architecture — chaque feature dans `src/features/`
- Les composants partagés vont dans `src/shared/components/`
- Les appels API passent par `apiClient` (jamais `fetch()` direct dans un composant — gère cookie + refresh automatique)
- Le store Zustand (`authStore`) est persisté en `sessionStorage`
- CSS uniquement via les classes du design system — pas de `style={{}}` sauf valeurs runtime (% de barre de progression, CSS custom property dynamique pour indentation, couleur dérivée d'un map)
- Pas de `any` TypeScript sauf cas vraiment nécessaire
- **Routing** : React Router v6 wrappé via `<BrowserRouter>` dans `main.tsx`. `App.tsx` maintient un `useState<View>` + un bridge `pathToView`/`viewToPath` qui synchronise URL ↔ view dans les deux sens. Toutes les vues (sauf `?superadmin`/`?api-docs`/`?token=` legacy) ont une URL canonique deep-linkable
- **Modales** : composant `<Modal>` partagé dans `shared/components/ui/Modal.tsx` (focus trap, Escape, fermeture backdrop, `aria-modal`). Pour les confirmations destructives, utiliser `<ConfirmDialog>` qui s'appuie dessus — **jamais `window.confirm()`** (cassé visuellement, non localisable)
- **Inputs** : toujours `<Input>` (jamais `<input>` brut) pour cohérence d'accessibilité (aria-invalid, aria-describedby)
- **Error handling** : règle stricte
  - Action utilisateur échoue → `toast.error()`
  - Chargement initial échoue → `toast.error()` (l'écran reste, l'utilisateur sait)
  - Sync background non critique (analytics, autocomplete suggestions, onboarding-done) → `.catch()` silencieux légitime
  - Jamais `console.error` ou `errors.general` orphelin
- **`useToast()`** retourne une référence STABLE (instance créée au module level). Tu peux la mettre en deps de `useEffect` sans déclencher de boucle

## Design system

Voir `KNOWDESK_DESIGN_SYSTEM.docx` pour la référence complète.

Règles essentielles :
- Font : DM Sans (UI), DM Serif Display (brand only)
- Couleurs : variables CSS `--brand-*`, `--neutral-*`, `--color-danger/success`
- Border-radius : `--radius-sm/md/lg/xl/full`
- Transitions : `--t-fast` (120ms) ou `--t-normal` (200ms)
- Boutons : toujours le composant `<Button variant="..." size="...">`
- Inputs : toujours le composant `<Input>` avec label
- Loading : `<Skeleton>`, jamais de spinner global
- Toasts : `useToast()` hook

## Migrations en production

```bash
cd ~/KDProject/knowdesk-backend
# Étape 1 : déplacer le .env local pour qu'il n'écrase pas DATABASE_URL_PROD.
# node-pg-migrate (et son wrapper "npm run migrate") chargent automatiquement
# le .env présent dans le cwd et la valeur du .env local prend le dessus.
mv .env .env.bak

# Étape 2 : appliquer la migration sur prod (DATABASE_URL_PROD doit être
# exporté dans ton shell, par ex. via ~/.zshrc — ne JAMAIS commit la valeur).
DATABASE_URL="$DATABASE_URL_PROD" npm run migrate

# Étape 3 : restaurer le .env (à faire même si la migration échoue).
mv .env.bak .env
```

> ⚠️ **Sécurité** : ne JAMAIS commit la valeur réelle de `DATABASE_URL` dans le repo, ni dans aucun fichier markdown (CLAUDE.md, README, docs). Variables d'env uniquement, ou bien export shell local ignoré par git.

> ⚠️ **Ordre push/migrate** : appliquer la migration AVANT de push le code qui en dépend. Sinon Railway redéploye, le service crashe au premier appel sur les colonnes manquantes (`SELECT new_col` sur table sans la colonne) et la prod est down jusqu'à la migration. Pattern safe : `migrate prod` → `git push` → Railway redéploye sur DB déjà schemée.

> 🔄 **Rotation password Postgres** : utiliser le bouton **Regenerate** sur la variable `POSTGRES_PASSWORD` du service Postgres dans Railway (pas l'éditer manuellement). Ça déclenche un `ALTER USER` côté DB + propagation aux services qui référencent `${{ Postgres.DATABASE_URL }}`. Mettre à jour `DATABASE_URL_PROD` dans `~/.zshrc` puis `source ~/.zshrc`.

## Variables d'environnement Railway (backend)

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://app.knowdesk.fr
COOKIE_DOMAIN=.knowdesk.fr
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
RESEND_API_KEY=...
FROM_EMAIL=noreply@knowdesk.fr
R2_ACCOUNT_ID=0a0b0f1ca85a134a29898c21334dc996
R2_ACCESS_KEY_ID=5ac079e6cbcd2955db8ae446ce1cc1e3
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=knowdesk-images
R2_PUBLIC_URL=https://pub-2e6d152f4911496d8b20b31c2fe6aa28.r2.dev
```

## Variables d'environnement Vercel (frontend)

```
VITE_API_URL=https://api.knowdesk.fr/api/v1   # Production uniquement
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
VITE_MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

En **Production**, le frontend appelle l'API en URL absolue via `VITE_API_URL`. En **Preview / Development**, la variable n'est pas définie, donc `apiClient` retombe sur le chemin relatif `/api/v1` qui passe par le proxy Vite (en dev local, vers `http://localhost:3001`).

Cookies auth posés sur **`Domain=.knowdesk.fr`** (cf `COOKIE_DOMAIN` Railway) → partagés entre `app.knowdesk.fr`, `api.knowdesk.fr`, et toute extension Chrome ayant `host_permissions: ["*://*.knowdesk.fr/*"]`. SameSite=lax fonctionne parce que les sous-domaines partagent le même eTLD+1 (knowdesk.fr).

## Monitoring (Sentry)

Backend et frontend sont équipés du SDK Sentry (`@sentry/node`, `@sentry/react`).
Init conditionnelle : si `SENTRY_DSN` (backend) ou `VITE_SENTRY_DSN` (frontend)
n'est pas posée, le SDK n'est pas initialisé (cas dev local par défaut).

**2 projets Sentry séparés** : `knowdesk-backend` (Node) + `knowdesk-frontend` (React Vite).

Choix RGPD/sécurité durcis :
- `sendDefaultPii: false` — pas d'IP, pas de cookies, pas de headers PII
- `beforeSend` redact via `redactPii.ts` (email, téléphone, IBAN, carte, sécu)
- Strip systématique de `request.headers.authorization`, `cookie`, `x-api-key`, `request.data`
- Pas de Sentry Replay (trop de surface RGPD pour du contenu chat/auth)
- Pas d'upload source maps frontend (à activer ad hoc si besoin debug prod)

Sample rates :
- `tracesSampleRate: 0.1` (10%) en prod, `1.0` en dev
- Événements 401/403/422 ignorés (déjà filtrés au errorHandler côté back, 2ᵉ ligne ici)

Configuration prod :
- Railway → KnowDesk → variable `SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYY`
- Vercel → KnowDesk-frontend → variable `VITE_SENTRY_DSN=...`

Frontend : `<Sentry.ErrorBoundary>` enveloppe l'app, fallback "Une erreur s'est produite".

## Tests

Stack : **vitest + jsdom + @testing-library/react + @testing-library/jest-dom**.

```bash
npm test            # run unique, exit propre (CI ready)
npm run test:watch  # mode watch (re-run à chaque save)
```

Organisation :
- Tests **co-localisés** : `authStore.test.ts` à côté de `authStore.ts`. Pas de dossier `__tests__/` séparé.
- `vitest.config.ts` configure jsdom + setupFiles.
- `src/test-setup.ts` : import des matchers jest-dom + cleanup auto entre tests (DOM + sessionStorage).

Pattern de mock pour `apiClient` (essentiel pour tester les composants qui font des appels API) :

```ts
vi.mock('../shared/lib/apiClient', () => ({
  apiClient: { post: vi.fn(() => Promise.resolve({})), /* etc. */ },
}));
```

Pattern reset Zustand entre tests :

```ts
beforeEach(() => {
  useAuthStore.setState({ session: null, isLoaded: false, /* ... */ });
});
```

État au 2026-05-04 : **8 tests passants** (~1s).
- `src/store/authStore.test.ts` (5) : setSession, clearSession, setOnboardingDone (+ side-effect API), setImpersonating, persistence sessionStorage
- `src/router/ProtectedRoute.test.tsx` (3) : loader rehydration, redirect non-loggé (mock `window.location.replace`), rend children si loggé

Cibles à étendre (par valeur, dans cet ordre) : `apiClient` refresh + retry, `TagsInput`, `AnalyticsPage`, `ConfirmDialog`, autres composants critiques.

## Roadmap — État actuel (mai 2026)

### En production ✅
- Auth complète (login, register, forgot/reset password)
- **Login social Google + Microsoft (Sprint AUTH-1+2, mai 2026)** — boutons "Continuer avec Google/Microsoft" sur LoginForm + RegisterForm. Backend `auth.oauth.ts` : vérification idToken via google-auth-library (Google) et jose+JWKS (Microsoft, multi-tenant `/common/`). Table `auth_providers` (migration 32) lie un user à plusieurs identités externes. Matching en 3 cascades : (provider, external_id) → email match → création user+org+admin. Endpoint POST /auth/oauth idempotent. Email auto-vérifié pour les nouveaux users (Google/Microsoft ont vérifié). Disclaimer RGPD entre les boutons et le form classique. Boutons masqués via gracefully degrade si les `*_CLIENT_ID` ne sont pas posés en env.
- Articles (CRUD, versioning, restauration, publication)
- **Éditeur TipTap (Sprint EDITOR-1+2+3+partial-4, mai 2026)** — refonte complète de `RichTextEditor.tsx` sur TipTap v3 (ProseMirror), remplace l'ancien `contentEditable + execCommand` déprécié. Output HTML pour rester compatible avec les articles existants (seedés ou écrits avec l'ancien éditeur — TipTap hydrate depuis HTML brut, zéro migration de contenu). Features : toolbar 6 groupes (bold/italic/underline/strike/code, H2/H3, listes bullet/ordered/task, blockquote/code block lowlight/callout/HR, highlight 6 couleurs/table/link/image, clear formatting), bubble menu sur sélection, markdown shortcuts via Typography + StarterKit (`# `, `> `, `1. `, etc.), slash menu `/` avec 13 commandes filtrables clavier (h2, h3, listes, blockquote, code, table, hr, 4 callouts), character count footer, code blocks colorés via lowlight + 8 langs curatés (js/ts/bash/json/sql/html/css/python). Custom node `Callout` (`features/editor/extensions/Callout.ts`) avec 4 variantes info/success/warning/danger sérialisées en `<div data-type="callout" data-callout="...">`. Sanitize backend mis à jour (`shared/lib/sanitize.ts`) pour whitelister data-type, data-callout, data-checked, style. CSS `.article-content` étendue (`features/articles/articles.css`) pour rendu cohérent éditeur ↔ lecture (callouts colorés avec icône, task lists checkbox, code dark theme inline avec tokens hljs, table column resize). Bundle +550 KB minified — acceptable pour le feature set ; lazy-load route éditeur prévu en suivi si besoin perf perçue.
- Catégories arborescentes
- Membres + invitations par email
- Notifications in-app
- Paramètres (général, notifications, billing placeholder, danger zone)
- Processus guidés (arbres de décision question/réponse)
- Gestion du compte utilisateur
- Superadmin (liste orgs, disable/enable, impersonnification)
- Clés API + endpoints publics (/public/v1/categories, /articles, /trees)
- Documentation API publique (?api-docs)
- Aide contextuelle (centre d'aide avec recherche)
- Upload d'images dans les articles (Cloudflare R2)
- Liens dans les articles (externes + internes)
- Onboarding flag côté serveur
- SideNav avec initiales, bouton déconnexion dans TopBar
- Recherche intelligente (Meilisearch) — tolérance aux fautes, indexation articles + processus guidés, synonymes par organisation gérables dans Settings
- Tags libres sur les articles — chips avec auto-complétion dans l'éditeur, filtre multi-tag dans la liste, affichage sur la fiche article et le dashboard, gestion admin (rename, suppression) dans Settings
- Analytics d'utilisation — page admin/manager avec inventaire, articles à vérifier, brouillons orphelins, articles sans tag, top contributeurs, couverture par catégorie, top tags, tags inutilisés, top articles consultés, articles peu consultés, top recherches, recherches sans résultat, engagement DAU/WAU/MAU. Tracking d'événements (table events), purge cron 90 jours.
- **FAQs éditables (P0+P1)** — entité distincte des articles, accessible via `/faqs`. CRUD admin/manager (Question 200 chars / Réponse 2000 chars), catégorisation, tags réutilisés, visibilité interne/public (préparation export web P2), lien optionnel vers un article. Indexation Meilisearch (boost « FAQ » en haut du dropdown), dans la SearchBar : clic → expansion in-line de la réponse complète + bouton **Copier la réponse** (1-clic UX conseiller). **Vote 👍/👎** par tous les rôles avec compteurs et score helpful (anti-spam localStorage). **Suggesteur** sur Analytics : bannière ambre listant les recherches sans résultat (≥ 3 occurrences sur 7j) avec bouton « Créer une FAQ » qui ouvre l'éditeur avec la question pré-remplie. **Fraîcheur** : badge `À réviser` sur les FAQs publiées > 6 mois sans modification, bannière éditeur + bouton « C'est à jour ». **Historique** : panneau collapsible dans l'éditeur (audit_logs filtrés). Cycle de vie complet : zéro-result → suggestion → création → indexation → recherche → expansion + copy → vote → fraîcheur → historique.
- **SearchBar — sections par type + click outside** — les résultats sont regroupés par type (❓ FAQs / 📄 Articles / 🌳 Processus) avec headers dédiés (icône + label + compteur), sections vides masquées, l'index actif au clavier saute les headers (`role="presentation"`). Click hors de la barre ferme le dropdown sans vider la query (focus de l'input ré-ouvre).
- **KnowledgePage UX P1+P2+P3** — sidebar redimensionnable (drag handle 180-360px) + état d'expansion persisté localStorage ; séparation chevron (déplie) / nom (navigue) ; breadcrumb cliquable ; toolbar tri (Alpha / Mis à jour / Plus consultés via events `article.view` 30j) + recherche locale ; filtre articles inclut sous-cats (`includeSubcategories=true`) ; tags scopés à la sélection (counts locaux dérivés des articles chargés, masqués si zéro). **Sidebar interactive admin** : au hover ligne → bouton ··· avec menu Renommer (inline), + Sous-catégorie (modale pré-remplie), Déplacer (modale + anti-cycle backend), Supprimer (ConfirmDialog).
- **Quick switcher Cmd+J** — palette flottante en complément de la SearchBar (Cmd+K reste sur recherche). Sections : Actions / Catégories / Articles / FAQs / Processus. Fuzzy local sur catégories, Meilisearch debounced 200ms pour le contenu. Navigation clavier complète, click outside.
- **AI Search (Réponse IA)** — carte streaming Mistral au-dessus des résultats SearchBar quand la query déclenche le trigger (≥ 15 chars OU mot interrogatif). Sparkle ✨ animé pendant le streaming. Fallback "Je n'ai pas la réponse précise dans la base." si extraits insuffisants. Sources `[1] [2]…` cliquables, bouton Copier, 👍/👎 trackés (events `ai_answer.shown` + `ai_answer.feedback`). Section **✨ IA** dédiée dans Settings (admin only) : toggle on/off, secteur d'activité (texte libre), tonalité (5 enums), forme d'adresse (tu/vous/aucune), glossaire `from→to` (max 30 paires) — tout injecté dans le prompt système Mistral. Section "Réponse IA" dans Analytics avec metrics + top 5 questions/questions-sans-réponse.
- **Chatbot embeddable (FAQs P3)** — widget JS public servi à `/chat.js` (Vercel static), à intégrer sur le site client via `<script data-org="<slug>" defer>`. Vanilla JS + Web Component + Shadow DOM = isolation CSS totale du site hôte. Pipeline RAG public : Meilisearch filtré sur `visibility=public + status=published` + Mistral Small en multi-tour (history 10 derniers tours). Garde-fous : CORS dynamique vs liste blanche org, rate-limit 30 req/min/IP, prompt anti-jailbreak + hors-scope, fallback admin-configuré. Section **💬 Chatbot** dédiée dans Settings (admin) : toggle, message d'accueil, fallback (avec canaux contact), couleur primaire (input color + hex), logo URL, domaines autorisés (textarea liste blanche). Snippet d'intégration affiché avec bouton Copier. Sélecteur Visibility dans ArticleEditor + TreeEditor pour piloter ce qui est exposé.
- **Conversation Engine — chatbot avancé (Sprints 1-6, 10)** — Le widget est passé d'un endpoint stateless à un moteur conversationnel persistant côté serveur. Tables `conversations` / `conversation_turns` / `conversation_state` (migration 18). Le client ne stocke plus que `conversationId` en localStorage ; le serveur est source de vérité (audit, RGPD, multi-channel ready). **Slot filling** : quand une question est trop vague (`shouldClarify` heuristique : ≤ 5 mots porteurs + topScore < 0.45), 1× max par conversation, le bot pose une question de clarification générée par Mistral et merge la réponse avec la query initiale au tour suivant. **Quick replies déterministes** : chips sous chaque réponse bot proposant les 2 premières sources distinctes (zéro coût LLM). **Handoff structuré** (migration 19, 3 nouveaux champs `chat_handoff_*`) : `webhook` POST le transcript JSON / `email` envoie par Resend / `none` (UX pure fallback message). **UX polishing** : bouton 🙋 dans le header du widget remplace le chip « Parler à un humain » (n'apparaît que ≥ 1 turn visiteur, sinon flash visuel). Pouces 👍/👎 inline sous chaque réponse bot non-welcome (opacity 0.45, hover full) — 👍 marque `resolved`, 👎 (Sprint 10) pousse une bulle d'empathie DANS le canal qui demande l'email pour contact ultérieur ; le prochain message est intercepté côté widget : email valide → POST `/handoff(visitorEmail)` + bulle confirmation, sinon flag retombe et le RAG reprend. **Topic clustering** (migration 20, `conversations.topic`) : Mistral résume chaque conversation à la clôture en 3-6 mots (groupe nominal court) — alimente le top thématiques Analytics (groupBy topic au lieu de message brut, agrège « résiliation forfait » = « comment résilier mon forfait »). **Cron auto-abandon** : worker BullMQ `chat-cleanup` toutes les 10 min — `status='active'` inactives > 30 min → `'abandoned'` (avec topic généré en bonus). Donne enfin un `resolvedRate` significatif dans Analytics.
- **Page admin Chats** (`/chats`, admin only) — nouvelle entrée sidebar entre Analytics et Settings. Liste paginée 20/page triée date desc, filtre statut (all / active / resolved / escalated / abandoned), recherche full-text dans les transcripts (Postgres ILIKE sur `conversation_turns.content`). Chaque ligne affiche thématique + 1ʳᵉ question italique + badge statut + nb messages + CSAT/👍👎 si voté + date relative. Modale plein écran (`<Modal size="lg">`) avec bandeau métadonnées + bulles chat (visiteur droite/brand, bot gauche/blanc) scrollables max 60vh. URL deep-linkable.
- **Prompt système chatbot personnalisable (Sprint 9, migration 21 `chat_system_prompt`)** — Settings → ✨ IA chatbot enrichi de 2 nouveaux blocs : **Personnalisation** (les 4 champs `industry` / `tone` / `addressForm` / `glossary` apparaissent ici aussi, partagés avec Réponse IA — note explicite affichée, 2 PATCHs en parallèle au save) et **Prompt système** (textarea pré-rempli avec le prompt actuellement utilisé : custom s'il existe, sinon le défaut généré par `buildSystemPrompt(perso, fallback)`). Édition libre = override total. Bouton **↺ Restaurer le défaut** repose `null` en DB. Min 50 chars, max 8000. Le défaut est recalculé à chaque GET `/settings/org` pour rester en phase avec les valeurs perso courantes.
- **Analytics — dédup préfixes Réponse IA (Sprint 8)** — la section "Top questions" et "Questions sans réponse" filtre désormais les events `ai_answer.shown` "intermédiaires" : pour chaque user, un event dont la `query` est strictement préfixe d'un autre event du même user dans une fenêtre 60s est considéré comme keystroke en cours et écarté. Implémenté en post-processing JS sur ≤ 5000 events (lisible vs NOT EXISTS imbriqué). Rétro-actif. Côté frontend, debounce `useAiAnswer` monté 600 → 1200ms pour limiter à la source.
- **Disclaimer RGPD chatbot (mai 2026)** — au 1ᵉʳ ouverture du widget chez un visiteur, écran dédié « Avant de commencer » avec icône, texte de transparence (configurable depuis Settings → Chatbot → Confidentialité RGPD, sinon défaut), lien optionnel vers la politique de confidentialité, bouton « J'ai compris ». Acquittement persisté localStorage par orgSlug + version (`PRIVACY_VERSION='v1'`). Migration `25_chat_privacy.js` ajoute `chat_privacy_notice` + `chat_privacy_policy_url` sur organizations.
- **Modèles IA configurables (mai 2026)** — Settings → 🧠 Modèles IA (admin only) liste les 4 services IA de la plateforme (Génération chatbot / SearchBar / Slot-filling / Topic clustering) avec leur modèle actuel et drapeau région 🇫🇷. Seul "Génération chatbot" est modifiable en V1 — radio cards parmi 4 modèles Mistral (Small / Ministral 8B / Medium / Large) avec badge latence (Rapide/Équilibré/Précis) et coût relatif (×1 → ×10). Les autres services restent verrouillés sur `config.AI_MODEL` global avec cadenas + tooltip. Effet immédiat sur le prochain turn bot, y compris dans les conversations actives. Composant `AiModelsSection.tsx` + API `aiModelsApi` (`GET /settings/org/ai-services`, `PATCH /settings/org/chat/model`). Pas de fallback : erreur Mistral → erreur dure côté widget. Migrations backend `26_chat_model.js` et `27_conversation_turn_model.js`.
- **Prompt système templaté avec variables Mustache (mai 2026)** — Settings → ✨ IA chatbot → "Prompt système" : le textarea contient maintenant un template avec variables `{{industry}}`, `{{tone_description}}`, `{{glossary}}`, `{{response_modes}}`, etc. au lieu d'un texte figé. L'admin peut réorganiser/réécrire le prompt en gardant les variables — elles continuent de refléter automatiquement les changements de tonalité, glossaire, fallback. Layout 2 colonnes : textarea à gauche + nouveau composant `PromptVariablesPanel.tsx` à droite (liste cliquable des 8 variables avec description + valeur courante). Clic = insertion `{{var}}` à la position du curseur. Warning UI rouge si l'admin retire `{{response_modes}}` (perte des garde-fous anti-jailbreak / mode fallback). Migration backend `28_chat_system_prompt_reset.js` écrase tous les prompts custom existants (passage du format figé au template Mustache).
- **Rétention conversations chat + purge RGPD (mai 2026)** — Settings → Chatbot expose un sélecteur **30 / 60 / 90 / 180 jours** (default 90, CHECK SQL). Au save d'une valeur plus basse, `GET /settings/org/chat/retention-preview?days=N` renvoie le compte de conversations qui seront purgées et un ConfirmDialog en avertit l'admin. Worker BullMQ `chat-purge` quotidien à 3h hard-delete les conversations dont `started_at < NOW() - retention_days` (CASCADE FK supprime turns + state). Migration `24_chat_retention_days.js`.
- **PII redaction admin chats (mai 2026)** — `shared/redactPii.ts` (côté backend) applique 5 regex (sécu, IBAN, carte, téléphone, email) sur les content du transcript admin Chats. Email et téléphone reçoivent un masque partiel (`j****@e****.com`, `06 ** ** ** 78`), IBAN/carte/sécu un token générique. Badge « 🔒 Coordonnées masquées » en tête de modale transcript. **Pas appliqué** : pipeline RAG (besoin du contexte brut), widget public, stockage DB.
- **Audit log admin (mai 2026)** — page `/audit` (admin only, pas managers — `adminStrict` dans NavItem) avec tableau filtrable (action, dates), modal détail metadata JSON. Couverture étendue : 29 actions tracées (articles, members, account, apikeys, tags, synonyms, faqs, trees, categories, settings org chat/ai/general, superadmin.impersonate.start/stop). Endpoint `GET /api/v1/audit-logs` avec hydratation user + emails superadmins. Worker `audit-purge` quotidien retient 1 an. **Immuable côté admin** (aucun POST/DELETE exposé). Voir CLAUDE.md backend pour le pattern d'écriture (`auditLog` middleware factory + `writeAuditLog` helper).
- **Impersonation superadmin tracée (mai 2026)** — JWT d'impersonation porte `impersonated_by` + `impersonated_by_email` + `impersonated:true`. Backend `/superadmin/impersonate/:orgId` pose le cookie HTTP-only `access_token` (sinon le navigateur garde l'ancien cookie admin et toutes les actions sont mal attribuées). Endpoint `/superadmin/impersonate/stop` clear le cookie côté serveur (appelé par `ImpersonateBanner.handleReturn`). Toute action effectuée en impersonation est marquée dans audit log avec `metadata.impersonatedBy/Email`. Cookies same-site lax via Vercel rewrite — `saFetch` côté frontend utilise `/api/v1/superadmin` relatif + `credentials:include` (cohérent avec apiClient).
- **Refacto UI/UX (axes A→E)** — `<ConfirmDialog>` (4 `confirm()` natifs remplacés), `<Modal>` partagé avec focus trap (8 modales unifiées), 2 `<input>` bruts → `<Input>`, `fetch()` direct → `apiClient`, error handling unifié (toasts partout, plus aucun silent failure côté UI), 16 styles inline → 8 (tous légitimes runtime)
- **React Router v6** côté frontend (Phases G1+G2) — toutes les vues (`/dashboard`, `/knowledge`, `/articles/:id`, `/articles/:id/edit`, `/articles/new`, `/trees`, `/trees/:id`, `/trees/:id/edit`, `/members`, `/analytics`, `/settings`, `/account`) ont une URL canonique : deep-linking, F5 préserve l'écran, bouton Précédent fonctionnel, partage de liens. Bridge URL ↔ `useState<View>` dans `App.tsx` (cleanup vers `<Routes>` direct prévu en G3)
- Pool PG résilient — `pool.on('error')` listener (empêche les crashs silencieux quand un client idle perd sa connexion), `max: 20`, `keepAlive`. Rate limiter skippé en `NODE_ENV=development` pour ne pas gêner le dev local
- **Brand Monitoring V1 — UI complète (mai 2026, pivot GEO)** — nouveau module produit accessible via sidebar « Brand monitoring » (admin/manager only, icône radar). Route `/brand-monitoring`. Page principale `BrandMonitoringPage.tsx` avec 4 tabs internes :
  - **Dashboard** : part de voix globale (barres horizontales CSS pures, owner ⭐ en couleur brand) + part de voix par topic (sections collapsibles) + timeline temporelle (line chart Recharts). Actions « Lancer un run » et « Regrouper les prompts par topic ». Header projet : compteurs marques/prompts/runs + quota mensuel restant.
  - **Prompts** : CRUD prompts (ajout unitaire + import bulk paste + bouton ✨ Suggestions qui ouvre un modal avec 25 prompts curated du secteur, checkbox-list). Toggle actif/inactif inline.
  - **Réponses** : table drill-down (50 dernières), colonne « Sources » avec compteur (chip bleu si Perplexity), modal détail avec contenu complet + chips mentions colorées par sentiment (😊 vert / 😐 gris / 😞 rouge) + liste des sources web cliquables si présentes.
  - **Paramètres** : Mode LLM (radio Mémoire / Recherche / Les deux) + Secteur d'activité (Select Énergie / Assurance / Distribution alimentaire / Téléphonie mobile / Luxe pour débloquer Suggestions) + Toggle analyse sentiment + CRUD marques surveillées (owner unique + concurrents avec aliases JSONB).

  Dépendance ajoutée : **Recharts ^3.8** (bundle +130 KB minifié) — utilisée uniquement par TimelineChart. CSS co-localisé `brandMonitoring.css`. Onboarding empty-state si pas encore de projet (formulaire création simple).

  Cf section backend (`knowdesk-backend/CLAUDE.md`) pour le détail de l'API (17 endpoints), les migrations (34-38), les wrappers LLM (mistralClient, perplexityClient), le worker BullMQ et les coûts mesurés.

- **Settings → Modèles IA — regroupement par catégorie (Sprint R-S1, mai 2026)** : la page Settings → Modèles IA regroupe désormais les services par catégorie d'usage : 💬 Chatbot (chat-response, chat-query-rewrite, slot-filling, topic-clustering), 🔎 Recherche (search-ai), 📚 KB (article-quality, import-pdf-slicing, import-pdf-vision), 🎓 Formations (learning-quiz), 📊 Brand Monitoring (brand-monitoring-memory/search/sentiment/clustering). Le backend `GET /settings/org/ai-services` retourne `categories[]` en plus de `services[]` ; le frontend filtre `services` par `category.key` pour grouper. Side benefit : on a maintenant l'inventaire complet des 13 services IA de la plateforme et de leur modèle effectif dans une vue unique.

- **Brand Monitoring — rendering markdown des réponses (Sprint R-S2, mai 2026)** : nouveau composant `MarkdownContent.tsx` qui rend les réponses LLM en HTML safe (titres `##`, listes, **gras**, code, tableaux GFM, liens `target=_blank`, citations `[1]`) au lieu du `<pre>` brut illisible. Dépendances ajoutées : `react-markdown` + `remark-gfm`. CSS dédié `.bm-md` co-localisé dans `brandMonitoring.css`. Pas de raw HTML rendu (react-markdown safe par défaut), donc même un contenu LLM malveillant ne peut pas injecter de script.

- **Brand Monitoring — Recommandations actionnables (Sprint R-S8, mai 2026)** : nouvelle carte « Actions à mener » dans le Dashboard, alimentée par la génération déterministe côté backend de 4 types de signaux. Bouton « 💡 Générer les recommandations » à côté des actions Run + Cluster topics. Chaque carte de reco a un bord coloré selon `kind` (rouge `absent_from_llm`, orange `missing_topic`, brand `missing_attribute`, vert `missing_source`), un badge type, et un bouton « ✓ Traité » qui soft-dismiss la reco côté backend.

- **Brand Monitoring — Brand alignment narrative (Sprint R-S7, mai 2026)** : `BrandProject.desired_attributes: string[]` (3-8 attributs prioritaires saisis par l'admin) + `alignment_enabled: boolean` opt-in. Quand activé, chaque réponse passe par un LLM judge Mistral qui extrait les attributs associés à chaque marque (stockés dans `BrandMention.attributes: string[]`). SettingsView : textarea pour saisir les attributs prioritaires + toggle d'activation, hint sur le coût quota. DashboardView : nouvelle carte « Alignement narrative » avec un score d'alignement par marque (% des attributs souhaités effectivement présents) + chips d'attributs observés (couleur brand pour les attributs souhaités, gris pour les autres avec `bm-chip` et `bm-chip--owner`). Type `AlignmentPayload` côté frontend.

- **Brand Monitoring — AI Shopping V1 (Sprint R-S6, mai 2026)** : `MonitoredBrand.kind: 'brand' | 'product'` permet de surveiller à la fois les enseignes (Auchan vs Carrefour) et les produits / MDD (Auchan Bio vs Carrefour Bio) sur le même projet. SettingsView : radio 'Marque / Produit' lors de la création, liste split en 2 sections (la section Produits est masquée tant qu'aucun produit n'a été ajouté). DashboardView : si au moins 1 produit existe, la card « Part de voix » est splittée en 2 (marques vs produits) avec pct recalculés bucket par bucket pour ne pas mélanger les analyses business.

- **Brand Monitoring — multi-LLM élargi (Sprint R-S3, mai 2026)** : remplacement du radio « Mode LLM » par une checkbox-list de providers. 6 providers supportés : Mistral Medium (mémoire), Perplexity Sonar Pro (recherche + sources), OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, xAI Grok-2. `BrandProject.enabled_providers: BrandMonitoringProvider[]` + endpoint `GET /providers` qui liste les meta de chaque provider (label, description, exposesSources, configured). Les providers sans clé API en env sont grisés dans l'UI avec chip « Clé API requise ». Toast info au toggle qui rappelle le multiplicateur de quota (×N providers actifs).

### Haute priorité
- Toasts sur les erreurs API
- Stripe billing — plans, quotas, page de facturation

### Issu de l'analyse Mayday — Priorité 1 — État
- ~~FAQs éditables~~ ✅ livré P0+P1 (cycle complet conseiller + admin). Reste **P2 export web** (visibility=public déjà préparé en DB).
- ~~Chatbot~~ ✅ livré (couvre articles + processus + FAQs publics, pas seulement FAQs). Avec moteur conversationnel complet (Sprints 1-10) : persistence serveur, slot filling, quick replies, handoff structuré, pouces inline, topic clustering, page admin Chats.

### Issu de l'analyse Mayday — Priorité 2
- Mode appel en cours — suggestions contextuelles
- Processus guidés enrichis — variables, conditions
- Workflow de validation du contenu
- Centre d'aide V2 (Sprint Help-D) — ouvrir l'article pertinent depuis le contexte (pas la section), footer feedback 👍/👎 sur chaque article (tracké via la table events), parseur markdown standard avec support des images, indexation Meilisearch dédiée si l'aide grossit au-delà de ~50 articles.

### Backlog produit — En attente d'arbitrage

- **Extension Chrome** — POC technique validé en mai 2026 (auth Bearer + search Meilisearch + AI Answer streamée fonctionnent depuis `chrome-extension://`). Code dans `~/KDProject/knowdesk-extension/` (manifest V3, popup vanilla JS, ~700 lignes). Backend modifié : CORS autorise génériquement `chrome-extension://*` (commit `62e48eb`).
  - **V1 prévue** (~4-5 sem dev) : refresh token Bearer côté backend (modif minor `auth.controller` pour retourner `refreshToken` en JSON), polish UX (states erreurs, mot de passe oublié → web), tracking events (`extension.search`, `extension.ai_answer.shown`, `extension.opened_in_app`), icônes propres 16/48/128 PNG, soumission Chrome Web Store + paquet `.crx` self-hosted.
  - **V2 si pilote OK** : raccourci clavier global (`Cmd+Shift+K` configurable), overlay content-script en alternative au popup classique, preview inline d'article, port Edge.
  - **Pré-requis V1** : 1 client champion engagé par écrit à déployer dans les 30j post-livraison (sans cet engagement, on ne lance pas le dev — risque adoption IT corporate).
  - **Custom domain** `app.knowdesk.fr` ✅ livré le 2026-05-09 (cf section Refacto). Le SSO unifié web ↔ extension est désormais débloqué techniquement : le cookie `Domain=.knowdesk.fr` peut être lu par toute extension ayant `host_permissions: ["*://*.knowdesk.fr/*"]`. À implémenter dans la V1 de l'extension.

- **Sprint B — Copilote rédaction IA** (~3-4 sem dev, *à activer après Sprint A « Auditeur qualité » si calibration OK*) :
  - **B.1 Analyse one-shot** : bouton « ✨ Analyser » dans `ArticleEditor` qui réutilise le scoring du Sprint A en mode synchrone (5-10s). Affiche les dimensions flagged + propositions concrètes inline (« reformulation suggérée », « exemple manquant »). Diff visible avant validation. Pas de modification auto.
  - **B.2 Actions ciblées sur sélection** : menu contextuel limité à 5 actions (Reformuler concis / Reformuler clair / Convertir en liste / Ajouter un exemple / Adapter au glossaire org). Pas de chat libre. Pas de génération from scratch.
  - **B.3 (optionnel) Génération FAQs depuis article** : bouton dans l'éditeur → Mistral propose 3-5 paires Q/A → l'auteur valide → save dans `faqs` avec `source_article_id`.
  - **Risques à mitiger** : effet Clippy (opt-in strict, pas de popup auto), biais verbeux (prompt valorise concision), Mistral inventif (toujours un diff visible avant apply).
  - **Pré-requis** : Sprint A.1+A.2 livrés ET utilisés (admin clique sur les recommandations) — sans ça, le copilote n'a pas de modèle de qualité fiable derrière lui.

- **Sprint EDITOR-4 finitions (~2-3 j)** : éléments différés du sprint éditeur TipTap V1 :
  - **Drag handles** sur les blocks pour réorganiser par drag-and-drop. Pas d'extension TipTap officielle bien maintenue ; nécessite un custom ProseMirror plugin avec décorations qui ajoute une poignée à chaque bloc top-level. Pattern Linear/Notion. ~1.5 j.
  - **Emoji picker autocomplete** via `:` (même pattern que slash menu). Liste curatée de ~150 emojis populaires + recherche par nom (joie, coeur, check, etc.). ~0.5 j.
  - **Focus mode** (zen) : masque la sidebar + topbar pendant l'édition d'un article pour concentration totale. ~0.5 j.
  - **Lazy-load de la route éditeur** (`React.lazy + Suspense`) pour gagner ~550 KB sur le first paint (TipTap+lowlight n'est utilisé que dans `/articles/new` et `/articles/:id/edit`). ~0.3 j.
  - À déclencher selon retours d'usage : si les contributeurs réclament le drag, on l'ajoute. Sinon, ce sprint reste en backlog.

### Refacto à venir
- **Phase G3** (~1j) : nettoyer le bridge `useState<View>` ↔ Router dans `App.tsx`, passer en `<Routes><Route ...></Routes>` direct + `useParams`. Convertir `?superadmin` / `?api-docs` / `?token=` en routes propres (`/superadmin`, `/api-docs`, `/invitation/:token`).
- **API publique — OpenAPI source de vérité** (~1 sprint, à challenger) : remplacer la doc custom (`features/apidocs/`) par un schéma OpenAPI 3.x généré depuis le backend via `@asteasolutions/zod-to-openapi` (les schémas Zod existants servent de base), exposé sur `/public/v1/openapi.json`. Côté frontend, intégrer **Scalar API Reference** (ou Redoc / Stoplight Elements) pour consommer le JSON et générer la page automatiquement. Bénéfices : doc qui ne peut plus diverger du code, "Try it" intégré, search bar, multi-langage natif. ROI à challenger : aujourd'hui 5 endpoints GET seulement, l'effort/gain devient évident à partir de 15+ endpoints ou si on commence à avoir des intégrateurs externes.
- ~~**Axe F — CSS par feature**~~ ✅ livré mai 2026 (~4 800 lignes migrées). Architecture : `src/styles/{tokens,base,layout}.css` global + chaque composant UI partagé et chaque feature ont leur propre `.css` co-localisé importé via leur `.tsx`. Stylelint configuré (`npm run lint:css`) avec `stylelint-config-standard` ; règles cosmétiques (1 décl/ligne, lightness-notation, etc.) désactivées pour respecter le mix existant.
- **Axe F+ — finitions CSS (à challenger plus tard)** :
  - **Reformatage uniforme 1-décl-par-ligne** : ~556 violations désactivées dans la config. Réactiver `declaration-block-single-line-max-declarations` puis `npm run lint:css -- --fix` (~30 min). Risque visuel faible mais à valider.
  - **Renaming BEM strict** : mix actuel `.btn-primary` (legacy) vs `.btn--primary` (BEM). Sprint dédié si gêne lisibilité. Breaking pour le LSP, à coordonner.
  - **Critical CSS extraction** : Vite plugin pour inline le CSS critique au first paint (LCP). Pas urgent tant qu'on ne mesure pas un souci de perf.
  - **CSS Modules / Tailwind** : isolation auto vs convention BEM globale. Gros chantier (~3 sprints), à déclencher seulement si conflits de classes deviennent un problème récurrent.
- **Retirer le fallback Bearer** dans `auth.middleware` une fois que tous les clients utilisent les cookies (~1 sprint après stabilisation). Retirer aussi `accessToken` du retour JSON de `auth.controller` et du type `AuthSession` côté frontend.
- **Hook `useApi` générique** côté frontend (~7 hooks de fetch redupliqués) : pattern uniforme loading/error/data, intégration apiClient, retour typé.
- ~~**Custom domain** (`app.knowdesk.fr` + `api.knowdesk.fr`)~~ ✅ livré 2026-05-09. Frontend sur `app.knowdesk.fr` (Vercel custom domain), backend sur `api.knowdesk.fr` (Railway custom domain). Cookies posés sur `.knowdesk.fr` (env var `COOKIE_DOMAIN`) partagés entre sous-domaines. Frontend en URL absolue via `VITE_API_URL`, plus de rewrite Vercel. Anciens domaines (`know-desk-frontend.vercel.app` et `knowdesk-production.up.railway.app`) toujours actifs comme alias filet pendant la transition. **Phase 6 (deprecation) à faire dans 4-8 semaines** : retirer l'ancienne URL Vercel de la CORS allowlist backend une fois sûr qu'aucun trafic n'y passe.
- **Tests frontend** : socle posé (8 tests sur authStore + ProtectedRoute, vitest + jsdom + Testing Library — voir section « Tests » ci-dessus). Cibles à étendre : `apiClient` refresh+retry, `TagsInput` autocomplete, `ArticleEditor`, `AnalyticsPage`, le bridge router. Côté backend, **65 tests passants** (auth + multi-tenancy + permissions + FAQs).
- **Multilingue FR + EN** (~5-7 sprints au total, à challenger) — projet ambitieux mis en backlog. Découpé en 4 phases :
  - **Phase 1 — i18n UI** (~2-3 sprints) : `react-i18next` ou équivalent, extraction des ~600-800 strings hardcodées, 2 fichiers `fr.json`/`en.json`, setting `language` user (default depuis `navigator.language`), templates emails Resend par langue, aide en ligne (53 articles markdown) traduite **manuellement** par humain (qualité prime).
  - **Phase 2 — Articles avec langue déclarée** (~1 sprint) : champ `language` sur `articles` et `faqs` (default `fr` pour l'existant), détection auto au save (LLM court) avec override, filtre dans liste/search, bandeau « Cet article est en anglais » sans traduction encore.
  - **Phase 3 — Traduction à la volée** (~1-2 sprints) : moteur DeepL recommandé (qualité industrielle FR↔EN, ~20€/mois pour 500k chars) ou OpenAI/Anthropic avec prompt dédié. **LibreTranslate à éviter** sauf budget zéro (qualité insuffisante pour du contenu support client = risque légal). Cache DB obligatoire (table `article_translations` avec invalidation au `version` de l'article). Bandeau « Traduit automatiquement • Voir l'original ».
  - **Phase 4 — Recherche multilingue** (~1-2 sprints, à challenger) : 3 options — traduire la query au runtime, indexer les traductions Meilisearch, ou embeddings multilingues. Choix selon volume d'articles cross-lang à ce moment.
  
  **Questions structurantes à trancher avant de démarrer** :
  - Persona n°1 : org FR avec clients EN ? Équipes internationales bilingues ? Belges/Suisses multi-officielles ?
  - Article = 1 langue ou plusieurs versions par langue (modèle data radicalement différent) ?
  - L'admin org peut-il imposer la langue par défaut ?
  - Qualité ou vitesse pour la trad UI (humaine vs auto-LLM) ?
  - Moteur de traduction : qui choisit, qui paie ?
  - Latence acceptable à la volée (DeepL ~200ms vs OpenAI 1-3s — change l'UX) ?
  - FAQs P2 (export web) et P3 (chatbot) : traduction dans le scope ?
  
  **Risques identifiés** :
  - Traduction fautive sur de la « politique de remboursement » = litige client / risque légal — qui assume ?
  - Recherche multilingue mal foutue = frustration immédiate du conseiller bilingue
  - Coût LLM non maîtrisé sans cache DB (× N consultations)
  - I18n UI sous-estimée : ~600-800 strings dispersées, ~3-5j de mécanique + 1 sprint trad

- **SearchBar — Tags as results** (~3h, à challenger) : nouvelle section *« 🏷 Tags »* dans le dropdown (entre Articles et Processus). Endpoint `/api/v1/search/tags?q=...` qui matche sur les tags de l'org, retour `{ id, displayName, articlesCount, faqsCount }`. UI : chips compactes (pas des items pleine largeur), clic → `navigate('/knowledge?tags=<name>')` + ferme le dropdown. Valeur attendue : raccourci puissant pour les conseillers qui pensent en thématiques plutôt qu'en titres. Pas urgent — à valider après quelques semaines d'usage des sections.
- **FAQs P2 — Export web public** (~1 sprint) : visibility=public déjà en DB. Endpoint `/public/v1/faqs?visibility=public` à exposer, widget JS embed (`<script src="...">`) avec customisation visuelle, page hébergée optionnelle (`faq.knowdesk.fr/{org-slug}`), Schema.org FAQPage JSON-LD pour le SEO. À déclencher une fois l'adoption interne validée (helpful score moyen > 60% sur les FAQs publiques).
- **FAQs P3 — Chatbot** (~2 sprints) : endpoint conversational `/public/v1/chat`, widget chat embarquable, semantic match sur les FAQs publiques (Meilisearch + reranking ou embeddings type OpenAI), fallback escalation vers humain. Boucle d'apprentissage : conversations sans réponse satisfaisante → suggestions de FAQs côté admin. À gater derrière un seuil quantitatif (≥ 50 FAQs publiques helpful > 70%) — un chatbot médiocre est pire que pas de chatbot.

### Import de documents (plan rédigé)
- MVP : import PDF/DOCX → article
- V2 : import PPTX, import en lot

### Infrastructure
- ~~Sentry DSN configuré~~ ✅ activé mai 2026 (2 projets : `knowdesk-backend`, `knowdesk-frontend`, voir section Monitoring)
- ~~Tests frontend~~ socle posé mai 2026 (8 tests authStore + ProtectedRoute, voir section Tests)
- ~~CI/CD GitHub Actions backend~~ ✅ actif mai 2026 (workflow `CI KnowDesk Backend`, voir CLAUDE.md backend section « CI / Déploiement »). Quality gate uniquement (lint + typecheck + 68 tests) ; le déploiement reste géré par Railway native auto-deploy en parallèle.
- CI/CD frontend pas encore en place (Vercel auto-deploy fait office de pipeline mais sans gate type-check/build avant push). À ajouter si on veut bloquer un push qui casse le build.

## Cloudflare R2

- Bucket : `knowdesk-images` (région EU)
- Endpoint S3 : `https://0a0b0f1ca85a134a29898c21334dc996.eu.r2.cloudflarestorage.com`
- URL publique : `https://pub-2e6d152f4911496d8b20b31c2fe6aa28.r2.dev`
- Structure des clés : `orgs/{orgId}/articles/{articleId}/{uuid}.{ext}`
