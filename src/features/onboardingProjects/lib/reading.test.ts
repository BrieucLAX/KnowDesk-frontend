import { describe, it, expect } from 'vitest';
import {
  analyzedDocuments, analyzedDocumentsSummary, citedByText, documentType,
  baseAnnouncement, cardProgress, cardTitle, clarifySummary, describeCardAnswer, describeSummary, firstOpenCard, groupByNature, isBlocking,
  codeCheck, failedDetections, formatGapValue, isReadingAudit, notYetDetections, readsImageOnly, recommendationOutcome, unreadImagesText,
  missingSide, orderedCards, rejectionReasonLabel, sideDocuments, sidesQuestion, substantiveAnswers, toQuotes, unreadFiles, unreadReasonLabel, unverifiedCounts, unverifiedReasonLabel, type ReadingCard,
} from './reading';
import type { Audit } from './audit';
import type { Decision } from './decisions';

const doc = (documentId: string, extra: object = {}) =>
  ({ kind: 'document' as const, excerptRealigned: false, source: { format: 'pdf', document_id: documentId, page: 1, excerpt: 'Texte.', ...extra } });
const briefing = { kind: 'briefing' as const, excerptRealigned: false, excerpt: 'Fiche.' };
const vision = (documentId: string) => doc(documentId, { zone: 'image', image_id: 'img-1', excerpt_origin: 'vision_unverified' });

const card = (id: string, nature: ReadingCard['nature'], rank: number, sides: ReadingCard['sides'] = [
  { label: 'A', quotes: [doc('d1')] }, { label: 'B', quotes: [doc('d2')] },
]): ReadingCard => ({
  id, nature, rank, mergedRanks: [], documentIds: ['d1', 'd2'], sides,
  analysis: { subject: 's', reason: 'r', proposal: 'p' },
  answers: nature === 'incomplete_or_outdated'
    ? ['complete', 'remove', 'up_to_date', 'not_a_problem', 'other_answer', 'later', 'out_of_scope']
    : ['accept_side', 'adjust', 'same_meaning', 'different_subjects', 'other_answer', 'later', 'out_of_scope'],
  unverifiedQuotes: [],
});

const decision = (cardId: string, action: Decision['action']): Decision => ({
  id: `d-${cardId}`, questionId: cardId, cardId, groupId: null, conflictIds: null, action, supersedesId: null,
  decidedBy: { id: 'u1', name: 'X' }, decidedAt: '2026-10-02T10:00:00Z', cancelledAt: null, cancelledBy: null,
});

