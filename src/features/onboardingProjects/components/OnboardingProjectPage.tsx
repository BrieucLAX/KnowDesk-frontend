import React, { useCallback, useEffect, useState } from 'react';
import { ParcoursHeader } from '../../../shared/components/layout/ParcoursHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { Stepper }    from '../../../shared/components/ui/Stepper';
import { ActionBarHost } from '../../../shared/components/ui/ActionBar';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { useToast }   from '../../../shared/lib/useToast';
import { onboardingApi } from '../api/onboardingApi';
import { ProjectNameModal } from './ProjectNameModal';
import { DocumentsTab } from './DocumentsTab';
import { CadrageTab }   from './CadrageTab';
import { AnalysisTab }  from './AnalysisTab';
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
import { doneSteps, nextStep, stepOf, STEPS, StepFactsContext, type ProjectStep, type StepFacts } from '../lib/steps';

export type ProjectTab = ProjectStep;

interface OnboardingProjectPageProps {
  projectId:   string;
  tab:         ProjectTab;
  /** Une version validée à afficher (version propre), à la place des onglets. */
  validationId?: string | null;
  /** Avec `validationId` : l'écran « Créer la base de connaissance » de cette version. */
  knowledgeBase?: boolean;
  onTabChange: (tab: ProjectTab) => void;
  onOpenValidation?: (validationId: string) => void;
  onOpenKnowledgeBase?: (validationId: string) => void;
  onOpenKnowledge?: () => void;
  onBack:      () => void;
}

