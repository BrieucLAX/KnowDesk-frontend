import type { OrgRow } from '../types';

/** Délai entre la fin du test et la purge automatique (back : ONBOARDING_RETENTION_DAYS). */
export const ONBOARDING_RETENTION_DAYS = 30;

const DAY_MS = 86_400_000;

export const formatDay = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

/** Date de la purge automatique d'un test terminé (la tâche quotidienne passe à 3h45 UTC le jour même ou le suivant). */
export function scheduledPurgeDate(testEndedAt: string): Date {
  return new Date(new Date(testEndedAt).getTime() + ONBOARDING_RETENTION_DAYS * DAY_MS);
}

export interface OrgStatus {
  label: 'Actif' | 'Désactivé' | 'Test terminé' | 'Purgé';
  tone:  'active' | 'disabled' | 'purged';
  /** Infobulle : dates de fin de test, de purge prévue ou faite. */
  title?: string;
}

/**
 * Statut affiché dans la liste superadmin. « Purgé » : test terminé et données
 * supprimées depuis (sur demande ou à J+30). Une purge faite pendant le test
 * ne compte pas : des données ont pu arriver depuis, la purge à J+30 les reprendra.
 */
export function orgStatus(org: Pick<OrgRow, 'disabled_at' | 'test_ended_at' | 'onboarding_purged_at'>): OrgStatus {
  const ended  = org.test_ended_at ? new Date(org.test_ended_at) : null;
  const purged = org.onboarding_purged_at ? new Date(org.onboarding_purged_at) : null;

  if (ended && purged && purged >= ended) {
    return { label: 'Purgé', tone: 'purged', title: `Test terminé le ${formatDay(ended)}, données de test supprimées le ${formatDay(purged)}.` };
  }
  if (ended) {
    return {
      label: 'Test terminé', tone: 'disabled',
      title: `Test terminé le ${formatDay(ended)}. Purge automatique des données de test le ${formatDay(scheduledPurgeDate(org.test_ended_at!))}.`,
    };
  }
  const purgedNote = purged ? `Données de test supprimées le ${formatDay(purged)}.` : undefined;
  if (org.disabled_at) return { label: 'Désactivé', tone: 'disabled', title: purgedNote };
  return { label: 'Actif', tone: 'active', title: purgedNote };
}
