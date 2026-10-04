/**
 * Miroir des réponses du module onboarding du back
 * (src/modules/onboarding/onboarding.service.ts, onboarding.cadrage.ts).
 */

export interface OnboardingLimits {
  maxFileBytes:           number;
  maxDocumentsPerProject: number;
  maxProjectBytes:        number;
  maxFilesPerUpload:      number;
  /** Caractères de texte qu'une analyse peut lire (plafond d'entrée du back). */
  maxTextChars?:          number;
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
  /** Caractères de texte mesurés à l'import, documents non mesurés exclus. */
  textChars?:           number;
  /** Documents importés avant la mesure du volume. */
  unmeasuredDocuments?: number;
}

/** `zip` : une archive (un export Notion, par exemple), lue document par document par le pipeline. */
export type OnboardingFormat = 'pdf' | 'docx' | 'pptx' | 'md' | 'zip';

export interface OnboardingDocument {
  id:        string;
  filename:  string;
  format:    OnboardingFormat;
  sizeBytes: number;
  sha256:    string;
  /** Caractères de texte mesurés à l'import ; null : importé avant la mesure. */
  textChars?: number | null;
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

// ── Analyses (back, étape F2) ─────────────────────────────────

/** queued : pas encore acceptée par le service d'analyse ; running : en cours chez lui. */
export type AnalysisStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** Étapes du pipeline, plus `storing` (le back enregistre l'audit et ses images). */
export type AnalysisStage =
  | 'download' | 'cadrage' | 'parsing' | 'extraction' | 'detection' | 'questions' | 'storing'
  // Lecture globale (audit 0.8.0) : noms fixés avec le back (migration 50) et la PR 5 du pipeline.
  | 'images' | 'reading' | 'verification';

export interface OnboardingAnalysis {
  id:             string;
  status:         AnalysisStatus;
  stage:          AnalysisStage | null;
  /** Avancement i/n de l'étape en cours (lecture, extraction). */
  done:           number;
  total:          number;
  llmCalls:       number;
  llmRetries:     number;
  /** Version de la fiche figée au lancement. */
  cadrageVersion: number;
  /** Documents figés au lancement. */
  documents:      Array<{ id: string; filename: string }>;
  /** Code seul, jamais de message (voir lib/analysisStatus.ts). */
  errorCode:      string | null;
  pipelineVersion: { package: string; commit: string; prompts: string[] } | null;
  createdAt:      string;
  createdBy:      string | null;
  submittedAt:    string | null;
  finishedAt:     string | null;
  /** Au-delà, l'analyse est arrêtée (60 min après le lancement). */
  deadlineAt:     string;
}

export interface AnalysisQuota {
  used: number;
  max:  number;
}
