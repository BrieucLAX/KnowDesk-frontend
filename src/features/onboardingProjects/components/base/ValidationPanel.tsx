import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { useToast } from '../../../../shared/lib/useToast';
import { getErrorMessage } from '../../../../shared/lib/apiErrors';
import { formatFull } from '../../../../shared/lib/formatDate';
import { onboardingApi } from '../../api/onboardingApi';
import type { Review, ValidationSummary } from '../../lib/correction';

interface ValidationPanelProps {
  projectId:    string;
  correctionId: string;
  /** Les avis courants : leur changement relit l'état des versions validées. */
  reviews:      ReadonlyMap<string, Review>;
  /** Éléments à relire : modifications appliquées et conventions. */
  toReview:     number;
  /** Dernière correction réussie : elle se valide ; sinon, ses versions se consultent. */
  editable:     boolean;
  onOpen:       (validationId: string) => void;
}

/**
 * En tête de la relecture : « Valider la nouvelle base » quand chaque modification et chaque
 * convention a un avis (les commentaires ne comptent pas), sinon le nombre d'avis qui restent.
 * Une fois validée : la version propre ; un avis changé depuis demande de revalider. Les versions
 * validées restent consultables.
 */
export function ValidationPanel({ projectId, correctionId, reviews, toReview, editable, onOpen }: ValidationPanelProps) {
  const toast = useToast();
  const [validations, setValidations] = useState<ValidationSummary[] | null>(null);
  const [validating, setValidating] = useState(false);

  const load = useCallback(async () => {
    setValidations(await onboardingApi.listValidations(projectId, correctionId));
  }, [projectId, correctionId]);

  useEffect(() => { load().catch(() => setValidations([])); }, [load, reviews]);

  const reviewed = [...reviews.values()].filter(r => r.verdict !== null).length;
  const left = Math.max(0, toReview - reviewed);
  const latest = validations?.[0] ?? null;

  const validate = async () => {
    setValidating(true);
    try {
      const v = await onboardingApi.validateBase(projectId, correctionId);
      onOpen(v.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
      void load().catch(() => {});
    } finally {
      setValidating(false);
    }
  };

  if (validations === null) return null;
  const validateButton = (
    <Button variant="primary" size="md" loading={validating} onClick={validate}>Valider la nouvelle base</Button>
  );
  const leftLine = <span className="obp-muted">Encore {left} avis à donner avant de valider la nouvelle base.</span>;

  return (
    <section className="obp-base-validation" aria-label="Validation de la nouvelle base">
      {latest && latest.upToDate ? (
        <div className="obp-arb-entry">
          <span>Validée par {latest.validatedByName} le {formatFull(latest.validatedAt)}.</span>
          <Button variant="primary" size="md" onClick={() => onOpen(latest.id)}>Voir la version validée</Button>
        </div>
      ) : (
        <div className="obp-arb-entry">
          {latest && (
            <span role="status">
              Vos avis ont changé depuis la version validée du {formatFull(latest.validatedAt)} : revalidez pour mettre à jour la version propre.
            </span>
          )}
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
    </section>
  );
}
