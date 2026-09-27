import { apiClient } from '../../../shared/lib/apiClient';
import type {
  Cadrage, CadrageForm, CadrageVersionSummary, OnboardingDocument, OnboardingNotice,
  OnboardingProject, OnboardingProjectSummary, SavedCadrage,
} from '../types';

const BASE = '/onboarding';

/** Module Onboarding (back, étape F1). Toutes les routes : admin ou manager, module onboarding. */
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
  /** Crée une nouvelle version (les versions sont immuables). */
  saveCadrage:  (projectId: string, form: CadrageForm) =>
    apiClient.post<SavedCadrage>(`${BASE}/projects/${projectId}/cadrages`, { form }),
};
