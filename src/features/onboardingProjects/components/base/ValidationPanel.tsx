import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../../shared/components/ui/Button';
import { useToast } from '../../../../shared/lib/useToast';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import { revalidationLabel, type Review, type SectionFix, type ValidationSummary } from '../../lib/correction';
import { AuthorName } from './AuthorName';

interface ValidationPanelProps {
  projectId:    string;
  correctionId: string;
  /** Les avis courants : leur changement relit l'état des versions validées. */
  reviews:      ReadonlyMap<string, Review>;
  /** Les textes de section courants : leur changement aussi (plan v4, point 10). */
  fixes?:       ReadonlyMap<string, SectionFix>;
  /** Éléments à relire : modifications appliquées et conventions. */
  toReview:     number;
  /** Dernière correction réussie : elle se valide ; sinon, ses versions se consultent. */
  editable:     boolean;
  onOpen:       (validationId: string) => void;
  /** « Créer la base de connaissance », proposé sur la version validée à jour ; absent : pas de bouton. */
  onCreateKnowledgeBase?: (validationId: string) => void;
  /** Le bas de la relecture, où le bouton est repris (plan v4, point 7) ; null : pas repris. */
  footer?:      HTMLElement | null;
}

/**
 * En tête de la relecture : « Valider la nouvelle base » quand chaque modification et chaque
 * convention a un avis (les commentaires ne comptent pas), sinon le nombre d'avis qui restent.
 * Une fois validée : la version propre ; un avis ou un texte de section changé depuis demande de
 * revalider, en disant ce qui a changé. Les versions validées restent consultables. Quand tous
 * les avis sont donnés, le bouton est repris en bas de la relecture (`footer`), avec ce qu'il
 * fait. L'état reste ici : la relecture n'est pas rendue de nouveau à chaque avis.
 */
export function ValidationPanel({
  projectId, correctionId, reviews, fixes, toReview, editable, onOpen, onCreateKnowledgeBase, footer = null,
}: ValidationPanelProps) {
  const toast = useToast();
  const [validations, setValidations] = useState<ValidationSummary[] | null>(null);
  const [validating, setValidating] = useState(false);
  /** Une validation en cours : les deux boutons (haut et bas) n'en lancent pas une seconde. */
  const sending = useRef(false);

  const load = useCallback(async () => {
    setValidations(await onboardingApi.listValidations(projectId, correctionId));
  }, [projectId, correctionId]);

  useEffect(() => { load().catch(() => setValidations([])); }, [load, reviews, fixes]);

  const reviewed = [...reviews.values()].filter(r => r.verdict !== null).length;
  const left = Math.max(0, toReview - reviewed);
  const latest = validations?.[0] ?? null;

  const validate = async () => {
    if (sending.current) return;
    sending.current = true;
    setValidating(true);
    try {
      const v = await onboardingApi.validateBase(projectId, correctionId);
      onOpen(v.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
      void load().catch(() => {});
    } finally {
      sending.current = false;
      setValidating(false);
    }
  };

  if (validations === null) return null;
  const validateButton = (
    <Button variant="primary" size="md" loading={validating} onClick={validate}>Valider la nouvelle base</Button>
  );
  const leftLine = <span className="obp-muted">Encore {left} avis à donner avant de valider la nouvelle base.</span>;
  const bottom = editable && left === 0 && !latest?.upToDate && footer !== null && createPortal(
    <section className="obp-base-validation obp-base-validation--bottom" aria-label="Valider la nouvelle base">
      <div className="obp-arb-entry">
        <span>Tous les avis sont donnés : validez pour obtenir la version finale.</span>
        {validateButton}
      </div>
    </section>,
    footer,
  );

  return (
    <section className="obp-base-validation" aria-label="Validation de la nouvelle base">
      {latest && latest.upToDate ? (
        <div className="obp-arb-entry">
          <span>
            Validée par <AuthorName name={latest.validatedByName} authorId={latest.validatedById} /> le {formatFull(latest.validatedAt)}.
          </span>
          <Button variant="primary" size="md" onClick={() => onOpen(latest.id)}>Voir la version validée</Button>
          {onCreateKnowledgeBase && (
            <Button variant="secondary" size="md" onClick={() => onCreateKnowledgeBase(latest.id)}>Créer la base de connaissance</Button>
          )}
        </div>
      ) : (
        <div className="obp-arb-entry">
          {latest && <span role="status">{revalidationLabel(latest, formatFull(latest.validatedAt))}</span>}
          {editable && (left === 0 ? validateButton : leftLine)}
        </div>
      )}
      {validations.length > 0 && (
        <details className="obp-base-validation__history">
          <summary>Versions validées ({validations.length})</summary>
          <ul>
            {validations.map(v => (
              <li key={v.id}>
                <button type="button" className="obp-link" onClick={() => onOpen(v.id)}>
                  Version {v.version}, validée par {v.validatedByName} le {formatFull(v.validatedAt)}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {bottom}
    </section>
  );
}
