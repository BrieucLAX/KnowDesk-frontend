import React, { useState } from 'react';
import { Modal }  from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';

interface ProjectNameModalProps {
  title:        string;
  submitLabel:  string;
  initialName?: string;
  /** Rejette avec le message du back en cas d'échec : il s'affiche sous le champ. */
  onSubmit:     (name: string) => Promise<void>;
  onClose:      () => void;
}

/** Saisie du nom d'un projet (création ou renommage). 120 caractères au plus, comme le back. */
export function ProjectNameModal({ title, submitLabel, initialName = '', onSubmit, onClose }: ProjectNameModalProps) {
  const [name,       setName]       = useState(initialName);
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Le nom du projet est requis.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      asForm
      onSubmit={submit}
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={submitting}>{submitLabel}</Button>
        </>
      }
    >
      <Input
        id="obp-project-name"
        label="Nom du projet"
        value={name}
        maxLength={120}
        onChange={e => setName(e.target.value)}
        error={error || undefined}
        autoFocus
      />
    </Modal>
  );
}
