import React, { useState, useCallback } from 'react';
import { Button }        from '../../../shared/components/ui/Button';
import { Input }         from '../../../shared/components/ui/Input';
import { ChipsInput }    from '../../../shared/components/ui/ChipsInput';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { Modal }         from '../../../shared/components/ui/Modal';
import { SettingsListSection } from '../../../shared/components/ui/SettingsListSection';
import { useSynonyms }   from '../hooks/useSynonyms';
import type { Synonym }  from '../types';

export function SearchSettingsSection() {
  const { items, loading, error, create, update, remove } = useSynonyms();
  const [showCreate,    setShowCreate]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Synonym | null>(null);

  return (
    <SettingsListSection<Synonym>
      title="Synonymes"
      titleId="search-title"
      description={
        <>Définissez des synonymes propres à votre organisation. Une recherche sur un terme
        remontera aussi les contenus contenant ses synonymes, et inversement.</>
      }
      createCta={{ label: 'Ajouter un synonyme', onClick: () => setShowCreate(true) }}
      loading={loading}
      error={error}
      items={items}
      emptyMessage="Aucun synonyme pour l'instant. Ajoutez-en un, par exemple pour relier « annulation » et « résiliation »."
      listClassName="synonyms-list"
      renderItem={item => (
        <SynonymItem
          key={item.id}
          item={item}
          onSave={syn => update(item.id, syn)}
          onDelete={() => setConfirmDelete(item)}
        />
      )}
    >
      {confirmDelete && (
        <ConfirmDialog
          title={`Supprimer « ${confirmDelete.term} » ?`}
          description="Ce terme et ses synonymes ne seront plus pris en compte par la recherche. Cette action est irréversible."
          confirmLabel="Supprimer le synonyme"
          variant="danger"
          onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {showCreate && (
        <CreateSynonymModal
          existingTerms={items.map(i => i.term.toLowerCase())}
          onClose={() => setShowCreate(false)}
          onCreate={async (term, synonyms) => {
            const ok = await create(term, synonyms);
            if (ok) setShowCreate(false);
          }}
        />
      )}
    </SettingsListSection>
  );
}

// ── Item — affichage + édition inline ──────────────────────────

function SynonymItem({
  item, onSave, onDelete,
}: {
  item:     Synonym;
  onSave:   (synonyms: string[]) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<string[]>(item.synonyms);
  const [saving,  setSaving]  = useState(false);

  const startEdit = () => { setDraft(item.synonyms); setEditing(true); };
  const cancel    = () => { setDraft(item.synonyms); setEditing(false); };

  const save = useCallback(async () => {
    if (draft.length === 0) return;
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  }, [draft, onSave]);

  return (
    <li className="synonym-item">
      <div className="synonym-item__term">{item.term}</div>

      {editing ? (
        <div className="synonym-item__edit">
          <ChipsInput value={draft} onChange={setDraft} placeholder="Ajouter un synonyme…" ariaLabel={`Synonymes de ${item.term}`} />
          <div className="synonym-item__actions">
            <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>Annuler</Button>
            <Button variant="primary" size="sm" onClick={save} loading={saving} disabled={draft.length === 0}>
              Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="synonym-item__chips">
            {item.synonyms.map(s => <span key={s} className="synonym-chip">{s}</span>)}
          </div>
          <div className="synonym-item__actions">
            <Button variant="ghost" size="sm" onClick={startEdit}>Modifier</Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>Supprimer</Button>
          </div>
        </>
      )}
    </li>
  );
}

// ── Modal de création ───────────────────────────────────────────

function CreateSynonymModal({
  existingTerms, onClose, onCreate,
}: {
  existingTerms: string[];
  onClose:       () => void;
  onCreate:      (term: string, synonyms: string[]) => Promise<void>;
}) {
  const [term,     setTerm]     = useState('');
  const [synonyms, setSynonyms] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const trimmed = term.trim();
  const canSubmit = trimmed.length > 0 && synonyms.length > 0 && !existingTerms.includes(trimmed.toLowerCase());

  const submit = useCallback(async () => {
    if (!canSubmit) {
      if (existingTerms.includes(trimmed.toLowerCase())) {
        setError('Un synonyme existe déjà pour ce terme. Modifiez-le plutôt que d\'en créer un autre.');
      }
      return;
    }
    setSaving(true);
    setError(null);
    await onCreate(trimmed, synonyms);
    setSaving(false);
  }, [canSubmit, trimmed, synonyms, existingTerms, onCreate]);

  return (
    <Modal
      title="Ajouter un synonyme"
      onClose={onClose}
      asForm
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={!canSubmit}>
            Ajouter le synonyme
          </Button>
        </>
      }
    >
      <Input
        id="synonym-term"
        type="text"
        label="Terme principal"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Par exemple : annulation"
        autoFocus
      />
      <div className="field">
        <label htmlFor="synonym-group-new" className="field-label">Synonymes</label>
        <ChipsInput id="synonym-group-new" value={synonyms} onChange={setSynonyms} placeholder="Par exemple : résiliation, désabonnement…" />
        <p className="field-helper">
          La correspondance fonctionne dans les deux sens : une recherche sur l'un de ces termes
          remontera aussi les contenus qui contiennent les autres termes du groupe.
        </p>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </Modal>
  );
}
