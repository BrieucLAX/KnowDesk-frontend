import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginPage }        from './features/auth/components/LoginPage';
import { VerifyEmailPage }  from './features/auth/components/VerifyEmailPage';
import { PrivacyPage }      from './features/privacy/PrivacyPage';
import { EmailVerificationBanner } from './features/auth/components/EmailVerificationBanner';
import { OnboardingPage }   from './features/onboarding/components/OnboardingPage';
import { DashboardPage }    from './features/dashboard/components/DashboardPage';
import { ArticlePage }      from './features/articles/components/ArticlePage';
import { KnowledgePage }    from './features/knowledge/components/KnowledgePage';
import { QuestionTreePage } from './features/knowledge/components/QuestionTreePage';
import { ArticleEditor }    from './features/editor/components/ArticleEditor';
import { AcceptInvitationPage } from './features/invitation/components/AcceptInvitationPage';
import { TreesPage }    from './features/trees/components/TreesPage';
import { TreeEditor }  from './features/trees/components/TreeEditor';
import { AccountPage }      from './features/account/components/AccountPage';
import { OnboardingHomePage }    from './features/onboardingProjects/components/OnboardingHomePage';
import { OnboardingProjectPage, type ProjectTab } from './features/onboardingProjects/components/OnboardingProjectPage';
import { FaqsPage }         from './features/faqs/components/FaqsPage';
import { FaqEditor }        from './features/faqs/components/FaqEditor';
import { SuperadminApp }   from './features/superadmin/components/SuperadminApp';
import { HelpPanel }       from './features/help/components/HelpPanel';
import { ApiDocsApp }     from './features/apidocs/components/ApiDocsApp';
import { MembersPage }      from './features/members/components/MembersPage';
import { SettingsPage }     from './features/settings/components/SettingsPage';
import { AnalyticsPage }    from './features/analytics/components/AnalyticsPage';
import { ChatsPage }        from './features/chats/components/ChatsPage';
import { BrandMonitoringPage } from './features/brandMonitoring/BrandMonitoringPage';
import { LearningPage }     from './features/learning/components/LearningPage';
import { LearningPathEditor } from './features/learning/components/LearningPathEditor';
import { LearningPlayer }     from './features/learning/components/LearningPlayer';
import { SearchBar }        from './features/search/components/SearchBar';
import { CommandPalette }   from './features/search/components/CommandPalette';
import { AppLayout }        from './shared/components/layout/AppLayout';
import { ImpersonateBanner } from './shared/components/ui/ImpersonateBanner';
import { NetworkErrorBanner } from './shared/components/ui/NetworkErrorBanner';
import { ToastContainer }   from './shared/components/ui/ToastContainer';
import { ProtectedRoute }   from './router/ProtectedRoute';
import { apiClient, ApiError } from './shared/lib/apiClient';
import {
  useAuthStore, selectIsLoggedIn, selectUserRole, selectOrganization,
} from './store/authStore';
import { canRunSetupWizard, canSeeScreen, hasModule } from './shared/lib/modules';
import type { AuthSession }  from './features/auth/types';
import type { SearchResult } from './features/search/types';



type Screen =
  | 'dashboard'
  | 'knowledge'
  | 'article'
  | 'tree'
  | 'editor'
  | 'members'
  | 'analytics'
  | 'chats'
  | 'brand-monitoring'
  | 'settings'
  | 'trees'
  | 'tree-editor'
  | 'account'
  | 'faqs'
  | 'faq-editor'
  | 'learning'
  | 'learning-edit'
  | 'learning-play'
  | 'onboarding'
  | 'onboarding-project';

type View =
  | { screen: 'dashboard' }
  | { screen: 'knowledge' }
  | { screen: 'article';  articleId: string; from: Screen }
  | { screen: 'tree';     treeId: string;    from: Screen }
  | { screen: 'editor';   articleId?: string; from: Screen }
  | { screen: 'members'  }
  | { screen: 'analytics' }
  | { screen: 'chats' }
  | { screen: 'brand-monitoring' }
  | { screen: 'settings'; section?: string  }
  | { screen: 'trees' }
  | { screen: 'tree-editor'; treeId: string }
  | { screen: 'account' }
  | { screen: 'faqs' }
  | { screen: 'faq-editor'; faqId?: string }
  | { screen: 'learning' }
  | { screen: 'learning-edit'; pathId: string }
  | { screen: 'learning-play'; moduleId: string }
  | { screen: 'onboarding' }
  | { screen: 'onboarding-project'; projectId: string; tab: ProjectTab; validationId?: string };

