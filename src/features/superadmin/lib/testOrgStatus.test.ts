import { describe, it, expect } from 'vitest';
import { orgStatus, scheduledPurgeDate } from './testOrgStatus';

const base = { disabled_at: null, test_ended_at: null, onboarding_purged_at: null };

describe('orgStatus', () => {
  it('actif, désactivé', () => {
    expect(orgStatus(base)).toMatchObject({ label: 'Actif', tone: 'active' });
    expect(orgStatus({ ...base, disabled_at: '2026-10-01T10:00:00Z' })).toMatchObject({ label: 'Désactivé', tone: 'disabled' });
  });

  it('test terminé : annonce la date de purge automatique, 30 jours après', () => {
    const s = orgStatus({ ...base, disabled_at: '2026-10-01T10:00:00Z', test_ended_at: '2026-10-01T10:00:00Z' });
    expect(s).toMatchObject({ label: 'Test terminé', tone: 'disabled' });
    expect(s.title).toContain('31 octobre 2026');
  });

  it('purgé : test terminé puis données supprimées', () => {
    const s = orgStatus({ ...base, disabled_at: '2026-10-01T10:00:00Z', test_ended_at: '2026-10-01T10:00:00Z', onboarding_purged_at: '2026-10-02T09:00:00Z' });
    expect(s).toMatchObject({ label: 'Purgé', tone: 'purged' });
    expect(s.title).toContain('2 octobre 2026');
  });

  it('une purge faite pendant le test ne vaut pas « Purgé » une fois le test terminé', () => {
    const s = orgStatus({ ...base, disabled_at: '2026-10-05T10:00:00Z', test_ended_at: '2026-10-05T10:00:00Z', onboarding_purged_at: '2026-10-02T09:00:00Z' });
    expect(s.label).toBe('Test terminé');
  });

  it('une organisation active purgée reste active, avec la date en infobulle', () => {
    const s = orgStatus({ ...base, onboarding_purged_at: '2026-10-02T09:00:00Z' });
    expect(s).toMatchObject({ label: 'Actif' });
    expect(s.title).toContain('2 octobre 2026');
  });
});

describe('scheduledPurgeDate', () => {
  it('30 jours après la fin du test', () => {
    expect(scheduledPurgeDate('2026-10-01T10:00:00Z').toISOString()).toBe('2026-10-31T10:00:00.000Z');
  });
});
