# Icônes

62 pictos issus de **Lucide** (licence ISC, libre d'usage commercial), au trait de 2 px, coins arrondis, grille de 24 px. Les fichiers ci-dessous sont tracés en `ink` (#27211c) pour l'aperçu ; dans le code, utiliser la bibliothèque Lucide (`lucide`, `lucide-react`…) avec les mêmes noms, en `currentColor`.

## Par usage

| Usage | Pictos |
|---|---|
| Actions | `search`, `plus`, `pencil`, `trash-2`, `copy`, `check`, `x`, `filter`, `ellipsis`, `upload`, `download`, `share-2` |
| Navigation | `chevron-right`, `chevron-down`, `arrow-right`, `external-link` |
| Contenus de la base | `book-open`, `file-text`, `folder`, `list-ordered`, `circle-help`, `message-square-text`, `lightbulb`, `tag`, `link`, `history`, `star` |
| Statuts | `circle-check` (succès), `triangle-alert` (alerte), `circle-alert` (erreur), `info` (information), `clock` (en attente, revue), `lock` (interne), `eye` / `eye-off` (visibilité), `flag` (signaler) |
| Personnes et contact | `user`, `users`, `phone`, `mail`, `message-circle` |
| Pilotage | `chart-column`, `trending-up`, `calendar`, `settings`, `bell`, `thumbs-up`, `thumbs-down` |
| Thèmes clients | `package` (commandes), `undo-2` (retours), `credit-card` (paiement), `refresh-cw` (abonnements), `shield-check` (garanties) |
| Reprise de l'existant | `file-search` (analyse), `git-compare` (incohérence) |
| Origine KnowDesk | `sparkles` : tout contenu préparé par KnowDesk, toujours avec la mention écrite |
| Étapes de l'onboarding | `file-text` (Documents), `building` (Contexte métier), `scale` (Points à trancher), `list` (Plan), `eye` (Relecture et publication) |
| Rubriques du contexte métier | `building-2` (Votre entreprise), `package` (Vos offres), `users` (Vos publics), `layers` (Vos documents de référence), `calendar-clock` (Changements à venir) |

## Règles

- Tailles : 16 px dans le texte et les petits boutons, 20 px dans les boutons, encarts et le stepper, 24 px dans les pastilles d'icône et en illustration de carte.
- Épaisseur de trait 2, jamais remplie, jamais d'emoji à la place d'un picto.
- Couleur : `currentColor`, donc celle du texte voisin ; en couleur d'état seulement dans un encart ou un badge d'état.
- Un picto seul dans un bouton porte un `aria-label` ; un picto à côté d'un texte est décoratif (`aria-hidden="true"`).
- Un même picto garde le même sens partout : `lock` signifie toujours « interne, réservé aux agents », `sparkles` toujours « préparé par KnowDesk », `trash-2` toujours « supprimer ».
- Besoin d'un picto absent de cette liste : le choisir dans Lucide, puis l'ajouter ici.

## Ajouts KnowDesk

Pictos Lucide ajoutés pour l'interface de KnowDesk (lot 4), avec leur sens. Ils suivent les mêmes règles que la liste d'origine.

| Usage | Pictos |
|---|---|
| Navigation de l'app | `house` (accueil), `graduation-cap` (formations), `radar` (brand monitoring), `life-buoy` (aide), `arrow-left` (retour, précédent), `chevron-up` (replier), `layout-grid` (vue cartes), `table` (vue tableau, insérer un tableau) |
| Actions | `trash-2` (toute suppression : bouton, menu d'actions, ligne d'un formulaire ; jamais `x`, qui ferme ou retire une puce de saisie), `rotate-cw` (relancer un calcul : réévaluer, réindexer, recharger, module à renouveler), `rotate-ccw` (recommencer, restaurer le défaut), `folder-input` (déplacer dans une catégorie), `play` (lancer une exécution), `arrow-up` / `arrow-down` (monter, descendre ; tri croissant, décroissant), `arrow-up-down` (colonne triable) |
| Origine KnowDesk | `sparkles` : préparé par KnowDesk (réponse, suggestion, article rédigé, point tranché), toujours avec la mention écrite qui nomme KnowDesk. Un bouton qui lance une préparation par KnowDesk peut la garder, mais reste un bouton normal, sans prune. Ce n'est plus le picto d'une « fonction d'IA » : un titre de réglage ou de statistique prend le picto de son sujet. |
| Sujets des fonctions de KnowDesk | `bot` (chatbot public), `search` (recherche interne), `file-check` (auditeur qualité des articles), `message-square-text` (réponses de la recherche, statistiques de réponse) |
| Éditeur d'article | `list` (liste à puces), `list-todo` (liste de tâches), `quote` (citation), `megaphone` (encadré coloré), `minus` (séparateur), `highlighter` (surligner), `image` (image) |
| États | `circle` (à faire), `circle-dot` (en cours), `lock-keyhole` (réglage non modifiable ; `lock` reste « interne » et porte la carte « Interne · réservé aux agents »), `inbox` (liste vide), `party-popper` (module terminé) |
| Brand monitoring | `smile` / `meh` / `frown` (sentiment positif, neutre, négatif), `target` (positionnement), `trending-down` (sujet manquant) |
| Divers | `globe` (public, hébergement hors de France), `cloud` (nuage de mots), `user-plus` (nouveau membre, accueil d'un conseiller), `file-lock` (données personnelles, RGPD), `shield-alert` (sécurité, fraude) |
| Rubriques de l'aide | `newspaper` (nouveautés), `rocket` (premiers pas), `headphones` (conseillers), `briefcase` (cas d'usage) |
| Étapes du projet d'onboarding (lot 7b, noms d'écran inchangés) | `file-text` (Documents), `building` (Fiche de cadrage), `file-search` (Analyse), `scale` (À clarifier), `list` (Nouvelle base), `pencil` (renommer le projet) |
| Sections de la fiche de cadrage (lot 7b) | `package` (1. Les offres), `users` (2. Les segments de clientèle), `concierge-bell` (3. Les services et activités), `equal-not` (4. Notions à ne jamais confondre), `layers` (5. Hiérarchie des sources), `calendar-clock` (6. Documents à durée limitée) |

Pictos de la liste d'origine qui prennent un sens précis dans KnowDesk : `list-ordered` désigne les **processus guidés** (jamais la liste numérotée de l'éditeur, qui garde son libellé « 1. ») et `circle-help` les **FAQ** (l'aide a `life-buoy`). `scale` ne sert qu'à « Points à trancher » (dans l'app : l'étape « À clarifier ») et `package` qu'à « Vos offres » (dans l'app : la section « Les offres » de la fiche de cadrage) : la réglementation et le RGPD prennent `file-lock`.