/** Suffixe d'URL de chaque onglet d'un projet d'onboarding. */
const ONBOARDING_TAB_PATHS: Record<ProjectTab, string> = {
  documents: '', cadrage: '/cadrage', analysis: '/analyse', audit: '/audit', base: '/base',
};

/** Maps URL pathname to a View. Returns null for unmapped paths. */
function pathToView(pathname: string, fallbackFrom: Screen): View | null {
  if (pathname === '/' || pathname === '')        return { screen: 'dashboard' };
  if (pathname === '/knowledge')                  return { screen: 'knowledge' };
  if (pathname === '/articles/new')               return { screen: 'editor', from: fallbackFrom };
  if (pathname === '/members')                    return { screen: 'members' };
  if (pathname === '/analytics')                  return { screen: 'analytics' };
  if (pathname === '/chats')                      return { screen: 'chats' };
  if (pathname === '/brand-monitoring')           return { screen: 'brand-monitoring' };
  // /audit reste un deep-link mais ouvre désormais la section Audit
  // dans /settings — la page standalone a été dépréciée.
  if (pathname === '/audit')                      return { screen: 'settings', section: 'audit' };
  if (pathname === '/learning')                   return { screen: 'learning' };
  const learningEditMatch = pathname.match(/^\/learning\/([^/]+)\/edit$/);
  if (learningEditMatch) return { screen: 'learning-edit', pathId: learningEditMatch[1] };
  const learningPlayMatch = pathname.match(/^\/learning\/play\/([^/]+)$/);
  if (learningPlayMatch) return { screen: 'learning-play', moduleId: learningPlayMatch[1] };
  if (pathname === '/settings')                   return { screen: 'settings' };
  if (pathname === '/account')                    return { screen: 'account' };
  if (pathname === '/trees')                      return { screen: 'trees' };
  if (pathname === '/faqs')                       return { screen: 'faqs' };
  if (pathname === '/faqs/new')                   return { screen: 'faq-editor' };
  if (pathname === '/onboarding')                 return { screen: 'onboarding' };
  // Version propre d'une base validée : un écran à part, sous l'onglet « Nouvelle base ».
  const validatedMatch = pathname.match(/^\/onboarding\/projects\/([^/]+)\/base\/validee\/([^/]+)$/);
  if (validatedMatch) return { screen: 'onboarding-project', projectId: validatedMatch[1], tab: 'base', validationId: validatedMatch[2] };
  const onboardingMatch = pathname.match(/^\/onboarding\/projects\/([^/]+)(?:\/(cadrage|analyse|audit|base))?$/);
  if (onboardingMatch) {
    const tab: ProjectTab = onboardingMatch[2] === 'cadrage' ? 'cadrage'
      : onboardingMatch[2] === 'analyse' ? 'analysis'
      : onboardingMatch[2] === 'audit' ? 'audit'
      : onboardingMatch[2] === 'base' ? 'base'
      : 'documents';
    return { screen: 'onboarding-project', projectId: onboardingMatch[1], tab };
  }

  const faqEditMatch = pathname.match(/^\/faqs\/([^/]+)\/edit$/);
  if (faqEditMatch) return { screen: 'faq-editor', faqId: faqEditMatch[1] };

  const editMatch = pathname.match(/^\/articles\/([^/]+)\/edit$/);
  if (editMatch) return { screen: 'editor', articleId: editMatch[1], from: 'article' };

  const articleMatch = pathname.match(/^\/articles\/([^/]+)$/);
  if (articleMatch) return { screen: 'article', articleId: articleMatch[1], from: fallbackFrom };

  // /trees/:id/edit AVANT /trees/:id (sinon le second matche aussi)
  const treeEditMatch = pathname.match(/^\/trees\/([^/]+)\/edit$/);
  if (treeEditMatch) return { screen: 'tree-editor', treeId: treeEditMatch[1] };

  const treeMatch = pathname.match(/^\/trees\/([^/]+)$/);
  if (treeMatch) return { screen: 'tree', treeId: treeMatch[1], from: fallbackFrom };

  return null;
}

