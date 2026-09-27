// Global shared types. Feature-specific types live in features/[name]/types.ts

export type UserRole = 'admin' | 'manager' | 'advisor';
export type OrgPlan  = 'free'  | 'pro'     | 'enterprise';

export interface User {
  id:         string;
  email:      string;
  firstName?: string;
  lastName?:  string;
  role:          UserRole;
  onboardingDone?: boolean;
  /** Sprint Onboarding-3 : indique si l'email a été confirmé via le lien magique. */
  emailVerified?: boolean;
}

export interface Organization {
  id:   string;
  name: string;
  slug: string;
  plan: OrgPlan;
  /** Modules activés (`organizations.enabled_modules`). Absent d'une session
   *  gardée avant que le back ne l'expose : voir `hasModule`. */
  enabledModules?: string[];
}

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error';   message: string };
