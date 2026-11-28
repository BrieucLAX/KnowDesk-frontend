import { describe, it, expect } from 'vitest';
import {
  actionNote, attentionSentence, dateLine, DEFAULT_DOCUMENT_TYPES, documentsView, foldedGroups, formatDocumentDate,
  showAllLabel, sortedTypes, summaryParts,
} from './documents';
import { makeDocument } from '../components/documentsTestUtils';

describe('types de document (contrat lot 2a, section 1)', () => {
  it('les 7 clés et libellés, dans l\'ordre de US 1.1', () => {
    expect(DEFAULT_DOCUMENT_TYPES.map(t => [t.key, t.name, t.rank])).toEqual([
      ['conditions_contrats', 'Conditions générales et contrats', 1],
      ['tarifs', 'Tarifs', 2],
      ['descriptions_offres', 'Descriptions d\'offres', 3],
      ['procedures_internes', 'Procédures internes', 4],
      ['supports_formation', 'Supports de formation', 5],
      ['communications_clients', 'Communications aux clients', 6],
      ['base_faq', 'Base ou FAQ existante', 7],
    ]);
  });

  it('trie la liste reçue par rang ; vide ou inconnue → liste figée', () => {
    const reversed = [...DEFAULT_DOCUMENT_TYPES].reverse();
    expect(sortedTypes(reversed).map(t => t.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(sortedTypes([])).toEqual(DEFAULT_DOCUMENT_TYPES);
    expect(sortedTypes(null)).toEqual(DEFAULT_DOCUMENT_TYPES);
  });
});

describe('dates (US 1.3, contrat section 6)', () => {
  it('« 1er » pour le premier du mois, mois abrégés', () => {
    expect(formatDocumentDate('2026-09-01')).toBe('1er sept. 2026');
    expect(formatDocumentDate('2026-01-15')).toBe('15 janv. 2026');
    expect(formatDocumentDate('2025-08-01')).toBe('1er août 2025');
    expect(formatDocumentDate('n\'importe quoi')).toBe('n\'importe quoi');
  });

  it('origine : titre, corps et page, utilisateur sans origine, aucune', () => {
    expect(dateLine({ date: '2026-09-01', dateOrigin: 'titre', datePage: null }))
      .toEqual({ date: '1er sept. 2026', origin: 'trouvée dans le titre', action: 'Modifier' });
    expect(dateLine({ date: '2026-09-01', dateOrigin: 'corps', datePage: 1 }).origin).toBe('trouvée dans le document, page 1');
    expect(dateLine({ date: '2026-09-01', dateOrigin: 'utilisateur', datePage: null }).origin).toBeNull();
    expect(dateLine({ date: null, dateOrigin: 'aucune', datePage: null }))
      .toEqual({ date: null, origin: null, action: 'Ajouter une date (facultatif)' });
    expect(dateLine({ date: null, dateOrigin: 'utilisateur', datePage: null }).date).toBeNull();
  });
});

describe('vue de la liste', () => {
  const docs = [
    makeDocument({ id: 'p', filename: 'p.pdf', classificationStatus: 'en_attente', documentType: null }),
    makeDocument({ id: 'e', filename: 'e.pdf', classificationStatus: 'echec', documentType: null, toVerify: true }),
    makeDocument({ id: 'f', filename: 'f.pdf', documentType: 'supports_formation', date: '2026-01-01', dateOrigin: 'titre' }),
    makeDocument({ id: 'c', filename: 'c.pdf', documentType: 'conditions_contrats', toVerify: true }),
    makeDocument({ id: 'u', filename: 'u.pdf', state: 'illisible', documentType: null }),
  ];

  it('en cours, sans type, groupes au rang, illisibles à part ; compteurs', () => {
    const v = documentsView(docs, DEFAULT_DOCUMENT_TYPES);
    expect(v.pending.map(d => d.id)).toEqual(['p']);
    expect(v.untyped.map(d => d.id)).toEqual(['e']);
    expect(v.groups.map(g => g.key)).toEqual(['conditions_contrats', 'supports_formation']);
    expect(v.unreadable.map(d => d.id)).toEqual(['u']);
    expect(v.readable).toHaveLength(4);
    expect(v.toVerify).toBe(2);
    expect(v.withoutDate).toBe(2);
    expect(actionNote(v)).toBe('Classement en cours · 3 sur 4');
    expect(actionNote(documentsView(docs.slice(1), DEFAULT_DOCUMENT_TYPES))).toBe('3 documents classés · 2 à vérifier');
    expect(actionNote(documentsView([], DEFAULT_DOCUMENT_TYPES))).toBeNull();
  });

  it('au-delà de trois groupes, repli, sauf un groupe qui porte un « À vérifier »', () => {
    const many = ['conditions_contrats', 'tarifs', 'descriptions_offres', 'procedures_internes', 'base_faq'] as const;
    const list = many.map((k, i) => makeDocument({ id: String(i), filename: `${i}.pdf`, documentType: k, toVerify: k === 'base_faq' }));
    const v = documentsView(list, DEFAULT_DOCUMENT_TYPES);
    const folded = foldedGroups(v.groups);
    expect([...folded]).toEqual(['procedures_internes']);
    expect(showAllLabel(v.groups.filter(g => folded.has(g.key)))).toBe('Voir tous les documents · 1 autre de 1 type');
  });
});

describe('phrases', () => {
  it('encadré de la maquette', () => {
    expect(attentionSentence(1, 1)).toBe('1 document est difficile à classer et 1 document n\'a pas de date. Vérifiez aussi les dates trouvées : elles servent à savoir quel document est le plus récent.');
    expect(attentionSentence(0, 3)).toMatch(/^3 documents n'ont pas de date\./);
    expect(attentionSentence(0, 0)).toBeNull();
  });

  it('synthèse d\'import', () => {
    const parts = summaryParts({
      received: 38, created: 33,
      duplicates: Array.from({ length: 5 }, () => ({ filename: 'x', reason: 'nom' as const, duplicateOf: 'x' })),
      unreadable: [{ id: 'u1', filename: 'u.pdf' }], unsupported: [],
    });
    expect(parts).toEqual([{ text: '5 doublons écartés' }, { text: '1 document illisible', linkTo: 'u1' }]);
    expect(summaryParts({ received: 1, created: 0, duplicates: [{ filename: 'a', reason: 'contenu', duplicateOf: 'b' }], unreadable: [], unsupported: [] }))
      .toEqual([{ text: '1 doublon écarté' }]);
    expect(summaryParts(null)).toEqual([]);
  });
});
