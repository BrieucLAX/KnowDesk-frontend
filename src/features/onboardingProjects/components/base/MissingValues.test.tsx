import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissingValues } from './BuildView';
import { missingValuesTitle, readConstruction, verifyLegend } from '../../lib/build';
import { UNCOVERED_REASON_LABEL } from '../../lib/plan';
import type { Audit } from '../../lib/audit';
import ELYRA from '../clarify/fixtures/audit-0.16.0-elyra-v2-lecture-4.response.json';
import BUILD_ELYRA_03 from './fixtures/construction-0.3.0-elyra-2026-11-22.response.json';

/**
 * Articles vides de Test Elyra (23/11 ; décisions du porteur du 2026-11-25) : les valeurs de vos
 * documents qu'aucun article n'écrit sont listées (Q3, réglage « signal ») ; une ligne reprise mot
 * pour mot est « À vérifier » avec sa raison ; les raisons du plan 0.2.0 se disent en clair (Q1 b).
 */
type Raw = { articles: Array<{ subject_id: string; title: string; blocks: Array<Record<string, unknown>> }>; uncovered: Array<Record<string, unknown>> };

function withSignals(): Raw {
  const raw = JSON.parse(JSON.stringify(BUILD_ELYRA_03.construction)) as Raw;
  const article = raw.articles.find(a => a.title === 'Mensualisation et prélèvement')!;
  const source = (article.blocks.find(b => Array.isArray(b.sources) && (b.sources as unknown[]).length > 0)!.sources as Array<Record<string, unknown>>)[0];
  raw.uncovered.push(
    { id: 'pt_v1', kind: 'missing_information', subject_id: article.subject_id, note: 'Valeur de vos documents absente de la base : 150,00 €.', passages: [{ ...source, excerpt: 'Geste commercial autorisé jusqu\'à 150 € sans validation' }] },
    // Un manque signalé par la rédaction, sans passage : jamais affiché (C-Q11).
    { id: 'pt_m1', kind: 'missing_information', subject_id: article.subject_id, note: 'Le délai de réponse n\'est pas précisé.' },
  );
  return raw;
}

describe('Valeurs de vos documents qu\'aucun article n\'écrit', () => {
  it('lit les seules valeurs relevées par le code, avec leur ligne', () => {
    const c = readConstruction(withSignals())!;
    expect(c.missingValues).toHaveLength(1);
    expect(c.missingValues[0].note).toBe('Valeur de vos documents absente de la base : 150,00 €.');
    expect(c.missingValues[0].passages[0].excerpt).toBe('Geste commercial autorisé jusqu\'à 150 € sans validation');
    expect(readConstruction(BUILD_ELYRA_03.construction)!.missingValues).toEqual([]);
  });

  it('les montre sous leur article, avec la ligne mot pour mot', () => {
    const c = readConstruction(withSignals())!;
    const audit = (ELYRA as unknown as { audit: Audit }).audit;
    render(<MissingValues construction={c} ctx={{ audit, cardTitle: () => '', onGoToClarify: () => {} }} />);
    expect(screen.getByRole('heading', { name: missingValuesTitle(1) })).toBeInTheDocument();
    expect(screen.getByText('Mensualisation et prélèvement')).toBeInTheDocument();
    expect(screen.getByText('Valeur de vos documents absente de la base : 150,00 €.')).toBeInTheDocument();
    expect(screen.getByText(/Geste commercial autorisé jusqu'à 150 €/)).toBeInTheDocument();
    expect(screen.queryByText(/délai de réponse n'est pas précisé/)).not.toBeInTheDocument();
  });

  it('rien sans valeur relevée', () => {
    const c = readConstruction(BUILD_ELYRA_03.construction)!;
    const audit = (ELYRA as unknown as { audit: Audit }).audit;
    const { container } = render(<MissingValues construction={c} ctx={{ audit, cardTitle: () => '', onGoToClarify: () => {} }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Ligne reprise des sources, « À vérifier »', () => {
  it('la légende la dit, seule ou avec les autres raisons', () => {
    expect(verifyLegend({ toVerifyReasons: ['restored_from_sources'] }))
      .toBe('elle reprend mot pour mot une ligne de vos documents qu\'aucun article ne donnait.');
    expect(verifyLegend({ toVerifyReasons: ['joined_passages', 'restored_from_sources'] }))
      .toBe('elle relie deux passages différents de vos documents, ou elle reprend mot pour mot une ligne de vos documents qu\'aucun article ne donnait.');
    expect(verifyLegend({ toVerifyReasons: ['joined_passages'] })).toBe('elle relie deux passages différents de vos documents.');
  });

  it('un bloc repris est lu avec sa raison', () => {
    const raw = JSON.parse(JSON.stringify(BUILD_ELYRA_03.construction)) as Raw;
    const article = raw.articles.find(a => a.title === 'Mensualisation et prélèvement')!;
    const source = (article.blocks.find(b => Array.isArray(b.sources) && (b.sources as unknown[]).length > 0)!.sources as unknown[])[0];
    article.blocks.push({
      id: 'blk_v1', kind: 'text', origin: 'document', text: 'Répondre sous 15 jours calendaires',
      sources: [source], to_verify: [{ reason: 'restored_from_sources', passages: ['Répondre sous 15 jours calendaires'] }],
    });
    const c = readConstruction(raw)!;
    expect(c.toVerifyReasons).toContain('restored_from_sources');
    const block = c.chapters.flatMap(ch => ch.articles).flatMap(a => a.blocks).find(b => b.id === 'blk_v1')!;
    expect(block.toVerify).toEqual([{ reason: 'restored_from_sources', passages: ['Répondre sous 15 jours calendaires'] }]);
  });
});

describe('Plan 0.2.0 : les raisons d\'un passage sans article, en clair', () => {
  it('dit ce qui s\'est vraiment passé', () => {
    expect(UNCOVERED_REASON_LABEL.omitted).toBe('l\'IA ne l\'a placé dans aucun article');
    expect(UNCOVERED_REASON_LABEL.unknown_article).toBe('l\'IA l\'a placé dans un article qui n\'existe pas');
    expect(UNCOVERED_REASON_LABEL.untitled_article).toBe('l\'IA a proposé un nouvel article sans lui donner de titre');
    expect(UNCOVERED_REASON_LABEL.no_text).toBe('aucun texte lisible (image non lue, document scanné)');
  });
});
