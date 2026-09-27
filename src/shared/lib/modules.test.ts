import { describe, it, expect } from 'vitest';
import { LEGACY_MODULES, SCREEN_MODULES, canSeeScreen, hasModule, isTestOrganization } from './modules';

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
  it('une organisation historique voit tous les écrans', () => {
    for (const screen of Object.keys(SCREEN_MODULES)) expect(canSeeScreen(legacyOrg, screen)).toBe(true);
    for (const screen of Object.keys(SCREEN_MODULES)) expect(canSeeScreen(staleOrg, screen)).toBe(true);
  });

  it('une organisation de test ne voit que Mon compte', () => {
    const visible = Object.keys(SCREEN_MODULES).filter(s => canSeeScreen(testOrg, s));
    expect(visible).toEqual(['account']);
  });

  it('refuse un écran inconnu', () => {
    expect(canSeeScreen(legacyOrg, 'nope')).toBe(false);
  });
});
