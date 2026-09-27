import React, { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { FilterTabs } from '../../../shared/components/ui/FilterTabs';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { useToast }   from '../../../shared/lib/useToast';
import { onboardingApi } from '../api/onboardingApi';
import { ProjectNameModal } from './ProjectNameModal';
import { DocumentsTab } from './DocumentsTab';
import type { OnboardingProject } from '../types';
import '../onboardingProjects.css';

export type ProjectTab = 'documents' | 'cadrage';

const TABS = [
  { id: 'documents', label: 'Documents' },
  { id: 'cadrage',   label: 'Fiche de cadrage' },
] as const;

interface OnboardingProjectPageProps {
  projectId:   string;
  tab:         ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
  onBack:      () => void;
}

/** Un projet d'onboarding : ses documents et sa fiche de cadrage. */
export function OnboardingProjectPage({ projectId, tab, onTabChange, onBack }: OnboardingProjectPageProps) {
  const toast = useToast();
  const [project,  setProject]  = useState<OnboardingProject | null>(null);
  const [missing,  setMissing]  = useState(false);
  const [renaming, setRenaming] = useState(false);

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
    <button type="button" className="obp-back" onClick={onBack}>← Tous les projets</button>
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
        onChange={id => onTabChange(id)}
        ariaLabel="Sections du projet"
      />
      <div className="obp-tab">
        {tab === 'documents' && <DocumentsTab project={project} onChanged={reload} />}
        {tab === 'cadrage' && null}
      </div>

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