/** Un projet d'onboarding : ses documents, sa fiche de cadrage, ses analyses et leur audit. */
export function OnboardingProjectPage({
  projectId, tab, validationId = null, knowledgeBase = false, onTabChange, onOpenValidation, onOpenKnowledgeBase, onOpenKnowledge, onBack,
}: OnboardingProjectPageProps) {
  const toast = useToast();
  const [project,  setProject]  = useState<OnboardingProject | null>(null);
  const [missing,  setMissing]  = useState(false);
  const [renaming, setRenaming] = useState(false);
  // Fiche de cadrage modifiée et non enregistrée : on confirme avant de quitter l'onglet.
  const [cadrageDirty, setCadrageDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  /** La carte à ouvrir dans « À clarifier », demandée depuis « Nouvelle base » ; oubliée hors de l'onglet. */
  const [clarifyCard, setClarifyCard] = useState<string | undefined>(undefined);
  const currentUserId = useAuthStore(s => s.session?.user.id ?? null);
  const isAdmin = useAuthStore(selectUserRole) === 'admin';
  const knowledgeEnabled = hasModule(useAuthStore(selectOrganization), 'knowledge');
  useEffect(() => { if (tab !== 'audit') setClarifyCard(undefined); }, [tab]);
  /** Ce que les écrans ont déjà lu des étapes (analyse réussie, cartes bloquantes, base créée). */
  const [facts, setFacts] = useState<StepFacts>({});
  useEffect(() => { setFacts({}); }, [projectId]);
  const reportFact = useCallback((step: keyof StepFacts, done: boolean) => {
    setFacts(f => (f[step] === done ? f : { ...f, [step]: done }));
  }, []);

  const leave = (action: () => void) => {
    if (cadrageDirty) setPendingLeave(() => action);
    else action();
  };

  /** Relit le projet (compteurs, plafonds, version du cadrage) après un changement. */
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

  const rename = useCallback(async (name: string) => {
    const updated = await onboardingApi.renameProject(projectId, name);
    setProject(p => p ? { ...p, name: updated.name, updatedAt: updated.updatedAt } : p);
    setRenaming(false);
  }, [projectId]);

  const back = { label: 'Tous les projets', onClick: () => leave(onBack) };
  const step = stepOf(tab);

  if (missing) {
    return <div className="obp-page"><ParcoursHeader back={back} title="Projet introuvable" /></div>;
  }

  if (!project) {
    return (
      <div className="obp-page" aria-busy="true">
        <ParcoursHeader back={back} title={step.label} lead={step.lead} />
        <Skeleton className="obp-skeleton-block" />
      </div>
    );
  }

  // « Créer la base de connaissance » depuis une version propre (plan-articles-v1, lot 2).
  if (validationId && knowledgeBase) {
    return (
      <div className="obp-page">
        <ParcoursHeader
          back={{ label: 'Revenir à la version propre', onClick: () => onOpenValidation?.(validationId) }}
          eyebrow={project.name}
          title="Créer la base de connaissance"
          lead="Les fiches de la version validée deviennent des articles de votre base de connaissance."
        />
        <StepFactsContext.Provider value={reportFact}>
        <KnowledgeBaseCreationView
          projectId={projectId}
          validationId={validationId}
          isAdmin={isAdmin}
          knowledgeEnabled={knowledgeEnabled}
          onBack={() => onOpenValidation?.(validationId)}
          onOpenKnowledge={() => onOpenKnowledge?.()}
          hideBack
        />
        </StepFactsContext.Provider>
      </div>
    );
  }

  // La version propre : un écran à part, une seule ligne en tête.
  if (validationId) {
    return (
      <div className="obp-page">
        <ParcoursHeader
          className="obp-clean-noprint"
          back={{ label: 'Revenir à la relecture', onClick: () => onTabChange('base') }}
          eyebrow={project.name}
          title="Version propre"
          lead="La nouvelle base validée, telle qu'elle sera reprise : à lire, imprimer ou exporter en PDF."
        />
        <CleanBaseView projectId={projectId} validationId={validationId} onBack={() => onTabChange('base')}
          onCreateKnowledgeBase={onOpenKnowledgeBase} hideBack />
      </div>
    );
  }

  const done = doneSteps(project, facts);
  const next = nextStep(tab);
  const goTo = (id: ProjectTab) => { if (id !== tab) leave(() => onTabChange(id)); };
  // Une étape sans action principale à ce moment-là propose l'étape suivante.
  const fallback = next && {
    children: (
      <Button variant="primary" size="md" onClick={() => goTo(next.id)}>
        Continuer : {next.label}<ArrowRight size={16} aria-hidden="true" />
      </Button>
    ),
  };

  return (
    <div className="obp-page">
      <div className="obp-parcours-top">
        <ParcoursHeader back={back} eyebrow={project.name} title={step.label} lead={step.lead} overlap />
        <Stepper
          items={STEPS.map(s => ({ id: s.id, label: s.label, icon: s.icon, done: done[s.id] }))}
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
      <StepFactsContext.Provider value={reportFact}>
      <ActionBarHost fallback={fallback || null}>
      <div className="obp-tab" id="obp-step-panel" aria-label={step.label} role="region">
        {tab === 'documents' && <DocumentsTab project={project} onChanged={reload} />}
        {tab === 'cadrage' && <CadrageTab project={project} onSaved={reload} onDirtyChange={setCadrageDirty} />}
        {tab === 'analysis' && (
          <AnalysisTab
            project={project}
            // Une nouvelle analyse : ce qu'on savait de « À clarifier » et de la base ne vaut plus.
            onChanged={() => { setFacts(f => ({ analysis: f.analysis })); void reload(); }}
            onOpenAudit={() => onTabChange('audit')}
          />
        )}
        {tab === 'audit' && (
          <AuditTab
            project={project}
            onGoToAnalysis={() => onTabChange('analysis')}
            onOpenBase={() => onTabChange('base')}
            openCardId={clarifyCard}
          />
        )}
        {tab === 'base' && (
          <BaseTab
            project={project}
            onGoToClarify={cardId => { setClarifyCard(cardId); onTabChange('audit'); }}
            onOpenValidation={onOpenValidation}
            onOpenKnowledgeBase={onOpenKnowledgeBase}
            knowledgeEnabled={knowledgeEnabled}
            onOpenKnowledge={onOpenKnowledge}
          />
        )}
      </div>
      </ActionBarHost>
      </StepFactsContext.Provider>
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
