# Button

Le bouton déclenche une action : publier, enregistrer, accepter, supprimer.

## Variantes

| Classe | Usage |
|---|---|
| `cx-btn cx-btn--primary` | L'action principale de la zone, une seule par zone : « Publier l'article », « Envoyer la réponse ». |
| `cx-btn cx-btn--secondary` | Les actions de second rang à côté du principal : « Enregistrer le brouillon », « Refuser ». |
| `cx-btn cx-btn--ghost` | Les actions discrètes dans un contenu : « Ajouter une étape », « Voir tout ». |
| `cx-btn cx-btn--danger` | Les actions destructrices, toujours confirmées par une modale. |

Modificateurs : `cx-btn--sm` (36 px de haut, dans les cartes et listes denses), `cx-btn--icon` (bouton carré avec une seule icône, `aria-label` obligatoire).

## Ce que fournit l'intégrateur

- Un vrai `<button>` (ou un `<a>` pour une navigation), jamais une `<div>` cliquable.
- Un libellé à l'infinitif qui dit ce qui va se passer. Pas de « OK », pas de « Valider » seul.
- Une icône facultative de 16 px placée avant le texte, en `currentColor`.

## Règles

- Hauteur minimale 44 px, pour le toucher.
- Focus clavier : anneau `focus` de 2 px, décalé de 2 px.
- État désactivé (`disabled`) : fond `line`, texte `ink-muted`. Préférer expliquer pourquoi l'action n'est pas possible plutôt que désactiver sans explication.
- Ne jamais utiliser `accent` pour un bouton : la framboise est réservée aux mises en avant.
