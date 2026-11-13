# Design system CX

Le socle visuel des outils CX, à commencer par la base de connaissance du service client. Une identité **moderne et chaleureuse** : un pétrole profond qui inspire confiance, une touche framboise pour la chaleur, des fonds crème plutôt que blancs, des coins généreusement arrondis.

> Première version, construite sans logo ni charte existante. Les couleurs, la police et les échelles sont des propositions à valider.

## Principes

- **Clair avant tout.** Un agent cherche une réponse avec un client en ligne : la hiérarchie doit se lire en une seconde. Un seul titre `display` par écran au plus, une seule action principale par zone.
- **Chaleureux, pas décoratif.** La chaleur vient des fonds `surface` crème, des arrondis et du ton, pas d'ornements. Pas de dégradés, pas d'emojis dans l'interface.
- **Aéré.** Grille de 8 px ; en cas de doute, prendre le pas d'espacement au-dessus.
- **Accessible.** Tout texte atteint au moins 4,5:1 sur son fond ; contours de contrôles et focus au moins 3:1.

## Ton et rédaction

- On parle comme un collègue compétent : phrases courtes, vocabulaire du client, pas de jargon interne.
- Les titres d'articles sont formulés comme la question du client : « Comment modifier mon adresse ? ».
- Les boutons disent ce qu'ils font, à l'infinitif : « Publier l'article », pas « OK ».
- Les messages d'erreur expliquent quoi faire : « Ajoutez un titre pour enregistrer l'article. »
- Pas de point d'exclamation, pas de majuscules pour insister.

## Couleurs

| Rôle | Token | Usage |
|---|---|---|
| Fonds | `surface`, `surface-raised` | Page en crème, cartes et panneaux en blanc. |
| Texte | `ink`, `ink-muted` | Texte principal ; texte secondaire et métadonnées. |
| Marque | `primary` (pétrole) | Action principale, liens, état actif, focus. Texte posé dessus : `on-primary`. |
| Chaleur | `accent` (framboise) | Mises en avant ponctuelles : badge « nouveau », FAQ. Moins de 5 % d'un écran. |
| Teintes | `primary-soft`, `accent-soft` | Fonds de sélection et d'encarts, toujours avec du texte `ink` ou de la couleur assortie. |
| Contours | `line`, `line-strong` | `line` pour séparer, `line-strong` pour les champs de formulaire. |

### Couleurs d'état

| État | Couleur | Fond | Usage |
|---|---|---|---|
| Succès | `success` | `success-soft` | Validé, publié, action réussie. |
| Alerte | `warning` | `warning-soft` | À vérifier, revue proche. |
| Erreur | `danger` | `danger-soft` | Échec, revue en retard, suppression. |
| Information | `info` | `info-soft` | En cours, en relecture, conseil. |

Règles :
- Un état ne se dit jamais par la couleur seule : toujours une icône ou un mot avec.
- Sur un fond `*-soft`, le texte est en `ink` ou dans la couleur d'état assortie ; seule l'icône prend la couleur dans un encart.
- `accent` n'est jamais une couleur d'état : la framboise sert uniquement aux mises en avant.
- `info` (bleu) se distingue de `primary` (pétrole) : une information ne doit pas ressembler à une action.
- Le focus clavier : anneau de 2 px en `focus`, décalé de 2 px.
- Pas de texte gris clair : le texte secondaire est toujours `ink-muted`.

## Typographie

Une seule famille, **Plus Jakarta Sans**, gratuite sur Google Fonts, en six niveaux : `display`, `title`, `heading`, `body`, `label`, `small`. Le corps de texte est en 15 px pour le confort de lecture des articles. Graisses utilisées : 400, 600 et 700.

## Espacements et arrondis

- Espacements : `space-2` (8 px), `space-4` (16 px), `space-6` (24 px), `space-8` (32 px).
- Arrondis : `radius-sm` (6 px) pour les badges, `radius-md` (12 px) pour les boutons et champs, `radius-lg` (20 px) pour les cartes et modales.
- Ombres : aucune sur les cartes posées sur la page ; `shadow-sm` pour les menus et notifications, `shadow-lg` pour les modales.

## Iconographie et logo

- Pas encore de logo : en attendant, le nom s'écrit en Plus Jakarta Sans 700, couleur `ink`.
- Icônes : le jeu **Lucide** uniquement, au trait de 2 px, en `currentColor`. Taille 16 px dans le texte, 20 px dans les boutons et encarts, 24 px en illustration. La sélection validée et le sens de chaque picto sont dans le groupe d'assets Icons.
- Jamais d'emoji dans l'interface.

## Composants

Huit composants, en HTML et CSS, préfixés `cx-` : `Button`, `TextField`, `SearchBar`, `Badge`, `Alert`, `Card`, `SegmentedControl`, `Modal`. Chacun a sa fiche avec les classes, ce que l'intégrateur fournit et les règles d'usage.

## Pour les sessions de développement

- Charger `tokens.css` (les variables) puis `components/bundle.css` (les composants et la police).
- Envelopper l'interface dans `cx-root` pour la police, la couleur de texte et le `box-sizing`.
- Utiliser uniquement les tokens et les classes `cx-` de ce système : aucune valeur codée en dur.
- Si un composant manque, le signaler plutôt que d'inventer un style.
