import React, { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { FilterTabs } from '../../../shared/components/ui/FilterTabs';
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

export type ProjectTab = 'documents' | 'cadrage' | 'analysis' | 'audit' | 'base';

const TABS = [
  { id: 'documents', label: 'Documents' },
  { id: 'cadrage',   label: 'Fiche de cadrage' },
  { id: 'analysis',  label: 'Analyse' },
  // L'URL reste `audit` ; l'onglet montre l'audit de chaque analyse réussie, quelle que soit sa version.
  { id: 'audit',     label: 'À clarifier' },
  { id: 'base',      label: 'Nouvelle base' },
] as const;

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
      toast.error(err instanceof Error ? err.message : 'Impossible de charger le projet.');
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

  const back = (
    <button type="button" className="obp-back" onClick={() => leave(onBack)}>← Tous les projets</button>
  );

  if (missing) {
    return <div className="obp-page">{back}</div>;
  }

  if (!project) {
    return (
      <div className="obp-page" aria-busy="true">
        {back}
        <Skeleton className="obp-skeleton-title" />
        <Skeleton className="obp-skeleton-block" />
      </div>
    );
  }

  // « Créer la base de connaissance » depuis une version propre (plan-articles-v1, lot 2).
  if (validationId && knowledgeBase) {
    return (
      <div className="obp-page">
        <KnowledgeBaseCreationView
          projectId={projectId}
          validationId={validationId}
          isAdmin={isAdmin}
          knowledgeEnabled={knowledgeEnabled}
          onBack={() => onOpenValidation?.(validationId)}
          onOpenKnowledge={() => onOpenKnowledge?.()}
        />
      </div>
    );
  }

  // La version propre : un écran à part, une seule ligne en tête.
  if (validationId) {
    return (
      <div className="obp-page">
        <CleanBaseView projectId={projectId} validationId={validationId} onBack={() => onTabChange('base')}
          onCreateKnowledgeBase={onOpenKnowledgeBase} />
      </div>
    );
  }

  return (
    <div className="obp-page">
      {back}
      <PageHeader
        title={project.name}
        actions={<Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>Renommer</Button>}
      />
      <FilterTabs
        options={TABS}
        value={tab}
        onChange={id => { if (id !== tab) leave(() => onTabChange(id)); }}
        ariaLabel="Sections du projet"
      />
      <CurrentUserContext.Provider value={currentUserId}>
      <div className="obp-tab">
        {tab === 'documents' && <DocumentsTab project={project} onChanged={reload} />}
        {tab === 'cadrage' && <CadrageTab project={project} onSaved={reload} onDirtyChange={setCadrageDirty} />}
        {tab === 'analysis' && <AnalysisTab project={project} onChanged={reload} onOpenAudit={() => onTabChange('audit')} />}
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
          />
        )}
      </div>
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
