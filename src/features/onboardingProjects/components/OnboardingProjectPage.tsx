import React, { useCallback, useEffect, useState } from 'react';
import { ParcoursHeader } from '../../../shared/components/layout/ParcoursHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { Stepper }    from '../../../shared/components/ui/Stepper';
import { ActionBarHost } from '../../../shared/components/ui/ActionBar';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { useToast }   from '../../../shared/lib/useToast';
import { usePolling } from '../../../shared/lib/usePolling';
import { onboardingApi } from '../api/onboardingApi';
import { ProjectNameModal } from './ProjectNameModal';
import { DocumentsTab } from './DocumentsTab';
import { CadrageTab }   from './CadrageTab';
import { AnalysisWaiting } from './AnalysisWaiting';
import { AuditTab }     from './audit/AuditTab';
import { BaseTab }      from './base/BaseTab';
import { CleanBaseView } from './base/CleanBaseView';
import { KnowledgeBaseCreationView } from './knowledgeBase/KnowledgeBaseCreationView';
import type { OnboardingProject } from '../types';
import '../onboardingProjects.css';
import { useAuthStore, selectOrganization, selectUserRole } from '../../../store/authStore';
import { hasModule } from '../../../shared/lib/modules';
import { CurrentUserContext } from './base/AuthorName';
import { ArrowRight, Pencil } from 'lucide-react';
import { ANALYSIS_POLL_MS } from '../lib/analysisStatus';
import {
  currentStepOf, nextStep, ProjectRefreshContext, RUNNING_STATUSES, stepOf, stepStates, STEPS, type ProjectStep,
} from '../lib/steps';

export type ProjectTab = ProjectStep;

interface OnboardingProjectPageProps {
  projectId:   string;
  /** L'étape affichée ; null : l'étape en cours du projet (statut renvoyé par le back). */
  tab:         ProjectTab | null;
  /** Une version validée à afficher (version propre), à la place des étapes. */
  validationId?: string | null;
  /** Avec `validationId` : l'écran « Créer la base de connaissance » de cette version. */
  knowledgeBase?: boolean;
  onTabChange: (tab: ProjectTab) => void;
  onOpenValidation?: (validationId: string) => void;
  onOpenKnowledgeBase?: (validationId: string) => void;
  onOpenKnowledge?: () => void;
  onBack:      () => void;
}

/**
 * Un projet d'onboarding, en cinq étapes (parcours cible, lot 1 « Socle » ; US.md, règles
 * transverses 1 et 2) : en-tête « ORGANISATION · BASE DE CONNAISSANCE », titre et phrase de
 * l'étape, retour « Mes projets » ; stepper dont le statut de chaque étape est lu dans le statut
 * du projet renvoyé par le back ; une seule action principale par écran, dans la barre d'action,
 * qui mène à l'étape suivante. Le même parcours vaut quel que soit le mode de l'audit.
 */