/**
 * Paths gérés par les early-returns de l'App (rendu spécial, hors du
 * système de Views) : le bridge View→URL ne doit PAS les remplacer par
 * `/` quand `pathToView` retourne null, sinon on perd le query param
 * (`?token=…`) et l'utilisateur tombe sur LoginPage au lieu du flow
 * d'invitation / vérif email / privacy.
 */
function isSpecialPath(pathname: string, search: string): boolean {
  if (pathname === '/accept-invitation') return true;
  if (pathname === '/verify-email')      return true;
  if (pathname === '/privacy')           return true;
  if (search.includes('superadmin'))     return true;
  if (search.includes('api-docs'))       return true;
  return false;
}

/** Maps a View back to the canonical URL pathname. */
function viewToPath(view: View): string | null {
  switch (view.screen) {
    case 'dashboard':   return '/';
    case 'knowledge':   return '/knowledge';
    case 'article':     return `/articles/${view.articleId}`;
    case 'editor':      return view.articleId ? `/articles/${view.articleId}/edit` : '/articles/new';
    case 'tree':        return `/trees/${view.treeId}`;
    case 'tree-editor': return `/trees/${view.treeId}/edit`;
    case 'trees':       return '/trees';
    case 'members':     return '/members';
    case 'analytics':   return '/analytics';
    case 'chats':       return '/chats';
    case 'brand-monitoring': return '/brand-monitoring';
    case 'learning':      return '/learning';
    case 'learning-edit': return `/learning/${view.pathId}/edit`;
    case 'learning-play': return `/learning/play/${view.moduleId}`;
    case 'settings':    return '/settings';
    case 'account':     return '/account';
    case 'faqs':        return '/faqs';
    case 'faq-editor':  return view.faqId ? `/faqs/${view.faqId}/edit` : '/faqs/new';
    case 'onboarding':  return '/onboarding';
    case 'onboarding-project':
      return view.validationId
        ? `/onboarding/projects/${view.projectId}/base/validee/${view.validationId}`
        : `/onboarding/projects/${view.projectId}${ONBOARDING_TAB_PATHS[view.tab]}`;
    default:            return null;
  }
}

/**
 * Écrans réservés aux admins et managers, comme leurs routes côté back.
 * (Les écrans historiques ne sont pas gardés ici : voir S12.)
 */
const MANAGER_SCREENS: ReadonlySet<string> = new Set(['onboarding', 'onboarding-project']);

function isScreenAllowed(org: Parameters<typeof canSeeScreen>[0], role: string | null, screen: string): boolean {
  if (!canSeeScreen(org, screen)) return false;
  return !MANAGER_SCREENS.has(screen) || role === 'admin' || role === 'manager';
}

/**
 * Écran d'accueil d'une organisation : le tableau de bord si elle a le module,
 * sinon l'Onboarding, sinon Mon compte (toujours permis).
 */
function homeView(org: Parameters<typeof canSeeScreen>[0], role: string | null): View {
  if (isScreenAllowed(org, role, 'dashboard'))  return { screen: 'dashboard' };
  if (isScreenAllowed(org, role, 'onboarding')) return { screen: 'onboarding' };
  return { screen: 'account' };
}

