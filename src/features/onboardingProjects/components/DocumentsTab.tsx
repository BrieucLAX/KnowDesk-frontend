import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';
import { useToast } from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { onboardingApi } from '../api/onboardingApi';
import { formatBytes } from '../lib/format';
import { NoticeGate, NoticeReminder } from './NoticeGate';
import type { OnboardingDocument, OnboardingNotice, OnboardingProject } from '../types';

interface DocumentsTabProps {
  project:   OnboardingProject;
  /** Les documents ont changé : le projet relit ses compteurs. */
  onChanged: () => void;
}

const FORMAT_LABEL: Record<OnboardingDocument['format'], string> = { pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint' };

/** Documents du projet : texte d'information, import, liste. */
export function DocumentsTab({ project }: DocumentsTabProps) {
  const toast = useToast();
  const [notice,    setNotice]    = useState<OnboardingNotice | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocument[] | null>(null);

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

  if (!notice || !documents) {
    return <Skeleton className="obp-skeleton-block" />;
  }

  return (
    <>
      {notice.acceptedAt ? <NoticeReminder notice={notice} /> : <NoticeGate notice={notice} onChange={setNotice} />}

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
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
