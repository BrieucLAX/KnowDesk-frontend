# Design system CX

Le socle visuel des outils CX, à commencer par la base de connaissance du service client et son parcours d'onboarding. Une identité **moderne et chaleureuse** : un pétrole profond qui inspire confiance, une touche prune pour signaler ce que KnowDesk a préparé, des fonds crème plutôt que blancs, des coins généreusement arrondis.

> Première version, construite sans logo ni charte existante. Les couleurs, la police et les échelles sont des propositions à valider.

## Principes

- **Clair avant tout.** Un agent cherche une réponse avec un client en ligne : la hiérarchie doit se lire en une seconde. Un seul titre `display` par écran au plus, une seule action principale par zone.
- **Chaleureux, pas décoratif.** La chaleur vient des fonds `surface` crème, des arrondis et du ton, pas d'ornements. Pas de dégradés, pas d'emojis dans l'interface.
- **Aéré.** Grille de 8 px ; en cas de doute, prendre le pas d'espacement au-dessus.
- **Accessible.** Tout texte atteint au moins 4,5:1 sur son fond ; contours de contrôles et focus au moins 3:1.
- **On sait toujours qui a fait quoi.** Ce que KnowDesk a préparé est en prune, ce que l'utilisateur a ajouté en pétrole clair, chacun avec une mention écrite.

## Ton et rédaction

- On parle comme un collègue compétent : phrases courtes, vocabulaire du client, pas de jargon interne.
- Les titres d'articles sont formulés comme la question du client : « Comment modifier mon adresse ? ».
- Les boutons disent ce qu'ils font, à l'infinitif : « Publier l'article », pas « OK ».
- Les messages d'erreur expliquent quoi faire : « Ajoutez un titre pour enregistrer l'article. »
- Pas de point d'exclamation, pas de majuscules pour insister.
- Les textes d'interface sont les mêmes pour tous les clients : ils ne citent jamais le secteur ni les documents d'un client. Seul le contenu généré peut le faire.

## Couleurs

| Rôle | Token | Usage |
|---|---|---|
| Fonds | `surface`, `surface-raised` | Page en crème, cartes et panneaux en blanc. |
| Texte | `ink`, `ink-muted` | Texte principal ; texte secondaire et métadonnées. |
| Marque | `primary` (pétrole) | Action principale, liens, état actif, focus, en-tête de page. Texte posé dessus : `on-primary`. |
| KnowDesk | `accent` (prune) | Ce que KnowDesk a préparé : contenu pré-rempli, tranché, rédigé ou suggéré par l'IA. |
| Teintes | `primary-soft`, `accent-soft` | `primary-soft` : sélection, ce que l'utilisateur a ajouté. `accent-soft` : badge et encart « préparé par KnowDesk ». |
| Contours | `line`, `line-strong` | `line` pour séparer, `line-strong` pour les champs de formulaire. |

### Couleurs d'état

| État | Couleur | Fond | Usage |
|---|---|---|---|
| Succès | `success` | `success-soft` | Validé, publié, étape terminée, action réussie. |
| Alerte | `warning` | `warning-soft` | À vérifier, revue proche. |
| Erreur | `danger` | `danger-soft` | Échec, revue en retard, suppression. |
| Information | `info` | `info-soft` | En cours, en relecture, conseil. |

Règles :
- Un état ne se dit jamais par la couleur seule : toujours une icône ou un mot avec. Une action de suppression porte l'icône `trash-2`.
- **La prune ne s'emploie jamais seule** : elle accompagne toujours une mention explicite de KnowDesk (« Préparé par KnowDesk », « Tranché automatiquement par KnowDesk », « Rédigé par KnowDesk ») et l'icône `sparkles`. Pas de légende de couleur dans les écrans : si une couleur a besoin d'une légende, c'est que le libellé manque.
- `accent` n'est jamais une couleur d'état ni d'action : la prune signale uniquement l'origine d'un contenu.
- Ce que l'utilisateur a ajouté lui-même (« Ajouté par vous », « Nouvelle ») est en `primary-soft` / `primary`.
- `info` (bleu) se distingue de `primary` (pétrole) : une information ne doit pas ressembler à une action.
- Le focus clavier : anneau de 2 px en `focus`, décalé de 2 px.
- Pas de texte gris clair : le texte secondaire est toujours `ink-muted`.

## Typographie

Une seule famille, **Plus Jakarta Sans**, gratuite sur Google Fonts, en six niveaux : `display`, `title`, `heading`, `body`, `label`, `small`. Le corps de texte est en 15 px pour le confort de lecture des articles. Graisses utilisées : 400, 600 et 700.

## Espacements et arrondis

- Espacements : `space-2` (8 px), `space-4` (16 px), `space-6` (24 px), `space-8` (32 px).
- Arrondis : `radius-sm` (6 px) pour les badges, `radius-md` (12 px) pour les boutons, champs et pastilles d'icône, `radius-lg` (20 px) pour les cartes, modales et barre d'action.
- Ombres : aucune sur les cartes posées sur la page ; `shadow-sm` pour les menus, notifications et la barre d'action collante, `shadow-lg` pour les modales.

## Structure d'un écran de parcours

Les écrans d'un parcours en étapes (comme l'onboarding) suivent tous la même structure, de haut en bas :

1. **En-tête de page** (`PageHeader`) : bandeau pétrole avec retour, nom du client, titre `display` et une phrase d'introduction.
2. **Stepper** (`Stepper`) : carte blanche qui chevauche l'en-tête, une icône par étape, étapes terminées en `success`, étape en cours en `primary`.
3. **Contenu** : cartes, avec une pastille d'icône (`IconTile`) par rubrique quand l'écran en a plusieurs.
4. **Barre d'action** (`ActionBar`) : collée en bas de l'écran, une seule action principale.

## Iconographie et logo

- Pas encore de logo : en attendant, le nom s'écrit en Plus Jakarta Sans 700, couleur `ink`.
- Icônes : le jeu **Lucide** uniquement, au trait de 2 px, en `currentColor`. Taille 16 px dans le texte, 20 px dans les boutons, encarts et le stepper, 24 px dans les pastilles d'icône. La sélection validée et le sens de chaque picto sont dans le groupe d'assets Icons.
- Jamais d'emoji dans l'interface.

## Composants

Quatorze composants, en HTML et CSS, préfixés `cx-` : `Button`, `TextField`, `Select`, `SearchBar`, `Badge`, `Alert`, `Card`, `SegmentedControl`, `Modal`, `PageHeader`, `Stepper`, `IconTile`, `ActionBar`, `KnowDeskContent`. Chacun a sa fiche avec les classes, ce que l'intégrateur fournit et les règles d'usage.

## Pour les sessions de développement

- Charger `tokens.css` (les variables) puis `components/bundle.css` (les composants et la police).
- Envelopper l'interface dans `cx-root` pour la police, la couleur de texte et le `box-sizing`.
- Utiliser uniquement les tokens et les classes `cx-` de ce système : aucune valeur codée en dur.
- Si un composant manque, le signaler plutôt que d'inventer un style.