describe('reading', () => {
  const cards = [card('i1', 'incomplete_or_outdated', 1), card('d2', 'dated_change', 3), card('c1', 'contradiction', 4), card('d1', 'dated_change', 2)];

  it('ordre : natures qui bloquent d\'abord, puis le rang du modèle ; regroupement par nature', () => {
    expect(orderedCards(cards).map(c => c.id)).toEqual(['c1', 'd1', 'd2', 'i1']);
    expect(groupByNature(cards).map(g => [g.nature, g.cards.map(c => c.id)])).toEqual([
      ['contradiction', ['c1']], ['dated_change', ['d1', 'd2']], ['incomplete_or_outdated', ['i1']],
    ]);
  });

  it('progression et reprise : « Plus tard » compté à part et toujours à traiter', () => {
    const current = new Map([['c1', decision('c1', { type: 'same_meaning' })], ['d1', decision('d1', { type: 'later' })]]);
    expect(cardProgress(cards, current)).toEqual({ answered: 1, later: 1, total: 4 });
    expect(firstOpenCard(orderedCards(cards), current)).toBe(1);
  });

  it('bloque selon sa nature seule, comme le back : une lecture d\'image à confirmer ne l\'exempte pas', () => {
    expect(isBlocking(card('c', 'contradiction', 1))).toBe(true);
    expect(isBlocking(card('i', 'incomplete_or_outdated', 1))).toBe(false);
    // Essai 5 : changement daté (pharmacies) dont un côté ne repose que sur une image.
    const vision1 = card('v', 'dated_change', 1, [{ label: 'A', quotes: [vision('d1')] }, { label: 'B', quotes: [doc('d2')] }]);
    expect(isBlocking(vision1)).toBe(true);
    expect(readsImageOnly(vision1)).toBe(true);
    expect(readsImageOnly(card('m', 'contradiction', 1, [{ label: 'A', quotes: [vision('d1'), doc('d1')] }, { label: 'B', quotes: [doc('d2')] }]))).toBe(false);
  });

  it('réponses de fond hors côtés, « Autre réponse », « Plus tard » et menu secondaire', () => {
    expect(substantiveAnswers(card('d', 'dated_change', 1))).toEqual(['adjust', 'same_meaning', 'different_subjects']);
    expect(substantiveAnswers(card('i', 'incomplete_or_outdated', 1))).toEqual(['complete', 'remove', 'up_to_date', 'not_a_problem']);
  });

  it('documents d\'un côté par nom de fichier, sans doublon ; la fiche de cadrage nommée comme telle', () => {
    const quotes = toQuotes([doc('d1'), doc('d1'), { kind: 'briefing', excerptRealigned: false, excerpt: 'Fiche.' }]);
    expect(sideDocuments(quotes, id => `${id}.pdf`)).toEqual(['d1.pdf', 'votre fiche de cadrage']);
    expect(toQuotes([{ kind: 'document', excerptRealigned: false, source: {} }])).toEqual([]);
  });

  it('réponse en clair : côté retenu avec ses fichiers, texte saisi entre guillemets', () => {
    const c = card('c', 'contradiction', 1);
    const name = (id: string) => `${id}.pdf`;
    expect(describeCardAnswer({ type: 'accept_side', side: 'B' }, c, name)).toBe('Côté B retenu : d2.pdf');
    expect(describeCardAnswer({ type: 'distinct_cases', text: 'A en Corse.' }, c, name)).toBe('Les deux sont vraies, selon le cas : « A en Corse. »');
    expect(describeCardAnswer({ type: 'later' }, c, name)).toBe('Plus tard');
    const withBriefing = card('b', 'contradiction', 1, [{ label: 'A', quotes: [doc('d1')] }, { label: 'B', quotes: [briefing] }]);
    expect(describeCardAnswer({ type: 'accept_side', side: 'B' }, withBriefing, name)).toBe('Votre fiche de cadrage retenue');
    const oneSided = card('o', 'probable_error', 1, [{ label: 'A', quotes: [doc('d1')] }]);
    expect(describeCardAnswer({ type: 'accept_side', side: 'A' }, oneSided, name)).toBe('Passage jugé juste : d1.pdf');
  });

  it('un seul côté retrouvé : le côté manquant, une question sur ce passage, sans les réponses qui comparent', () => {
    const oneSided = card('o', 'dated_change', 1, [{ label: 'B', quotes: [doc('d2')] }]);
    expect(missingSide(oneSided)).toBe('A');
    expect(missingSide(card('a', 'probable_error', 1, [{ label: 'A', quotes: [doc('d1')] }]))).toBe('B');
    expect(missingSide(card('c', 'contradiction', 1))).toBeNull();
    // « Incomplet ou périmé » n'a pas à comparer deux côtés.
    expect(missingSide(card('i', 'incomplete_or_outdated', 1, [{ label: 'A', quotes: [doc('d1')] }]))).toBeNull();
    expect(sidesQuestion(oneSided)).toBe('Ce passage est-il juste ?');
    expect(sidesQuestion(card('c', 'contradiction', 1))).toBe('Quel côté est juste ?');
    expect(substantiveAnswers(oneSided)).toEqual(['adjust']);
  });

  it('titre : le sujet de la carte, sinon « Carte N »', () => {
    const c = card('c', 'contradiction', 1);
    expect(cardTitle({ ...c, analysis: { ...c.analysis, subject: ' Forfait optique ' } }, 3)).toBe('Forfait optique');
    expect(cardTitle({ ...c, analysis: { ...c.analysis, subject: '' } }, 3)).toBe('Carte 3');
  });

  it('résumé : cartes par nature, celles qui bloquent la publication et celles encore à traiter', () => {
    const v = card('v', 'probable_error', 5, [{ label: 'A', quotes: [vision('d1')] }, { label: 'B', quotes: [doc('d2')] }]);
    const all = [...cards, v];
    const none = new Map<string, Decision>();
    expect(describeSummary(clarifySummary(all, none), true)).toEqual([
      '5 cartes : 1 contradiction, 2 changements datés, 1 erreur probable et 1 incomplet ou périmé.',
      '4 bloquent la publication tant qu\'elles n\'ont pas de réponse, dont 4 encore à traiter.',
    ]);
    const some = new Map([['c1', decision('c1', { type: 'same_meaning' })], ['d1', decision('d1', { type: 'later' })]]);
    expect(describeSummary(clarifySummary(all, some), true)[1]).toBe('4 bloquent la publication tant qu\'elles n\'ont pas de réponse, dont 3 encore à traiter.');
    expect(describeSummary(clarifySummary(all, some), false)[1]).toBe('4 bloquent la publication tant qu\'elles n\'ont pas de réponse.');
    const done = new Map(['c1', 'd1', 'd2', 'v'].map(id => [id, decision(id, { type: 'same_meaning' })]));
    expect(describeSummary(clarifySummary(all, done), true)[1]).toBe('Les 4 cartes qui bloquaient la publication ont toutes une réponse.');
    expect(describeSummary(clarifySummary([card('c', 'contradiction', 1)], none), true)).toEqual([
      '1 carte : 1 contradiction.', '1 bloque la publication tant qu\'elle n\'a pas de réponse, dont 1 encore à traiter.',
    ]);
    expect(describeSummary(clarifySummary([card('i', 'incomplete_or_outdated', 1)], none), true)[1]).toBe('Aucune ne bloque la publication.');
    expect(describeSummary(clarifySummary([], none), true)).toEqual([]);
  });

  it('raisons des citations non vérifiées : description d\'image, « autre raison » en dernier', () => {
    expect(unverifiedReasonLabel('image_description_only')).toBe('reprend seulement la description d\'une image, pas son texte');
    expect(unverifiedReasonLabel('other')).toBe('autre raison');
    expect(unverifiedReasonLabel('inconnue')).toBe('autre raison');
    expect(unverifiedCounts({ other: 2, image_description_only: 1, not_found: 3 }))
      .toEqual([['image_description_only', 1], ['not_found', 3], ['other', 2]]);
  });
});

