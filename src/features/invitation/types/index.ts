export interface AcceptInvitationForm {
  password:        string;
  passwordConfirm: string;
}

export interface AcceptInvitationErrors {
  password?:        string;
  passwordConfirm?: string;
  general?:         string;
}

/** GET /members/invitations/:token */
export interface InvitationInfo {
  email:         string;
  role:          'admin' | 'manager' | 'advisor';
  orgName:       string;
  expiresAt:     string;
  /** Un compte existe déjà pour cette adresse : il rejoint l'espace avec son mot de passe actuel. */
  accountExists: boolean;
}
