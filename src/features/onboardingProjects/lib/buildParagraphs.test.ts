import { describe, it, expect } from 'vitest';
import SHARED from './fixtures/build-paragraphs-elyra-2026-11-22.json';
import { groupBlocks, readConstruction } from './build';

/**
 * Le back crée la base de connaissance avec les paragraphes que cet écran montre (plan-construire-v1,
 * lot D) : il recopie `groupBlocks`. La fixture est commune aux deux dépôts (même fichier dans
 * KnowDesk, `tests/fixtures/onboarding`) : une rédaction Elyra du 22/11 (4 articles) et les
 * paragraphes attendus, bloc par bloc.
 */
const BACK = Object.values(import.meta.glob<unknown>(
  '../../../../../KnowDesk/tests/fixtures/onboarding/build-paragraphs-elyra-2026-11-22.json', { eager: true, import: 'default' },
))[0];

describe('paragraphes de la voie A : les mêmes que ceux du back qui crée la base', () => {
  it('groupBlocks forme les paragraphes attendus de la fixture commune', () => {
    const c = readConstruction(SHARED.construction);
    expect(c).not.toBeNull();
    const articles = c!.chapters.flatMap(ch => ch.articles);
    for (const e of SHARED.expected) {
      const a = articles.find(x => x.subjectId === e.subject_id)!;
      const got = groupBlocks(a.blocks).map(g => (g.kind === 'paragraph'
        ? { kind: 'paragraph', block_ids: g.blocks.map(b => b.id) } : { kind: 'block', block_ids: [g.block.id] }));
      expect(got).toEqual(e.groups);
    }
  });

  it.skipIf(BACK === undefined)('la fixture est celle du back voisin (../KnowDesk)', () => {
    expect(SHARED).toEqual(BACK);
  });
});
