import React, { useState, useCallback } from 'react';
import { Button }         from '../../../shared/components/ui/Button';
import { Input }          from '../../../shared/components/ui/Input';
import { Modal }          from '../../../shared/components/ui/Modal';
import { ConfirmDialog }  from '../../../shared/components/ui/ConfirmDialog';
import { SettingsListSection } from '../../../shared/components/ui/SettingsListSection';
import { useTags }        from '../hooks/useTags';
import type { OrgTag }    from '../../articles/api/tagsApi';

export function TagsSettingsSection() {
  const { items, loading, error, rename, remove } = useTags();
  const [editing,        setEditing]       = useState<OrgTag | null>(null);
  const [confirmDelete,  setConfirmDelete] = useState<OrgTag | null>(null);

  return (
    <SettingsListSection<OrgTag>
      title="Tags"
      titleId="tags-title"
      description={
        <>Gérez les tags utilisés par votre équipe sur les articles.
        Les nouveaux tags se créent automatiquement depuis l'éditeur ;
        ici, vous pouvez les renommer ou les supprimer.</>
      }
      loading={loading}
      error={error}
      items={items}
      emptyMessage="Aucun tag pour l'instant. Les tags se créent automatiquement quand un membre en saisit dans l'éditeur d'article."
      listClassName="tags-list"
      renderItem={tag => (
        <li key={tag.id} className="tag-row">
          <span className="tag-row__label">{tag.display_name}</span>
          <span className="tag-row__count">
            {tag.articles_count} article{tag.articles_count === 1 ? '' : 's'}
          </span>
          <div className="tag-row__actions">
            <Button variant="ghost" size="sm" onClick={() => setEditing(tag)}>
              Renommer
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setConfirmDelete(tag)}
            >
              Supprimer
            </Button>
          </div>
        </li>
      )}
    >
      {confirmDelete && (
        <ConfirmDialog
          title={`Supprimer « ${confirmDelete.display_name} » ?`}
          description={
            confirmDelete.articles_count > 0
              ? `Ce tag sera retiré de ${confirmDelete.articles_count} article${confirmDelete.articles_count === 1 ? '' : 's'}. Cette action est irréversible.`
              : 'Cette action est irréversible.'
          }
          confirmLabel="Supprimer le tag"
          variant="danger"
          onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {editing && (
        <RenameTagModal
          tag={editing}
          onClose={() => setEditing(null)}
          onSave={async displayName => {
            const ok = await rename(editing.id, displayName);
            if (ok) setEditing(null);
          }}
        />
      )}
    </SettingsListSection>
  );
}

// ── Modal de renommage ──────────────────────────────────────────

function RenameTagModal({
  tag, onClose, onSave,
}: {
  tag:     OrgTag;
  onClose: () => void;
  onSave:  (displayName: string) => Promise<void>;
}) {
  const [value,  setValue]  = useState(tag.display_name);
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== tag.display_name;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
  }, [canSubmit, trimmed, onSave]);

  return (
    <Modal
      title="Renommer le tag"
      onClose={onClose}
      asForm
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={!canSubmit}>
            Renommer le tag
          </Button>
        </>
      }
    >
      <Input
        id="rename-input"
        type="text"
        label="Nouveau nom"
        helperText="Tous les articles qui portent ce tag afficheront le nouveau nom. Si un tag porte déjà ce nom (majuscules et minuscules confondues), les deux seront fusionnés."
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
      />
    </Modal>
  );
}
