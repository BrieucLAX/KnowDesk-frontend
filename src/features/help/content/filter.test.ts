import { describe, it, expect } from 'vitest';
import { HELP_CONTENT } from './index';
import { visibleHelp, helpIndex, resolveHelpText } from './filter';

/**
 * Séquence 2 du masquage : l'aide suit les modules de l'organisation (`hasModule`).
 * Modules d'une organisation normale avec la valeur de production de `DISABLED_MODULES`.
 */
const PRODUCTION = [
  'ai_answer', 'analytics_collect', 'article_quality', 'dashboard', 'faqs', 'help',
  'imports', 'knowledge', 'members', 'settings',
];
const prod = { enabledModules: PRODUCTION };
const all  = { enabledModules: undefined }; // organisation historique : tous les modules

const ALL_IDS = HELP_CONTENT.flatMap(s => s.articles.map(a => a.id));

/** Articles masqués avec la valeur actuelle (décisions du PO du 2026-11-16). */
const MASKED_ARTICLES = [
  'chatbot-config', 'chatbot-handoff',                                   // chatbot, passage à un humain
  'what-is-tree', 'create-tree', 'tree-nodes', 'tree-publish', 'follow-tree', // processus guidés
  'advisor-notifications',                                               // notifications
  'measure-impact', 'find-gaps',                                         // cas d'usage sur l'Analyse seule
  'analytics-overview', 'chats-overview', 'api-keys',
  'report-issue',                                                        // bouton sans effet (masqué partout)
];
const MASKED_SECTIONS = ['trees', 'analytics', 'chats'];

/** Ce qu'un texte visible ne doit jamais citer avec la valeur actuelle. */
const MASKED_WORDS = /processus|chatbot|\bAnalyse\b|notification|Conversations|\bAPI\b|webhook|passage à un humain|résumé hebdomadaire|KB Health Score|signaler|signalement|article lié|Interne \/ Public|\*Public\*/i;

const ids = (sections: ReturnType<typeof visibleHelp>) => sections.flatMap(s => s.articles.map(a => a.id));

