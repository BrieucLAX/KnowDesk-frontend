import type { DashboardData } from '../types';
import { simulateDelay } from '../../auth/api/authApi.mock';

export const MOCK_DASHBOARD_DATA: DashboardData = {
  stats: {
    totalArticles:    24,
    publishedArticles: 18,
    totalFaqs:        42,
    teamMembers:       8,
  },

  recentItems: [
    {
      id:         'art-1',
      title:      'Politique de remboursement express',
      category:   'Livraisons',
      status:     'published',
      updatedAt:  new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 90min ago
      version:    4,
      authorName: 'Marc Duval',
    },
    {
      id:         'art-2',
      title:      'Traitement des retours après 30 jours',
      category:   'Retours',
      status:     'published',
      updatedAt:  new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      version:    2,
      authorName: 'Sophie Martin',
    },
    {
      id:         'art-3',
      title:      'Gestion des litiges livraison — nouveau process',
      category:   'Livraisons',
      status:     'draft',
      updatedAt:  new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      version:    1,
      authorName: 'Marc Duval',
    },
    {
      id:         'art-4',
      title:      'Procédure résiliation abonnement Premium',
      category:   'Abonnements',
      status:     'published',
      updatedAt:  new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      version:    6,
      authorName: 'Lucie Benoît',
    },
  ],

  activity: [
    { id: 'a1', type: 'article_published', message: 'a publié "Politique de remboursement express"',     timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), authorName: 'Marc D.' },
    { id: 'a2', type: 'member_joined',     message: "a rejoint l'organisation",                          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), authorName: 'Camille R.' },
    { id: 'a3', type: 'faq_created',       message: 'a créé 3 nouvelles FAQ dans Abonnements',           timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), authorName: 'Lucie B.' },
    { id: 'a4', type: 'article_updated',   message: 'a mis à jour "Procédure résiliation abonnement"',   timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), authorName: 'Marc D.' },
  ],

  checklist: [
    { id: 'c1', label: 'Créer votre première catégorie',   completed: true,  href: '/categories/new' },
    { id: 'c2', label: 'Publier votre premier article',     completed: true,  href: '/articles/new' },
    { id: 'c3', label: 'Inviter votre équipe',              completed: false, href: '/settings/members' },
    { id: 'c4', label: 'Tester la recherche',               completed: false, href: '/search' },
  ],
};

/** Empty state — advisor joining a new org with no content yet */
export const MOCK_EMPTY_DASHBOARD: DashboardData = {
  stats: { totalArticles: 0, publishedArticles: 0, totalFaqs: 0, teamMembers: 1 },
  recentItems: [],
  activity:    [],
  checklist:   [],
};

export async function mockGetDashboard(isEmpty = false): Promise<DashboardData> {
  await simulateDelay(600);
  return isEmpty ? MOCK_EMPTY_DASHBOARD : MOCK_DASHBOARD_DATA;
}
