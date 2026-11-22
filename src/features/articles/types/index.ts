export type ArticleStatus  = 'draft' | 'published' | 'archived';

export interface ArticleVersion {
  version:   number;
  updatedAt: string;
  authorName: string;
  summary?:  string;  // optional change summary
}

export interface Article {
  id:          string;
  title:       string;
  content:     string;       // stored as HTML (from Tiptap)
  status:      ArticleStatus;
  categoryId:  string;
  categoryName: string;
  version:     number;
  versions:    ArticleVersion[];
  authorName:  string;
  updatedAt:   string;
  createdAt:   string;
  faqs:        ArticleFaq[];
  tags?:       string[];     // display_names ; absent si l'API n'a pas hydraté
  /** 'internal' : réservé à l'équipe (carte « Interne · réservé aux agents ») ; absent d'une réponse ancienne. */
  visibility?: 'internal' | 'public';
}

export interface ArticleFaq {
  id:       string;
  question: string;
  answer:   string;
  followUpQuestions?: string[];
}

export interface ArticleListItem {
  id:           string;
  title:        string;
  status:       ArticleStatus;
  categoryId:   string;
  categoryName: string;
  version:      number;
  authorName:   string;
  updatedAt:    string;
  tags?:        string[];
  /** Article publié non modifié depuis > 6 mois. Calculé à la volée
   *  backend (cf articles.repository.findMany). Pas de
   *  `last_reviewed_at` séparé pour l'instant — si on veut un bouton
   *  « C'est à jour » à la FAQ, faudra une migration. */
  isStale:      boolean;
  /** Nombre d'events `article.view` sur les 30 derniers jours. */
  viewsCount:   number;
  /** 'internal' (défaut) ou 'public' — gouvernance visibilité chatbot. */
  visibility:   'internal' | 'public';
}
