# ActionBar

La barre d'action porte l'action principale d'un écran de parcours. Elle reste visible en bas de l'écran pendant le défilement.

## Classes

- `cx-actionbar` : la barre, collée à 16 px du bas, fond `surface-raised`, ombre `shadow-sm`.
- `cx-actionbar__note` : une phrase qui dit ce qui va se passer ou ce qui reste à faire.
- `cx-actionbar__actions` : les boutons, alignés à droite.

## Ce que fournit l'intégrateur

- Un bouton `cx-btn--primary` qui mène à l'étape suivante, au libellé explicite (« Valider et lancer l'analyse »).
- Au plus une action secondaire, en `cx-btn--ghost` (« Finir plus tard »).
- La note : la conséquence de l'action, ou ce qui sera signalé.

## Règles

- Une seule barre d'action par écran, une seule action principale.
- Pas d'action irréversible sans confirmation (voir Modal).