describe('base existante repérée (audit 0.12.0, lot Elyra v2)', () => {
  it('annonce la base et sa raison, sans rien demander ; rien avant 0.12.0', () => {
    expect(baseAnnouncement({ base: { mode: 'correct', reason: 'numbered_files', documentIds: ['a', 'b'], briefingExcerpt: null } }))
      .toEqual({ title: 'Nous avons repéré une base existante (2 documents) : nous allons la corriger', reason: 'Ses fichiers sont numérotés « NN- ».' });
    expect(baseAnnouncement({ base: { mode: 'correct', reason: 'briefing', documentIds: ['a'], briefingExcerpt: 'Notre base est la FAQ.' } }))
      .toEqual({
        title: 'Nous avons repéré une base existante (1 document) : nous allons la corriger',
        reason: 'Votre fiche de cadrage la désigne : « Notre base est la FAQ. ».',
      });
    const none = baseAnnouncement({ base: { mode: 'build', reason: 'none', documentIds: [], briefingExcerpt: null } });
    expect(none?.title).toBe('Pas de base existante');
    expect(none?.reason).toContain('aucun fichier n\'est numéroté « NN- »');
    expect(baseAnnouncement({ base: null })).toBeNull();
    expect(baseAnnouncement({})).toBeNull();
  });
});

describe('fichiers non lus', () => {
  it('chaque raison du pipeline a son libellé ; un échec de lecture, « document illisible »', () => {
    expect(unreadReasonLabel('unsupported_file: format non lu')).toBe('format non lu');
    expect(unreadReasonLabel('unreferenced_image: image citée par aucun document')).toBe('image citée par aucun document');
    expect(unreadReasonLabel('nested_archive: archive dans une archive, non lue')).toBe('archive contenue dans une archive, non lue');
    expect(unreadReasonLabel('unsafe_archive: chemin qui sort de l\'archive')).toContain('archive refusée');
    expect(unreadReasonLabel('unreadable_archive: archive chiffrée')).toBe('archive illisible ou chiffrée');
    expect(unreadReasonLabel('UnicodeDecodeError: invalid start byte')).toBe('document illisible');
    expect(unreadReasonLabel(null)).toBe('document illisible');
  });

  it('un doublon nomme le fichier gardé', () => {
    expect(unreadReasonLabel('duplicate_file: même contenu que jeu.zip/cr_comite.docx'))
      .toBe('doublon, non relu : même contenu que jeu.zip/cr_comite.docx');
    expect(unreadReasonLabel('duplicate_file')).toBe('doublon d\'un autre fichier, non relu');
  });

  it('seuls les fichiers en échec, dans l\'ordre de l\'inventaire', () => {
    const audit = { inventory: [
      { documentId: 'a', path: 'export.zip/Export/Page.md', format: 'md', status: 'parsed', error: null },
      { documentId: 'b', path: 'export.zip/Export/Base.csv', format: 'other', status: 'failed', error: 'unsupported_file: format non lu' },
      { documentId: 'c', path: 'vieux.md', format: 'md', status: 'failed', error: 'UnicodeDecodeError: x' },
    ] } as unknown as Audit;
    expect(unreadFiles(audit)).toEqual([
      { path: 'export.zip/Export/Base.csv', reason: 'format non lu' },
      { path: 'vieux.md', reason: 'document illisible' },
    ]);
  });
});

