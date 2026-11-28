import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { Button }   from '../../../shared/components/ui/Button';
import { Alert }    from '../../../shared/components/ui/Alert';
import { ActionBarContent } from '../../../shared/components/ui/ActionBar';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { KnowDeskMention } from '../../../shared/components/ui/Origin';
import { useToast } from '../../../shared/lib/useToast';
import { usePolling } from '../../../shared/lib/usePolling';
import { onboardingApi } from '../api/onboardingApi';
import {
  actionNote, attentionSentence, CLASSIFICATION_POLL_MS, displayName, documentsCount, documentsView, foldedGroups,
  LIST_MENTION, showAllLabel, sortedTypes, summaryParts,
} from '../lib/documents';
import { DocumentItem, RemoveButton } from './DocumentItem';
import { NoticeGate, NoticeReminder } from './NoticeGate';
import { UploadZone } from './UploadZone';
import type {
  DocumentPatch, DocumentTypeDef, ImportSummary, OnboardingDocument, OnboardingNotice, OnboardingProject,
} from '../types';

interface DocumentsTabProps {
  project:   OnboardingProject;
  /** Les documents ont changé : le projet relit son statut. */
  onChanged: () => void;
  /** « Continuer vers le contexte métier » ; absent : la barre de la page propose la suite. */
  onContinue?: () => void;
}

/** Focalise un élément de la page (lien de la synthèse vers un document illisible). */
function focusElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView?.({ block: 'center' });
  el.focus();
}

/**
 * Étape 1 « Documents » (US 1.1 à 1.3, maquette Documents.dc.html) : ce qui est utile, import,
 * synthèse de l'import, documents classés par type (type, usage, date modifiables), illisibles à
 * part. La liste se relit tant qu'un classement est en cours. Rien ne bloque la suite : ni une
 * date absente, ni un document « À vérifier ».
 */
