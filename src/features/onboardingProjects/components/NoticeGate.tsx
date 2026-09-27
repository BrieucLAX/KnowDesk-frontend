import React, { useState } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Modal }  from '../../../shared/components/ui/Modal';
import { ApiError } from '../../../shared/lib/apiClient';
import { useToast } from '../../../shared/lib/useToast';
import { formatFull } from '../../../shared/lib/formatDate';
import { onboardingApi } from '../api/onboardingApi';
import type { OnboardingNotice } from '../types';

interface NoticeGateProps {
  notice:     OnboardingNotice;
  /** Appelé avec le texte à jour : acceptation enregistrée, ou nouvelle version à relire. */
  onChange:   (notice: OnboardingNotice) => void;
}

/**
 * Texte d'information à accepter avant le premier import (décision produit 2).
 * Le texte vient du back (GET /onboarding/notice), qui trace l'acceptation par
 * utilisateur avec sa version : il n'est jamais recopié dans le front.
 */
export function NoticeGate({ notice, onChange }: NoticeGateProps) {
  const toast = useToast();
  const [read,      setRead]      = useState(false);
  const [accepting, setAccepting] = useState(false);

  const accept = async () => {
    setAccepting(true);
    try {
      const { acceptedAt } = await onboardingApi.acceptNotice(notice.version);
      onChange({ ...notice, acceptedAt });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOTICE_OUTDATED') {
        // Le texte a changé entre-temps : on affiche la nouvelle version à relire.
        toast.error(err.message);
        setRead(false);
        onChange(await onboardingApi.getNotice());
      } else {
        toast.error(err instanceof Error ? err.message : 'Acceptation impossible.');
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <section className="obp-notice" aria-labelledby="obp-notice-title">
      <h2 id="obp-notice-title" className="obp-notice__title">Avant votre premier import</h2>
      <p className="obp-notice__text">{notice.text}</p>
      <label className="obp-notice__check">
        <input type="checkbox" checked={read} onChange={e => setRead(e.target.checked)} />
        <span>J'ai lu ce texte d'information.</span>
      </label>
      <div>
        <Button variant="primary" size="md" disabled={!read} loading={accepting} onClick={accept}>
          Accepter et continuer
        </Button>
      </div>
    </section>
  );
}

/** Rappel discret une fois le texte accepté, avec la possibilité de le relire. */
export function NoticeReminder({ notice }: { notice: OnboardingNotice }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="obp-notice-reminder">
      Texte d'information accepté le {formatFull(notice.acceptedAt)}.{' '}
      <button type="button" className="obp-link" onClick={() => setOpen(true)}>Le relire</button>
      {open && (
        <Modal
          title="Texte d'information"
          onClose={() => setOpen(false)}
          footer={<Button variant="primary" size="md" onClick={() => setOpen(false)}>Fermer</Button>}
        >
          <p className="obp-notice__text">{notice.text}</p>
        </Modal>
      )}
    </div>
  );
}
