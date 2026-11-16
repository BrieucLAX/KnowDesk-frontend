import type { Organization } from '../../../shared/types';
import { hasModule, type ModuleName } from '../../../shared/lib/modules';
import { HELP_CONTENT, type HelpArticle, type HelpSection } from './index';

/**
 * Aide filtrée selon les fonctions actives (séquence 2 du masquage, 2026-11-16).
 *
 * Rien n'est supprimé du contenu : chaque article déclare les modules qu'il décrit (`modules`, tous
 * requis), et les passages qui citent une fonction donnée sont écrits entre deux balises :
 *
 *   [[if chatbot]]texte avec le chatbot[[else]]texte sans[[/if]]
 *
 * Condition : un ou plusieurs modules, séparés par `,` (tous requis) ou `|` (un seul suffit), et
 * `!module` pour « sans ce module ». `[[else]]` est facultatif. Les balises ne s'imbriquent pas ;
 * elles peuvent tenir dans une phrase ou entourer plusieurs paragraphes. Même source que le reste
 * du front (`hasModule`) : une fonction réactivée retrouve son aide sans autre intervention.
 */
type Org = Pick<Organization, 'enabledModules'> | null | undefined;

const BLOCK = /\[\[if ([^\]]+)\]\]([\s\S]*?)(?:\[\[else\]\]([\s\S]*?))?\[\[\/if\]\]/g;

function conditionHolds(org: Org, condition: string): boolean {
  const any = condition.split('|').map(s => s.trim());
  return any.some(group => group.split(',').map(s => s.trim()).every(term =>
    term.startsWith('!') ? !hasModule(org, term.slice(1) as ModuleName) : hasModule(org, term as ModuleName)));
}

/** Texte de l'article pour cette organisation : balises résolues, lignes vides en trop retirées. */
export function resolveHelpText(md: string, org: Org): string {
  return md
    .replace(BLOCK, (_all, cond: string, yes: string, no: string | undefined) =>
      conditionHolds(org, cond) ? yes : (no ?? ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function articleVisible(article: HelpArticle, org: Org): boolean {
  return !article.hidden && (article.modules ?? []).every(m => hasModule(org, m));
}

/** Rubriques et articles visibles, contenu résolu ; une rubrique sans article visible disparaît. */
export function visibleHelp(org: Org): HelpSection[] {
  return HELP_CONTENT
    .map(section => ({
      ...section,
      articles: section.articles
        .filter(a => articleVisible(a, org))
        .map(a => ({ ...a, content: resolveHelpText(a.content, org) })),
    }))
    .filter(section => section.articles.length > 0);
}

export interface HelpIndexEntry {
  sectionId: string; sectionTitle: string; articleId: string; title: string; content: string;
}

/** Index de recherche de l'aide : uniquement les articles visibles, sur leur texte résolu. */
export function helpIndex(sections: HelpSection[]): HelpIndexEntry[] {
  return sections.flatMap(section => section.articles.map(article => ({
    sectionId: section.id, sectionTitle: section.title, articleId: article.id,
    title: article.title, content: article.content,
  })));
}
