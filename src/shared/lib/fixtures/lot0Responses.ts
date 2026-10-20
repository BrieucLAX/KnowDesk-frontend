/**
 * Réponses réelles du back (main 8bd868d, base locale : 205 articles dont 201 publiés, 2 brouillons
 * et 2 archivés ; 105 FAQ dont 102 publiées), enregistrées le 2026-10-20 pour les tests du lot 0
 * (plan-articles-v1). Le back rend 200 articles et 100 FAQ au plus par page.
 *
 * `respond(path)` rend l'enveloppe `{ data, meta }` de la réponse qui correspond au chemin et à
 * ses paramètres (`page`, `status`), quel que soit leur ordre.
 */
import ARTICLES_P1 from './articles-p1.response.json';
import ARTICLES_P2 from './articles-p2.response.json';
import ARTICLES_PUBLISHED_P1 from './articles-published-p1.response.json';
import ARTICLES_PUBLISHED_P2 from './articles-published-p2.response.json';
import FAQS_P1 from './faqs-p1.response.json';
import FAQS_P2 from './faqs-p2.response.json';
import FAQS_PUBLISHED_P1 from './faqs-published-p1.response.json';
import FAQS_PUBLISHED_P2 from './faqs-published-p2.response.json';
import CATEGORIES from './categories.response.json';
import TAGS from './tags.response.json';
import LEARNING_PATH from './learning-path.response.json';
import LEARNING_RESOURCES from './learning-resources.response.json';
import LEARNING_QUIZ from './learning-quiz.response.json';
import TREES_PUBLISHED from './trees-published.response.json';

/** Le parcours et son module, créés sur le même back local. */
export const LEARNING_PATH_ID   = '2e7c3a88-bfdc-4aa4-8496-f0004c6b7d4a';
export const LEARNING_MODULE_ID = 'be52cc2f-18e9-456e-a7ca-870c0230bade';

export interface Envelope { data: unknown; meta?: unknown }

const BY_KEY: Record<string, Envelope> = {
  '/articles?page=1':                  ARTICLES_P1,
  '/articles?page=2':                  ARTICLES_P2,
  '/articles?page=1&status=published': ARTICLES_PUBLISHED_P1,
  '/articles?page=2&status=published': ARTICLES_PUBLISHED_P2,
  '/faqs?page=1':                      FAQS_P1,
  '/faqs?page=2':                      FAQS_P2,
  '/faqs?page=1&status=published':     FAQS_PUBLISHED_P1,
  '/faqs?page=2&status=published':     FAQS_PUBLISHED_P2,
  '/categories':                       CATEGORIES,
  '/tags':                             TAGS,
  '/trees?status=published':           TREES_PUBLISHED,
  [`/learning/paths/${LEARNING_PATH_ID}`]:               LEARNING_PATH,
  [`/learning/modules/${LEARNING_MODULE_ID}/resources`]: LEARNING_RESOURCES,
  [`/learning/modules/${LEARNING_MODULE_ID}/quiz`]:      LEARNING_QUIZ,
};

/** La clé d'un appel : le chemin, puis `page` et `status` s'ils sont posés. */
export function keyOf(path: string): string {
  const [base, qs = ''] = path.split('?');
  const params = new URLSearchParams(qs);
  const kept = ['page', 'status'].filter(k => params.has(k)).map(k => `${k}=${params.get(k)}`);
  return kept.length ? `${base}?${kept.join('&')}` : base;
}

export function respond(path: string): Envelope {
  const found = BY_KEY[keyOf(path)];
  if (!found) throw new Error(`aucune réponse enregistrée pour ${path}`);
  return found;
}
