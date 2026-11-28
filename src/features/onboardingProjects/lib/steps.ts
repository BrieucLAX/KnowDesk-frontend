import { createContext, useContext, useEffect } from 'react';
import { Building, FileSearch, FileText, List, Scale, type LucideIcon } from 'lucide-react';
import type { OnboardingProject } from '../types';

export type ProjectStep = 'documents' | 'cadrage' | 'analysis' | 'audit' | 'base';

interface StepDef {
  id:    ProjectStep;
  label: string;
  icon:  LucideIcon;
  /** La phrase d'introduction du bandeau. */
  lead:  string;
}

/** Les cinq étapes du projet : noms, ordre et URL inchangés (lot 7b, habillage seul). */
export const STEPS: readonly StepDef[] = [
  { id: 'documents', label: 'Documents',        icon: FileText,
    lead: 'Importez les documents de votre base actuelle : ce sont eux que l\'analyse va lire.' },
  { id: 'cadrage',   label: 'Fiche de cadrage', icon: Building,
    lead: 'Décrivez votre métier, pour que l\'analyse lise vos documents dans leur contexte.' },
  { id: 'analysis',  label: 'Analyse',          icon: FileSearch,
    lead: 'Lancez l\'analyse de vos documents avec votre fiche de cadrage, puis suivez son avancement.' },
  // L'URL reste `audit`. « Questions » (US 3.1, lot étape A) : le mot « trancher » n'est plus employé.
  { id: 'audit',     label: 'Questions',        icon: Scale,
    lead: 'Répondez aux questions que l\'analyse a relevées dans vos documents.' },
  { id: 'base',      label: 'Nouvelle base',    icon: List,
    lead: 'Relisez la nouvelle base préparée à partir de vos documents et de vos réponses.' },
];

export const stepOf = (id: ProjectStep): StepDef => STEPS.find(s => s.id === id)!;
export const nextStep = (id: ProjectStep): StepDef | null => STEPS[STEPS.findIndex(s => s.id === id) + 1] ?? null;

/**
 * Ce que les écrans ont déjà chargé disent des étapes : vrai, terminée ; faux, pas terminée ;
 * absent, on ne sait pas (étape neutre). Aucun appel au back pour ça.
 */
export type StepFacts = Partial<Record<'analysis' | 'audit' | 'base', boolean>>;

/**
 * Les étapes terminées, sans ambiguïté :
 * - Documents : au moins un document dans le projet ;
 * - Fiche de cadrage : une version enregistrée ;
 * - Analyse : une analyse réussie (lue par « Analyse », « À clarifier » ou « Nouvelle base ») ;
 * - À clarifier : sur la dernière analyse réussie, aucune carte bloquante sans vraie réponse
 *   (« Plus tard » ne tranche pas), lu par « À clarifier » ou « Nouvelle base » ; un audit à
 *   questions (0.6.0, 0.7.0) reste neutre ;
 * - Nouvelle base : la base de connaissance créée depuis la dernière rédaction ou la version validée.
 */
export function doneSteps(project: OnboardingProject, facts: StepFacts): Record<ProjectStep, boolean> {
  return {
    documents: project.documentsCount > 0,
    cadrage:   project.cadrageVersion !== null,
    analysis:  facts.analysis === true,
    audit:     facts.audit === true,
    base:      facts.base === true,
  };
}

/** Les écrans disent à la page ce qu'ils savent d'une étape ; hors de la page, rien. */
export const StepFactsContext = createContext<((step: keyof StepFacts, done: boolean) => void) | null>(null);

/** Signale l'état d'une étape quand il est connu (`undefined` : rien à dire). */
export function useStepFact(step: keyof StepFacts, done: boolean | undefined): void {
  const report = useContext(StepFactsContext);
  useEffect(() => {
    if (report && done !== undefined) report(step, done);
  }, [report, step, done]);
}
