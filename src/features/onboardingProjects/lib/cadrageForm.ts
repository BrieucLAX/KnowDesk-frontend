import type { CadrageForm } from '../types';

/**
 * Fiche de cadrage : règles reprises du schéma zod du back
 * (src/modules/onboarding/onboarding.cadrage.ts). Le back reste juge ; ces
 * contrôles évitent la plupart des 422 et placent l'erreur sous le bon champ.
 */

export const CADRAGE_SECTIONS = [
  { key: 'offers',           number: 1, title: 'Les offres' },
  { key: 'segments',         number: 2, title: 'Les segments de clientèle' },
  { key: 'services',         number: 3, title: 'Les services et activités' },
  { key: 'notions',          number: 4, title: 'Notions à ne jamais confondre' },
  { key: 'sourceHierarchy',  number: 5, title: 'Hiérarchie des sources' },
  { key: 'limitedDocuments', number: 6, title: 'Documents à durée limitée' },
] as const;

export type CadrageSectionKey = typeof CADRAGE_SECTIONS[number]['key'];

export const CADRAGE_LIMITS = {
  offers: 30, segments: 30, services: 50, notions: 50,
  levels: 15, levelDocuments: 50, specialCases: 30, limitedDocuments: 50,
  name: 120, paragraph: 2000, specialCase: 500,
} as const;

export function emptyCadrageForm(): CadrageForm {
  return {
    offers: [], segments: [], services: [], notions: [],
    sourceHierarchy: { levels: [], specialCases: [] },
    limitedDocuments: [],
  };
}

/** Complète un formulaire reçu du back (champs par défaut de zod). */
export function normalizeCadrageForm(raw: Partial<CadrageForm> | null | undefined): CadrageForm {
  const empty = emptyCadrageForm();
  if (!raw) return empty;
  return {
    offers:   raw.offers   ?? empty.offers,
    segments: raw.segments ?? empty.segments,
    services: raw.services ?? empty.services,
    notions:  raw.notions  ?? empty.notions,
    sourceHierarchy: {
      levels:       raw.sourceHierarchy?.levels       ?? [],
      specialCases: raw.sourceHierarchy?.specialCases ?? [],
    },
    limitedDocuments: raw.limitedDocuments ?? empty.limitedDocuments,
  };
}

/** Valeurs envoyées au back : textes sans espaces en bord (le back les retire aussi). */
export function cleanCadrageForm(form: CadrageForm): CadrageForm {
  const t = (s: string) => s.trim();
  return {
    offers:   form.offers.map(o => ({ name: t(o.name), description: t(o.description) })),
    segments: form.segments.map(o => ({ name: t(o.name), description: t(o.description) })),
    services: form.services.map(o => ({ name: t(o.name), description: t(o.description), status: o.status })),
    notions:  form.notions.map(n => ({ first: t(n.first), second: t(n.second), explanation: t(n.explanation) })),
    sourceHierarchy: {
      levels: form.sourceHierarchy.levels.map(l => ({ label: t(l.label), detail: t(l.detail), documentIds: l.documentIds })),
      specialCases: form.sourceHierarchy.specialCases.map(t),
    },
    limitedDocuments: form.limitedDocuments.map(d => ({
      documentId: d.documentId,
      validFrom:  d.validFrom  || null,
      validUntil: d.validUntil || null,
      effect:     d.effect,
      scope:      t(d.scope),
    })),
  };
}

/** Erreurs par chemin, au format du back : `offers.0.name`, `limitedDocuments.2.validUntil`… */
export type CadrageErrors = Record<string, string>;

function checkLine(errors: CadrageErrors, path: string, value: string, max: number) {
  const v = value.trim();
  if (!v) errors[path] = 'Champ requis.';
  else if (v.length > max) errors[path] = `${max} caractères au plus.`;
  else if (/[\r\n]/.test(v)) errors[path] = 'Une seule ligne attendue.';
}

