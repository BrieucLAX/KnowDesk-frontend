export interface SuperadminSession {
  accessToken: string;
  superadmin: {
    id:        string;
    email:     string;
    firstName: string | null;
    lastName:  string | null;
  };
}

export interface OrgStats {
  membersActive:   number;
  membersDisabled: number;
  articlesCount:   number;
}

export interface OrgRow {
  id:          string;
  name:        string;
  slug:        string;
  plan:        string;
  created_at:  string;
  disabled_at: string | null;
  /** Modules activés ; une organisation de test n'a que `onboarding`. */
  enabled_modules: string[];
  /** Fin du test (« Terminer le test ») : point de départ de la purge à J+30. */
  test_ended_at:   string | null;
  /** Dernière purge des données de test de toute l'organisation (étape D). */
  onboarding_purged_at: string | null;
  stats:       OrgStats;
}

/** GET /superadmin/organizations/:id/onboarding-projects : aucun nom, contenu du client. */
export interface OnboardingProjectRow {
  id:        string;
  createdAt: string;
  documents: number;
}

/** Réponse des routes de purge : objets R2 et lignes supprimés, par table. */
export interface PurgeReport {
  scope:   'org' | 'project';
  objects: number;
  rows:    Record<string, number>;
}

/** Réponse de POST /superadmin/test-organizations. */
export interface TestOrgCreated {
  organization: { id: string; name: string; slug: string; enabledModules: string[]; createdAt: string };
  invitation:   { email: string; role: 'admin'; expiresAt: string; acceptUrl: string };
  /** Envoi de l'invitation : le lien reste à transmettre à la main si ce n'est pas `sent`. */
  email:        'sent' | 'skipped_no_api_key' | 'failed';
}
