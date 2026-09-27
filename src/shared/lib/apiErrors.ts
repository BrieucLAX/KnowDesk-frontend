/**
 * Mapping des codes d'erreur API → messages utilisateur français.
 * Utiliser via getErrorMessage(err) dans les catch blocks.
 */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS:   'Email ou mot de passe incorrect.',
  TOKEN_EXPIRED:         'Votre session a expiré. Reconnectez-vous.',
  UNAUTHORIZED:          'Authentification requise.',
  FORBIDDEN:             'Vous n\'avez pas les droits pour cette action.',
  NOT_FOUND:             'Ressource introuvable.',
  CONFLICT:              'Cette ressource existe déjà.',
  VALIDATION_ERROR:      'Données invalides. Vérifiez le formulaire.',
  ORG_LIMIT_REACHED:     'Limite du plan gratuit atteinte. Passez au plan Pro.',
  TOO_MANY_REQUESTS:     'Trop de tentatives. Attendez 1 minute.',
  INTERNAL_ERROR:        'Une erreur interne est survenue. Réessayez.',
  UNSUPPORTED_MEDIA_TYPE:'Format de requête invalide.',
  // Accès (B3b côté back) — mêmes textes que le back.
  ORG_DISABLED:          'Cet espace est désactivé.',
  REGISTRATION_CLOSED:   'Les inscriptions sont fermées. L\'accès se fait sur invitation.',
  ACCOUNT_NOT_FOUND:     'Aucun compte Knowdesk n\'est associé à cette adresse. L\'accès se fait sur invitation.',
  // Arbitrage de l'audit (F3, B-F3b).
  DECISION_CONFLICT:     'Cette question a été modifiée entre-temps.',
  AUDIT_READ_ONLY:       'Cet audit est celui d\'une analyse précédente : il se consulte, mais ne s\'arbitre plus.',
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // ApiError a un code — cherche dans le mapping
    const code = (err as any).code as string | undefined;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    return err.message;
  }
  return 'Une erreur inattendue est survenue.';
}