describe('aide filtrée selon les modules', () => {
  it('tous les modules actifs : 46 des 47 articles (« Signaler » masqué partout) et les 12 rubriques', () => {
    const sections = visibleHelp(all);
    expect(ALL_IDS).toHaveLength(47);
    expect(ids(sections)).toEqual(ALL_IDS.filter(id => id !== 'report-issue'));
    expect(sections).toHaveLength(HELP_CONTENT.length);
    for (const a of sections.flatMap(s => s.articles)) expect(a.content, a.id).not.toMatch(/\[\[|\]\]/);
  });

  it('valeur de production : aucun article ni rubrique masqué n\'est atteignable', () => {
    const sections = visibleHelp(prod);
    const visible = ids(sections);
    for (const id of MASKED_ARTICLES) expect(visible, id).not.toContain(id);
    expect(visible).toEqual(ALL_IDS.filter(id => !MASKED_ARTICLES.includes(id)));
    expect(visible).toHaveLength(33);
    for (const id of MASKED_SECTIONS) expect(sections.map(s => s.id)).not.toContain(id);
    for (const s of sections) expect(s.articles.length, s.id).toBeGreaterThan(0);
    // Gardés : articles, catégories, tags, synonymes, recherche, réponse IA et son réglage, FAQ,
    // « Systématiser les réponses récurrentes », équipe, rôles, compte, facturation.
    for (const id of ['create-article', 'categories', 'add-tags', 'synonyms', 'search-basics', 'ai-answer',
      'ai-config', 'what-is-faq', 'industrialize-faqs', 'invite', 'roles', 'manage-roles', 'account-settings',
      'manage-tags', 'org-settings']) expect(visible, id).toContain(id);
  });

  it('valeur de production : aucun texte visible ne cite une fonction masquée', () => {
    for (const a of visibleHelp(prod).flatMap(s => s.articles)) {
      expect(`${a.title}\n${a.content}`, a.id).not.toMatch(MASKED_WORDS);
      expect(a.content, a.id).not.toMatch(/\[\[|\]\]/);
      expect(a.content, a.id).not.toMatch(/\n{3,}/);
    }
  });

  it.each(['processus', 'chatbot', 'analyse', 'notification', 'API', 'conversation', 'humain', 'signaler', 'article lié'])(
    'recherche d\'aide « %s » : aucun résultat ne décrit une fonction masquée', term => {
      const q = term.toLowerCase();
      const hits = helpIndex(visibleHelp(prod)).filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q));
      for (const h of hits) expect(MASKED_ARTICLES, h.articleId).not.toContain(h.articleId);
      // La recherche de l'aide porte sur des morceaux de mots : « api » trouve « rapide », « conversation »
      // trouve « conversation client », « humain » trouve « humaine ». Ces trois termes et « analyse »
      // peuvent donc donner des articles gardés, qui ne citent aucune fonction masquée (test précédent).
      if (['processus', 'chatbot', 'notification', 'signaler', 'article lié'].includes(term)) expect(hits.map(h => h.articleId)).toEqual([]);
    });

  it('« Premiers pas » ne cite aucune fonction masquée, et l\'assistant a 2 étapes', () => {
    const start = visibleHelp(prod).find(s => s.id === 'getting-started')!;
    for (const a of start.articles) expect(a.content, a.id).not.toMatch(MASKED_WORDS);
    expect(start.articles.find(a => a.id === 'create-workspace')!.content).toContain('2 étapes');
  });

  it('« Signaler une information incorrecte » reste masqué même avec tous les modules', () => {
    expect(ids(visibleHelp(all))).not.toContain('report-issue');
    expect(HELP_CONTENT.flatMap(x => x.articles).find(a => a.id === 'report-issue')!.content).toContain('Signaler');
  });

  it('historique des versions : en bas de la page de l\'article', () => {
    const a = visibleHelp(prod).flatMap(x => x.articles).find(x => x.id === 'versions')!;
    expect(a.content).toContain('En bas de la page de l\'article, cliquez sur **Historique des versions**');
    expect(a.content).not.toMatch(/en haut à droite/);
  });

  it('créer une FAQ : la visibilité n\'est décrite qu\'avec le chatbot', () => {
    const text = (mods: string[]) => visibleHelp({ enabledModules: mods }).flatMap(x => x.articles).find(a => a.id === 'create-faq')!.content;
    expect(text(PRODUCTION)).not.toContain('**Visibilité**');
    expect(text([...PRODUCTION, 'chatbot'])).toContain('**Visibilité**');
  });

  it.each([
    ['trees',         ['what-is-tree', 'create-tree', 'tree-nodes', 'tree-publish', 'follow-tree']],
    ['analytics',     ['analytics-overview', 'measure-impact', 'find-gaps']],
    ['chats',         ['chats-overview']],
    ['chatbot',       ['chatbot-config', 'chatbot-handoff']],
    ['notifications', ['advisor-notifications']],
    ['api_keys',      ['api-keys']],
  ])('réactiver %s fait revenir son aide, sans autre intervention', (module, articles) => {
    const visible = ids(visibleHelp({ enabledModules: [...PRODUCTION, module] }));
    for (const id of articles) expect(visible).toContain(id);
  });

  it('les passages mélangés suivent le module : processus dans la recherche', () => {
    const text = (mods: string[]) => visibleHelp({ enabledModules: mods }).flatMap(s => s.articles).find(a => a.id === 'search-basics')!.content;
    expect(text(PRODUCTION)).toContain('couvre les articles, les FAQ et leurs tags.');
    expect(text([...PRODUCTION, 'trees'])).toContain('couvre les articles, les FAQ, les processus guidés et leurs tags.');
    expect(text([...PRODUCTION, 'trees'])).toContain('- **Processus** en dernier');
  });

  it('publier : « retiré … du chatbot » seulement avec le chatbot', () => {
    const text = (mods: string[]) => visibleHelp({ enabledModules: mods }).flatMap(s => s.articles).find(a => a.id === 'publish')!.content;
    expect(text(PRODUCTION)).toContain('- Retiré des articles publiés et de la recherche');
    expect(text([...PRODUCTION, 'chatbot'])).toContain('- Retiré des articles publiés, de la recherche et du chatbot');
  });

  it('cas d\'usage saisonnier : étapes numérotées sans trou dans les deux cas', () => {
    const steps = (mods: string[]) => [...visibleHelp({ enabledModules: mods }).flatMap(s => s.articles)
      .find(a => a.id === 'seasonal-campaign')!.content.matchAll(/\*\*Étape (\d)/g)].map(m => Number(m[1]));
    expect(steps(PRODUCTION)).toEqual([1, 2, 3, 4]);
    expect(steps([...PRODUCTION, 'trees'])).toEqual([1, 2, 3, 4, 5]);
    expect(steps([...PRODUCTION, 'trees', 'analytics'])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(steps([...PRODUCTION, 'analytics'])).toEqual([1, 2, 3, 4, 5]);
  });

  it('balises : jamais imbriquées, toujours fermées, modules connus', () => {
    const known = /^!?(dashboard|knowledge|faqs|trees|learning|analytics|chats|chatbot|ai_answer|article_quality|imports|brand_monitoring|notifications|members|api_keys|help|settings|onboarding|kbscore|analytics_collect|audit)$/;
    for (const a of HELP_CONTENT.flatMap(s => s.articles)) {
      let open = false;
      for (const tok of a.content.matchAll(/\[\[(if ([^\]]+)|else|\/if)\]\]/g)) {
        if (tok[1].startsWith('if ')) {
          expect(open, `${a.id} : balise imbriquée`).toBe(false);
          open = true;
          for (const term of tok[2].split(/[|,]/)) expect(term.trim(), a.id).toMatch(known);
        } else if (tok[1] === '/if') { expect(open, a.id).toBe(true); open = false; }
        else expect(open, a.id).toBe(true);
      }
      expect(open, `${a.id} : balise non fermée`).toBe(false);
      expect(resolveHelpText(a.content, all), a.id).not.toMatch(/\[\[|\]\]/);
    }
  });
});
