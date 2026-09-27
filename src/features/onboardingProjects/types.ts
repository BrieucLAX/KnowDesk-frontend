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

export interface SourceLevel {
  label:       string;
  detail:      string;
  documentIds: string[];
}

export interface LimitedDocument {
  documentId: string;
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

export interface CadrageVersionSummary {
  version:   number;
  createdAt: string;
  createdBy: string;
}

export interface Cadrage extends CadrageVersionSummary {
  form:     CadrageForm;
  /** Rendu figé à l'enregistrement : c'est ce qui part au pipeline. */
  markdown: string;
}
