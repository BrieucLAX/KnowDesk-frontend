import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ByYouBadge, InternalCard, KnowDeskBadge, KnowDeskBlock, KnowDeskMention } from './Origin';
import { answerMention } from '../../../features/search/components/AiAnswerCard';

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
    render(<><KnowDeskBadge>Tranché automatiquement par KnowDesk</KnowDeskBadge><ByYouBadge /><ByYouBadge modified /></>);
    expect(screen.getByText('Tranché automatiquement par KnowDesk')).toHaveClass('badge--accent');
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
 * La prune ne sert qu'à « ce que KnowDesk a préparé » : ses seuls usages sont les composants
 * d'origine (Origin.css, badge accent) et deux encarts qui contiennent une mention KnowDesk
 * (réponse IA de la recherche, recommandation d'une carte). Un nouvel usage doit passer par Origin.
 */
describe('Prune réservée à KnowDesk', () => {
  const ALLOWED: Record<string, RegExp> = {
    '/src/styles/tokens.css':                                  /--accent(-soft)?:/,
    '/src/shared/components/ui/Origin.css':                    /./,
    '/src/shared/components/ui/StatusBadge.css':               /\.badge--accent/,
    '/src/features/search/search.css':                         /\.ai-answer \{/,
    '/src/features/onboardingProjects/onboardingProjects.css': /\.obp-clarify-reco__text/,
  };
  const files = import.meta.glob('/src/**/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  it('aucune feuille n’emploie --accent hors de son rôle', () => {
    expect(Object.keys(files)).toContain('/src/features/faqs/faqs.css');
    const offenders: string[] = [];
    for (const [path, css] of Object.entries(files)) {
      css.split('\n').forEach((line, i) => {
        if (!/var\(--accent(-soft)?\)|--accent(-soft)?:/.test(line)) return;
        const rule = ALLOWED[path];
        // La règle autorisée doit être sur la ligne même ou sur la ligne d'ouverture du bloc.
        const opening = css.split('\n').slice(0, i + 1).reverse().find(l => l.includes('{')) ?? '';
        if (!rule || !(rule.test(line) || rule.test(opening))) offenders.push(`${path}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
