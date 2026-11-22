# Card

La carte regroupe un contenu cohérent : un article dans une liste, une section de page, une rubrique de formulaire, un encart.

## Variantes

- `cx-card` : fond `surface-raised`, contour `line`, arrondi `radius-lg`. Sur un `<a>`, toute la carte devient le lien et le contour se renforce au survol.
- `cx-card--current` : contour `primary` de 2 px, pour la rubrique sur laquelle l'utilisateur doit agir maintenant. Une seule par écran.
- `cx-card--tinted` : fond `primary-soft` sans contour, pour la réponse courte ou un encart d'aide.
- `cx-card--warm` : fond `accent-soft`, réservé à un contenu préparé par KnowDesk ; il porte la mention `cx-kd` (voir KnowDeskContent).
- `cx-card--internal` : fond `surface` et contour pointillé, pour le bloc « Interne · réservé aux agents », avec l'icône `lock`.

## Ce que fournit l'intégrateur

- Un titre `cx-card__title` (balise `h2` ou `h3` selon la hiérarchie de la page).
- Des métadonnées facultatives `cx-card__meta`.
- Le contenu : texte, badges, boutons ; une pastille `cx-icontile` devant le titre d'une rubrique.

## Règles

- Pas d'ombre sur les cartes posées sur la page : le contour suffit.
- Pas de bordure colorée sur un seul côté.
- Une carte cliquable ne contient pas d'autre lien ni de bouton.
