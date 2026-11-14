import type { Endpoint } from '../utils/types';
import { makeExamples } from '../utils/makeExamples';

export const ENDPOINTS: Endpoint[] = [
  // ── Catégories ──
  {
    method:      'GET',
    path:        '/categories',
    title:       'Lister les catégories',
    description:
      'Retourne toutes les catégories de votre base de connaissance, avec leur hiérarchie. Une catégorie racine a un parent_id à null ; les sous-catégories pointent vers leur parent via parent_id.',
    response: JSON.stringify({
      data: [
        { id: 'uuid-mobile',     name: 'Mobile',              parent_id: null,             position: 0 },
        { id: 'uuid-activation', name: 'Activation',          parent_id: 'uuid-mobile',    position: 0 },
        { id: 'uuid-reseau',     name: 'Réseau & couverture', parent_id: 'uuid-mobile',    position: 1 },
        { id: 'uuid-box',        name: 'Box & Internet fixe', parent_id: null,             position: 1 },
      ],
      error: null,
    }, null, 2),
    examples: makeExamples({ path: '/categories' }),
  },

  // ── Articles ──
  {
    method:      'GET',
    path:        '/articles',
    title:       'Lister les articles',
    description:
      'Retourne les articles publiés. La liste ne contient pas le contenu HTML — utilisez l\'endpoint de détail pour récupérer le contenu complet.',
    params: [
      { name: 'categoryId', type: 'uuid',   required: false, description: 'Filtrer par catégorie' },
      { name: 'q',          type: 'string', required: false, description: 'Recherche full-text dans le titre et le contenu' },
      { name: 'tags',       type: 'string', required: false, description: 'Liste de tags séparés par des virgules (filtre AND)' },
      { name: 'page',       type: 'number', required: false, description: 'Numéro de page (défaut : 1)' },
      { name: 'perPage',    type: 'number', required: false, description: 'Résultats par page (défaut : 20, max : 100)' },
    ],
    response: JSON.stringify({
      data: [
        {
          id:            'uuid',
          title:         'Guide de retour produit',
          status:        'published',
          version:       2,
          updated_at:    '2026-04-19T17:12:17.171Z',
          category_id:   'uuid',
          category_name: 'Livraisons',
          tags:          ['retour', 'remboursement'],
        },
      ],
      error: null,
    }, null, 2),
    examples: makeExamples({ path: '/articles', query: { page: 1, perPage: 20 } }),
  },
  {
    method:      'GET',
    path:        '/articles/:id',
    title:       'Détail d\'un article',
    description: 'Retourne le contenu complet d\'un article publié, incluant le HTML.',
    response: JSON.stringify({
      data: {
        id:            'uuid',
        title:         'Guide de retour produit',
        content:       { html: "<p>Contenu de l'article...</p>" },
        status:        'published',
        version:       2,
        updated_at:    '2026-04-19T17:12:17.171Z',
        category_id:   'uuid',
        category_name: 'Livraisons',
        author_email:  'admin@exemple.fr',
        tags:          ['retour', 'remboursement'],
      },
      error: null,
    }, null, 2),
    examples: makeExamples({ path: '/articles/:id', pathParamLabel: 'article_id' }),
  },

  // ── Processus guidés ──
  {
    method:      'GET',
    path:        '/trees',
    title:       'Lister les processus guidés',
    description:
      'Retourne les processus guidés publiés. Utilisez l\'endpoint de détail pour récupérer les nœuds et réponses.',
    response: JSON.stringify({
      data: [
        {
          id:            'uuid',
          title:         'Processus de remboursement',
          description:   'Arbre guidé pour les demandes de remboursement',
          updated_at:    '2026-04-21T18:39:21.206Z',
          category_id:   null,
          category_name: null,
        },
      ],
      error: null,
    }, null, 2),
    examples: makeExamples({ path: '/trees' }),
  },
  {
    method:      'GET',
    path:        '/trees/:id',
    title:       'Détail d\'un processus guidé',
    description: 'Retourne la structure complète d\'un processus guidé avec tous ses nœuds et réponses.',
    response: JSON.stringify({
      data: {
        id:    'uuid',
        title: 'Processus de remboursement',
        nodes: [
          {
            id:               'uuid',
            type:             'question',
            content:          'Le produit est-il défectueux ?',
            parent_id:        null,
            parent_answer_id: null,
            answers: [
              { id: 'uuid', label: 'Oui', position: 0 },
              { id: 'uuid', label: 'Non', position: 1 },
            ],
          },
          {
            id:               'uuid',
            type:             'conclusion',
            content:          'Remboursement intégral accordé.',
            parent_id:        'uuid',
            parent_answer_id: 'uuid',
            answers:          [],
          },
        ],
      },
      error: null,
    }, null, 2),
    examples: makeExamples({ path: '/trees/:id', pathParamLabel: 'tree_id' }),
  },
];
