import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ByYouBadge, InternalCard, KnowDeskBadge, KnowDeskBlock, KnowDeskMention } from './Origin';
import { answerMention } from '../../../features/search/components/AiAnswerCard';
import { isAppCode, isStylesheet, readSources } from '../../../test/readSources';

describe('Qui a fait quoi (lot 7a)', () => {
  it('la mention KnowDesk porte l’icône sparkles et son texte', () => {
    const { container } = render(<KnowDeskMention>Rédigé par KnowDesk à partir de 3 documents</KnowDeskMention>);
    expect(screen.getByText('Rédigé par KnowDesk à partir de 3 documents')).toHaveClass('kd-mention');
    expect(container.querySelector('svg.lucide-sparkles')).not.toBeNull();
  });

  it('l’encart met la mention en tête et le moyen de corriger à côté', () => {
    render(<KnowDeskBlock mention="Préparé par KnowDesk" actions={<button type="button">Modifier</button>}>Texte</KnowDeskBlock>);
    expect(screen.getByText('Préparé par KnowDesk').closest('.kd-block')).toHaveTextContent('Préparé par KnowDeskTexteModifier');
  });

  it('le badge KnowDesk est en accent, « Ajouté par vous » en primary', () => {
    render(<><KnowDeskBadge>Réglé automatiquement par KnowDesk</KnowDeskBadge><ByYouBadge /><ByYouBadge modified /></>);
    expect(screen.getByText('Réglé automatiquement par KnowDesk')).toHaveClass('badge--accent');
    expect(screen.getByText('Ajouté par vous')).toHaveClass('badge--primary');
    expect(screen.getByText('Modifié par vous')).toHaveClass('badge--primary');
  });

  it('la carte interne dit « Interne · réservé aux agents » avec l’icône lock', () => {
    const { container } = render(<InternalCard>Réservé</InternalCard>);
    expect(screen.getByText('Interne · réservé aux agents')).toBeInTheDocument();
    expect(container.querySelector('.internal-card svg.lucide-lock')).not.toBeNull();
  });

  it('la réponse IA nomme KnowDesk et sa source', () => {
    expect(answerMention(3)).toBe('Rédigé par KnowDesk à partir de 3 sources');
    expect(answerMention(1)).toBe('Rédigé par KnowDesk à partir de 1 source');
    expect(answerMention(0)).toBe('Rédigé par KnowDesk à partir de votre base');
  });
});

/**
 * La prune ne sert qu'à « ce que KnowDesk a préparé » (règle 7 des US) : ses seuls usages sont les
 * composants d'origine (Origin.css : mention, encart, cercle coché « Réglée par KnowDesk » ; badge
 * accent) et deux encarts qui portent une mention KnowDesk (réponse rédigée de la recherche,
 * recommandation d'une carte). Un nouvel usage doit passer par Origin.
 * Les feuilles se lisent sur le disque : avec `css: false`, un import `?raw` les rend vides.
 */
const ACCENT = /var\(--accent(-soft)?\)/;
const PRUNE_HEX = /#(9b3b8c|f6e6f3)\b/i;

/** Sélecteurs autorisés à employer la prune, par feuille. */
const ALLOWED: Record<string, RegExp> = {
  '/src/shared/components/ui/Origin.css':                    /^\.kd-(mention|check|block)\b/,
  '/src/shared/components/ui/StatusBadge.css':               /^\.badge--accent$/,
  '/src/features/search/search.css':                         /^\.ai-answer$/,
  '/src/features/onboardingProjects/onboardingProjects.css': /^\.obp-clarify-reco__text$/,
};

/** Les règles d'une feuille (sélecteur, déclarations), au niveau le plus intérieur, commentaires retirés. */
function cssRules(css: string): Array<{ selector: string; body: string }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }));
}

/** Les emplois de la prune hors de leur rôle : `fichier : sélecteur`. */
function accentOffenders(files: Record<string, string>): string[] {
  const offenders: string[] = [];
  for (const [path, css] of Object.entries(files)) {
    if (path === '/src/styles/tokens.css') {
      // Seule la définition des deux tokens ; aucun alias qui les reprendrait.
      css.split('\n').forEach((line, i) => { if (ACCENT.test(line)) offenders.push(`${path}:${i + 1}`); });
      continue;
    }
    if (PRUNE_HEX.test(css)) offenders.push(`${path} : prune écrite en dur`);
    for (const { selector, body } of cssRules(css)) {
      if (!ACCENT.test(body)) continue;
      const rule = ALLOWED[path];
      const ok = rule !== undefined && selector.split(',').every(part => rule.test(part.trim()));
      if (!ok) offenders.push(`${path} : ${selector}`);
    }
  }
  return offenders;
}

describe('Prune réservée à KnowDesk', () => {
  const sheets = readSources(isStylesheet);
  const code = readSources(isAppCode);

  it('les feuilles sont réellement lues (jamais vides)', () => {
    expect(Object.keys(sheets)).toContain('/src/features/faqs/faqs.css');
    expect(sheets['/src/shared/components/ui/Origin.css']).toMatch(/\.kd-mention/);
    // Chaque usage autorisé existe : la liste ne garde rien de périmé.
    for (const [path, rule] of Object.entries(ALLOWED)) {
      expect(cssRules(sheets[path]).some(r => ACCENT.test(r.body) && rule.test(r.selector)), path).toBe(true);
    }
  });

  it('aucune feuille n’emploie la prune hors de son rôle, ni ne l’écrit en dur', () => {
    expect(accentOffenders(sheets)).toEqual([]);
  });

  it('aucun style posé en code n’emploie la prune', () => {
    const offenders = Object.entries(code)
      .filter(([, text]) => ACCENT.test(text) || PRUNE_HEX.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('le contrôle échoue sur un usage hors rôle (cas volontairement faux, en mémoire)', () => {
    expect(accentOffenders({
      '/src/features/faqs/faqs.css': '.faq-title { color: var(--accent); }',
      '/src/shared/components/ui/Origin.css': '.kd-mention { color: var(--accent); }\n.autre { background: var(--accent-soft); }',
      '/src/features/search/search.css': '.ai-answer, .ai-answer__erreur { background: var(--accent-soft); }',
      '/src/shared/components/ui/Button.css': '.btn-ia { color: #9B3B8C; }',
      '/src/styles/tokens.css': '--accent: #9b3b8c;\n--color-ia: var(--accent);',
    })).toEqual([
      '/src/features/faqs/faqs.css : .faq-title',
      '/src/shared/components/ui/Origin.css : .autre',
      '/src/features/search/search.css : .ai-answer, .ai-answer__erreur',
      '/src/shared/components/ui/Button.css : prune écrite en dur',
      '/src/styles/tokens.css:2',
    ]);
  });
});
