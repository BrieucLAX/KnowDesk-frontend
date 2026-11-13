import { apiClient } from '../../../shared/lib/apiClient';

export type QualityDimension =
  | 'clarity'
  | 'actionable'
  | 'title_match'
  | 'structure'
  | 'freshness'
  | 'vocabulary';

export const ALL_DIMENSIONS: QualityDimension[] = [
  'clarity', 'actionable', 'title_match', 'structure', 'freshness', 'vocabulary',
];

export const DIMENSION_LABEL: Record<QualityDimension, string> = {
  clarity:     'Clarté',
  actionable:  'Actionnable',
  title_match: 'Titre et contenu',
  structure:   'Structure',
  freshness:   'Fraîcheur',
  vocabulary:  'Vocabulaire',
};

export const DIMENSION_HELP: Record<QualityDimension, string> = {
  clarity:     'Un conseiller comprend sans ambigüité quoi faire ?',
  actionable:  'Étapes concrètes ou politique claire ?',
  title_match: 'Le titre annonce-t-il fidèlement le contenu ?',
  structure:   'Sections, listes ou tableaux pour les articles longs ?',
  freshness:   'Mention de prix, de délai ou de lien externe à vérifier régulièrement.',
  vocabulary:  'Glossaire de l\'organisation respecté ?',
};

export interface QualityIssue {
  dimension: QualityDimension;
  message:   string;
  excerpt?:  string;
}

export interface QualityResult {
  dimensions: Record<QualityDimension, 'ok' | 'flagged'>;
  issues:     QualityIssue[];
  score:      number;  // 0-6 (nb dimensions OK)
  checkedAt:  string;
  model:      string;
}

export interface QualityForArticle {
  quality:        QualityResult | null;
  checkedAt:      string | null;
  versionAtCheck: number | null;
  currentVersion: number;
  dismissed:      Record<string, boolean>;
  /** True si la version courante > version au moment du scoring → re-score recommandé. */
  stale:          boolean;
}

export interface ArticleToRework {
  id:                string;
  title:             string;
  score:             number;
  flaggedDimensions: QualityDimension[];
  checkedAt:         string | null;
  updatedAt:         string | null;
  categoryName:      string | null;
  authorName:        string;
}

export interface QualityStats {
  published:   number;
  scored:      number;
  notScored:   number;
  /** 0 dimension flagged */
  perfect:     number;
  /** 1-2 dimensions flagged */
  good:        number;
  /** ≥ 3 dimensions flagged */
  toRework:    number;
  lastChecked: string | null;
}

export type QualityTier = 'perfect' | 'good' | 'toRework';

export const articleQualityApi = {
  async getForArticle(articleId: string): Promise<QualityForArticle> {
    return apiClient.get<QualityForArticle>(`/article-quality/${articleId}`);
  },

  async recheck(articleId: string): Promise<QualityResult> {
    return apiClient.post<QualityResult>(`/article-quality/${articleId}/recheck`, {});
  },

  async dismissDimension(articleId: string, dimension: QualityDimension): Promise<{ dismissed: Record<string, boolean> }> {
    return apiClient.post<{ dismissed: Record<string, boolean> }>(
      `/article-quality/${articleId}/dismiss`,
      { dimension },
    );
  },

  async resetDismissed(articleId: string): Promise<{ dismissed: Record<string, boolean> }> {
    return apiClient.post<{ dismissed: Record<string, boolean> }>(
      `/article-quality/${articleId}/reset-dismissed`,
      {},
    );
  },

  async listToRework(tier: QualityTier = 'toRework'): Promise<{ items: ArticleToRework[]; total: number }> {
    return apiClient.get<{ items: ArticleToRework[]; total: number }>(
      `/article-quality/to-rework?tier=${tier}`,
    );
  },

  async stats(): Promise<QualityStats> {
    return apiClient.get<QualityStats>('/article-quality/stats');
  },

  async rescoreAll(): Promise<{ enqueued: number }> {
    return apiClient.post<{ enqueued: number }>('/article-quality/rescore-all', {});
  },

  async getFeature(): Promise<{ enabled: boolean }> {
    return apiClient.get<{ enabled: boolean }>('/article-quality/feature');
  },

  async setFeature(enabled: boolean): Promise<{ enabled: boolean }> {
    return apiClient.patch<{ enabled: boolean }>('/article-quality/feature', { enabled });
  },
};
