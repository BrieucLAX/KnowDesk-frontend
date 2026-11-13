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
