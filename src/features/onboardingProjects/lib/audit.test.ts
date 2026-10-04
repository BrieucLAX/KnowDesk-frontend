import { describe, it, expect } from 'vitest';
import {
  documentName, documentPath, documentsLine, fileName, groupQuestions, isSupportedAudit, normalizeAudit, optionSources, proposedCases, proposedCondition, questionKind,
  type Audit,
} from './audit';
import { discardReasonLabel, impactLabel, questionTypeLabel, sourceLocation } from './auditLabels';

/** Seuls les champs requis par audit.schema.json 0.6.0. */
const MINIMAL = {
  generated_at: '2026-09-27T10:00:00Z',
  inventory: [],
  decisions: { count: 0, conflict_count: 0, auto_resolved_count: 0 },
  estimated_duration: { minutes: 0, method: 'x' },
};

const option = (value: string, assertionIds: string[], extra: object = {}) => ({
  label: `A — ${value}`, document: 'cgv.pdf', value, assertion_ids: assertionIds, ...extra,
});

const q = (id: string, extra: object = {}) => ({
  id, type: 'genuine_conflict', question: `Question ${id} ?`, subject: id, conflict_ids: [`c-${id}`],
  options: [option('1', ['a1']), option('2', ['a2'])], impact: { level: 'high', customer_fact: true, score: 70 },
  blocking: true, ...extra,
});

const normalized = (raw: object): Audit => {
  const audit = normalizeAudit(raw);
  if (!audit) throw new Error('audit illisible');
  return audit;
};

describe('normalizeAudit', () => {
  it('un audit réduit aux champs requis : toutes les listes vides, compteurs par défaut à 0', () => {
    const audit = normalized(MINIMAL);
    expect(audit.questions).toEqual([]);
    expect(audit.automaticDecisions).toEqual([]);
    expect(audit.discardedGaps).toEqual([]);
    expect(audit.assertions.size).toBe(0);
    expect(audit.unavailableDetections.size).toBe(0);
    expect(audit.summary).toEqual({ count: 0, conflictCount: 0, autoResolvedCount: 0, toConfirmCount: 0, toVerifyCount: 0, byImpact: {} });
    expect(audit.estimatedMinutes).toBe(0);
  });

  it('ce qui n\'est pas un objet n\'est pas un audit', () => {
    expect(normalizeAudit(null)).toBeNull();
    expect(normalizeAudit('audit')).toBeNull();
    expect(normalizeAudit([])).toBeNull();
  });

  it('ignore les éléments illisibles d\'une liste, sans échouer', () => {
    const audit = normalized({ ...MINIMAL, questions: [null, 'x', { question: 'sans id' }, q('q1')], assertions: [{}, 3] });
    expect(audit.questions.map(x => x.id)).toEqual(['q1']);
    expect(audit.assertions.size).toBe(0);
  });

  it('nullables et valeurs par défaut du schéma', () => {
    const audit = normalized({
      ...MINIMAL,
      questions: [q('q1', { group_id: null, rationale: null, options: [option('1', ['a1'], { scope: null })] })],
      assertions: [{ id: 'a1', subject: 's', source: { format: 'pdf', document_id: 'd1', excerpt: 'e', page: 2 } }],
    });
    expect(audit.questions[0]).toMatchObject({ groupId: null, rationale: null, blocking: true });
    expect(audit.questions[0].options[0]).toMatchObject({ scope: null, readByVision: false });
    expect(audit.assertions.get('a1')?.source).toMatchObject({
      zone: 'text', visionUnverified: false, imageId: null, tableCell: null, page: 2, slide: null, headingPath: [],
    });
  });

  it('garde les valeurs d\'énumération inconnues, que les libellés rattrapent', () => {
    const audit = normalized({ ...MINIMAL, questions: [q('q1', { type: 'nouveau_type', impact: { level: 'extreme', score: 1 } })] });
    expect(questionTypeLabel(audit.questions[0].type)).toBe('Écart');
    expect(impactLabel(audit.questions[0].impact.level)).toBe('Impact non précisé');
    expect(discardReasonLabel('constructor')).toBe('Autre raison');
  });

  it('les versions 0.6.0 et 0.7.0 sont lisibles, pas les autres', () => {
    expect(isSupportedAudit({ schemaVersion: '0.6.0' })).toBe(true);
    expect(isSupportedAudit({ schemaVersion: '0.7.0' })).toBe(true);
    expect(isSupportedAudit({ schemaVersion: '0.8.0' })).toBe(false);
  });

  it('un audit 0.7.0 se lit comme un 0.6.0 : ses champs nouveaux sont ignorés', () => {
    const audit = normalized({
      ...MINIMAL,
      schema_version: '0.7.0',
      cards: [{ id: 'card_1', nature: 'dated_change', question_ids: [], conflict_ids: [] }],
      extraction_notes: [{ document_id: 'd', reason: 'model_returned_nothing', units_read: 1, units_empty: 1, rejected: 0 }],
    });
    expect(audit).not.toBeNull();
  });
});

