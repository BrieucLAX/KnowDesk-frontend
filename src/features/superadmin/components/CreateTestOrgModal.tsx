import React, { useState } from 'react';
import { Modal }  from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';
import { formatFull } from '../../../shared/lib/formatDate';
import type { TestOrgCreated } from '../types';

interface CreateTestOrgModalProps {
  onCreate: (name: string, adminEmail: string) => Promise<TestOrgCreated>;
  onClose:  () => void;
}

const EMAIL_STATUS: Record<TestOrgCreated['email'], string> = {
  sent:               'L\'invitation a été envoyée par email.',
  skipped_no_api_key: 'Aucun email n\'est parti : l\'envoi d\'emails n\'est pas configuré sur le back. Transmettez le lien vous-même.',
  failed:             'L\'envoi de l\'email a échoué. Transmettez le lien vous-même.',
};

/**
 * Création d'une organisation de test (module onboarding seul) et invitation
 * de son admin (prérequis 17). Après création, affiche le lien d'invitation
 * renvoyé par le back, à transmettre à la main si l'email n'est pas parti.
 */
export function CreateTestOrgModal({ onCreate, onClose }: CreateTestOrgModalProps) {
  const [name,       setName]       = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [created,    setCreated]    = useState<TestOrgCreated | null>(null);
  const [copied,     setCopied]     = useState(false);

  const submit = async () => {
    if (!name.trim() || !adminEmail.trim()) {
      setError('Le nom de l\'organisation et l\'email de son admin sont requis.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      setCreated(await onCreate(name.trim(), adminEmail.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.invitation.acceptUrl);
      setCopied(true);
    } catch {
      setError('Copie impossible : sélectionnez le lien à la main.');
    }
  };

  if (created) {
    return (
      <Modal
        title="Organisation de test créée"
        onClose={onClose}
        footer={<Button variant="primary" size="md" onClick={onClose}>Fermer</Button>}
      >
        <div className="sa-test-org">
          <p>
            <strong>{created.organization.name}</strong> ({created.organization.slug}) — admin invité :{' '}
            {created.invitation.email}.
          </p>
          <p className={created.email === 'sent' ? 'sa-test-org__ok' : 'sa-test-org__warn'} role="status">
            {EMAIL_STATUS[created.email]}
          </p>
          <div className="sa-test-org__link">
            <Input
              id="sa-test-org-link"
              label="Lien d'invitation"
              value={created.invitation.acceptUrl}
              readOnly
              onFocus={e => e.currentTarget.select()}
              helperText={`Valable jusqu'au ${formatFull(created.invitation.expiresAt)}.`}
            />
            <Button variant="secondary" size="md" onClick={copyLink}>
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
          {error && <p className="sa-test-org__error" role="alert">{error}</p>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Nouvelle organisation de test"
      onClose={onClose}
      asForm
      onSubmit={submit}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={submitting}>Créer et inviter</Button>
        </>
      }
    >
      <div className="sa-test-org">
        <p className="sa-test-org__desc">
          L'organisation n'aura que le module Onboarding. Son admin reçoit une invitation par le parcours habituel.
        </p>
        <Input
          id="sa-test-org-name"
          label="Nom de l'organisation"
          value={name}
          maxLength={80}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <Input
          id="sa-test-org-email"
          label="Email de l'admin"
          type="email"
          value={adminEmail}
          onChange={e => setAdminEmail(e.target.value)}
          autoComplete="off"
        />
        {error && <p className="sa-test-org__error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