export function DocumentsTab({ project, onChanged, onContinue }: DocumentsTabProps) {
  const toast = useToast();
  const [notice,    setNotice]    = useState<OnboardingNotice | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocument[] | null>(null);
  const [types,     setTypes]     = useState<DocumentTypeDef[]>(() => sortedTypes(null));
  const [summary,   setSummary]   = useState<ImportSummary | null>(null);
  const [showAll,   setShowAll]   = useState(false);
  const [removing,  setRemoving]  = useState<OnboardingDocument | null>(null);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([onboardingApi.getNotice(), onboardingApi.listDocuments(project.id)])
      .then(([n, docs]) => { if (alive) { setNotice(n); setDocuments(docs); } })
      .catch(err => {
        if (!alive) return;
        setDocuments([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger les documents. Rechargez la page.');
      });
    // Les libellés des types : repli silencieux sur la liste figée du contrat.
    onboardingApi.listDocumentTypes(project.id)
      .then(list => { if (alive) setTypes(sortedTypes(list)); })
      .catch(() => { /* liste figée */ });
    return () => { alive = false; };
  }, [project.id, toast]);

  const view = useMemo(() => documentsView(documents ?? [], types), [documents, types]);
  const classifying = view.pending.length > 0;

  // Classement en arrière-plan : la liste se relit tant qu'il reste des documents à classer.
  const refresh = useCallback(async () => {
    const docs = await onboardingApi.listDocuments(project.id);
    setDocuments(docs);
  }, [project.id]);
  usePolling(refresh, CLASSIFICATION_POLL_MS, classifying);

  const handleUploaded = useCallback((created: OnboardingDocument[], s: ImportSummary | null) => {
    setDocuments(prev => [...(prev ?? []), ...created]);
    setSummary(s);
    onChanged();
  }, [onChanged]);

  const reloadNotice = useCallback(() => {
    onboardingApi.getNotice()
      .then(setNotice)
      .catch(err => toast.error(err instanceof Error ? err.message : 'Impossible de charger le texte d\'information. Rechargez la page.'));
  }, [toast]);

  const update = useCallback(async (doc: OnboardingDocument, patch: DocumentPatch) => {
    try {
      const saved = await onboardingApi.updateDocument(project.id, doc.id, patch);
      setDocuments(prev => (prev ?? []).map(d => d.id === saved.id ? saved : d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La modification n\'a pas été enregistrée. Réessayez.');
      throw err;
    }
  }, [project.id, toast]);

  /**
   * Retrait d'un document, tant qu'aucune analyse ne l'a figé. Un refus du
   * back (DOCUMENT_LOCKED, document cité par la fiche de cadrage…) est
   * affiché tel quel.
   */
  const confirmRemove = async () => {
    if (!removing) return;
    setDeleting(true);
    try {
      await onboardingApi.deleteDocument(project.id, removing.id);
      setDocuments(prev => (prev ?? []).filter(d => d.id !== removing.id));
      toast.success(`« ${displayName(removing)} » a été retiré.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Le document n\'a pas pu être retiré. Réessayez.');
    } finally {
      setDeleting(false);
      setRemoving(null);
    }
  };

  const continueBar = (
    <ActionBarContent note={actionNote(view)}>
      {onContinue && (
        <Button variant="primary" size="md" onClick={onContinue}>
          Continuer vers le contexte métier<ArrowRight size={16} aria-hidden="true" />
        </Button>
      )}
    </ActionBarContent>
  );

  if (!notice || !documents) {
    return <Skeleton className="obp-skeleton-block" />;
  }

  const folded = foldedGroups(view.groups);
  const shownGroups = showAll ? view.groups : view.groups.filter(g => !folded.has(g.key));
  const hiddenGroups = view.groups.filter(g => folded.has(g.key));
  const attention = attentionSentence(view.toVerify, view.withoutDate);
  const parts = summaryParts(summary);
  const total = view.readable.length;

  const item = (d: OnboardingDocument) => (
    <DocumentItem key={d.id} document={d} types={types} onUpdate={patch => update(d, patch)} onRemove={() => setRemoving(d)} />
  );

  return (
    <>
      <section aria-labelledby="obp-useful-title" className="obp-useful">
        <h2 id="obp-useful-title" className="obp-useful__title">Ce qui est utile</h2>
        <ul className="obp-useful__list" role="list">
          {types.map(t => <li key={t.key} className="obp-useful__chip">{t.name}</li>)}
        </ul>
      </section>

      {notice.acceptedAt ? (
        <>
          <UploadZone project={project} onUploaded={handleUploaded} onNoticeRequired={reloadNotice} />
          <NoticeReminder notice={notice} />
        </>
      ) : (
        <NoticeGate notice={notice} onChange={setNotice} />
      )}

      <section aria-labelledby="obp-docs-title" className="obp-doclist">
        <div className="obp-doclist__head">
          <div className="obp-doclist__heading">
            <h2 id="obp-docs-title" className="obp-doclist__title">
              {classifying ? documentsCount(total) : `${total} ${total > 1 ? 'documents classés' : 'document classé'}`}
            </h2>
            {total > 0 && <KnowDeskMention>{LIST_MENTION}</KnowDeskMention>}
          </div>
          {parts.length > 0 && (
            <p className="obp-doclist__summary" role="status">
              {parts.map((p, i) => (
                <React.Fragment key={p.text}>
                  {i > 0 && ' · '}
                  {p.linkTo
                    ? <button type="button" className="obp-link-button" onClick={() => focusElement(`obp-doc-${p.linkTo}`)}>{p.text}</button>
                    : p.text}
                </React.Fragment>
              ))}
            </p>
          )}
        </div>

        {total > 0 && (
          <p className="obp-doclist__help">
            L'usage indique si un document peut servir à répondre aux clients. Le contenu d'un document <strong>interne</strong> ne
            sera repris que dans les parties réservées aux conseillers.
          </p>
        )}

        {classifying && (
          <p className="obp-doclist__classifying" role="status">
            Classement en cours : {total - view.pending.length} sur {documentsCount(total)} classés. La liste se met à jour toute seule.
          </p>
        )}

        {attention && <Alert tone="warning" role="note">{attention}</Alert>}

        {total === 0 && view.unreadable.length === 0 && <p className="obp-muted">Aucun document pour l'instant.</p>}

        {view.pending.length > 0 && (
          <DocumentGroupCard title="En cours de classement" count={view.pending.length}>{view.pending.map(item)}</DocumentGroupCard>
        )}
        {view.untyped.length > 0 && (
          <DocumentGroupCard title="Type à choisir" count={view.untyped.length}>{view.untyped.map(item)}</DocumentGroupCard>
        )}
        {shownGroups.map(g => (
          <DocumentGroupCard key={g.key} title={g.name} count={g.docs.length}>{g.docs.map(item)}</DocumentGroupCard>
        ))}
        {!showAll && hiddenGroups.length > 0 && (
          <button type="button" className="obp-link-button obp-doclist__more" onClick={() => setShowAll(true)}>
            {showAllLabel(hiddenGroups)}
          </button>
        )}

        {view.unreadable.length > 0 && (
          <section aria-labelledby="obp-unreadable-title" className="obp-doc-group">
            <div className="obp-doc-group__head">
              <h3 id="obp-unreadable-title" className="obp-doc-group__title">Documents illisibles</h3>
              <span className="obp-doc-group__count">{documentsCount(view.unreadable.length)}</span>
            </div>
            <p className="obp-doc-group__note">
              Ces documents n'ont pas pu être lus : ils ne serviront pas à l'analyse. Retirez-les, ou importez-en une version lisible.
            </p>
            <ul className="obp-doc-group__list" role="list">
              {view.unreadable.map(d => (
                <li key={d.id} id={`obp-doc-${d.id}`} tabIndex={-1} className="obp-doc-item" aria-label={d.filename}>
                  <div className="obp-doc-item__main">
                    <span className="obp-doc-item__title">{d.filename}</span>
                  </div>
                  <div className="obp-doc-item__controls">
                    <RemoveButton document={d} onRemove={() => setRemoving(d)} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      {continueBar}

      {removing && (
        <ConfirmDialog
          title="Retirer ce document ?"
          description={`« ${displayName(removing)} » sera supprimé du projet. Vous pourrez l'importer à nouveau.`}
          confirmLabel="Retirer le document"
          variant="danger"
          loading={deleting}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </>
  );
}

function DocumentGroupCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="obp-doc-group" aria-label={title}>
      <div className="obp-doc-group__head">
        <h3 className="obp-doc-group__title">{title}</h3>
        <span className="obp-doc-group__count">{documentsCount(count)}</span>
      </div>
      <ul className="obp-doc-group__list" role="list">{children}</ul>
    </section>
  );
}
