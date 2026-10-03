import type { OnboardingProject } from '../types';

export interface CorpusVolume {
  /** Part, en %, de ce qu'une analyse peut lire (peut dépasser 100). */
  share: number;
  tone:  'ok' | 'warning' | 'over';
  label: string;
  /** Documents importés avant la mesure du volume : non comptés. */
  note:  string | null;
}

const WARNING_SHARE = 80;

/**
 * Volume de texte du projet, rapporté au plafond d'une analyse (plafond
 * d'entrée du back, `limits.maxTextChars`). Null quand le back ne l'expose pas.
 * La fiche de cadrage, comptée par le back au lancement, n'y figure pas.
 */
export function corpusVolume(
  project: Pick<OnboardingProject, 'limits' | 'textChars' | 'unmeasuredDocuments'>,
): CorpusVolume | null {
  const max = project.limits.maxTextChars;
  if (!max || project.textChars === undefined) return null;
  const share = Math.round((project.textChars / max) * 100);
  const tone = share > 100 ? 'over' : share >= WARNING_SHARE ? 'warning' : 'ok';
  const label = tone === 'over'
    ? `Volume de texte : ${share} % de ce qu'une analyse peut lire. Retirez des documents pour pouvoir lancer l'analyse.`
    : `Volume de texte : ${share} % de ce qu'une analyse peut lire.`;
  const unmeasured = project.unmeasuredDocuments ?? 0;
  const note = unmeasured === 0 ? null
    : unmeasured === 1 ? 'Un document importé avant cette mesure n\'est pas compté.'
    : `${unmeasured} documents importés avant cette mesure ne sont pas comptés.`;
  return { share, tone, label, note };
}

/** Le volume mesuré dépasse déjà ce qu'une analyse peut lire. */
export const isCorpusTooLarge = (project: Pick<OnboardingProject, 'limits' | 'textChars' | 'unmeasuredDocuments'>) =>
  corpusVolume(project)?.tone === 'over';
