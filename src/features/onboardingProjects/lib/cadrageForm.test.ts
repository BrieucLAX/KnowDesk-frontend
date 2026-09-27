import { describe, it, expect } from 'vitest';
import {
  cleanCadrageForm, emptyCadrageForm, errorsBySection, missingDocuments, normalizeCadrageForm, parseBackendError, validateCadrageForm,
} from './cadrageForm';
import type { CadrageForm } from '../types';

const D1 = 'cgv.pdf';
const D2 = 'faq.docx';

function form(patch: Partial<CadrageForm>): CadrageForm {
  return { ...emptyCadrageForm(), ...patch };
}

describe('validateCadrageForm', () => {
  it('un formulaire vide est valide (toute section peut rester vide)', () => {
    expect(validateCadrageForm(emptyCadrageForm())).toEqual({});
  });

  it('exige les champs d\'une ligne, sur une ligne', () => {
    const errors = validateCadrageForm(form({
      offers: [{ name: '  ', description: '' }],
      notions: [{ first: 'Résiliation', second: 'a\nb', explanation: '' }],
    }));
    expect(errors).toEqual({
      'offers.0.name':   'Champ requis.',
      'notions.0.second': 'Une seule ligne attendue.',
    });
  });

  it('un document ne figure qu\'à un seul niveau ; un document absent du projet n\'est pas une erreur', () => {
    const errors = validateCadrageForm(form({
      sourceHierarchy: {
        levels: [
          { label: 'CGV', detail: '', documents: [D1] },
          { label: 'FAQ', detail: '', documents: [D1, 'retiré.pdf'] },
        ],
        specialCases: [],
      },
    }));
    expect(errors).toEqual({ 'sourceHierarchy.levels.1.documents': 'Un document ne figure qu\'à un seul niveau de la hiérarchie.' });
  });

  it('documents à durée limitée : document choisi, unique, dates dans l\'ordre', () => {
    const errors = validateCadrageForm(form({
      limitedDocuments: [
        { document: D1, validFrom: '2026-10-01', validUntil: '2026-09-01', effect: 'replaces', scope: '' },
        { document: D1, validFrom: null, validUntil: null, effect: 'suspends', scope: '' },
        { document: '', validFrom: '2026-02-30', validUntil: null, effect: 'replaces', scope: '' },
      ],
    }));
    expect(errors).toEqual({
      'limitedDocuments.0.validUntil': 'La fin de validité précède son début.',
      'limitedDocuments.1.document': 'Document déjà listé parmi les documents à durée limitée.',
      'limitedDocuments.2.document': 'Choisissez un document.',
      'limitedDocuments.2.validFrom':  'Date invalide.',
    });
    expect(errorsBySection(errors)).toEqual({ limitedDocuments: 4 });
  });
});

describe('missingDocuments', () => {
  it('liste les noms cités mais absents du projet, une fois chacun', () => {
    const f = form({
      sourceHierarchy: { levels: [{ label: 'A', detail: '', documents: [D1, 'retiré.pdf'] }], specialCases: [] },
      limitedDocuments: [
        { document: 'retiré.pdf', validFrom: null, validUntil: null, effect: 'replaces', scope: '' },
        { document: '', validFrom: null, validUntil: null, effect: 'replaces', scope: '' },
      ],
    });
    expect(missingDocuments(f, new Set([D1, D2]))).toEqual(['retiré.pdf']);
    expect(missingDocuments(f, new Set([D1, 'retiré.pdf']))).toEqual([]);
  });
});

describe('cleanCadrageForm / normalizeCadrageForm', () => {
  it('retire les espaces et remplace les dates vides par null', () => {
    const cleaned = cleanCadrageForm(form({
      offers: [{ name: ' Box ', description: ' Fibre ' }],
      limitedDocuments: [{ document: D2, validFrom: '', validUntil: '2026-12-31', effect: 'suspends', scope: ' Été ' }],
    }));
    expect(cleaned.offers[0]).toEqual({ name: 'Box', description: 'Fibre' });
    expect(cleaned.limitedDocuments[0]).toMatchObject({ validFrom: null, validUntil: '2026-12-31', scope: 'Été' });
  });

  it('complète un formulaire partiel', () => {
    expect(normalizeCadrageForm({ offers: [{ name: 'A', description: '' }] }).sourceHierarchy).toEqual({ levels: [], specialCases: [] });
  });
});

describe('parseBackendError', () => {
  it('découpe « chemin : message »', () => {
    expect(parseBackendError('offers.0.name : une seule ligne attendue'))
      .toEqual({ path: 'offers.0.name', message: 'une seule ligne attendue' });
  });

  it('laisse les messages sans chemin', () => {
    expect(parseBackendError('2 document(s) cité(s) n\'appartiennent pas à ce projet.')).toBeNull();
    expect(parseBackendError('formulaire : Expected object')).toBeNull();
  });
});
