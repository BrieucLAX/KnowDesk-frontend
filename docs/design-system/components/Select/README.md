# Select

Le sélecteur permet de choisir une valeur dans une liste courte : un type de document, un usage, une règle.

## Classes

- `cx-select` : l'enveloppe, qui place la flèche ; elle contient un `<select>` natif et l'icône `chevron-down` (classe `cx-icon`).
- Taille par défaut : 36 px de haut, pour les sélecteurs posés dans une ligne de liste ou de tableau.
- `cx-select--lg` : 48 px, aligné sur les champs de formulaire (`cx-input`).
- `cx-select--block` : prend toute la largeur disponible.

## Ce que fournit l'intégrateur

- Un `<label>` visible (ex. « Type de document », « Usage »), ou un `aria-label` si le libellé est implicite.
- Les options, avec la valeur sélectionnée.
- L'icône `chevron-down` après le `<select>`, avec `aria-hidden="true"`.

## Règles

- La flèche est toujours à 12 px du bord droit ; le texte ne passe jamais dessous (36 px réservés à droite).
- Pas de sélecteur pour deux choix seulement quand ils sont toujours visibles côte à côte : préférer le `SegmentedControl`.
- Au-delà d'une dizaine d'options, prévoir une recherche plutôt qu'une liste déroulante.
