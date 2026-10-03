import React, { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { Button }   from '../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { useToast } from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { onboardingApi } from '../api/onboardingApi';
import { formatBytes } from '../lib/format';
import { NoticeGate, NoticeReminder } from './NoticeGate';
import { UploadZone } from './UploadZone';
import type { OnboardingDocument, OnboardingNotice, OnboardingProject } from '../types';

interface DocumentsTabProps {
  project:   OnboardingProject;
  /** Les documents ont changé : le projet relit ses compteurs. */
  onChanged: () => void;
}

const FORMAT_LABEL: Record<OnboardingDocument['format'], string> = {
  pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint', md: 'Markdown', zip: 'Export Notion (.zip)',
};

/** Documents du projet : texte d'information, import, liste, retrait. */
export function DocumentsTab({ project, onChanged }: DocumentsTabProps) {
  const toast = useToast();
  const [notice,    setNotice]    = useState<OnboardingNotice | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocument[] | null>(null);
  const [removing,  setRemoving]  = useState<OnboardingDocument | null>(null);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([onboardingApi.getNotice(), onboardingApi.listDocuments(project.id)])
      .then(([n, docs]) => { if (alive) { setNotice(n); setDocuments(docs); } })
      .catch(err => {
        if (!alive) return;
        setDocuments([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger les documents.');
      });
    return () => { alive = false; };
  }, [project.id, toast]);

  const handleUploaded = useCallback((created: OnboardingDocument[]) => {
    setDocuments(prev => [...(prev ?? []), ...created]);
    onChanged();
  }, [onChanged]);

  const reloadNotice = useCallback(() => {
    onboardingApi.getNotice()
      .then(setNotice)
      .catch(err => toast.error(err instanceof Error ? err.message : 'Impossible de charger le texte d\'information.'));
  }, [toast]);

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
      toast.success(`« ${removing.filename} » a été retiré.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrait impossible.');
    } finally {
      setDeleting(false);
      setRemoving(null);
    }
  };

  if (!notice || !documents) {
    return <Skeleton className="obp-skeleton-block" />;
  }

  return (
    <>
      {notice.acceptedAt ? (
        <>
          <UploadZone project={project} onUploaded={handleUploaded} onNoticeRequired={reloadNotice} />
          <NoticeReminder notice={notice} />
        </>
      ) : (
        <NoticeGate notice={notice} onChange={setNotice} />
      )}

      <section aria-labelledby="obp-docs-title">
        <h2 id="obp-docs-title" className="obp-section-title">
          Documents importés <span className="obp-count">{documents.length}</span>
        </h2>
        {documents.length === 0 ? (
          <p className="obp-muted">Aucun document pour l'instant.</p>
        ) : (
          <ul className="obp-docs" role="list">
            {documents.map(d => (
              <li key={d.id} className="obp-doc">
                <span className="obp-doc__name">{d.filename}</span>
                <span className="obp-doc__meta">
                  {FORMAT_LABEL[d.format]} · {formatBytes(d.sizeBytes)} · importé {formatRelative(d.createdAt)}
                  {d.locked && ' · utilisé par une analyse'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={d.locked}
                  title={d.locked ? 'Utilisé par une analyse : il ne peut plus être retiré.' : undefined}
                  aria-label={`Retirer ${d.filename}`}
                  onClick={() => setRemoving(d)}
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {removing && (
        <ConfirmDialog
          title="Retirer ce document ?"
          description={`« ${removing.filename} » sera supprimé du projet. Vous pourrez l'importer à nouveau.`}
          confirmLabel="Retirer"
          variant="danger"
          loading={deleting}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </>
  );
}
