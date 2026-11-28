import type { OnboardingLimits } from '../types';
import { formatBytes } from './format';

/** Formats lus par le pipeline, comme ONBOARDING_FORMATS côté back (lot 2a : Excel) ; `zip` : une archive, développée en documents par le back. */
export const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'xlsx', 'md', 'zip'] as const;

/** Les formats acceptés, en clair (message d'erreur et aide de la zone d'import ; maquette Documents, contrat lot 2a). */
export const ACCEPTED_FORMATS_TEXT = 'PDF, Word, PowerPoint, Excel, Markdown ou archive .zip';
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map(e => `.${e}`).join(',');

const quote = (names: string[]) => names.map(n => `« ${n} »`).join(', ');

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Contrôles faits avant l'envoi, avec les plafonds renvoyés par le back
 * (`project.limits`) : nombre de fichiers d'un envoi, format, fichier vide,
 * taille d'un fichier. Les plafonds du projet (documents, Mo) sont comptés par
 * le back seul, après développement des archives et retrait des doublons
 * (lot 2a, décision Q1 a). Renvoie le message à afficher, ou null si la sélection
 * peut partir : un seul problème et rien n'est envoyé. Les doublons (même nom,
 * même contenu) ne sont plus refusés (lot 2a) : le back les écarte et les
 * compte. Le back refait ces contrôles, après le développement des archives.
 */
export function checkSelection(files: File[], limits: OnboardingLimits): string | null {
  if (files.length === 0) return null;

  if (files.length > limits.maxFilesPerUpload) {
    return `Vous avez sélectionné ${files.length} fichiers : ${limits.maxFilesPerUpload} au plus par envoi. Rien n'a été envoyé.`;
  }

  const unsupported = files.filter(f => !(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension(f.name)));
  if (unsupported.length) {
    return `Format non pris en charge : ${quote(unsupported.map(f => f.name))}. Formats acceptés : ${ACCEPTED_FORMATS_TEXT}.`;
  }

  const empty = files.filter(f => f.size === 0);
  if (empty.length) return `Fichier vide : ${quote(empty.map(f => f.name))}.`;

  const tooLarge = files.filter(f => f.size > limits.maxFileBytes);
  if (tooLarge.length) {
    return `Un fichier pèse ${formatBytes(limits.maxFileBytes)} au plus : ${quote(tooLarge.map(f => f.name))}.`;
  }

  return null;
}
