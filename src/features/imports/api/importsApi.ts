import { apiClient } from '../../../shared/lib/apiClient';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export type ImportStatus    = 'pending' | 'processing' | 'completed' | 'failed';
export type ImportSplitMode = 'one_article' | 'split_by_section';
export type ImportFormat    = 'pdf' | 'docx' | 'pptx';

export interface ImportItem {
  id:                string;
  filename:          string;
  format:            ImportFormat;
  split_mode:        ImportSplitMode;
  status:            ImportStatus;
  articles_created:  number;
  error_message:     string | null;
  category_id:       string | null;
  category_name:     string | null;
  user_email?:       string | null;
  created_at:        string;
  completed_at:      string | null;
}

export const importsApi = {
  /**
   * Upload via fetch direct (apiClient force Content-Type: application/json,
   * incompatible avec multipart). On laisse le navigateur poser le bon
   * Content-Type avec boundary. credentials:include pour le cookie auth.
   */
  async upload(file: File, splitMode: ImportSplitMode): Promise<ImportItem> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('splitMode', splitMode);
    const res = await fetch(`${API_BASE}/imports`, {
      method:      'POST',
      body:        fd,
      credentials: 'include',
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      throw new Error(body.error?.message ?? body.error ?? `L'envoi du fichier a échoué (code ${res.status}). Réessayez dans un instant.`);
    }
    return body.data as ImportItem;
  },

  list(): Promise<ImportItem[]> {
    return apiClient.get<ImportItem[]>('/imports');
  },

  get(id: string): Promise<ImportItem> {
    return apiClient.get<ImportItem>(`/imports/${encodeURIComponent(id)}`);
  },
};
