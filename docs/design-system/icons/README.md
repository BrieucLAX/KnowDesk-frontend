# Icônes

55 pictos issus de **Lucide** (licence ISC, libre d'usage commercial), au trait de 2 px, coins arrondis, grille de 24 px. Les fichiers ci-dessous sont tracés en `ink` (#27211c) pour l'aperçu ; dans le code, utiliser la bibliothèque Lucide (`lucide`, `lucide-react`…) avec les mêmes noms, en `currentColor`.

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

## Règles

- Tailles : 16 px dans le texte et les petits boutons, 20 px dans les boutons et encarts, 24 px en illustration de carte.
- Épaisseur de trait 2, jamais remplie, jamais d'emoji à la place d'un picto.
- Couleur : `currentColor`, donc celle du texte voisin ; en couleur d'état seulement dans un encart ou un badge d'état.
- Un picto seul dans un bouton porte un `aria-label` ; un picto à côté d'un texte est décoratif (`aria-hidden="true"`).
- Un même picto garde le même sens partout : `lock` signifie toujours « interne, réservé aux agents ».
- Besoin d'un picto absent de cette liste : le choisir dans Lucide, puis l'ajouter ici.

## Ajouts KnowDesk

Pictos Lucide ajoutés pour l'interface de KnowDesk (lot 4), avec leur sens. Ils suivent les mêmes règles que la liste d'origine.

| Usage | Pictos |
|---|---|
| Navigation de l'app | `house` (accueil), `graduation-cap` (formations), `radar` (brand monitoring), `life-buoy` (aide), `arrow-left` (retour, précédent), `chevron-up` (replier), `layout-grid` (vue cartes), `table` (vue tableau, insérer un tableau) |
| Actions | `rotate-cw` (relancer un calcul : réévaluer, réindexer, recharger, module à renouveler), `rotate-ccw` (recommencer, restaurer le défaut), `folder-input` (déplacer dans une catégorie), `play` (lancer une exécution), `arrow-up` / `arrow-down` (monter, descendre ; tri croissant, décroissant), `arrow-up-down` (colonne triable) |
| IA | `sparkles` (fonction d'IA : réponse, suggestions, génération) |
| Éditeur d'article | `list` (liste à puces), `list-todo` (liste de tâches), `quote` (citation), `megaphone` (encadré coloré), `minus` (séparateur), `highlighter` (surligner), `image` (image) |
| États | `circle` (à faire), `circle-dot` (en cours), `lock-keyhole` (réglage non modifiable ; `lock` reste « interne »), `inbox` (liste vide), `party-popper` (module terminé) |
| Brand monitoring | `smile` / `meh` / `frown` (sentiment positif, neutre, négatif), `target` (positionnement), `trending-down` (sujet manquant) |
| Divers | `globe` (public, hébergement hors de France), `cloud` (nuage de mots), `user-plus` (nouveau membre, accueil d'un conseiller), `scale` (réglementation, RGPD), `shield-alert` (sécurité, fraude) |
| Rubriques de l'aide | `newspaper` (nouveautés), `rocket` (premiers pas), `headphones` (conseillers), `briefcase` (cas d'usage) |

Deux pictos de la liste d'origine prennent un sens précis dans KnowDesk : `list-ordered` désigne les **processus guidés** (jamais la liste numérotée de l'éditeur, qui garde son libellé « 1. ») et `circle-help` les **FAQ** (l'aide a `life-buoy`).
