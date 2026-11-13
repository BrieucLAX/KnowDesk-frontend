# TextField

Le champ de formulaire permet de saisir du texte, sur une ligne (`input`) ou plusieurs (`textarea`).

## Structure

```html
<div class="cx-field">
  <label class="cx-label" for="titre">Titre</label>
  <input class="cx-input" id="titre" type="text">
  <span class="cx-help">Formulez le titre comme le client poserait la question.</span>
</div>
```

La même classe `cx-input` s'applique à `input`, `textarea` et `select`.

## Ce que fournit l'intégrateur

- Un `<label>` relié au champ par `for` et `id`, toujours visible. Le placeholder ne remplace jamais le libellé.
- Une aide facultative (`cx-help`) quand le format attendu n'est pas évident.
- En cas d'erreur : la classe `cx-field--error`, `aria-invalid="true"` sur le champ, et un message `cx-error` relié par `aria-describedby`, qui dit quoi faire.

## Règles

- Contour `line-strong` (3,6:1) au repos, `danger` en 2 px en erreur, anneau `focus` au clavier.
- Hauteur 48 px pour un champ simple.
- Le message d'erreur s'affiche quand l'utilisateur quitte le champ ou valide, pas à chaque frappe.
