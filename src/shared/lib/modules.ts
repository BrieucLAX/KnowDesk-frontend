import type { Organization } from '../types';

/**
 * Modules activables par organisation (`organization.enabledModules`), miroir
 * de `src/shared/modules.ts` côté back.
 *
 * Le back renvoie 404 sur toute route d'un module absent : c'est lui qui ferme
 * l'accès. Le front masque la navigation, l'écran et les appels en arrière-plan
 * pour qu'une organisation de test (`{onboarding}` seul) ne voie ni n'appelle
 * rien d'autre.
 */
export const LEGACY_MODULES = [
  'dashboard',
  'knowledge',
  'faqs',
  'trees',
  'learning',
  'analytics',
  'chats',
  'chatbot',
  'ai_answer',
  'article_quality',
  'imports',
  'brand_monitoring',
  'notifications',
  'members',
  'api_keys',
  'help',
  'settings',
] as const;

export const ONBOARDING_MODULE = 'onboarding' as const;

export type ModuleName = typeof LEGACY_MODULES[number] | typeof ONBOARDING_MODULE;

/**
 * Vrai si l'organisation a le module. Sans `enabledModules` (session gardée
 * dans le navigateur avant que le back ne l'expose), l'organisation est
 * considérée comme historique : elle garde tout, sauf `onboarding`.
 */
export function hasModule(org: Pick<Organization, 'enabledModules'> | null | undefined, module: ModuleName): boolean {
  if (!org) return false;
  const modules: readonly string[] = org.enabledModules ?? LEGACY_MODULES;
  return modules.includes(module);
}

/** Organisation de test : celles qui ont le module onboarding (bandeau « Version de test »). */
export function isTestOrganization(org: Pick<Organization, 'enabledModules'> | null | undefined): boolean {
  return hasModule(org, ONBOARDING_MODULE);
}

/**
 * Module requis par chaque écran de l'aiguillage d'`App.tsx`. `null` : écran
 * toujours accessible à un utilisateur connecté.
 */
export const SCREEN_MODULES: Record<string, ModuleName | null> = {
  'dashboard':        'dashboard',
  'knowledge':        'knowledge',
  'article':          'knowledge',
  'editor':           'knowledge',
  'tree':             'trees',
  'trees':            'trees',
  'tree-editor':      'trees',
  'faqs':             'faqs',
  'faq-editor':       'faqs',
  'learning':         'learning',
  'learning-edit':    'learning',
  'learning-play':    'learning',
  'analytics':        'analytics',
  'chats':            'chats',
  'brand-monitoring': 'brand_monitoring',
  'members':          'members',
  'settings':         'settings',
  'account':          null,
};

/** Vrai si l'écran est permis ; un écran inconnu de la table est refusé. */
export function canSeeScreen(org: Pick<Organization, 'enabledModules'> | null | undefined, screen: string): boolean {
  if (!(screen in SCREEN_MODULES)) return false;
  const module = SCREEN_MODULES[screen];
  return module === null || hasModule(org, module);
}
