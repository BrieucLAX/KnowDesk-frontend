import { describe, it, expect } from 'vitest';
import {
  imageOf, inlineParts, parseLines, proposedLines, rowCells, sectionBlocks, sectionTitle, sheetViews, wordDiff,
} from './baseDocument';
import type { BaseCorrection, CorrectedSection } from './correction';

const section = (over: Partial<CorrectedSection>): CorrectedSection => ({
  key: 'doc_1:0', heading_path: ['Chapitre 3 — Cotisations'], original_markdown: '', corrected_markdown: '', ...over,
});

describe('lignes, comme le pipeline', () => {
  it('découpe titres, images, tableaux, listes, et joint les lignes d\'un paragraphe', () => {
    expect(parseLines('# Titre\n\nUne ligne\nla suite\n\n- un\n| a | b |\n![Schéma](image:img_1)')).toEqual([
      { type: 'heading', text: '# Titre' },
      { type: 'text', text: 'Une ligne la suite' },
      { type: 'item', text: '- un' },
      { type: 'row', text: '| a | b |' },
      { type: 'image', text: '![Schéma](image:img_1)' },
    ]);
  });

  it('lit une image et une ligne de tableau sans en montrer la syntaxe', () => {
    expect(imageOf({ type: 'image', text: '![Schéma tiers payant](image:img_ab12)' })).toEqual({ alt: 'Schéma tiers payant', imageId: 'img_ab12' });
    expect(rowCells({ type: 'row', text: '| 18-29 ans | 32 € |' })).toEqual(['18-29 ans', '32 €']);
    expect(rowCells({ type: 'row', text: '|---|:--:|' })).toBeNull();
    expect(inlineParts('Le **plafond** [voir](https://x)')).toEqual([
      { text: 'Le ', strong: false }, { text: 'plafond', strong: true }, { text: ' voir', strong: false },
    ]);
  });
});

describe('comparaison', () => {
  it('mot à mot', () => {
    expect(wordDiff('tranches de 5 ans', 'tranches de 10 ans')).toEqual([
      { op: 'equal', text: 'tranches de ' }, { op: 'delete', text: '5' }, { op: 'insert', text: '10' }, { op: 'equal', text: ' ans' },
    ]);
  });

  it('rattache chaque ligne changée à sa modification, et garde l\'ordre de la section', () => {
    const s = section({
      original_markdown: '# Chapitre 3\n\nTarifs par tranches de 5 ans.\n\nFin.',
      corrected_markdown: '# Chapitre 3\n\nTarifs par tranches de 10 ans.\n\nNouveau paragraphe.\n\nFin.',
      modification_ids: ['M2', 'M8'],
      changes: [
        { kind: 'modify', line_kind: 'paragraph', before: 'Tarifs par tranches de 5 ans.', after: 'Tarifs par tranches de 10 ans.', modification_id: 'M8', kept: true },
        { kind: 'insert', line_kind: 'paragraph', before: '', after: 'Nouveau paragraphe.', modification_id: 'M2', kept: true },
        { kind: 'insert', line_kind: 'paragraph', before: '', after: 'Annulé.', modification_id: null, kept: false, undo_reason: 'not_decided' },
      ],
    });
    const blocks = sectionBlocks(s);
    expect(blocks.map(b => b.op)).toEqual(['equal', 'modify', 'insert', 'equal']);
    expect(blocks[1]).toMatchObject({ op: 'modify', modificationId: 'M8' });
    expect(blocks[2]).toMatchObject({ op: 'insert', modificationId: 'M2' });
    expect(proposedLines(blocks, 'M8')).toEqual(['Tarifs par tranches de 10 ans.']);
    expect(proposedLines(blocks, 'M2')).toEqual(['Nouveau paragraphe.']);
  });

  it('une section inchangée n\'a que des lignes égales', () => {
    const blocks = sectionBlocks(section({ original_markdown: 'A\n\nB', corrected_markdown: 'A\n\nB' }));
    expect(blocks.every(b => b.op === 'equal')).toBe(true);
  });
});

describe('mise en page', () => {
  it('titre une section par son chemin, sans le titre de la fiche', () => {
    expect(sectionTitle({ heading_path: ['## Chapitre 3', '3.2 **Tranches**'] }, 'Chapitre 3')).toBe('3.2 Tranches');
    expect(sectionTitle({ heading_path: ['Chapitre 3'] }, 'Chapitre 3')).toBe('Chapitre 3');
  });

  it('range les modifications dans leurs sections, conventions comprises', () => {
    const base: BaseCorrection = {
      schema_version: '0.1.0',
      sheets: [{
        document_id: 'doc_1', document_path: 'base/03-cotisations.md', markdown: '',
        sections: [
          section({ key: 'doc_1:0', original_markdown: 'A', corrected_markdown: 'A' }),
          section({ key: 'doc_1:1', heading_path: ['Chapitre 3 — Cotisations', '3.1'], original_markdown: 'B', corrected_markdown: 'B2', modification_ids: ['M1'] }),
        ],
      }],
      modifications: [],
      conventions: [{ id: 'C1', rule: 'Listes datées : la plus récente en premier.', section_keys: ['doc_1:0'] }],
    };
    const [sheet] = sheetViews(base);
    expect(sheet).toMatchObject({ title: 'Chapitre 3 — Cotisations', fileName: '03-cotisations.md' });
    expect(sheet.sections[0]).toMatchObject({ changed: false, conventionIds: ['C1'], modificationIds: [] });
    expect(sheet.sections[1]).toMatchObject({ title: '3.1', changed: true, modificationIds: ['M1'] });
  });
});
