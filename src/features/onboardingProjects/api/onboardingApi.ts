import { apiClient } from '../../../shared/lib/apiClient';
import type {
  AnalysisQuota, Cadrage, CadrageForm, CadrageVersionSummary, OnboardingAnalysis, OnboardingDocument,
  OnboardingNotice, OnboardingProject, OnboardingProjectSummary, SavedCadrage,
} from '../types';
import type { AuditResponse } from '../lib/audit';
import type { CardAction } from '../lib/reading';
import type { CancelResult, Decision, DecisionAction, DecisionsState } from '../lib/decisions';

const BASE = '/onboarding';

/** Module Onboarding (back, étapes F1 à F3). Toutes les routes : admin ou manager, module onboarding. */
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

  /** Audit d'une analyse réussie, tel que livré ; 404 sinon. */
  getAudit: (projectId: string, analysisId: string) =>
    apiClient.get<AuditResponse>(`${BASE}/projects/${projectId}/analyses/${analysisId}/audit`),
  /** Image citée par l'audit (octets relayés par le back depuis le bucket privé). */
  getAuditImage: (projectId: string, analysisId: string, imageId: string) =>
    apiClient.getBlob(`${BASE}/projects/${projectId}/analyses/${analysisId}/images/${encodeURIComponent(imageId)}`),

  /** Décision courante de chaque question décidée, compteurs, et si l'audit s'arbitre encore. */
  listDecisions: (projectId: string, analysisId: string) =>
    apiClient.get<DecisionsState>(`${BASE}/projects/${projectId}/analyses/${analysisId}/decisions`),
  /** Historique d'une question, du plus ancien au plus récent, annulations comprises. */
  questionHistory: (projectId: string, analysisId: string, questionId: string) =>
    apiClient.get<Decision[]>(`${BASE}/projects/${projectId}/analyses/${analysisId}/decisions?questionId=${encodeURIComponent(questionId)}`),
  /**
   * 201. `expectedCurrentId` : la décision courante affichée (null si aucune) ;
   * 409 DECISION_CONFLICT si elle a changé entre-temps.
   */
  decide: (projectId: string, analysisId: string, body: { questionId: string; expectedCurrentId: string | null; action: DecisionAction }) =>
    apiClient.post<Decision>(`${BASE}/projects/${projectId}/analyses/${analysisId}/decisions`, body),
  /** Historique d'une carte (audit 0.8.0), du plus ancien au plus récent, annulations comprises. */
  cardHistory: (projectId: string, analysisId: string, cardId: string) =>
    apiClient.get<Decision[]>(`${BASE}/projects/${projectId}/analyses/${analysisId}/decisions?cardId=${encodeURIComponent(cardId)}`),
  /** Réponse à une carte (audit 0.8.0) : 201 ; 409 DECISION_CONFLICT si la réponse courante a changé entre-temps. */
  answerCard: (projectId: string, analysisId: string, body: { cardId: string; expectedCurrentId: string | null; action: CardAction }) =>
    apiClient.post<Decision>(`${BASE}/projects/${projectId}/analyses/${analysisId}/decisions`, body),
  /** Annule la décision courante d'une question ou d'une carte (Q1). */
  cancelDecision: (projectId: string, analysisId: string, decisionId: string) =>
    apiClient.post<CancelResult>(`${BASE}/projects/${projectId}/analyses/${analysisId}/decisions/${decisionId}/cancel`, {}),
};
