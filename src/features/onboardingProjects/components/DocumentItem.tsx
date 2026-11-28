import React, { useState } from 'react';
import { CalendarDays, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { Select } from '../../../shared/components/ui/Select';
import { Badge } from '../../../shared/components/ui/StatusBadge';
import { dateLine, displayName, isPending, USAGE_LABEL } from '../lib/documents';
import type { DocumentPatch, DocumentTypeDef, DocumentTypeKey, DocumentUsage, OnboardingDocument } from '../types';

interface DocumentItemProps {
  document: OnboardingDocument;
  types:    readonly DocumentTypeDef[];
  /** Envoie la correction ; rejette en cas d'échec (le message est déjà affiché). */
  onUpdate: (patch: DocumentPatch) => Promise<void>;
  onRemove: () => void;
}

const removeTitle = (d: OnboardingDocument) => d.locked ? 'Utilisé par une analyse : il ne peut plus être retiré.' : undefined;

/** Bouton « Retirer » (corbeille ; confirmation par l'écran). */
export function RemoveButton({ document: d, onRemove }: Pick<DocumentItemProps, 'document' | 'onRemove'>) {
  return (
    <Button
      variant="ghost" size="sm" disabled={d.locked} title={removeTitle(d)}
      aria-label={`Retirer ${d.filename}`} onClick={onRemove}
    >
      <Trash2 size={16} aria-hidden="true" />Retirer
    </Button>
  );
}

/**
 * Un document lu (US 1.2, 1.3) : titre lisible et nom du fichier, badge « À vérifier » et
 * « Confirmer le type », ligne de date et sélecteur sur place, menus Usage et Type de document.
 * Pendant son classement, seuls le nom et « Classement en cours… » s'affichent.
 */
export function DocumentItem({ document: d, types, onUpdate, onRemove }: DocumentItemProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [draftDate,   setDraftDate]   = useState('');
  const [busy,        setBusy]        = useState(false);
  const name = displayName(d);
  const pending = isPending(d);

  const send = async (patch: DocumentPatch, after?: () => void) => {
    setBusy(true);
    try {
      await onUpdate(patch);
      after?.();
    } catch { /* l'écran a affiché l'erreur ; la valeur d'origine reste */ } finally {
      setBusy(false);
    }
  };

  const openDate = () => { setDraftDate(d.date ?? ''); setEditingDate(true); };
  const saveDate = () => {
    const value = draftDate || null;
    if (value === d.date) { setEditingDate(false); return; }
    void send({ date: value }, () => setEditingDate(false));
  };

  const line = dateLine(d);

  return (
    <li className="obp-doc-item" id={`obp-doc-${d.id}`} aria-label={name}>
      <div className="obp-doc-item__main">
        <span className="obp-doc-item__title">
          {name}
          {!pending && d.toVerify && (
            <>
              <Badge tone="warning">À vérifier</Badge>
              {d.documentType && (
                <button
                  type="button" className="obp-link-button" disabled={busy}
                  aria-label={`Confirmer le type de ${name}`}
                  onClick={() => void send({ documentType: d.documentType as DocumentTypeKey })}
                >
                  Confirmer le type
                </button>
              )}
            </>
          )}
        </span>
        {d.title?.trim() && <span className="obp-doc-item__file">{d.filename}</span>}
        {d.locked && <span className="obp-doc-item__file">Utilisé par une analyse</span>}

        {pending ? (
          <span className="obp-doc-item__pending">Classement en cours…</span>
        ) : editingDate ? (
          <span className="obp-doc-item__date-edit">
            <label className="obp-doc-item__date-label">
              Date du document
              <input
                type="date" className="obp-date-input" value={draftDate}
                onChange={e => setDraftDate(e.target.value)} disabled={busy}
              />
            </label>
            <Button variant="primary" size="sm" loading={busy} onClick={saveDate}>Enregistrer</Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditingDate(false)}>Annuler</Button>
          </span>
        ) : (
          <span className="obp-doc-item__date">
            <CalendarDays size={14} aria-hidden="true" className="obp-doc-item__date-icon" />
            {line.date
              ? <span className="obp-doc-item__date-value">{line.date}</span>
              : <span className="obp-doc-item__no-date">Aucune date trouvée</span>}
            {line.origin && <span className="obp-doc-item__date-origin">{` · ${line.origin}`}</span>}
            {line.date ? ' · ' : ' '}
            <button
              type="button" className="obp-link-button" onClick={openDate}
              aria-label={line.action === 'Modifier' ? `Modifier la date de ${name}` : `Ajouter une date à ${name} (facultatif)`}
            >
              {line.action}
            </button>
          </span>
        )}
      </div>

      <div className="obp-doc-item__controls">
        {!pending && (
          <>
            <label className="obp-doc-item__control">
              Usage
              <Select
                value={d.usage ?? ''} disabled={busy}
                onChange={e => void send({ usage: e.target.value as DocumentUsage })}
              >
                {!d.usage && <option value="" disabled>Choisir</option>}
                {(Object.keys(USAGE_LABEL) as DocumentUsage[]).map(u => <option key={u} value={u}>{USAGE_LABEL[u]}</option>)}
              </Select>
            </label>
            <label className="obp-doc-item__control">
              Type de document
              <Select
                value={d.documentType ?? ''} disabled={busy}
                onChange={e => void send({ documentType: e.target.value as DocumentTypeKey })}
              >
                {!d.documentType && <option value="" disabled>Choisir un type</option>}
                {types.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
              </Select>
            </label>
          </>
        )}
        <RemoveButton document={d} onRemove={onRemove} />
      </div>
    </li>
  );
}
