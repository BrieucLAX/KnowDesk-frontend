import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { acceptNotice: vi.fn(), getNotice: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { NoticeGate, NoticeReminder } from './NoticeGate';
import type { OnboardingNotice } from '../types';
// Réponses réelles de GET /onboarding/notice : back de main (8bd868d) et back de KnowDesk#50, en local.
import OLD from './fixtures/notice-2026-09-26.response.json';
import NEW from './fixtures/notice-2026-10-20.response.json';

const notice = { version: '2026-09-26', text: 'Vos documents sont analysés par Knowdesk…', sha256: 'x', acceptedAt: null };

describe('NoticeGate', () => {
  beforeEach(() => {
    vi.mocked(onboardingApi.acceptNotice).mockReset();
    vi.mocked(onboardingApi.getNotice).mockReset();
  });

  it('affiche le texte du back et n\'accepte qu\'après la case cochée', async () => {
    vi.mocked(onboardingApi.acceptNotice).mockResolvedValue({ version: notice.version, acceptedAt: '2026-09-27T09:00:00Z' });
    const onChange = vi.fn();
    render(<NoticeGate notice={notice} onChange={onChange} />);
    expect(screen.getByText(notice.text)).toBeInTheDocument();
    const accept = screen.getByRole('button', { name: 'Accepter et continuer' });
    expect(accept).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(accept);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ ...notice, acceptedAt: '2026-09-27T09:00:00Z' }));
    expect(onboardingApi.acceptNotice).toHaveBeenCalledWith('2026-09-26');
  });

  it('texte du 2026-10-20 : quatre paragraphes, dans l\'ordre, sans ligne vide affichée', () => {
    const real = NEW.data as OnboardingNotice;
    const { container } = render(<NoticeGate notice={real} onChange={vi.fn()} />);
    const paragraphs = [...container.querySelectorAll('.obp-notice__text')].map(p => p.textContent);
    expect(paragraphs).toEqual(real.text.split('\n\n'));
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[1]).toMatch(/^Vos documents importés sont supprimés 30 jours après la validation de votre base/);
  });

  it('texte du 2026-09-26 : un seul paragraphe, comme avant', () => {
    const real = OLD.data as OnboardingNotice;
    const { container } = render(<NoticeGate notice={real} onChange={vi.fn()} />);
    const paragraphs = [...container.querySelectorAll('.obp-notice__text')].map(p => p.textContent);
    expect(paragraphs).toEqual([real.text]);
  });

  it('« Le relire » affiche aussi les paragraphes', () => {
    const real = { ...(NEW.data as OnboardingNotice), acceptedAt: '2026-10-21T09:00:00Z' };
    render(<NoticeReminder notice={real} />);
    fireEvent.click(screen.getByRole('button', { name: 'Le relire' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelectorAll('.obp-notice__text')).toHaveLength(4);
  });

  it('NOTICE_OUTDATED : recharge la nouvelle version et demande de la relire', async () => {
    const newer = { ...notice, version: '2026-10-01', text: 'Nouveau texte' };
    vi.mocked(onboardingApi.acceptNotice).mockRejectedValue(new ApiError('NOTICE_OUTDATED', 'Rechargez la page.', 409));
    vi.mocked(onboardingApi.getNotice).mockResolvedValue(newer);
    const onChange = vi.fn();
    render(<NoticeGate notice={notice} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(newer));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
