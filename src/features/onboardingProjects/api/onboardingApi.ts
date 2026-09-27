import { apiClient } from '../../../shared/lib/apiClient';
import type {
  AnalysisQuota, Cadrage, CadrageForm, CadrageVersionSummary, OnboardingAnalysis, OnboardingDocument,
  OnboardingNotice, OnboardingProject, OnboardingProjectSummary, SavedCadrage,
} from '../types';

const BASE = '/onboarding';

/** Module Onboarding (back, étapes F1 et F2). Toutes les routes : admin ou manager, module onboarding. */
export const onboardingApi = {
  getNotice:    () => apiClient.get<OnboardingNotice>(`${BASE}/notice`),
  acceptNotice: (version: string) =>
    apiClient.post<{ version: string; acceptedAt: string }>(`${BASE}/notice/accept`, { version }),

  listProjects:  () => apiClient.get<OnboardingProjectSummary[]>(`${BASE}/projects`),
  getProject:    (id: string) => apiClient.get<OnboardingProject>(`${BASE}/projects/${id}`),
  createProject: (name: string) => apiClient.post<OnboardingProjectSummary>(`${BASE}/projects`, { name }),
  renameProject: (id: string, name: string) =>
    apiClient.patch<OnboardingProjectSummary>(`${BASE}/projects/${id}`, { name }),

  listDocuments:   (projectId: string) =>
    apiClient.get<OnboardingDocument[]>(`${BASE}/projects/${projectId}/documents`),
  /** Tout ou rien : un fichier refusé fait refuser l'envoi entier. */
  uploadDocuments: (projectId: string, files: File[]) => {
    const form = new FormData();
    for (const f of files) form.append('files', f, f.name);
    return apiClient.postForm<OnboardingDocument[]>(`${BASE}/projects/${projectId}/documents`, form);
  },
  /** 204. */
  deleteDocument:  (projectId: string, documentId: string) =>
    apiClient.delete<void>(`${BASE}/projects/${projectId}/documents/${documentId}`),

  listCadrages: (projectId: string) =>
    apiClient.get<CadrageVersionSummary[]>(`${BASE}/projects/${projectId}/cadrages`),
  /** Dernière version si `version` est omis ; 404 s'il n'y en a aucune. */
  getCadrage:   (projectId: string, version?: number) =>
    apiClient.get<Cadrage>(`${BASE}/projects/${projectId}/cadrages/${version ?? 'current'}`),
  /** Crée une nouvelle version structurée (les versions sont immuables). */
  saveCadrage:  (projectId: string, form: CadrageForm) =>
    apiClient.post<SavedCadrage>(`${BASE}/projects/${projectId}/cadrages`, { form }),
  /** Crée une nouvelle version libre : le texte part tel quel au pipeline. */
  saveFreeCadrage: (projectId: string, text: string, sourceFilename: string | null) =>
    apiClient.post<SavedCadrage>(`${BASE}/projects/${projectId}/cadrages`, { kind: 'free', text, sourceFilename }),

  /**
   * 202 : l'analyse part en file. Fige la fiche courante et les documents du
   * projet. Refus : NO_DOCUMENTS, CADRAGE_REQUIRED, ANALYSIS_IN_PROGRESS,
   * ANALYSIS_QUOTA_EXCEEDED.
   */
  launchAnalysis: (projectId: string) =>
    apiClient.post<OnboardingAnalysis>(`${BASE}/projects/${projectId}/analyses`, {}),
  /** La plus récente d'abord ; le quota de l'organisation en meta. */
  listAnalyses:   (projectId: string) =>
    apiClient.getWithMeta<OnboardingAnalysis[], { quota: AnalysisQuota }>(`${BASE}/projects/${projectId}/analyses`),
  getAnalysis:    (projectId: string, analysisId: string) =>
    apiClient.get<OnboardingAnalysis>(`${BASE}/projects/${projectId}/analyses/${analysisId}`),
};
