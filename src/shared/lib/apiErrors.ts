/**
 * Mapping des codes d'erreur API → messages utilisateur français.
 * Utiliser via getErrorMessage(err) dans les catch blocks.
 */
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS:   'Adresse e-mail ou mot de passe incorrect. Vérifiez votre saisie, puis réessayez.',
  TOKEN_EXPIRED:         'Votre session a expiré. Reconnectez-vous.',
  UNAUTHORIZED:          'Vous n\'êtes pas connecté. Connectez-vous pour continuer.',
  FORBIDDEN:             'Vous n\'avez pas les droits pour cette action. Demandez-les à un administrateur de votre organisation.',
  NOT_FOUND:             'Cet élément est introuvable. Il a peut-être été supprimé : rechargez la page.',
  CONFLICT:              'Cet élément existe déjà. Modifiez votre saisie, puis réessayez.',
  VALIDATION_ERROR:      'Certaines données sont invalides. Vérifiez le formulaire, puis réessayez.',
  ORG_LIMIT_REACHED:     'Vous avez atteint la limite du plan gratuit. Passez au plan Pro pour continuer.',
  TOO_MANY_REQUESTS:     'Trop de tentatives en peu de temps. Attendez une minute, puis réessayez.',
  INTERNAL_ERROR:        'Le serveur a rencontré une erreur. Réessayez dans quelques instants.',
  UNSUPPORTED_MEDIA_TYPE:'Le format de la requête n\'est pas accepté. Rechargez la page, puis réessayez.',
  // Accès (B3b côté back) — mêmes textes que le back.
  ORG_DISABLED:          'Cet espace est désactivé.',
  REGISTRATION_CLOSED:   'Les inscriptions sont fermées. L\'accès se fait sur invitation.',
  ACCOUNT_NOT_FOUND:     'Aucun compte Knowdesk n\'est associé à cette adresse. L\'accès se fait sur invitation.',
  // Arbitrage de l'audit (F3, B-F3b).
  DECISION_CONFLICT:     'Cette question a été modifiée entre-temps : l\'audit a été rechargé.',
  AUDIT_READ_ONLY:       'Cet audit est celui d\'une analyse précédente : il se consulte, mais ne s\'arbitre plus.',
  // Correction de la base (plan-correction-produit.md, lot 3). CARDS_PENDING et
  // CORRECTION_QUOTA_EXCEEDED gardent le message du back, qui donne le nombre.
  REVIEW_CONFLICT:        'Cet avis a été modifié entre-temps : la relecture a été rechargée.',
  BASE_READ_ONLY:         'Cette base est celle d\'une préparation précédente : elle se consulte, mais ne se relit plus.',
  CORRECTION_IN_PROGRESS: 'Une nouvelle base est déjà en préparation pour ce projet. Attendez la fin de sa préparation.',
  ANALYSIS_NOT_LATEST:    'La nouvelle base se prépare sur la dernière analyse du projet.',
  AUDIT_NOT_CORRECTABLE:  'Cet audit vient d\'une version précédente de l\'analyse : relancez une analyse pour préparer la nouvelle base.',
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // ApiError a un code — cherche dans le mapping
    const code = (err as any).code as string | undefined;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    return err.message;
  }
  return 'Une erreur inattendue est survenue. Réessayez dans quelques instants.';
}
