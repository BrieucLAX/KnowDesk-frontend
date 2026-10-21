import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { Skeleton } from '../../../../shared/components/ui/Skeleton';
import { useToast } from '../../../../shared/lib/useToast';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import { parseLines, type Block } from '../../lib/baseDocument';
import type { Validation } from '../../lib/correction';
import { AuditImagesContext, type AuditImages } from '../audit/AuditSource';
import { BaseLines } from './BaseLines';
import { isUpToDateValidation } from '../knowledgeBase/KnowledgeBaseCreationView';

interface CleanBaseViewProps {
  projectId:    string;
  validationId: string;
  /** Revenir à la relecture (onglet « Nouvelle base »). */
  onBack:       () => void;
  /** « Créer la base de connaissance », proposé si cette version est la version validée à jour. */
  onCreateKnowledgeBase?: (validationId: string) => void;
}

const anchor = (i: number) => `obp-clean-fiche-${i + 1}`;

/**
 * La version propre d'une base validée : le texte final assemblé par le back, fiche par fiche,
 * avec ses titres d'origine, ses tableaux et ses images. En tête, une seule ligne « Validée par …
 * le … » et le retour à la relecture ; puis un sommaire cliquable. Aucun badge, raison, numéro de
 * modification ni code. « Imprimer / PDF » s'appuie sur la feuille d'impression du module.
 */
export function CleanBaseView({ projectId, validationId, onBack, onCreateKnowledgeBase }: CleanBaseViewProps) {
  const toast = useToast();
  const [validation, setValidation] = useState<Validation | null>(null);
  const [failed, setFailed] = useState(false);
  const [imageIds, setImageIds] = useState<ReadonlySet<string>>(new Set());
  /** La version validée à jour : seule elle propose « Créer la base de connaissance ». */
  const [upToDate, setUpToDate] = useState(false);
  const offerKnowledgeBase = onCreateKnowledgeBase !== undefined;

  useEffect(() => {
    let cancelled = false;
    setValidation(null);
    setFailed(false);
    setUpToDate(false);
    onboardingApi.getValidation(projectId, validationId)
      .then(v => {
        if (cancelled) return;
        setValidation(v);
        onboardingApi.listAuditImages(projectId, v.analysisId)
          .then(list => { if (!cancelled) setImageIds(new Set(list.map(i => i.imageId))); })
          .catch(() => {});
        if (offerKnowledgeBase) {
          isUpToDateValidation(projectId, v)
            .then(ok => { if (!cancelled) setUpToDate(ok); })
            .catch(() => {});
        }
      })
      .catch(err => {
        if (cancelled) return;
        setFailed(true);
        toast.error(getErrorMessage(err));
      });
    return () => { cancelled = true; };
  }, [projectId, validationId, toast, offerKnowledgeBase]);

  const analysisId = validation?.analysisId ?? '';
  const loadImage = useCallback(
    (imageId: string) => onboardingApi.getAuditImage(projectId, analysisId, imageId),
    [projectId, analysisId],
  );
  const images = useMemo<AuditImages>(() => ({ available: imageIds, load: loadImage }), [imageIds, loadImage]);
  const sheets = useMemo(
    () => (validation?.content.sheets ?? []).map(s => ({
      ...s, blocks: parseLines(s.markdown).map((line): Block => ({ op: 'equal', line })),
    })),
    [validation],
  );

  const back = <button type="button" className="obp-link" onClick={onBack}>Revenir à la relecture</button>;
  if (failed) return <div className="obp-clean">{back}</div>;
  if (!validation) return <Skeleton className="obp-skeleton-block" />;

  const goTo = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(anchor(i))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AuditImagesContext.Provider value={images}>
      <article className="obp-clean">
        <header className="obp-clean-head">
          <p>
            Validée par {validation.validatedByName} le {formatFull(validation.validatedAt)}
            <span className="obp-clean-noprint"> · {back}</span>
          </p>
          <span className="obp-clean-actions obp-clean-noprint">
            {onCreateKnowledgeBase && upToDate && (
              <Button variant="primary" size="sm" onClick={() => onCreateKnowledgeBase(validation.id)}>Créer la base de connaissance</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Imprimer / PDF
            </Button>
          </span>
        </header>

        <nav className="obp-clean-toc" aria-label="Sommaire">
          <p className="obp-clean-toc__title">Sommaire</p>
          <ol>
            {sheets.map((s, i) => (
              <li key={s.documentId}><a href={`#${anchor(i)}`} onClick={goTo(i)}>{s.title}</a></li>
            ))}
          </ol>
        </nav>

        {sheets.map((s, i) => (
          <section key={s.documentId} id={anchor(i)} className="obp-clean-sheet" aria-label={s.title}>
            <BaseLines blocks={s.blocks} />
          </section>
        ))}
      </article>
    </AuditImagesContext.Provider>
  );
}
