/**
 * Miroir des réponses du module onboarding du back
 * (src/modules/onboarding/onboarding.service.ts, onboarding.cadrage.ts).
 */

export interface OnboardingLimits {
  maxFileBytes:           number;
  maxDocumentsPerProject: number;
  maxProjectBytes:        number;
  maxFilesPerUpload:      number;
}

export interface OnboardingProjectSummary {
  id:             string;
  name:           string;
  createdAt:      string;
  updatedAt:      string;
  documentsCount: number;
  totalBytes:     number;
}

export interface OnboardingProject extends OnboardingProjectSummary {
  limits:         OnboardingLimits;
  /** Dernière version de la fiche de cadrage, null s'il n'y en a pas. */
  cadrageVersion: number | null;
}

export type OnboardingFormat = 'pdf' | 'docx' | 'pptx';

export interface OnboardingDocument {
  id:        string;
  filename:  string;
  format:    OnboardingFormat;
  sizeBytes: number;
  sha256:    string;
  /** Figé par une analyse : ne peut plus être retiré. */
  locked:    boolean;
  createdAt: string;
}

export interface OnboardingNotice {
  version:    string;
  text:       string;
  sha256:     string;
  /** Acceptation de l'utilisateur courant pour cette version, null sinon. */
  acceptedAt: string | null;
}

// ── Fiche de cadrage (six sections du cadrage pilote) ─────────

export interface NamedItem {
  name:        string;
  description: string;
}

export interface ServiceItem extends NamedItem {
  status: 'active' | 'upcoming';
}

export interface NotionItem {
  first:       string;
  second:      string;
  explanation: string;
}

/** Les documents sont cités par nom de fichier : un document réimporté sous le même nom reprend sa place. */
export interface SourceLevel {
  label:     string;
  detail:    string;
  documents: string[];
}

export interface LimitedDocument {
  document:   string;
  validFrom:  string | null;
  validUntil: string | null;
  effect:     'replaces' | 'suspends';
  scope:      string;
}

export interface CadrageForm {
  offers:   NamedItem[];
  segments: NamedItem[];
  services: ServiceItem[];
  notions:  NotionItem[];
  sourceHierarchy: {
    levels:       SourceLevel[];
    specialCases: string[];
  };
  limitedDocuments: LimitedDocument[];
}

/**
 * Une version de fiche est soit libre (texte collé ou importé, envoyé tel
 * quel au pipeline), soit structurée (formulaire en six sections).
 */
export type CadrageKind = 'free' | 'structured';

export interface CadrageVersionSummary {
  version:        number;
  kind:           CadrageKind;
  /** Fichier .md/.txt dont le texte libre a été importé, s'il y en a un. */
  sourceFilename: string | null;
  createdAt:      string;
  createdBy:      string;
}

export interface Cadrage extends CadrageVersionSummary {
  /** Nul pour une version libre. */
  form:     CadrageForm | null;
  /** Ce qui part au pipeline : le texte libre tel quel, ou le rendu du formulaire. */
  markdown: string;
}

/** Réponse d'un enregistrement : les documents cités mais absents du projet sont signalés, pas refusés. */
export interface SavedCadrage extends Cadrage {
  missingDocuments: string[];
}
