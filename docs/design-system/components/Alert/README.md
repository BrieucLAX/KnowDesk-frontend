# Alert

L'encart d'alerte porte un message de contexte : une information, une confirmation, un point à vérifier ou une erreur.

## Variantes

- `cx-alert--info` : information utile, sans action attendue.
- `cx-alert--success` : confirmation qu'une action a réussi.
- `cx-alert--warning` : un point demande de l'attention avant d'agir.
- `cx-alert--danger` : une action a échoué ; dire pourquoi et quoi faire.

## Ce que fournit l'intégrateur

- Une icône de 20 px en tête (`cx-icon`), dont la couleur est donnée par la variante.
- Un titre court (`cx-alert__title`) et/ou un texte (`cx-alert__text`).
- `role="status"` pour l'info, le succès et l'alerte ; `role="alert"` pour l'erreur.

## Règles

- Le texte reste en `ink` : seule l'icône prend la couleur d'état.
- Une erreur dit toujours quoi faire ensuite.
- Pas d'encart `accent` : la framboise n'est pas un état.