describe('lecture de l\'audit', () => {
  it('un document se nomme par son nom de fichier, jamais par son titre', () => {
    const audit = normalized({
      ...MINIMAL,
      inventory: [{ document_id: 'd1', path: 'cgv_2026.pdf', title: 'Conditions générales', format: 'pdf', size_bytes: 1, sha256: 'a', unit_count: 1 }],
    });
    expect(documentName(audit, 'd1')).toBe('cgv_2026.pdf');
    expect(documentName(audit, 'inconnu')).toBe('inconnu');
  });

  it('un document tiré d\'une archive : son nom de fichier seul, le chemin complet à part', () => {
    const audit = normalized({
      ...MINIMAL,
      inventory: [
        { document_id: 'd1', path: 'base-notion/03-cotisations-tarification.md', format: 'md', size_bytes: 1, sha256: 'a', unit_count: 1 },
        { document_id: 'd2', path: 'base-notion/faq/lisez-moi.md', format: 'md', size_bytes: 1, sha256: 'b', unit_count: 1 },
        { document_id: 'd3', path: 'base-notion/tarifs/lisez-moi.md', format: 'md', size_bytes: 1, sha256: 'c', unit_count: 1 },
      ],
    });
    expect(documentName(audit, 'd1')).toBe('03-cotisations-tarification.md');
    expect(documentPath(audit, 'd1')).toBe('base-notion/03-cotisations-tarification.md');
    // Deux fichiers de même nom dans des dossiers différents gardent leur chemin.
    expect(documentName(audit, 'd2')).toBe('base-notion/faq/lisez-moi.md');
    expect(fileName('C:\\export\\a.md')).toBe('a.md');
    expect(fileName('a.md')).toBe('a.md');
  });

  it('documents d\'une analyse : ceux qu\'elle a lus, et les fichiers importés s\'ils diffèrent', () => {
    const entry = (id: string, status: string) =>
      ({ document_id: id, path: `x/${id}.md`, format: 'md', size_bytes: 1, sha256: id, unit_count: 1, status });
    const archive = normalized({ ...MINIMAL, inventory: [entry('a', 'parsed'), entry('b', 'parsed'), entry('c', 'failed')] });
    expect(documentsLine(1, archive)).toBe('2 documents lus (dans 1 fichier importé)');
    expect(documentsLine(2, archive)).toBe('2 documents lus');
    expect(documentsLine(3, normalized({ ...MINIMAL, inventory: [entry('a', 'parsed')] }))).toBe('1 document lu (dans 3 fichiers importés)');
    // Audit en cours de chargement, ou sans inventaire : les fichiers importés.
    expect(documentsLine(1, null)).toBe('1 fichier importé');
    expect(documentsLine(2, normalized(MINIMAL))).toBe('2 fichiers importés');
  });

  it('extraits d\'une option, dans son ordre, sans les assertions introuvables', () => {
    const audit = normalized({
      ...MINIMAL,
      questions: [q('q1', { options: [option('1', ['a2', 'absente', 'a1']), option('2', ['a1'])] })],
      assertions: ['a1', 'a2'].map(id => ({ id, subject: 's', source: { format: 'pdf', document_id: 'd1', excerpt: id, page: 1 } })),
    });
    expect(optionSources(audit, audit.questions[0].options[0]).map(s => s.excerpt)).toEqual(['a2', 'a1']);
  });

  it('classe les questions : bloquante, à confirmer (deux cas), à vérifier sinon', () => {
    const audit = normalized({
      ...MINIMAL,
      questions: [q('q1'), q('q2', { blocking: false }), q('q3', { blocking: false })],
      conflicts: [
        { id: 'c-q2', status: 'to_verify' },
        { id: 'c-q3', status: 'to_confirm', proposed_condition: { text: 'En Corse' } },
      ],
    });
    expect(audit.questions.map(x => questionKind(audit, x))).toEqual(['decision', 'to_verify', 'to_confirm']);
    expect(proposedCondition(audit, audit.questions[2])).toEqual({ text: 'En Corse', clauses: [] });
    expect(proposedCondition(audit, audit.questions[0])).toBeNull();
  });

  it('regroupe les questions d\'un même group_id en une étape, dans l\'ordre de l\'audit', () => {
    const audit = normalized({
      ...MINIMAL,
      questions: [q('q1', { group_id: 'g1' }), q('q2', { group_id: 'g2' }), q('q3', { group_id: 'g1' }), q('q4')],
    });
    expect(groupQuestions(audit.questions).map(g => g.map(x => x.id))).toEqual([['q1', 'q3'], ['q2'], ['q4']]);
  });
});

