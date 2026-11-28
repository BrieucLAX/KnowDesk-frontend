import { createContext, useContext, useEffect } from 'react';
import { Building, FileText, List, PenLine, Scale, type LucideIcon } from 'lucide-react';
import type { StepState } from '../../../shared/components/ui/Stepper';
import type { OnboardingProject, ProjectStatus } from '../types';

/**
 * Les cinq étapes du parcours (US.md, règle transverse 1 ; lot 1 « Socle »). L'analyse n'est pas
 * une étape : elle se lance à l'étape 2 et l'étape 3 attend pendant qu'elle tourne.
 * Correspondance avec les anciens onglets : Documents → 1 ; Fiche de cadrage → 2 ; « À clarifier »
 * → 3 ; « Nouvelle base » partagé entre 4 (le plan, ou la préparation de la correction) et 5 (la
 * rédaction, la relecture et la création de la base).
 */
export type ProjectStep = 'documents' | 'cadrage' | 'audit' | 'plan' | 'relecture';

interface StepDef {
  id:    ProjectStep;
  /** Nom court, dans le stepper. */
  label: string;
  icon:  LucideIcon;
  /** Titre de l'écran (maquettes du parcours cible). */
  title: string;
  /** La phrase d'introduction du bandeau. */
  lead:  string;
  /** La fin de « Continuer vers … », depuis l'étape précédente. */
  towards: string;
}

/*
 * Titres des maquettes à l'identique. Les phrases reprennent celles des maquettes (Documents :
 * mot pour mot depuis le lot 2a) sans ce qui n'existe pas encore (brouillon pré-rempli, ajout d'articles,
 * publication à tout moment : lots 2 à 5), ni les nombres qui viendront avec ces lots.
 */
export const STEPS: readonly StepDef[] = [
  { id: 'documents', label: 'Documents', icon: FileText, title: 'Importez vos documents',
    lead: 'Apportez tout ce qui sert à répondre aux clients. Nous proposons pour chaque document un type, un usage et '
      + 'une date : vérifiez-les, ils serviront à décider quel document fait foi et ce qui peut être montré aux clients.',
    towards: 'les documents' },
  { id: 'cadrage', label: 'Contexte métier', icon: Building, title: 'Votre contexte métier',
    lead: 'Vérifiez votre fiche de cadrage et complétez ce qui manque, puis lancez l\'analyse de vos documents.',
    towards: 'le contexte métier' },
  // L'URL reste `audit`. « Questions » (US 3.1, lot étape A) : le mot « trancher » n'est plus employé.
  { id: 'audit', label: 'Questions', icon: Scale, title: 'Questions',
    lead: 'Répondez aux questions que l\'analyse a relevées dans vos documents.', towards: 'les questions' },
  { id: 'plan', label: 'Plan', icon: List, title: 'Le plan de votre base',
    lead: 'Renommez, déplacez ou réunissez des articles jusqu\'à ce que le plan vous convienne : nous rédigeons ensuite les articles.',
    towards: 'le plan' },
  { id: 'relecture', label: 'Relecture et publication', icon: PenLine, title: 'Relisez vos articles',
    lead: 'Vérifiez les phrases surlignées, puis créez votre base de connaissance.', towards: 'la relecture' },
];

export const stepOf = (id: ProjectStep): StepDef => STEPS.find(s => s.id === id)!;
export const nextStep = (id: ProjectStep): StepDef | null => STEPS[STEPS.findIndex(s => s.id === id) + 1] ?? null;

/** Étape en cours lue dans le statut du projet ; sans statut (back d'avant la migration 65), l'étape 1. */
export function currentStepOf(project: Pick<OnboardingProject, 'currentStep'>): ProjectStep {
  return STEPS[(project.currentStep ?? 1) - 1]?.id ?? 'documents';
}

/**
 * Statut de chaque étape, lu dans le statut du projet renvoyé par le back (`completedSteps`,
 * `currentStep`), jamais déduit par le front : terminée, en cours, à venir.
 */
export function stepStates(project: Pick<OnboardingProject, 'currentStep' | 'completedSteps'>): Record<ProjectStep, StepState> {
  const current = project.currentStep ?? 1;
  const completed = project.completedSteps ?? 0;
  return Object.fromEntries(STEPS.map((s, i) => {
    const n = i + 1;
    return [s.id, n <= completed ? 'done' : n === current ? 'current' : 'upcoming'];
  })) as Record<ProjectStep, StepState>;
}

/** Les statuts où un travail tourne (analyse, rédaction) : la page relit le projet en attendant. */
export const RUNNING_STATUSES: ReadonlySet<ProjectStatus> = new Set(['analyse_en_cours', 'redaction_en_cours']);

/** La page relit le projet (et son statut) ; hors de la page, rien. */
export const ProjectRefreshContext = createContext<(() => void) | null>(null);

/**
 * Un écran a vu changer ce qui fait avancer le statut du projet (analyse réussie, réponses,
 * préparation terminée, base créée) : la page relit le projet pour mettre le stepper à jour.
 * `undefined` : rien à dire encore.
 */
export function useStatusSignal(value: string | boolean | null | undefined): void {
  const refresh = useContext(ProjectRefreshContext);
  useEffect(() => {
    if (refresh && value !== undefined) refresh();
  }, [refresh, value]);
}
