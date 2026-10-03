import type { OnboardingLimits } from '../types';
import { formatBytes } from './format';

/** Formats lus par le pipeline, comme ONBOARDING_FORMATS côté back ; `zip` : un export Notion. */
export const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'md', 'zip'] as const;

/** Les formats acceptés, en clair (message d'erreur et aide de la zone d'import). */
export const ACCEPTED_FORMATS_TEXT = 'PDF, Word (.docx), PowerPoint (.pptx), Markdown (.md) ou export Notion (.zip)';
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map(e => `.${e}`).join(',');

interface Usage {
  documentsCount: number;
  totalBytes:     number;
}

const quote = (names: string[]) => names.map(n => `« ${n} »`).join(', ');

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Contrôles faits avant l'envoi, avec les plafonds renvoyés par le back
 * (`project.limits`). Renvoie le message à afficher, ou null si la sélection
 * peut partir. L'import est tout ou rien : un seul problème et rien n'est
 * envoyé. Le back refait tous ces contrôles, plus la signature des fichiers et
 * les doublons avec les documents déjà importés.
 */
export function checkSelection(files: File[], limits: OnboardingLimits, usage: Usage): string | null {
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

  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const f of files) (seen.has(f.name) ? repeated : seen).add(f.name);
  if (repeated.size) return `Même nom sélectionné deux fois : ${quote([...repeated])}.`;

  if (usage.documentsCount + files.length > limits.maxDocumentsPerProject) {
    return `Un projet compte ${limits.maxDocumentsPerProject} documents au plus (${usage.documentsCount} déjà importés).`;
  }

  const bytes = files.reduce((sum, f) => sum + f.size, 0);
  if (usage.totalBytes + bytes > limits.maxProjectBytes) {
    return `Un projet pèse ${formatBytes(limits.maxProjectBytes)} au plus (${formatBytes(usage.totalBytes)} déjà importés).`;
  }

  return null;
}
