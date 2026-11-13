import type { SidebarSection } from '../utils/types';

/**
 * Source de vérité pour la sidebar et les ancres.
 * Si tu ajoutes une section/un endpoint, mets à jour ce fichier — la sidebar
 * et les ancres `id="..."` dans `ApiDocsApp` lisent ces données.
 */
export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: 'Démarrage',
    links: [
      { href: '#auth',       label: 'Authentification' },
      { href: '#errors',     label: 'Erreurs' },
      { href: '#pagination', label: 'Pagination' },
      { href: '#scope',      label: 'Périmètre et chatbot' },
    ],
  },
  {
    label: 'Endpoints',
    links: [
      { href: '#categories', label: 'Catégories' },
      { href: '#articles',   label: 'Articles' },
      { href: '#trees',      label: 'Processus guidés' },
    ],
  },
];
