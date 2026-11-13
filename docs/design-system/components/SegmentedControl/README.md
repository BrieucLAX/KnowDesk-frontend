# SegmentedControl

Le sélecteur segmenté bascule entre deux à quatre affichages d'un même contenu : une période, une vue.

## Structure

Un conteneur `cx-segmented` avec `role="group"` et un `aria-label`, contenant des `<button class="cx-segmented__item">`. Le bouton actif porte `aria-pressed="true"`.

## Ce que fournit l'intégrateur

- Deux à quatre libellés courts, de longueur proche.
- La gestion de l'état : un seul bouton à `aria-pressed="true"` à la fois.

## Règles

- Pour changer de vue, pas pour déclencher une action : une action, c'est un `cx-btn`.
- Au-delà de quatre choix, utiliser une liste déroulante.
