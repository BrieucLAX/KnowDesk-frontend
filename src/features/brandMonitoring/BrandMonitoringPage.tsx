import { useEffect, useState, useCallback } from 'react';
import { brandMonitoringApi } from './api/brandMonitoringApi';
import { useToast } from '../../shared/lib/useToast';
import { Button } from '../../shared/components/ui/Button';
import { Input }  from '../../shared/components/ui/Input';
import { Skeleton } from '../../shared/components/ui/Skeleton';
import { DashboardView } from './components/DashboardView';
import { PromptsView }   from './components/PromptsView';
import { ResponsesView } from './components/ResponsesView';
import { SettingsView }  from './components/SettingsView';
import type { BrandProject } from './types';
import './brandMonitoring.css';
import { ChartColumn } from 'lucide-react';
import { Tabs, TabPanel } from '../../shared/components/ui/Tabs';

type Tab = 'dashboard' | 'prompts' | 'responses' | 'settings';

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'prompts',   label: 'Questions suivies' },
  { id: 'responses', label: 'Réponses' },
  { id: 'settings',  label: 'Paramètres' },
];

export function BrandMonitoringPage() {
  const toast = useToast();
  const [project, setProject] = useState<BrandProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('dashboard');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // V1 : on charge le premier projet de l'org (1 seul attendu en pratique).
  // Sprint future : multi-projets avec sélecteur en haut.
  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const list = await brandMonitoringApi.listProjects();
      if (list.length === 0) { setProject(null); return; }
      const detail = await brandMonitoringApi.getProject(list[0].id);
      setProject(detail);
    } catch (err) {
      toast.error((err as Error).message ?? "Le projet de suivi de marque n'a pas pu être chargé. Rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void loadProject(); }, [loadProject]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (name.length < 2) { toast.error("Saisissez un nom de projet d'au moins 2 caractères."); return; }
    setCreating(true);
    try {
      await brandMonitoringApi.createProject(name);
      toast.success(`Projet « ${name} » créé. Configurez les marques et les questions suivies dans l'onglet Paramètres.`);
      setNewName('');
      await loadProject();
      setTab('settings');
    } catch (err) {
      toast.error((err as Error).message ?? "Le projet n'a pas pu être créé. Réessayez.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="brand-monitoring-page">
        <Skeleton className="bm-skeleton-large" />
        <Skeleton className="bm-skeleton-large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="brand-monitoring-page brand-monitoring-page--empty">
        <div className="bm-empty">
          <div className="bm-empty__icon" aria-hidden="true"><ChartColumn size={24} /></div>
          <h2 className="bm-empty__title">Créer un projet de suivi de marque</h2>
          <p className="bm-empty__desc">
            Suivez la visibilité de votre marque dans les réponses des IA (Mistral pour l'instant),
            face à vos concurrents. Donnez un nom à votre projet (par exemple « Auchan »), puis
            configurez les marques suivies et les questions suivies dans l'onglet Paramètres.
          </p>
          <div className="bm-empty__form">
            <Input
              id="bm-new-project-name"
              label="Nom du projet"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Auchan"
              autoFocus
            />
            <Button variant="primary" size="md" onClick={handleCreate} loading={creating}>
              Créer le projet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-monitoring-page">
      <header className="bm-header">
        <div>
          <h1 className="bm-header__title">{project.name}</h1>
          <p className="bm-header__meta">
            {project.brandsCount ?? 0} marque{(project.brandsCount ?? 0) > 1 ? 's' : ''} suivie{(project.brandsCount ?? 0) > 1 ? 's' : ''}
            {' · '}{project.promptsCount ?? 0} question{(project.promptsCount ?? 0) > 1 ? 's' : ''} suivie{(project.promptsCount ?? 0) > 1 ? 's' : ''}
            {' · '}{project.runsCount ?? 0} analyse{(project.runsCount ?? 0) > 1 ? 's' : ''}
            {project.quotaRemaining != null && project.monthlyQuota != null && (
              <> · <span className={(project.quotaRemaining / project.monthlyQuota) < 0.1 ? 'bm-quota--low' : ''}>
                quota : {project.quotaRemaining}/{project.monthlyQuota} ce mois-ci
              </span></>
            )}
          </p>
        </div>
      </header>

      <Tabs<Tab>
        id="bm-sections"
        items={TABS}
        value={tab}
        onChange={setTab}
        ariaLabel="Sections du suivi de marque"
      />

      <TabPanel id="bm-sections" value={tab} className="bm-main">
        {tab === 'dashboard'  && <DashboardView projectId={project.id} onReloadProject={loadProject} />}
        {tab === 'prompts'    && <PromptsView   projectId={project.id} onReloadProject={loadProject} />}
        {tab === 'responses'  && <ResponsesView projectId={project.id} />}
        {tab === 'settings'   && <SettingsView  projectId={project.id} onReloadProject={loadProject} />}
      </TabPanel>
    </div>
  );
}
