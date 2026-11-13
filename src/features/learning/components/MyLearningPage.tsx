import React, { useCallback, useEffect, useState } from 'react';
import { learningApi } from '../api/learningApi';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Button }     from '../../../shared/components/ui/Button';
import { Skeleton }   from '../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { useToast }   from '../../../shared/lib/useToast';
import { ApiError }   from '../../../shared/lib/apiClient';
import { formatRelative } from '../../../shared/lib/formatDate';
import type { MyLearningPath, LearningCompletionStatus } from '../types';
import '../learning.css';
import { StatusIcon } from '../../../shared/components/ui/StatusIcon';
import { Circle, CircleCheck, CircleDot, RotateCw } from 'lucide-react';

interface MyLearningPageProps {
  onOpenModule: (moduleId: string, pathId: string) => void;
}

/**
 * Vue conseiller : "Mes formations" — regroupe les parcours assignés
 * par état (à faire / en cours / à renouveler / complétés).
 */
export function MyLearningPage({ onOpenModule }: MyLearningPageProps) {
  const toast = useToast();
  const [paths,   setPaths]   = useState<MyLearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    learningApi.myLearning()
      .then(d => { if (alive) setPaths(d); })
      .catch((err: unknown) => { if (alive) toast.error(err instanceof ApiError ? err.message : 'Erreur de chargement.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [toast]);

  // Classification : un parcours est "à faire" si au moins 1 module
  // pending ; "à renouveler" si au moins 1 module outdated ;
  // "complété" si tous les modules sont completed.
  const classify = (p: MyLearningPath): 'todo' | 'renew' | 'done' => {
    const allCompleted = p.modules.length > 0 && p.modules.every(m => m.status === 'completed');
    if (allCompleted) return 'done';
    if (p.modules.some(m => m.status === 'outdated')) return 'renew';
    return 'todo';
  };

  const todo  = paths.filter(p => classify(p) === 'todo');
  const renew = paths.filter(p => classify(p) === 'renew');
  const done  = paths.filter(p => classify(p) === 'done');

  if (loading) {
    return (
      <div className="learning-page">
        <PageHeader title="Mes formations" subtitle="" />
        <Skeleton className="sk-card" />
      </div>
    );
  }

  if (paths.length === 0) {
    return (
      <div className="learning-page">
        <PageHeader title="Mes formations" subtitle="" />
        <EmptyState
          title="Aucune formation assignée"
          description="Quand votre admin vous assignera des parcours, ils apparaîtront ici."
        />
      </div>
    );
  }

  return (
    <div className="learning-page">
      <PageHeader
        title="Mes formations"
        subtitle="Vos parcours assignés et leur progression."
      />

      {todo.length > 0 && (
        <PathSection
          title={`À faire (${todo.length})`}
          paths={todo}
          variant="todo"
          onOpenModule={onOpenModule}
        />
      )}
      {renew.length > 0 && (
        <PathSection
          title={`À renouveler (${renew.length})`}
          paths={renew}
          variant="renew"
          onOpenModule={onOpenModule}
        />
      )}
      {done.length > 0 && (
        <PathSection
          title={`Complétées (${done.length})`}
          paths={done}
          variant="done"
          onOpenModule={onOpenModule}
        />
      )}
    </div>
  );
}

function PathSection({ title, paths, variant, onOpenModule }: {
  title: string;
  paths: MyLearningPath[];
  variant: 'todo' | 'renew' | 'done';
  onOpenModule: (moduleId: string, pathId: string) => void;
}) {
  return (
    <section className="my-learning-section">
      <h2 className="learning-section__title">{title}</h2>
      <ul className="my-learning-list">
        {paths.map(p => <PathCard key={p.path.id} path={p} variant={variant} onOpenModule={onOpenModule} />)}
      </ul>
    </section>
  );
}

function PathCard({ path, variant, onOpenModule }: {
  path: MyLearningPath;
  variant: 'todo' | 'renew' | 'done';
  onOpenModule: (moduleId: string, pathId: string) => void;
}) {
  const completed = path.modules.filter(m => m.status === 'completed').length;
  const total     = path.modules.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 1er module à attaquer : 1er pending → 1er in_progress → 1er outdated
  const nextModule =
    path.modules.find(m => m.status === 'pending') ??
    path.modules.find(m => m.status === 'in_progress') ??
    path.modules.find(m => m.status === 'outdated') ??
    null;

  return (
    <li className={`my-learning-card my-learning-card--${variant}`}>
      <div className="my-learning-card__head">
        <h3 className="my-learning-card__title">{path.path.name}</h3>
        <div className="my-learning-card__badges">
          {path.path.mandatory && <span className="badge badge--warning"><StatusIcon tone="warning" size={14} className="badge__icon" />Obligatoire</span>}
          {path.path.renewal_months && (
            <span className="badge badge--secondary"><RotateCw size={14} className="badge__icon" />{path.path.renewal_months} mois</span>
          )}
        </div>
      </div>
      {path.path.description && (
        <p className="my-learning-card__desc">{path.path.description}</p>
      )}
      <div className="my-learning-card__progress">
        <div className="my-learning-card__progress-bar">
          <div
            className="my-learning-card__progress-fill"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="my-learning-card__progress-label">
          {completed}/{total} modules complétés
        </span>
      </div>

      <ul className="my-learning-card__modules">
        {path.modules.map(m => (
          <li key={m.id} className={`my-learning-mod my-learning-mod--${m.status}`}>
            <span className="my-learning-mod__icon" aria-hidden="true">
              {m.status === 'completed' ? <CircleCheck size={16} /> :
               m.status === 'outdated'  ? <RotateCw size={16} /> :
               m.status === 'in_progress' ? <CircleDot size={16} /> : <Circle size={16} />}
            </span>
            <span className="my-learning-mod__name">{m.name}</span>
            {m.status === 'completed' && m.score !== null && (
              <span className="my-learning-mod__score">{m.score}%</span>
            )}
            {m.status === 'completed' && m.expires_at && (
              <span className="my-learning-mod__expires">
                Expire {formatRelative(m.expires_at)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {nextModule && (
        <div className="my-learning-card__cta">
          <Button variant="primary" size="md" onClick={() => onOpenModule(nextModule.id, path.path.id)}>
            {variant === 'renew' ? 'Refaire' : completed > 0 ? 'Continuer' : 'Démarrer'}
          </Button>
        </div>
      )}
    </li>
  );
}
