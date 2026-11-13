# Modal

La modale demande une décision avant de continuer : confirmer une suppression, une publication, une action irréversible.

## Structure

Un fond `cx-backdrop` qui couvre la page, et dedans une boîte `cx-modal` avec un titre `cx-modal__title`, un texte, et une rangée `cx-modal__actions`.

## Ce que fournit l'intégrateur

- `role="dialog"`, `aria-modal="true"` et `aria-labelledby` pointant sur le titre.
- Un titre en question qui reprend l'action : « Supprimer cet article ? ».
- Un texte qui dit la conséquence et si elle est réversible.
- Deux boutons : à gauche l'annulation (`cx-btn--secondary`), à droite l'action, avec un libellé qui la répète (« Supprimer l'article », pas « Oui »).
- Le focus placé dans la modale à l'ouverture, renvoyé au déclencheur à la fermeture, et la touche Échap pour fermer.

## Règles

- Une modale par écran, jamais de modale dans une modale.
- Pour une simple information, préférer un `cx-alert` dans la page.
