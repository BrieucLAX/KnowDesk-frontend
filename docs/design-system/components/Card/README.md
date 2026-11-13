# Card

La carte regroupe un contenu cohérent : un article dans une liste, une section de page, un encart.

## Variantes

- `cx-card` : fond `surface-raised`, contour `line`, arrondi `radius-lg`. Sur un `<a>`, toute la carte devient le lien et le contour se renforce au survol.
- `cx-card--tinted` : fond `primary-soft` sans contour, pour la réponse courte ou un encart d'aide.
- `cx-card--warm` : fond `accent-soft`, réservé au bloc interne agents et aux mises en avant.

## Ce que fournit l'intégrateur

- Un titre `cx-card__title` (balise `h2` ou `h3` selon la hiérarchie de la page).
- Des métadonnées facultatives `cx-card__meta`.
- Le contenu : texte, badges, boutons.

## Règles

- Pas d'ombre sur les cartes posées sur la page : le contour suffit.
- Pas de bordure colorée sur un seul côté.
- Une carte cliquable ne contient pas d'autre lien ni de bouton.
