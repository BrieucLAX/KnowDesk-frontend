import React, { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { useToast }   from '../../../shared/lib/useToast';
import { formatRelative } from '../../../shared/lib/formatDate';
import { onboardingApi }  from '../api/onboardingApi';
import { formatBytes }    from '../lib/format';
import { ProjectNameModal } from './ProjectNameModal';
import type { OnboardingProjectSummary } from '../types';
import '../onboardingProjects.css';

interface OnboardingHomePageProps {
  onOpenProject: (projectId: string) => void;
}

/** Accueil du module Onboarding : liste des projets et création. */
export function OnboardingHomePage({ onOpenProject }: OnboardingHomePageProps) {
  const toast = useToast();
  const [projects, setProjects] = useState<OnboardingProjectSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    onboardingApi.listProjects()
      .then(data => { if (alive) setProjects(data); })
      .catch(err => {
        if (!alive) return;
        setProjects([]);
        toast.error(err instanceof Error ? err.message : 'Impossible de charger les projets.');
      });
    return () => { alive = false; };
  }, [toast]);

  const create = useCallback(async (name: string) => {
    const project = await onboardingApi.createProject(name);
    setCreating(false);
    onOpenProject(project.id);
  }, [onOpenProject]);

  const newButton = (
    <Button variant="primary" size="md" onClick={() => setCreating(true)}>Nouveau projet</Button>
  );

  return (
    <div className="obp-page">
      <PageHeader
        title="Onboarding"
        subtitle="Importez vos documents et décrivez votre métier : Knowdesk en fera l'audit."
        actions={projects && projects.length > 0 ? newButton : undefined}
      />

      {projects === null ? (
        <div className="obp-projects" aria-busy="true">
          <Skeleton className="obp-skeleton-card" />
          <Skeleton className="obp-skeleton-card" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="Aucun projet pour l'instant"
          description="Un projet rassemble les documents de votre base de connaissance et la fiche qui décrit votre métier."
          ctaLabel="Créer un projet"
          onCta={() => setCreating(true)}
        />
      ) : (
        <ul className="obp-projects" role="list">
          {projects.map(p => (
            <li key={p.id}>
              <button type="button" className="obp-project-card" onClick={() => onOpenProject(p.id)}>
                <span className="obp-project-card__name">{p.name}</span>
                <span className="obp-project-card__meta">
                  {p.documentsCount} document{p.documentsCount > 1 ? 's' : ''}
                  {p.documentsCount > 0 && ` · ${formatBytes(p.totalBytes)}`}
                  {' · modifié '}{formatRelative(p.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <ProjectNameModal
          title="Nouveau projet"
          submitLabel="Créer le projet"
          onSubmit={create}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
