import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('../../api/onboardingApi', () => ({
  onboardingApi: {
    listAnalyses: vi.fn(), getAudit: vi.fn(), listAuditImages: vi.fn(), getAuditImage: vi.fn(),
    listCorrections: vi.fn(), launchCorrection: vi.fn(), getBase: vi.fn(),
    listReviews: vi.fn(), review: vi.fn(), cancelReview: vi.fn(),
    listSectionComments: vi.fn(), commentSection: vi.fn(), cancelSectionComment: vi.fn(),
    validateBase: vi.fn(), listValidations: vi.fn(), getValidation: vi.fn(),
  },
}));

import { onboardingApi } from '../../api/onboardingApi';
import { BaseTab } from './BaseTab';
import { CleanBaseView } from './CleanBaseView';
import type { BaseVersion, OnboardingCorrection, Review, Validation, ValidationSummary } from '../../lib/correction';
import type { OnboardingAnalysis, OnboardingProject } from '../../types';
import BASE_PILOTE from './fixtures/base-0.1.0-pilote.response.json';

/** Version propre : « Corriger » par section, validation, écran propre et impression. */
const PILOTE = BASE_PILOTE as unknown as BaseVersion;
const TECHNICAL = /\b[MC]\d+\b|card_|img_|doc_|\b[a-z]+_[a-z_]+\b|inchangée|Appliquée|Modification \d/;

const MB = 1024 * 1024;
const project: OnboardingProject = {
  id: 'p1', name: 'Pilote', createdAt: '', updatedAt: '', documentsCount: 1, totalBytes: MB, cadrageVersion: 1,
  limits: { maxFileBytes: 50 * MB, maxDocumentsPerProject: 50, maxProjectBytes: 300 * MB, maxFilesPerUpload: 10 },
};
const analysis = { id: 'a1', status: 'succeeded', createdAt: '2026-10-07T09:00:00Z', finishedAt: '2026-10-07T09:10:00Z' } as OnboardingAnalysis;
const correction = {
  id: PILOTE.correctionId, analysisId: 'a1', generation: 1, status: 'succeeded', stage: 'storing', done: 0, total: 0,
  errorCode: null, decisionCount: 9, createdAt: '', submittedAt: null, finishedAt: '2026-10-07T09:25:00Z',
} as OnboardingCorrection;

const applied = PILOTE.base.modifications.filter(m => m.outcome === 'applied');
const review = (itemId: string, extra: Partial<Review> = {}): Review => ({
  id: `00000000-0000-4000-8000-0000000000${itemId.slice(1).padStart(2, '0')}`, itemId, verdict: 'accept',
  correctedText: null, correctedTexts: null, comment: null, supersedesId: null, authorName: 'Camille Martin',
  createdAt: '2026-10-07T10:00:00Z', cancellation: null, ...extra,
});
const summary = (extra: Partial<ValidationSummary> = {}): ValidationSummary => ({
  id: 'v1', correctionId: PILOTE.correctionId, version: 1, validatedByName: 'Camille Martin',
  validatedAt: '2026-10-07T11:00:00Z', upToDate: true, ...extra,
});

function mockBase(base: BaseVersion = PILOTE, reviews: Review[] = [], validations: ValidationSummary[] = []) {
  vi.mocked(onboardingApi.listAnalyses).mockResolvedValue({ data: [analysis], meta: { quota: { used: 1, max: 5 } } });
  vi.mocked(onboardingApi.listCorrections).mockResolvedValue({ data: [correction], meta: { quota: { used: 1, max: 30 } } });
  vi.mocked(onboardingApi.getBase).mockResolvedValue(base);
  vi.mocked(onboardingApi.getAudit).mockRejectedValue(new Error('x'));
  vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([]);
  vi.mocked(onboardingApi.listReviews).mockResolvedValue({ reviews, counts: { reviewed: reviews.length, toReview: applied.length } });
  vi.mocked(onboardingApi.listSectionComments).mockResolvedValue([]);
  vi.mocked(onboardingApi.listValidations).mockResolvedValue(validations);
}

