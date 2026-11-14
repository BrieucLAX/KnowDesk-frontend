export interface OnboardingStep {
  id:    'team' | 'content';
  title: string;
  description: string;
}

export interface OnboardingData {
  inviteEmails:  string[]; // validated emails to invite
  firstCategory: string;
}

export interface OnboardingErrors {
  inviteEmails?:  string;
  firstCategory?: string;
}

/**
 * Onboarding 2-step. L'org est déjà créée au moment du register avec
 * son nom — pas besoin de la redemander ici.
 */
export const STEPS: OnboardingStep[] = [
  { id: 'team',    title: 'Inviter l\'équipe',    description: 'Optionnel — vous pouvez le faire plus tard.' },
  { id: 'content', title: 'Première catégorie',  description: 'Organisez votre base dès le départ.' },
];
