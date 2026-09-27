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
import { FaqsPage }         from './features/faqs/components/FaqsPage';
import { FaqEditor }        from './features/faqs/components/FaqEditor';
import { SuperadminApp }   from './features/superadmin/components/SuperadminApp';
import { HelpPanel }       from './features/help/components/HelpPanel';
import { ApiDocsApp }     from './features/apidocs/components/ApiDocsApp';
import { NotFoundPage } from './shared/components/ui/NotFoundPage';
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
import { apiClient }          from './shared/lib/apiClient';
import {
  useAuthStore, selectIsLoggedIn, selectUserRole,
} from './store/authStore';
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
  | 'learning-play';

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
  | { screen: 'learning-play'; moduleId: string };

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
    default:            return null;
  }
}

export function App() {


  const isLoggedIn        = useAuthStore(selectIsLoggedIn);
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
      (next as { faqId?: string }).faqId         === (view as { faqId?: string }).faqId;
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
      .catch(() => { /* 401/réseau : on tombe sur LoginPage, comportement par défaut */ })
      .finally(() => { if (alive) setBootValidated(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsOnboarding = isLoggedIn && role === 'admin' && !onboardingDone;

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
      else go({ screen: 'dashboard' });
    } else {
      go({ screen: 'dashboard' });
    }
  }, [view, go]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.type === 'tree') {
      go({ screen: 'tree', treeId: result.id, from: view.screen as Screen });
    } else {
      go({ screen: 'article', articleId: result.id, from: view.screen as Screen });
    }
  }, [go, view.screen]);

  const activeRoute = (
    view.screen === 'trees' || view.screen === 'tree-editor' || view.screen === 'tree' ? 'trees' :
    view.screen === 'faqs'  || view.screen === 'faq-editor'  ? 'faqs' :
    view.screen === 'account' ? 'settings' :
    view.screen === 'knowledge' || view.screen === 'article' || view.screen === 'editor'
      ? 'knowledge'
    : view.screen === 'members'   ? 'team'
    : view.screen === 'analytics' ? 'analytics'
    : view.screen === 'chats'     ? 'chats'
    : view.screen === 'brand-monitoring' ? 'brand-monitoring'
    : view.screen === 'learning' || view.screen === 'learning-edit' || view.screen === 'learning-play' ? 'learning'
    : view.screen === 'settings'  ? 'settings'
    : 'dashboard'
  ) as 'dashboard' | 'search' | 'knowledge' | 'faqs' | 'trees' | 'learning' | 'team' | 'analytics' | 'chats' | 'brand-monitoring' | 'settings';

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
          onHelp={() => setHelpOpen(true)}
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
          }}
          searchSlot={<SearchBar onSelect={handleSearchSelect} />}
        >
          {view.screen === 'dashboard' && (
            <DashboardPage
              onArticleClick={id => go({ screen: 'article', articleId: id, from: 'dashboard' })}
              onNewArticle={() => go({ screen: 'editor', from: 'dashboard' })}
            />
          )}
          {view.screen === 'knowledge' && (
            <KnowledgePage
              onOpenArticle={id  => go({ screen: 'article', articleId: id, from: 'knowledge' })}
              onNewArticle={() => go({ screen: 'editor', from: 'knowledge' })}
            />
          )}
          {view.screen === 'article' && (
            <ArticlePage
              articleId={view.articleId}
              onBack={goBack}
              onEdit={id => go({ screen: 'editor', articleId: id, from: 'article' })}
            />
          )}
          {view.screen === 'tree' && (
            <QuestionTreePage
              treeId={view.treeId}
              onBack={goBack}
              onViewArticle={id => go({ screen: 'article', articleId: id, from: 'tree' })}
            />
          )}
          {view.screen === 'editor' && (
            <ArticleEditor
              articleId={view.articleId}
              onSaved={id => go({ screen: 'article', articleId: id, from: 'editor' })}
              onCancel={goBack}
            />
          )}
          {view.screen === 'members'  && <MembersPage />}
          {view.screen === 'faqs' && (
            <FaqsPage
              onNewFaq={() => go({ screen: 'faq-editor' })}
              onEditFaq={id => go({ screen: 'faq-editor', faqId: id })}
            />
          )}
          {view.screen === 'faq-editor' && (
            <FaqEditor
              faqId={view.faqId}
              onSaved={() => go({ screen: 'faqs' })}
              onCancel={() => go({ screen: 'faqs' })}
            />
          )}
          {view.screen === 'analytics' && (
            <AnalyticsPage
              onOpenArticle={id => go({ screen: 'article', articleId: id, from: 'analytics' })}
              onCreateFaq={question => {
                // Navigate vers /faqs/new?question=... — le bridge URL→View va
                // pousser screen='faq-editor', et FaqEditor lit le query param
                navigate(`/faqs/new?question=${encodeURIComponent(question)}`);
              }}
            />
          )}
          {view.screen === 'settings' && (
            <SettingsPage initialSection={view.section as any} />
          )}
          {view.screen === 'chats' && <ChatsPage />}
          {view.screen === 'brand-monitoring' && <BrandMonitoringPage />}
          {view.screen === 'learning' && (
            <LearningPage
              onEditPath={id => go({ screen: 'learning-edit', pathId: id })}
              onOpenModule={moduleId => go({ screen: 'learning-play', moduleId })}
            />
          )}
          {view.screen === 'learning-edit' && (
            <LearningPathEditor
              pathId={view.pathId}
              onBack={() => go({ screen: 'learning' })}
            />
          )}
          {view.screen === 'learning-play' && (
            <LearningPlayer
              moduleId={view.moduleId}
              onBack={() => go({ screen: 'learning' })}
            />
          )}
          {view.screen === 'trees' && (
  <TreesPage
    onOpenTree={id    => go({ screen: 'tree-editor', treeId: id })}
    onEditTree={id    => go({ screen: 'tree-editor', treeId: id })}
    onPreviewTree={id => go({ screen: 'tree',        treeId: id, from: 'trees' })}
  />
)}
{view.screen === 'tree-editor' && (
  <TreeEditor
    treeId={view.treeId}
    onBack={() => go({ screen: 'trees' })}
    onPreview={id => go({ screen: 'tree', treeId: id, from: 'tree-editor' })}
  />
)}
{view.screen === 'account' && <AccountPage />}
{!(['dashboard','knowledge','article','tree','editor','members','analytics','chats','brand-monitoring','settings','trees','tree-editor','account','faqs','faq-editor','learning','learning-edit','learning-play'] as string[]).includes(view.screen) && (
  <NotFoundPage onBack={() => go({ screen: 'dashboard' })} />
)}
        </AppLayout>
      </ProtectedRoute>
      {helpOpen && (
  <HelpPanel
    onClose={() => setHelpOpen(false)}
    currentScreen={view.screen}
  />
)}

      <NetworkErrorBanner />
      <CommandPalette />
      <ToastContainer />
    </>
  );
}
