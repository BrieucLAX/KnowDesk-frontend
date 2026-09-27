import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../api/onboardingApi', () => ({
  onboardingApi: { acceptNotice: vi.fn(), getNotice: vi.fn() },
}));

import { onboardingApi } from '../api/onboardingApi';
import { ApiError } from '../../../shared/lib/apiClient';
import { NoticeGate } from './NoticeGate';

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
