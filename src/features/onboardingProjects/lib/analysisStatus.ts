import type { AnalysisStage, OnboardingAnalysis } from '../types';

/** Intervalle de relecture d'une analyse en file ou en cours (plan §2 « Front »). */
export const ANALYSIS_POLL_MS = 5000;

export function isAnalysisActive(a: Pick<OnboardingAnalysis, 'status'>): boolean {
  return a.status === 'queued' || a.status === 'running';
}

export interface AnalysisStep {
  /** Étapes du back regroupées sous ce libellé. */
  stages: AnalysisStage[];
  label:  string;
  /** Afficher l'avancement i/n (lecture, extraction). */
  counts?: boolean;
}

/** Étapes affichées, dans l'ordre : cadrage → lecture i/n → extraction i/n → croisement → questions. */
export const ANALYSIS_STEPS: AnalysisStep[] = [
  { stages: ['download', 'cadrage'], label: 'Lecture de la fiche de cadrage' },
  { stages: ['parsing'],    label: 'Lecture des documents', counts: true },
  { stages: ['extraction'], label: 'Extraction des informations', counts: true },
  { stages: ['detection'],  label: 'Croisement des documents' },
  { stages: ['questions'],  label: 'Préparation des questions' },
  { stages: ['storing'],    label: 'Enregistrement des résultats' },
];

export type StepState = 'done' | 'current' | 'pending';

/** État de chaque étape affichée pour une analyse. */
export function stepStates(a: Pick<OnboardingAnalysis, 'status' | 'stage'>): StepState[] {
  if (a.status === 'succeeded') return ANALYSIS_STEPS.map(() => 'done');
  const current = a.stage === null ? -1 : ANALYSIS_STEPS.findIndex(s => s.stages.includes(a.stage!));
  // En file, ou acceptée sans étape encore connue : rien n'a commencé.
  if (current === -1) return ANALYSIS_STEPS.map(() => 'pending');
  return ANALYSIS_STEPS.map((_, i) => {
    if (i < current) return 'done';
    if (i > current) return 'pending';
    return a.status === 'running' ? 'current' : 'pending';   // échec : l'étape atteinte n'est pas terminée
  });
}

/** Durée lisible : « 45 s », « 12 min 05 s », « 1 h 02 min ». */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(s).padStart(2, '0')} s`;
  return `${s} s`;
}

/** Temps écoulé depuis le lancement, figé à la fin de l'analyse. */
export function elapsedMs(a: Pick<OnboardingAnalysis, 'createdAt' | 'finishedAt'>, now: number): number {
  const end = a.finishedAt ? new Date(a.finishedAt).getTime() : now;
  return end - new Date(a.createdAt).getTime();
}

/**
 * Message d'un échec, à partir du code seul renvoyé par le back (codes du
 * pipeline, ou du back : pipeline_restarted, schema_mismatch, input_missing).
 */
const FAILURE_MESSAGES = new Map<string, string>(Object.entries({
  time_limit_exceeded:  'L\'analyse a dépassé sa durée maximale d\'une heure.',
  call_limit_exceeded:  'L\'analyse a atteint le nombre maximal d\'appels à l\'IA.',
  download_failed:      'Le service d\'analyse n\'a pas pu lire les documents.',
  checksum_mismatch:    'Un document a été modifié pendant son envoi au service d\'analyse.',
  document_too_large:   'Un document dépasse la taille acceptée par le service d\'analyse.',
  rate_limited:         'Le service d\'IA est saturé pour le moment.',
  provider_error:       'Le service d\'IA est indisponible pour le moment.',
  model_output_invalid: 'L\'IA a renvoyé une réponse inexploitable.',
  pipeline_restarted:   'Le service d\'analyse a redémarré pendant l\'analyse.',
  schema_mismatch:      'Le résultat de l\'analyse n\'est pas dans le format attendu.',
  input_missing:        'Un document ou la fiche de cadrage a disparu avant l\'envoi.',
  cancelled:            'L\'analyse a été annulée.',
}));

export function analysisFailureMessage(code: string | null): string {
  return (code !== null && FAILURE_MESSAGES.get(code)) || 'L\'analyse a échoué.';
}