describe('« Je suis la recommandation de l\'IA »', () => {
  const name = (id: string) => `${id}.docx`;
  const reco = (c: ReadingCard, effect: NonNullable<ReadingCard['recommendation']>['effect']): ReadingCard =>
    ({ ...c, recommendation: { text: 'Mettre à jour.', effect, basis: 'x' } });

  it('l\'audit 0.9.0 est un audit à cartes, comme 0.8.0', () => {
    expect(isReadingAudit('0.8.0')).toBe(true);
    expect(isReadingAudit('0.9.0')).toBe(true);
    expect(isReadingAudit('0.7.0')).toBe(false);
  });

  it('ce que la réponse fera dans la base, selon l\'effet', () => {
    const dated = card('c1', 'dated_change', 1, [{ label: 'A', quotes: [doc('fiche')] }, { label: 'B', quotes: [doc('email')] }]);
    expect(recommendationOutcome(reco(dated, { type: 'accept_side', side: 'B' }), name))
      .toBe('Le changement daté sera retenu : la base suivra le côté B (email.docx).');
    const error = card('c2', 'probable_error', 1, [{ label: 'A', quotes: [doc('fiche')] }, { label: 'B', quotes: [doc('faq')] }]);
    expect(recommendationOutcome(reco(error, { type: 'accept_side', side: 'A' }), name)).toBe('Le côté A (fiche.docx) sera retenu dans la base.');
    expect(recommendationOutcome(reco(dated, { type: 'complete' }), name)).toBe('Le passage sera complété dans la base, en suivant la recommandation.');
    expect(recommendationOutcome(reco(dated, null), name)).toMatch(/^Consigne seule : rien n'est ajouté ni tranché/);
    const absent = { ...reco(dated, null), absentReferences: [{ documentId: 'email', excerpt: 'voir grille complète en pièce jointe' }] };
    expect(recommendationOutcome(absent, name)).toBe('La base restera telle quelle, avec son avertissement : la source renvoie à un contenu absent de vos documents. Une précision de votre part s\'appliquera seule.');
  });

  it('le libellé de la réponse, avec sa précision', () => {
    const dated = card('c1', 'dated_change', 1);
    const follow = (effect: unknown, precisions: string | null) =>
      ({ type: 'follow_recommendation', recommendation: 'Mettre à jour.', effect, precisions }) as unknown as Decision['action'];
    expect(describeCardAnswer(follow({ type: 'accept_side', side: 'B' }, null), dated, name)).toBe('Recommandation de l\'IA suivie (changement daté retenu)');
    expect(describeCardAnswer(follow({ type: 'complete' }, 'Pour 2027.'), dated, name))
      .toBe('Recommandation de l\'IA suivie (passage à compléter) — précision : « Pour 2027. »');
    expect(describeCardAnswer(follow(null, null), dated, name)).toBe('Recommandation de l\'IA suivie (consigne seule)');
    expect(describeCardAnswer(follow({ type: 'accept_side', side: 'A' }, null), card('c2', 'probable_error', 1), name))
      .toBe('Recommandation de l\'IA suivie (côté A retenu)');
  });
});


describe('rejectionReasonLabel', () => {
  it('dit qu\'un passage cité est introuvable (plan v6, B1)', () => {
    expect(rejectionReasonLabel('no_verified_quote')).toBe('Un des passages cités est introuvable dans vos documents');
    expect(rejectionReasonLabel('briefing_only')).toBe('Ne cite que la fiche de cadrage');
    expect(rejectionReasonLabel('inconnue')).toBe('Autre raison');
  });

  it('nomme les deux raisons de l\'audit 0.13.0 (lot Elyra v2.1)', () => {
    expect(rejectionReasonLabel('unnamed_object')).toBe('Objet non nommé : ni produit, ni libellé, ni zone');
    expect(rejectionReasonLabel('same_value')).toBe('Même valeur des deux côtés');
    expect(isReadingAudit('0.13.0')).toBe(true);
  });
});

/** Audit 0.14.0 (lot Elyra v2.2) : une valeur d'écart dit ce qu'elle mesure (`unit.measure`). */
describe('formatGapValue (audit 0.14.0)', () => {
  const gap = (value: string, unit: object | undefined) =>
    codeCheck({ check: { kind: 'value_gap', period: null, values: [
      { side: 'A', value, unit }, { side: 'B', value: '2', unit },
    ] } }) as { kind: 'value_gap'; values: Parameters<typeof formatGapValue>[0][] } | null;
  const shown = (value: string, unit: object | undefined) => formatGapValue(gap(value, unit)!.values[0]);

  it('montant : inchangé, avec ou sans `measure`', () => {
    expect(shown('45.80', { currency: 'EUR', per: 'month', tax: 'ttc' })).toBe('45,80 € TTC par mois');
    expect(shown('45.80', { currency: 'EUR', per: 'month', tax: 'ttc', measure: 'amount' })).toBe('45,80 € TTC par mois');
    expect(shown('45.8', { currency: 'EUR', per: null, tax: null })).toBe('45,80 €');
    expect(shown('12', undefined)).toBe('12 €');
  });

  it('durée en mois, en jours ; pourcentage : jamais de « € »', () => {
    const none = { currency: null, per: null, tax: null };
    expect(shown('36', { ...none, measure: 'months' })).toBe('36 mois');
    expect(shown('1', { ...none, measure: 'months' })).toBe('1 mois');
    expect(shown('14', { ...none, measure: 'days' })).toBe('14 jours');
    expect(shown('1', { ...none, measure: 'days' })).toBe('1 jour');
    expect(shown('8', { ...none, measure: 'percent' })).toBe('8 %');
    expect(shown('5.5', { ...none, measure: 'percent' })).toBe('5,5 %');
    // Une durée ou un pourcentage qui porterait encore une devise ne la montre pas.
    expect(shown('30', { currency: 'EUR', per: 'month', tax: 'ttc', measure: 'days' })).toBe('30 jours');
  });

  it('mesure inconnue : la valeur nue, jamais un « € » faux', () => {
    expect(shown('5.5', { currency: null, per: null, tax: null, measure: 'weeks' })).toBe('5,5');
    expect(shown('3', { currency: 'EUR', per: 'month', tax: null, measure: 42 })).toBe('3');
    expect(isReadingAudit('0.14.0')).toBe(true);
  });
});

describe('Audit 0.15.0 : les images non lues, « non disponible », jamais « 0 »', () => {
  const docs = [{ documentId: 'doc_a', path: 'guide.docx', count: 2 }, { documentId: 'doc_b', path: 'faq.docx', count: 1 }];

  it('une panne complète du modèle de lecture des images se distingue d\'une image illisible', () => {
    expect(unreadImagesText({ cause: 'vision_unavailable', count: 3, total: 3, documents: docs })).toBe(
      'Le modèle de lecture des images n\'a pas répondu : aucune des 3 images n\'a été lue, les informations qu\'elles contiennent ne sont pas analysées.');
    expect(unreadImagesText({ cause: 'vision_unavailable', count: 1, total: 1, documents: [docs[1]] })).toBe(
      'Le modèle de lecture des images n\'a pas répondu : l\'image n\'a pas été lue, les informations qu\'elle contient ne sont pas analysées.');
    expect(unreadImagesText({ cause: 'vision_unavailable', count: 3, total: 8, documents: docs })).toBe(
      'Le modèle de lecture des images n\'a pas répondu pour 3 images sur 8 : les informations qu\'elles contiennent ne sont pas analysées.');
    expect(unreadImagesText({ cause: 'unreadable', count: 3, total: 8, documents: docs })).toBe(
      '3 images n\'ont pas pu être lues : les informations qu\'elles contiennent ne sont pas analysées.');
    expect(unreadImagesText({ cause: 'unreadable', count: 1, total: 8, documents: [docs[1]] })).toBe(
      '1 image n\'a pas pu être lue : les informations qu\'elle contient ne sont pas analysées.');
  });

  it('rangées avec les détections en échec, jamais avec ce que l\'analyse ne repère pas encore', () => {
    const unreadImages = { cause: 'unreadable' as const, count: 3, total: 8, documents: docs };
    const reading = { unavailableDetections: ['temporary_notes', 'images'], unreadImages };
    expect(failedDetections(reading)).toEqual([unreadImagesText(unreadImages)]);
    expect(notYetDetections(reading)).toEqual(['temporary_notes']);
    // Sans le détail (back plus ancien) : une phrase générale, jamais rien.
    expect(failedDetections({ unavailableDetections: ['images'] })).toEqual([
      'Des images n\'ont pas pu être lues : les informations qu\'elles contiennent ne sont pas analysées.']);
    expect(failedDetections({ unavailableDetections: ['temporary_notes'], unreadImages: null })).toEqual([]);
    expect(isReadingAudit('0.15.0')).toBe(true);
  });
});

describe('Documents analysés', () => {
  const audit = { inventory: [
    { documentId: 'd1', path: 'a.zip/grille.pdf', format: 'pdf', status: 'parsed', error: null },
    { documentId: 'd2', path: 'a.zip/faq.docx', format: 'docx', status: 'parsed', error: null },
    { documentId: 'd3', path: 'a.zip/note.eml', format: 'eml', status: 'parsed', error: null },
    { documentId: 'd4', path: 'a.zip/grille_1.pdf', format: 'pdf', status: 'failed', error: 'duplicate_file: même contenu que a.zip/grille.pdf' },
    { documentId: 'd5', path: 'a.zip/vieux.pdf', format: 'pdf', status: 'failed', error: 'duplicate_file' },
    { documentId: 'd6', path: 'a.zip/Base.csv', format: 'other', status: 'failed', error: 'unsupported_file: format non lu' },
  ] } as unknown as Audit;

  it('tout l\'inventaire, dans son ordre, avec le nombre de cartes de chaque document lu, 0 compris', () => {
    // Carte 1 : nomme d1 et d2, cite d1 et d2 ; carte 2 : nomme d1 seul, cite aussi d3 (une citation rattachée).
    const c2 = { ...card('c2', 'contradiction', 2, [{ label: 'A', quotes: [doc('d1')] }, { label: 'B', quotes: [doc('d3')] }]), documentIds: ['d1'] };
    const docs = analyzedDocuments(audit, { cards: [card('c1', 'contradiction', 1), c2], unreadImages: {
      cause: 'unreadable', count: 1, total: 3, documents: [{ documentId: 'd2', path: 'a.zip/faq.docx', count: 1 }],
    } });
    expect(docs.map(d => [d.documentId, d.type, d.status, d.unreadImages])).toEqual([
      ['d1', 'PDF', { kind: 'read', cards: 2 }, 0],
      ['d2', 'Word', { kind: 'read', cards: 1 }, 1],
      ['d3', 'Courriel', { kind: 'read', cards: 1 }, 0],
      ['d4', 'PDF', { kind: 'duplicate', of: 'a.zip/grille.pdf' }, 0],
      ['d5', 'PDF', { kind: 'duplicate', of: null }, 0],
      ['d6', 'CSV', { kind: 'unread', reason: 'format non lu' }, 0],
    ]);
    expect(analyzedDocumentsSummary(docs)).toBe('3 lus, 2 doublons écartés, 1 non lu');
    expect(analyzedDocuments(audit, { cards: [] }).filter(d => d.status.kind === 'read').map(d => d.status))
      .toEqual([{ kind: 'read', cards: 0 }, { kind: 'read', cards: 0 }, { kind: 'read', cards: 0 }]);
  });

  it('le type en clair ; une image ou un format inconnu, par l\'extension', () => {
    expect(documentType('pptx', 'x.pptx')).toBe('PowerPoint');
    expect(documentType('xlsx', 'x.xlsx')).toBe('Excel');
    expect(documentType('md', 'x.md')).toBe('Markdown');
    expect(documentType('zip', 'x.zip')).toBe('Archive');
    expect(documentType('other', 'dossier/graphique.PNG')).toBe('Image');
    expect(documentType('other', 'sans-extension')).toBe('Autre');
  });

  it('cité par aucune carte, une carte, des cartes', () => {
    expect(citedByText(0)).toBe('cité par aucune carte');
    expect(citedByText(1)).toBe('cité par 1 carte');
    expect(citedByText(4)).toBe('cité par 4 cartes');
  });
});
