import { describe, it, expect } from 'vitest';
import { LEGACY_MODULES, SCREEN_MODULES, canSeeScreen, hasModule, isTestOrganization, linkAllowed } from './modules';

const legacyOrg  = { enabledModules: [...LEGACY_MODULES] };
const testOrg    = { enabledModules: ['onboarding'] };
const staleOrg   = {}; // session gardée avant que le back n'expose enabledModules

describe('hasModule', () => {
  it('lit enabledModules', () => {
    expect(hasModule(legacyOrg, 'knowledge')).toBe(true);
    expect(hasModule(legacyOrg, 'onboarding')).toBe(false);
    expect(hasModule(testOrg, 'onboarding')).toBe(true);
    expect(hasModule(testOrg, 'notifications')).toBe(false);
  });

  it('sans enabledModules, considère l\'organisation comme historique', () => {
    for (const m of LEGACY_MODULES) expect(hasModule(staleOrg, m)).toBe(true);
    expect(hasModule(staleOrg, 'onboarding')).toBe(false);
  });

  it('sans organisation, refuse', () => {
    expect(hasModule(null, 'dashboard')).toBe(false);
  });
});

describe('isTestOrganization', () => {
  it('vaut vrai seulement avec le module onboarding', () => {
    expect(isTestOrganization(testOrg)).toBe(true);
    expect(isTestOrganization(legacyOrg)).toBe(false);
    expect(isTestOrganization(staleOrg)).toBe(false);
  });
});

describe('canSeeScreen', () => {
  it('une organisation historique voit tous les écrans, sauf l\'onboarding', () => {
    for (const org of [legacyOrg, staleOrg]) {
      const hidden = Object.keys(SCREEN_MODULES).filter(s => !canSeeScreen(org, s));
      expect(hidden).toEqual(['onboarding', 'onboarding-project']);
    }
  });

  it('une organisation de test ne voit que l\'onboarding et Mon compte', () => {
    const visible = Object.keys(SCREEN_MODULES).filter(s => canSeeScreen(testOrg, s));
    expect(visible).toEqual(['onboarding', 'onboarding-project', 'account']);
  });

  it('refuse un écran inconnu', () => {
    expect(canSeeScreen(legacyOrg, 'nope')).toBe(false);
  });
});

describe('masquage global (séquence 1)', () => {
  it('une session sans enabledModules garde aussi les modules dérivés', () => {
    expect(hasModule(staleOrg, 'kbscore')).toBe(true);
    expect(hasModule(staleOrg, 'analytics_collect')).toBe(true);
    expect(hasModule(staleOrg, 'audit')).toBe(true);
  });

  it('linkAllowed retire les liens vers une fonction masquée, garde les autres', () => {
    const org = { enabledModules: ['knowledge', 'faqs', 'members'] };
    expect(linkAllowed(org, '/articles/new')).toBe(true);
    expect(linkAllowed(org, '/faqs?focus=1')).toBe(true);
    expect(linkAllowed(org, '/settings/members')).toBe(true);
    expect(linkAllowed(org, '/trees')).toBe(false);
    expect(linkAllowed(org, '/trees/abc')).toBe(false);
    expect(linkAllowed(org, '/analytics')).toBe(false);
    expect(linkAllowed(org, '/audit')).toBe(false);
  });
});
