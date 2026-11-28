import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { ActionBarContent } from '../../../shared/components/ui/ActionBar';
import { useToast } from '../../../shared/lib/useToast';
import { ApiError } from '../../../shared/lib/apiClient';
import { onboardingApi } from '../api/onboardingApi';
import { analysisFailureMessage, isAnalysisActive } from '../lib/analysisStatus';
import { isCorpusTooLarge } from '../lib/volume';
import type { OnboardingAnalysis, OnboardingProject } from '../types';

/** La note de la barre d'action à l'étape 2 (US 2.1). L'e-mail de fin viendra au lot 2. */
export const ANALYSIS_NOTE = 'L\'analyse prend jusqu\'à une heure. Nous vous prévenons par e-mail.';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Les réponses données sur l'analyse précédente ne suivent pas sur la nouvelle (Q2, inchangé). */
function answersNotice(count: number | null): string {
  if (count === 0) return '';
  if (count === null) return 'Vos réponses aux questions actuelles restent consultables, mais ne seront pas reprises par la nouvelle analyse. ';
  return `${count > 1 ? `Vos ${count} réponses restent consultables` : 'Votre réponse reste consultable'} avec les questions actuelles, `
    + `mais ${count > 1 ? 'ne seront pas reprises' : 'ne sera pas reprise'} par la nouvelle analyse. `;
}

/** Suite du message d'échec, sans quota (règle transverse 4). */
function failureNote(code: string | null): string {
  if (code === 'corpus_too_large') return 'Retirez des documents à l\'étape « Documents » avant de la relancer.';
  if (code === 'provider_auth' || code === 'pipeline_invalid_error_code') return 'Nous sommes prévenus.';
  return 'Vous pouvez la relancer.';
}

interface AnalysisLaunchProps {
  project:    OnboardingProject;
  /** La fiche a des modifications non enregistrées : l'enregistrement passe d'abord. */
  disabled?:  boolean;
  /** L'analyse est lancée : la page relit le projet et ouvre l'étape 3. */
  onLaunched: () => void;
}

/**
 * Étape 2, action principale (lot 1 « Socle ») : « Valider et lancer l'analyse » lance l'analyse
 * existante, avec la confirmation existante. Plus d'onglet Analyse : ni quota, ni historique, ni
 * appels à l'IA (règle transverse 4). Une analyse interrompue se dit ici, d'où l'on relance.
 */
export function AnalysisLaunch({ project, disabled = false, onLaunched }: AnalysisLaunchProps) {
  const toast = useToast();
  const [analyses,   setAnalyses]   = useState<OnboardingAnalysis[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [checking,   setChecking]   = useState(false);
  const [launching,  setLaunching]  = useState(false);
  const [launchError, setLaunchError] = useState('');
  /** Réponses sur l'analyse actuelle, relues à l'ouverture de la confirmation ; null : inconnu. */
  const [answersCount, setAnswersCount] = useState<number | null>(0);
  useEffect(() => { setLaunchError(''); }, [project.documentsCount, project.textChars]);

  const load = useCallback(async () => {
    const { data } = await onboardingApi.listAnalyses(project.id);
    setAnalyses(data);
  }, [project.id]);

  useEffect(() => {
    load().catch(() => setAnalyses([]));   // la barre reste utilisable ; le back refusera s'il le faut
  }, [load]);

  const latest = analyses?.[0] ?? null;
  const active = latest !== null && isAnalysisActive(latest);

  const askLaunch = async () => {
    const audited = analyses?.find(a => a.status === 'succeeded');
    if (!audited) { setAnswersCount(0); setConfirming(true); return; }
    setChecking(true);
    try {
      setAnswersCount((await onboardingApi.listDecisions(project.id, audited.id)).decisions.length);
    } catch {
      setAnswersCount(null);
    } finally {
      setChecking(false);
      setConfirming(true);
    }
  };

  const launch = async () => {
    setLaunching(true);
    setLaunchError('');
    try {
      await onboardingApi.launchAnalysis(project.id);
      setConfirming(false);
      onLaunched();
    } catch (err) {
      setConfirming(false);
      if (err instanceof ApiError && err.code === 'CORPUS_TOO_LARGE') setLaunchError(err.message);
      else toast.error(err instanceof Error ? err.message : 'Impossible de lancer l\'analyse. Réessayez.');
      void load().catch(() => {});
    } finally {
      setLaunching(false);
    }
  };

  const blocker =
    project.documentsCount === 0 ? 'Importez au moins un document pour lancer l\'analyse.'
    : project.cadrageVersion === null ? 'Enregistrez la fiche de cadrage pour lancer l\'analyse.'
    : active ? 'L\'analyse est en cours : nous vous prévenons par e-mail quand elle est terminée.'
    : isCorpusTooLarge(project) ? 'Les documents dépassent ce qu\'une analyse peut lire : retirez-en à l\'étape « Documents ».'
    : null;

  return (
    <>
      {latest?.status === 'failed' && (
        <p className="obp-alert" role="alert">
          La dernière analyse n'a pas abouti. {analysisFailureMessage(latest.errorCode)} {failureNote(latest.errorCode)}
        </p>
      )}
      {launchError && <p className="obp-alert" role="alert">{launchError}</p>}
      {!disabled && (
        <ActionBarContent note={blocker ?? ANALYSIS_NOTE}>
          <Button
            variant="primary" size="md" disabled={blocker !== null || analyses === null}
            loading={checking} onClick={() => void askLaunch()}
          >
            Valider et lancer l'analyse<ArrowRight size={16} aria-hidden="true" />
          </Button>
        </ActionBarContent>
      )}

      {confirming && (
        <ConfirmDialog
          title="Lancer l'analyse ?"
          description={
            answersNotice(answersCount)
            + `Les ${plural(project.documentsCount, 'document', 'documents')} du projet et la fiche de cadrage seront figés : `
            + 'vous ne pourrez plus retirer ces documents. '
            + ANALYSIS_NOTE
          }
          confirmLabel="Lancer l'analyse"
          variant="primary"
          loading={launching}
          onConfirm={launch}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