export function App() {


  const isLoggedIn        = useAuthStore(selectIsLoggedIn);
  const organization      = useAuthStore(selectOrganization);
  const setSession        = useAuthStore(s => s.setSession);
  const role              = useAuthStore(selectUserRole);
  const onboardingDone    = useAuthStore(s => s.onboardingDone);
  const setOnboardingDone = useAuthStore(s => s.setOnboardingDone);

  const location = useLocation();
  const navigate = useNavigate();

  // Initial view derived from URL — supports deep-linking on G1 routes.
  const [view, setView] = useState<View>(() => {
    return pathToView(location.pathname, 'dashboard') ?? { screen: 'dashboard' };
  });
  const [helpOpen, setHelpOpen] = useState(false);

  // URL → View : back/forward du navigateur, deep-link, paste d'URL
  useEffect(() => {
    const next = pathToView(location.pathname, view.screen as Screen);
    if (!next) return;
    // Si on cible déjà la même ressource (même screen + même id), on ne touche pas
    // au view actuel pour préserver le `from` posé par la nav interne.
    const sameTarget =
      next.screen === view.screen &&
      (next as { articleId?: string }).articleId === (view as { articleId?: string }).articleId &&
      (next as { treeId?: string }).treeId       === (view as { treeId?: string }).treeId &&
      (next as { faqId?: string }).faqId         === (view as { faqId?: string }).faqId &&
      (next as { projectId?: string }).projectId === (view as { projectId?: string }).projectId &&
      (next as { tab?: string }).tab             === (view as { tab?: string }).tab;
    if (sameTarget) return;
    setView(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // View → URL : synchronise l'URL quand la navigation est faite via setView
  useEffect(() => {
    // Sur les paths spéciaux gérés par early-return (invitation, verify-email,
    // privacy…), on ne touche pas à l'URL — sinon on remplace `/accept-invitation
    // ?token=…` par `/` et le token est perdu.
    if (isSpecialPath(location.pathname, location.search)) return;
    const expected = viewToPath(view);
    if (expected && expected !== location.pathname) {
      navigate(expected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  
  // Détection du token d'invitation dans l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const invitationToken = urlParams.get('token');
  const isAcceptInvitation = !!invitationToken;

  // Bootstrap session depuis le cookie quand le store local n'a pas de session
  // (cas typique : nouvel onglet ouvert depuis l'extension Chrome qui démarre
  // sans rien en localStorage mais avec un cookie auth `.knowdesk.fr` valide).
  // On bloque le render initial pendant ce check pour éviter un flash de
  // LoginPage avant la rehydratation.
  const [bootValidated, setBootValidated] = useState(isLoggedIn);
  useEffect(() => {
    if (isLoggedIn) {
      setBootValidated(true);
      // Session déjà en localStorage : on relit /auth/me en arrière-plan pour
      // rafraîchir organization.enabledModules (un changement de modules prend
      // effet au prochain chargement). /auth/me ne renvoie pas `plan` : on
      // fusionne au lieu de remplacer.
      apiClient.get<{ user: AuthSession['user']; organization: Partial<AuthSession['organization']> }>('/auth/me')
        .then(data => {
          const current = useAuthStore.getState().session;
          if (!current || !data?.user || !data?.organization) return;
          setSession({
            ...current,
            user:         { ...current.user, ...data.user },
            organization: { ...current.organization, ...data.organization },
          });
        })
        .catch(() => { /* 401 : apiClient efface la session ; réseau : on garde l'état local */ });
      return;
    }
    let alive = true;
    apiClient.get<{ user: AuthSession['user']; organization: AuthSession['organization'] }>('/auth/me')
      .then(data => {
        if (!alive) return;
        if (data?.user && data?.organization) {
          setSession({ user: data.user, organization: data.organization });
        }
      })
      .catch(err => {
        // Cookie valide mais espace désactivé : l'écran de connexion le dit.
        if (alive && err instanceof ApiError && err.code === 'ORG_DISABLED') {
          useAuthStore.getState().endSession(err.message);
        }
        /* 401/réseau : on tombe sur LoginPage, comportement par défaut */
      })
      .finally(() => { if (alive) setBootValidated(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsOnboarding = isLoggedIn && role === 'admin' && !onboardingDone && canRunSetupWizard(organization);

  // Aiguillage filtré par les modules de l'organisation : un écran non permis
  // (lien direct, URL inconnue, retour arrière) est remplacé par l'accueil de
  // l'organisation. `shown` est rendu tout de suite, sans monter l'écran refusé
  // ni déclencher ses appels ; l'effet réaligne l'état et l'URL.
  const allowed = isScreenAllowed(organization, role, view.screen);
  const shown: View = allowed ? view : homeView(organization, role);
  useEffect(() => {
    if (isLoggedIn && !allowed) setView(homeView(organization, role));
  }, [isLoggedIn, allowed, organization, role]);

  const go = useCallback((v: View) => setView(v), []);

  // Retourne à l'écran précédent selon le contexte
  const goBack = useCallback(() => {
    if (
      view.screen === 'article' ||
      view.screen === 'tree'    ||
      view.screen === 'editor'
    ) {
      const from = view.from ?? 'dashboard';
      if (from === 'knowledge') go({ screen: 'knowledge' });
      else if (from === 'editor') go({ screen: 'knowledge' });
      else go(homeView(organization, role));
    } else {
      go(homeView(organization, role));
    }
  }, [view, go, organization, role]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.type === 'tree') {
      go({ screen: 'tree', treeId: result.id, from: view.screen as Screen });
    } else {
      go({ screen: 'article', articleId: result.id, from: view.screen as Screen });
    }
  }, [go, view.screen]);

  const activeRoute = (
    shown.screen === 'trees' || shown.screen === 'tree-editor' || shown.screen === 'tree' ? 'trees' :
    shown.screen === 'faqs'  || shown.screen === 'faq-editor'  ? 'faqs' :
    shown.screen === 'account' ? 'settings' :
    shown.screen === 'knowledge' || shown.screen === 'article' || shown.screen === 'editor'
      ? 'knowledge'
    : shown.screen === 'members'   ? 'team'
    : shown.screen === 'analytics' ? 'analytics'
    : shown.screen === 'chats'     ? 'chats'
    : shown.screen === 'brand-monitoring' ? 'brand-monitoring'
    : shown.screen === 'learning' || shown.screen === 'learning-edit' || shown.screen === 'learning-play' ? 'learning'
    : shown.screen === 'settings'  ? 'settings'
    : shown.screen === 'onboarding' || shown.screen === 'onboarding-project' ? 'onboarding'
    : 'dashboard'
  ) as 'dashboard' | 'search' | 'knowledge' | 'faqs' | 'trees' | 'learning' | 'team' | 'analytics' | 'chats' | 'brand-monitoring' | 'settings' | 'onboarding';

// Mode superadmin — accessible via ?superadmin dans l'URL
if (window.location.search.includes('superadmin')) {
  return <SuperadminApp />;
}
  if (window.location.search.includes('api-docs')) {
return <ApiDocsApp />;

}

// Confirmation d'email — accessible sans être connecté.
if (window.location.pathname === '/verify-email') {
  return <VerifyEmailPage />;
}

// Politique de confidentialité — page publique, requise par Chrome Web Store.
if (window.location.pathname === '/privacy') {
  return <PrivacyPage />;
}

// Page d'acceptation d'invitation — accessible sans être connecté
if (isAcceptInvitation && invitationToken) {
  return (
    <AcceptInvitationPage
      token={invitationToken}
      onSuccess={async () => {
        // Invalide tout cookie auth résiduel (cas typique : admin invité un
        // collègue, ouvre lui-même le lien en étant encore connecté). Sans ce
        // logout, le reload rebascule sur l'ancienne session via /auth/me.
        await useAuthStore.getState().logout();
        window.history.replaceState({}, '', '/');
        window.location.reload();
      }}
    />
  );
}


// Tant que le check session-via-cookie tourne, on évite de flasher la
// LoginPage : écran neutre minimal. ProtectedRoute fait quelque chose
// d'analogue sur les routes protégées, ici on couvre le boot global.
if (!isLoggedIn && !bootValidated) {
  return <div style={{ minHeight: '100vh' }} aria-busy="true" aria-label="Chargement de la session" />;
}

if (!isLoggedIn) {
  return (
    <>
      <ImpersonateBanner />
      <LoginPage onLoginSuccess={setSession} />
    </>
  );
}
  if (needsOnboarding) return <OnboardingPage onComplete={setOnboardingDone} />;

  return (
    <>
      <ImpersonateBanner />
      <EmailVerificationBanner />
      <ProtectedRoute>
        <AppLayout
          onHelp={hasModule(organization, 'help') ? () => setHelpOpen(true) : undefined}
          activeRoute={activeRoute}
          onNavigate={route => {
            if (route === 'dashboard') go({ screen: 'dashboard' });
            if (route === 'knowledge') go({ screen: 'knowledge' });
            if (route === 'team')      go({ screen: 'members'   });
            if (route === 'analytics') go({ screen: 'analytics' });
            if (route === 'chats')     go({ screen: 'chats'     });
            if (route === 'brand-monitoring') go({ screen: 'brand-monitoring' });
            if (route === 'settings')  go({ screen: 'settings'  });
            if (route === 'trees')     go({ screen: 'trees'     });
            if (route === 'learning')  go({ screen: 'learning'  });
            if (route === 'faqs')      go({ screen: 'faqs'      });
            if (route === 'account')   go({ screen: 'account'   });
            if (route === 'onboarding') go({ screen: 'onboarding' });
          }}
          searchSlot={hasModule(organization, 'knowledge') ? <SearchBar onSelect={handleSearchSelect} /> : null}
        >
          {shown.screen === 'dashboard' && (
            <DashboardPage
              onArticleClick={id => go({ screen: 'article', articleId: id, from: 'dashboard' })}
              onNewArticle={() => go({ screen: 'editor', from: 'dashboard' })}
            />
          )}
          {shown.screen === 'knowledge' && (
            <KnowledgePage
              onOpenArticle={id  => go({ screen: 'article', articleId: id, from: 'knowledge' })}
              onNewArticle={() => go({ screen: 'editor', from: 'knowledge' })}
            />
          )}
          {shown.screen === 'article' && (
            <ArticlePage
              articleId={shown.articleId}
              onBack={goBack}
              onEdit={id => go({ screen: 'editor', articleId: id, from: 'article' })}
            />
          )}
          {shown.screen === 'tree' && (
            <QuestionTreePage
              treeId={shown.treeId}
              onBack={goBack}
              onViewArticle={id => go({ screen: 'article', articleId: id, from: 'tree' })}
            />
          )}
          {shown.screen === 'editor' && (
            <ArticleEditor
              articleId={shown.articleId}
              onSaved={id => go({ screen: 'article', articleId: id, from: 'editor' })}
              onCancel={goBack}
            />
          )}
          {shown.screen === 'members'  && <MembersPage />}
          {shown.screen === 'faqs' && (
            <FaqsPage
              onNewFaq={() => go({ screen: 'faq-editor' })}
              onEditFaq={id => go({ screen: 'faq-editor', faqId: id })}
            />
          )}
          {shown.screen === 'faq-editor' && (
            <FaqEditor
              faqId={shown.faqId}
              onSaved={() => go({ screen: 'faqs' })}
              onCancel={() => go({ screen: 'faqs' })}
            />
          )}
          {shown.screen === 'analytics' && (
            <AnalyticsPage
              onOpenArticle={id => go({ screen: 'article', articleId: id, from: 'analytics' })}
              onCreateFaq={question => {
                // Navigate vers /faqs/new?question=... — le bridge URL→View va
                // pousser screen='faq-editor', et FaqEditor lit le query param
                navigate(`/faqs/new?question=${encodeURIComponent(question)}`);
              }}
            />
          )}
          {shown.screen === 'settings' && (
            <SettingsPage initialSection={shown.section as any} />
          )}
          {shown.screen === 'chats' && <ChatsPage />}
          {shown.screen === 'brand-monitoring' && <BrandMonitoringPage />}
          {shown.screen === 'learning' && (
            <LearningPage
              onEditPath={id => go({ screen: 'learning-edit', pathId: id })}
              onOpenModule={moduleId => go({ screen: 'learning-play', moduleId })}
            />
          )}
          {shown.screen === 'learning-edit' && (
            <LearningPathEditor
              pathId={shown.pathId}
              onBack={() => go({ screen: 'learning' })}
            />
          )}
          {shown.screen === 'learning-play' && (
            <LearningPlayer
              moduleId={shown.moduleId}
              onBack={() => go({ screen: 'learning' })}
            />
          )}
          {shown.screen === 'trees' && (
  <TreesPage
    onOpenTree={id    => go({ screen: 'tree-editor', treeId: id })}
    onEditTree={id    => go({ screen: 'tree-editor', treeId: id })}
    onPreviewTree={id => go({ screen: 'tree',        treeId: id, from: 'trees' })}
  />
)}
{shown.screen === 'tree-editor' && (
  <TreeEditor
    treeId={shown.treeId}
    onBack={() => go({ screen: 'trees' })}
    onPreview={id => go({ screen: 'tree', treeId: id, from: 'tree-editor' })}
  />
)}
{shown.screen === 'account' && <AccountPage />}
{shown.screen === 'onboarding' && (
  <OnboardingHomePage
    onOpenProject={projectId => go({ screen: 'onboarding-project', projectId, tab: 'documents' })}
  />
)}
{shown.screen === 'onboarding-project' && (
  <OnboardingProjectPage
    projectId={shown.projectId}
    tab={shown.tab}
    validationId={shown.validationId ?? null}
    onTabChange={tab => go({ screen: 'onboarding-project', projectId: shown.projectId, tab })}
    onOpenValidation={validationId => go({ screen: 'onboarding-project', projectId: shown.projectId, tab: 'base', validationId })}
    onBack={() => go({ screen: 'onboarding' })}
  />
)}
        </AppLayout>
      </ProtectedRoute>
      {helpOpen && hasModule(organization, 'help') && (
  <HelpPanel
    onClose={() => setHelpOpen(false)}
    currentScreen={shown.screen}
  />
)}

      <NetworkErrorBanner />
      {hasModule(organization, 'knowledge') && <CommandPalette />}
      <ToastContainer />
    </>
  );
}