function checkParagraph(errors: CadrageErrors, path: string, value: string) {
  if (value.trim().length > CADRAGE_LIMITS.paragraph) errors[path] = `${CADRAGE_LIMITS.paragraph} caractères au plus.`;
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`))
    && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);
}

/**
 * Contrôle le formulaire. `documentIds` : documents du projet, les seuls que
 * les sections 5 et 6 peuvent citer.
 */
export function validateCadrageForm(form: CadrageForm, documentIds: ReadonlySet<string>): CadrageErrors {
  const errors: CadrageErrors = {};
  const L = CADRAGE_LIMITS;

  const tooMany = (path: string, count: number, max: number) => {
    if (count > max) errors[path] = `${max} éléments au plus.`;
  };

  tooMany('offers', form.offers.length, L.offers);
  form.offers.forEach((o, i) => { checkLine(errors, `offers.${i}.name`, o.name, L.name); checkParagraph(errors, `offers.${i}.description`, o.description); });

  tooMany('segments', form.segments.length, L.segments);
  form.segments.forEach((o, i) => { checkLine(errors, `segments.${i}.name`, o.name, L.name); checkParagraph(errors, `segments.${i}.description`, o.description); });

  tooMany('services', form.services.length, L.services);
  form.services.forEach((o, i) => { checkLine(errors, `services.${i}.name`, o.name, L.name); checkParagraph(errors, `services.${i}.description`, o.description); });

  tooMany('notions', form.notions.length, L.notions);
  form.notions.forEach((n, i) => {
    checkLine(errors, `notions.${i}.first`, n.first, L.name);
    checkLine(errors, `notions.${i}.second`, n.second, L.name);
    checkParagraph(errors, `notions.${i}.explanation`, n.explanation);
  });

  const { levels, specialCases } = form.sourceHierarchy;
  tooMany('sourceHierarchy.levels', levels.length, L.levels);
  const ranked = new Set<string>();
  levels.forEach((l, i) => {
    checkLine(errors, `sourceHierarchy.levels.${i}.label`, l.label, L.name);
    checkParagraph(errors, `sourceHierarchy.levels.${i}.detail`, l.detail);
    const path = `sourceHierarchy.levels.${i}.documentIds`;
    tooMany(path, l.documentIds.length, L.levelDocuments);
    for (const id of l.documentIds) {
      if (!documentIds.has(id)) errors[path] = 'Un document cité n\'est plus dans le projet.';
      else if (ranked.has(id)) errors[path] = 'Un document ne figure qu\'à un seul niveau de la hiérarchie.';
      ranked.add(id);
    }
  });
  tooMany('sourceHierarchy.specialCases', specialCases.length, L.specialCases);
  specialCases.forEach((c, i) => checkLine(errors, `sourceHierarchy.specialCases.${i}`, c, L.specialCase));

  tooMany('limitedDocuments', form.limitedDocuments.length, L.limitedDocuments);
  const bounded = new Set<string>();
  form.limitedDocuments.forEach((d, i) => {
    const p = `limitedDocuments.${i}`;
    if (!d.documentId) errors[`${p}.documentId`] = 'Choisissez un document.';
    else if (!documentIds.has(d.documentId)) errors[`${p}.documentId`] = 'Ce document n\'est plus dans le projet.';
    else if (bounded.has(d.documentId)) errors[`${p}.documentId`] = 'Document déjà listé parmi les documents à durée limitée.';
    if (d.documentId) bounded.add(d.documentId);
    if (d.validFrom  && !isValidDate(d.validFrom))  errors[`${p}.validFrom`]  = 'Date invalide.';
    if (d.validUntil && !isValidDate(d.validUntil)) errors[`${p}.validUntil`] = 'Date invalide.';
    if (d.validFrom && d.validUntil && d.validFrom > d.validUntil) errors[`${p}.validUntil`] = 'La fin de validité précède son début.';
    checkParagraph(errors, `${p}.scope`, d.scope);
  });

  return errors;
}

/**
 * Découpe un message 422 du back (`offers.0.name : Champ requis`) en chemin et
 * message. Sans chemin reconnu (ex. « 2 document(s) cité(s) n'appartiennent
 * pas à ce projet. »), renvoie null : le message s'affiche tel quel.
 */
export function parseBackendError(message: string): { path: string; message: string } | null {
  const m = message.match(/^([A-Za-z]+(?:\.[A-Za-z0-9]+)*) : (.+)$/s);
  if (!m || m[1] === 'formulaire') return null;
  return { path: m[1], message: m[2] };
}

/** Section d'un chemin d'erreur (premier segment). */
export function sectionOfPath(path: string): CadrageSectionKey | null {
  const head = path.split('.')[0];
  return CADRAGE_SECTIONS.some(s => s.key === head) ? head as CadrageSectionKey : null;
}

/** Nombre d'erreurs par section, pour les signaler dans les titres. */
export function errorsBySection(errors: CadrageErrors): Partial<Record<CadrageSectionKey, number>> {
  const out: Partial<Record<CadrageSectionKey, number>> = {};
  for (const path of Object.keys(errors)) {
    const s = sectionOfPath(path);
    if (s) out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}