describe('cas proposés pour « deux cas distincts »', () => {
  const pdfSource = { format: 'pdf', document_id: 'd', excerpt: 'e', page: 1 };
  const audit = (conditions: Array<object | null>, proposed: object | null) => normalized({
    ...MINIMAL,
    assertions: conditions.map((condition, i) => ({ id: `a${i + 1}`, subject: 's', source: pdfSource, condition })),
    conflicts: [{ id: 'c-q1', status: 'to_confirm', proposed_condition: proposed }],
    questions: [q('q1', { blocking: false })],
  });
  const zone = { text: 'zone : Corse / France métropolitaine', clauses: [{ dimension: 'zone', operator: 'in', value: ['Corse', 'France métropolitaine'] }] };

  it('reprend, pour chaque option, la condition de sa source sur la dimension proposée', () => {
    const a = audit([
      { text: 'En Corse ; Livraison à domicile', clauses: [{ dimension: 'zone', operator: 'eq', value: 'Corse' }, { dimension: 'canal', operator: 'in', value: ['Domicile'] }] },
      { text: 'particuliers, Domicile (France métropolitaine)', clauses: [{ dimension: 'Zone', operator: 'eq', value: 'France métropolitaine' }] },
    ], zone);
    expect(proposedCases(a, a.questions[0])).toEqual(['zone : Corse', 'Zone : France métropolitaine']);
  });

  it('sans clause sur la dimension : le texte de la condition ; sans condition : vide', () => {
    const a = audit([{ text: 'Pour les pros', clauses: [] }, null], zone);
    expect(proposedCases(a, a.questions[0])).toEqual(['Pour les pros', '']);
  });
});

describe('emplacement d\'un extrait', () => {
  const base = {
    format: 'pdf', documentId: 'd', excerpt: 'e', zone: 'text', visionUnverified: false, imageId: null,
    tableCell: null, page: null, slide: null, headingPath: [], blockKind: null, blockIndex: null,
  };

  it('page, diapositive, titres et bloc', () => {
    expect(sourceLocation({ ...base, page: 3 })).toBe('page 3');
    expect(sourceLocation({ ...base, format: 'pptx', slide: 4, zone: 'image' })).toBe('diapositive 4, image');
    expect(sourceLocation({ ...base, format: 'docx', headingPath: ['Retours', 'Délais'], blockKind: 'paragraph', blockIndex: 0 }))
      .toBe('Retours › Délais, paragraphe 1');
    expect(sourceLocation({ ...base, format: 'docx', blockKind: 'table', blockIndex: 1, zone: 'table', tableCell: { row: 0, column: 2 } }))
      .toBe('tableau 2, ligne 1, colonne 3');
  });

  it('Markdown : titres et bloc, comme un docx', () => {
    expect(sourceLocation({ ...base, format: 'md', headingPath: ['Tiers payant', '5.1 Synthèse'], blockKind: 'paragraph', blockIndex: 2 }))
      .toBe('Tiers payant › 5.1 Synthèse, paragraphe 3');
    expect(sourceLocation({ ...base, format: 'md', headingPath: ['Tarifs'], blockKind: 'table', blockIndex: 0, zone: 'table' }))
      .toBe('Tarifs, tableau 1');
    expect(sourceLocation({ ...base, format: 'md', headingPath: [], blockKind: 'paragraph', blockIndex: 0, zone: 'image' }))
      .toBe('paragraphe 1, image');
  });

  it('format inconnu (version suivante) : emplacement non précisé', () => {
    expect(sourceLocation({ ...base, format: 'odt' })).toBe('emplacement non précisé');
  });
});
