import React, { useState, useCallback } from 'react';
import { Modal }  from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';
import type { InviteFormState, InviteFormErrors } from '../types';

interface InviteModalProps {
  onInvite: (form: InviteFormState) => Promise<void>;
  onClose:  () => void;
  isLoading: boolean;
}

function validate(form: InviteFormState): InviteFormErrors {
  const errors: InviteFormErrors = {};
  if (!form.email.trim())
    errors.email = 'Saisissez l\'adresse e-mail de la personne à inviter.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Saisissez une adresse e-mail valide, par exemple nom@entreprise.fr.';
  return errors;
}

export function InviteModal({ onInvite, onClose, isLoading }: InviteModalProps) {
  const [form,   setForm]   = useState<InviteFormState>({ email: '', role: 'advisor' });
  const [errors, setErrors] = useState<InviteFormErrors>({});

  const handleSubmit = useCallback(async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    await onInvite(form);
    onClose();
  }, [form, onInvite, onClose]);

  return (
    <Modal
      title="Inviter un membre"
      onClose={onClose}
      asForm
      onSubmit={handleSubmit}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Envoyer l'invitation
          </Button>
        </>
      }
    >
      <Input
        id="invite-email"
        type="email"
        label="Adresse e-mail"
        placeholder="prenom.nom@entreprise.fr"
        autoFocus
        required
        value={form.email}
        error={errors.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        onBlur={() => {
          const errs = validate(form);
          if (errs.email) setErrors(prev => ({ ...prev, email: errs.email }));
        }}
      />

      <div className="field">
        <label htmlFor="invite-role" className="field-label">Rôle</label>
        <select
          id="invite-role"
          className="field-input"
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value as InviteFormState['role'] }))}
        >
          <option value="advisor">Conseiller — lecture seule</option>
          <option value="manager">Manager — peut modifier les articles</option>
          <option value="admin">Administrateur — accès complet</option>
        </select>
        <p className="field-helper">
          {form.role === 'advisor'
            ? 'Peut rechercher et lire tous les articles publiés.'
            : form.role === 'manager'
            ? 'Peut créer et modifier des articles, mais pas gérer l\'équipe.'
            : 'Accès complet : contenu, équipe et facturation.'}
        </p>
      </div>
    </Modal>
  );
}
