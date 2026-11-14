import type { AuthSession } from '../types';

/**
 * Mock data used during development (MSW) and in unit tests.
 * Never imported in production code paths.
 */

export const MOCK_SESSION: AuthSession = {
  accessToken: 'mock-access-token-abc123',
  user: {
    id:        'user-1',
    email:     'sophie.martin@acme.fr',
    firstName: 'Sophie',
    lastName:  'Martin',
    role:      'advisor',
  },
  organization: {
    id:   'org-1',
    name: 'Acme Service Client',
    slug: 'acme',
    plan: 'pro',
  },
};

export const MOCK_ADMIN_SESSION: AuthSession = {
  ...MOCK_SESSION,
  user: {
    ...MOCK_SESSION.user,
    id:        'user-2',
    email:     'marc.duval@acme.fr',
    firstName: 'Marc',
    lastName:  'Duval',
    role:      'admin',
  },
};

/** Simulates the latency of a real API call */
export const simulateDelay = (ms = 800): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock login — replace authApi.login with this in tests or Storybook.
 * Throws for invalid credentials so error states can be tested.
 */
export async function mockLogin(email: string, password: string): Promise<AuthSession> {
  await simulateDelay();

  if (password === 'wrong') {
    throw new Error('Adresse e-mail ou mot de passe incorrect. Vérifiez votre saisie, puis réessayez.');
  }
  if (email.includes('admin')) {
    return MOCK_ADMIN_SESSION;
  }
  return MOCK_SESSION;
}