describe('Relecture : « Corriger » par section, convention sans « Corriger »', () => {
  beforeEach(() => { vi.clearAllMocks(); mockBase(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('« Corriger » ouvre un champ par section touchée, pré-rempli de ses lignes, et enregistre un texte par section', async () => {
    vi.mocked(onboardingApi.review).mockImplementation(async (_p, _c, body) => review(body.itemId, { verdict: body.verdict, correctedTexts: body.correctedTexts }));
    render(<BaseTab project={project} onGoToClarify={() => {}} onOpenValidation={() => {}} />);
    const m1 = await screen.findByRole('article', { name: /^Modification 1/ });
    fireEvent.click(within(m1).getByRole('button', { name: 'Corriger' }));
    const keys = PILOTE.base.modifications.find(m => m.id === 'M1')!.section_keys;
    const fields = within(m1).getAllByLabelText(/: le texte tel que vous l'écririez$/) as HTMLTextAreaElement[];
    expect(fields).toHaveLength(keys.length);
    // Pré-remplis des lignes que la modification propose dans chaque section.
    expect(fields.filter(f => f.value.trim().length > 0).length).toBeGreaterThan(0);
    fireEvent.change(fields[1], { target: { value: 'Mon texte pour la seconde section.' } });
    fireEvent.blur(fields[1]);
    await waitFor(() => expect(onboardingApi.review).toHaveBeenLastCalledWith('p1', PILOTE.correctionId, expect.objectContaining({
      itemId: 'M1', verdict: 'fix', correctedText: null,
      correctedTexts: expect.objectContaining({ [keys[1]]: 'Mon texte pour la seconde section.' }),
    })));
  });

  it('une convention s\'accepte ou se refuse ; un ancien « Corriger » se lit comme un refus', async () => {
    const withConvention: BaseVersion = {
      ...PILOTE,
      base: { ...PILOTE.base, conventions: [{ id: 'C1', rule: 'Listes datées : la plus récente en premier.', section_keys: [PILOTE.base.sheets[0].sections[0].key] }] },
    };
    mockBase(withConvention, [review('C1', { verdict: 'fix', correctedText: 'Autre règle' })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} onOpenValidation={() => {}} />);
    const c1 = await screen.findByRole('article', { name: 'Convention 1' });
    expect(within(c1).getAllByRole('button').map(b => b.textContent)).toEqual(['Accepter', 'Refuser']);
    expect(within(c1).getByRole('button', { name: 'Refuser' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Relecture : valider la nouvelle base', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('tant qu\'un avis manque : le nombre qui reste, pas de bouton', async () => {
    mockBase(PILOTE, [review('M1')]);
    render(<BaseTab project={project} onGoToClarify={() => {}} onOpenValidation={() => {}} />);
    expect(await screen.findByText(`Encore ${applied.length - 1} avis à donner avant de valider la nouvelle base.`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider la nouvelle base' })).not.toBeInTheDocument();
  });

  it('tous les avis donnés : valider ouvre la version propre', async () => {
    mockBase(PILOTE, applied.map(m => review(m.id)));
    vi.mocked(onboardingApi.validateBase).mockResolvedValue(summary({ id: 'v9' }));
    const open = vi.fn();
    render(<BaseTab project={project} onGoToClarify={() => {}} onOpenValidation={open} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Valider la nouvelle base' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('v9'));
    expect(onboardingApi.validateBase).toHaveBeenCalledWith('p1', PILOTE.correctionId);
  });

  it('validée et à jour : « Voir la version validée » ; un avis changé depuis : revalider ; l\'historique reste', async () => {
    mockBase(PILOTE, applied.map(m => review(m.id)), [summary()]);
    const open = vi.fn();
    const { unmount } = render(<BaseTab project={project} onGoToClarify={() => {}} onOpenValidation={open} />);
    expect(await screen.findByText(/^Validée par Camille Martin le /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voir la version validée' }));
    expect(open).toHaveBeenCalledWith('v1');
    unmount();

    mockBase(PILOTE, applied.map(m => review(m.id)), [summary({ id: 'v2', version: 2, upToDate: false }), summary({ upToDate: null })]);
    render(<BaseTab project={project} onGoToClarify={() => {}} onOpenValidation={open} />);
    expect(await screen.findByText(/^Vos avis ont changé depuis la version validée du /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider la nouvelle base' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Versions validées (2)'));
    fireEvent.click(screen.getByRole('button', { name: /^Version 1, validée par Camille Martin le / }));
    expect(open).toHaveBeenLastCalledWith('v1');
  });
});

describe('Version propre', () => {
  const sheets = PILOTE.base.sheets.map(s => ({
    documentId: s.document_id, path: s.document_path,
    title: s.document_path.startsWith('00-') ? 'Base de connaissance interne — Alviva Mutuelle' : s.sections[0].heading_path[0],
    markdown: s.sections.map(x => x.corrected_markdown).join('\n'),
  }));
  const validation: Validation = { ...summary(), analysisId: 'a1', content: { format: 1, sheets } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onboardingApi.getValidation).mockResolvedValue(validation);
    vi.mocked(onboardingApi.listAuditImages).mockResolvedValue([{ imageId: 'img_f71a4c3878ce1c4e' }]);
    vi.mocked(onboardingApi.getAuditImage).mockResolvedValue(new Blob([new Uint8Array([1])], { type: 'image/png' }));
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:image'), revokeObjectURL: vi.fn() });
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('une ligne en tête, un sommaire cliquable, les fiches dans l\'ordre ; aucun badge, raison ni code', async () => {
    const back = vi.fn();
    const { container } = render(<CleanBaseView projectId="p1" validationId="v1" onBack={back} />);
    const head = await screen.findByText(/^Validée par Camille Martin le /);
    expect(head).toHaveTextContent('Revenir à la relecture');
    fireEvent.click(screen.getByRole('button', { name: 'Revenir à la relecture' }));
    expect(back).toHaveBeenCalled();

    const toc = screen.getByRole('navigation', { name: 'Sommaire' });
    expect(within(toc).getAllByRole('link').map(a => a.textContent)).toEqual(sheets.map(s => s.title));
    fireEvent.click(within(toc).getAllByRole('link')[2]);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    const rendered = [...container.querySelectorAll('.obp-clean-sheet')];
    expect(rendered.map(s => s.getAttribute('aria-label'))).toEqual(sheets.map(s => s.title));
    // Le titre d'une fiche une seule fois dans son texte.
    const third = rendered[2];
    expect([...third.querySelectorAll('.obp-base-h')].filter(h => h.textContent === sheets[2].title)).toHaveLength(1);
    expect(container.querySelectorAll('.obp-base-tag, .obp-base-change, .obp-base-card, del, ins')).toHaveLength(0);
    expect(container.querySelector('.obp-clean')!.textContent).not.toMatch(TECHNICAL);
    await waitFor(() => expect(onboardingApi.getAuditImage).toHaveBeenCalledWith('p1', 'a1', 'img_f71a4c3878ce1c4e'));
  });

  it('« Imprimer / PDF » ouvre l\'impression', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<CleanBaseView projectId="p1" validationId="v1" onBack={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Imprimer / PDF' }));
    expect(print).toHaveBeenCalled();
  });
});