export function OnboardingProjectPage({
  projectId, tab: requested, validationId = null, knowledgeBase = false, onTabChange, onOpenValidation, onOpenKnowledgeBase, onOpenKnowledge, onBack,
}: OnboardingProjectPageProps) {
  const toast = useToast();
  const [project,  setProject]  = useState<OnboardingProject | null>(null);
  const [missing,  setMissing]  = useState(false);
  const [renaming, setRenaming] = useState(false);
  // Fiche de cadrage modifiée et non enregistrée : on confirme avant de quitter l'étape.
  const [cadrageDirty, setCadrageDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  /** La carte à ouvrir dans « Questions », demandée depuis le plan ou la relecture ; oubliée hors de l'étape. */
  const [clarifyCard, setClarifyCard] = useState<string | undefined>(undefined);
  const currentUserId = useAuthStore(s => s.session?.user.id ?? null);
  const isAdmin = useAuthStore(selectUserRole) === 'admin';
  const organization = useAuthStore(selectOrganization);
  const knowledgeEnabled = hasModule(organization, 'knowledge');
  useEffect(() => { if (requested !== 'audit') setClarifyCard(undefined); }, [requested]);

  const leave = (action: () => void) => {
    if (cadrageDirty) setPendingLeave(() => action);
    else action();
  };

  /** Relit le projet (compteurs, plafonds, fiche, statut du parcours) après un changement. */
  const reload = useCallback(async () => {
    try {
      setProject(await onboardingApi.getProject(projectId));
    } catch (err) {
      setMissing(true);
      toast.error(err instanceof Error ? err.message : 'Impossible de charger le projet. Rechargez la page.');
    }
  }, [projectId, toast]);

  useEffect(() => {
    setProject(null);
    setMissing(false);
    void reload();
  }, [reload]);

  // Changer d'étape relit le statut ; une analyse ou une rédaction en cours aussi, en attendant.
  const [shownOnce, setShownOnce] = useState<ProjectTab | null>(null);
  useEffect(() => {
    if (requested !== null && shownOnce !== null && requested !== shownOnce) void reload();
    if (requested !== null) setShownOnce(requested);
  }, [requested, shownOnce, reload]);
  const running = project?.status != null && RUNNING_STATUSES.has(project.status);
  usePolling(reload, ANALYSIS_POLL_MS, running);

  const rename = useCallback(async (name: string) => {
    const updated = await onboardingApi.renameProject(projectId, name);
    setProject(p => p ? { ...p, name: updated.name, updatedAt: updated.updatedAt } : p);
    setRenaming(false);
  }, [projectId]);

  const back = { label: 'Mes projets', onClick: () => leave(onBack) };
  const eyebrow = `${organization?.name ?? project?.name ?? ''} · Base de connaissance`;
  // Sans étape demandée, l'étape en cours du projet ; l'URL suit.
  const tab: ProjectTab = requested ?? (project ? currentStepOf(project) : 'documents');
  useEffect(() => { if (requested === null && project) onTabChange(currentStepOf(project)); }, [requested, project, onTabChange]);
  const step = stepOf(tab);

  if (missing) {
    return <div className="obp-page"><ParcoursHeader back={back} title="Projet introuvable" /></div>;
  }

  if (!project) {
    return (
      <div className="obp-page" aria-busy="true">
        <ParcoursHeader back={back} title={requested ? step.title : ''} lead={requested ? step.lead : undefined} />
        <Skeleton className="obp-skeleton-block" />
      </div>
    );
  }

  // « Créer la base de connaissance » depuis une version propre (mode correction), à l'étape 5.
  if (validationId && knowledgeBase) {
    return (
      <div className="obp-page">
        <ParcoursHeader
          back={{ label: 'Revenir à la version propre', onClick: () => onOpenValidation?.(validationId) }}
          eyebrow={eyebrow}
          title="Créer la base de connaissance"
          lead="Les fiches de la version validée deviennent des articles de votre base de connaissance."
        />
        <ProjectRefreshContext.Provider value={reload}>
        <KnowledgeBaseCreationView
          projectId={projectId}
          validationId={validationId}
          isAdmin={isAdmin}
          knowledgeEnabled={knowledgeEnabled}
          onBack={() => onOpenValidation?.(validationId)}
          onOpenKnowledge={() => onOpenKnowledge?.()}
          hideBack
        />
        </ProjectRefreshContext.Provider>
      </div>
    );
  }

  // La version propre (mode correction) : un écran à part, une seule ligne en tête.
  if (validationId) {
    return (
      <div className="obp-page">
        <ParcoursHeader
          className="obp-clean-noprint"
          back={{ label: 'Revenir à la relecture', onClick: () => onTabChange('relecture') }}
          eyebrow={eyebrow}
          title="Version propre"
          lead="La nouvelle base validée, telle qu'elle sera reprise : à lire, imprimer ou exporter en PDF."
        />
        <CleanBaseView projectId={projectId} validationId={validationId} onBack={() => onTabChange('relecture')}
          onCreateKnowledgeBase={onOpenKnowledgeBase} hideBack />
      </div>
    );
  }

  const states = stepStates(project);
  const next = nextStep(tab);
  const goTo = (id: ProjectTab) => { if (id !== tab) leave(() => onTabChange(id)); };
  // Une étape sans action principale à ce moment-là mène à l'étape suivante.
  const fallback = next && {
    children: (
      <Button variant="primary" size="md" onClick={() => goTo(next.id)}>
        Continuer vers {next.towards}<ArrowRight size={16} aria-hidden="true" />
      </Button>
    ),
  };
  const baseProps = {
    project,
    onGoToClarify: (cardId?: string) => { setClarifyCard(cardId); onTabChange('audit'); },
    onOpenValidation, onOpenKnowledgeBase, knowledgeEnabled, onOpenKnowledge,
    onOpenView: (view: 'plan' | 'articles') => onTabChange(view === 'plan' ? 'plan' : 'relecture'),
  };

  return (
    <div className="obp-page">
      <div className="obp-parcours-top">
        <ParcoursHeader back={back} eyebrow={eyebrow} title={step.title} lead={step.lead} overlap />
        <Stepper
          items={STEPS.map(s => ({ id: s.id, label: s.label, icon: s.icon, state: states[s.id] }))}
          value={tab}
          onSelect={goTo}
          ariaLabel="Étapes du projet"
        />
        <div className="obp-parcours-tools">
          <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>
            <Pencil size={16} aria-hidden="true" />Renommer le projet
          </Button>
        </div>
      </div>
      <CurrentUserContext.Provider value={currentUserId}>
      <ProjectRefreshContext.Provider value={reload}>
      <ActionBarHost fallback={fallback || null}>
      <div className="obp-tab" id="obp-step-panel" aria-label={step.label} role="region">
        {tab === 'documents' && <DocumentsTab project={project} onChanged={reload} />}
        {tab === 'cadrage' && (
          <CadrageTab
            project={project} onSaved={reload} onDirtyChange={setCadrageDirty}
            onAnalysisLaunched={() => { void reload(); onTabChange('audit'); }}
          />
        )}
        {tab === 'audit' && (project.status === 'analyse_en_cours' ? <AnalysisWaiting /> : (
          <AuditTab
            project={project}
            onGoToAnalysis={() => onTabChange('cadrage')}
            onOpenBase={() => onTabChange('plan')}
            onOpenReview={() => onTabChange('relecture')}
            openCardId={clarifyCard}
          />
        ))}
        {tab === 'plan' && <BaseTab {...baseProps} view="plan" />}
        {tab === 'relecture' && <BaseTab {...baseProps} view="articles" />}
      </div>
      </ActionBarHost>
      </ProjectRefreshContext.Provider>
      </CurrentUserContext.Provider>

      {pendingLeave && (
        <ConfirmDialog
          title="Quitter sans enregistrer ?"
          description="Les modifications de la fiche de cadrage seront perdues."
          confirmLabel="Quitter sans enregistrer"
          cancelLabel="Rester"
          variant="danger"
          onConfirm={() => { const go = pendingLeave; setPendingLeave(null); setCadrageDirty(false); go(); }}
          onCancel={() => setPendingLeave(null)}
        />
      )}

      {renaming && (
        <ProjectNameModal
          title="Renommer le projet"
          submitLabel="Renommer"
          initialName={project.name}
          onSubmit={rename}
          onClose={() => setRenaming(false)}
        />
      )}
    </div>
  );
}
