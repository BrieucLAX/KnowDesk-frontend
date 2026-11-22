# Badge

Le badge donne en un coup d'œil le statut, le type ou l'origine d'un élément. Il n'est jamais cliquable.

## Variantes

| Classe | Usage |
|---|---|
| `cx-badge--success` | Article validé, publié, rubrique validée. |
| `cx-badge--warning` | Revue proche, point à vérifier, à compléter. |
| `cx-badge--danger` | Revue en retard, erreur signalée. |
| `cx-badge--info` | En relecture, en cours, en rédaction. |
| `cx-badge--neutral` | Brouillon, archivé, facultatif, état sans enjeu. |
| `cx-badge--primary` | Type d'article, catégorie, « Nouveau », ce que l'utilisateur a ajouté (« Ajouté par vous »). |
| `cx-badge--accent` | Préparé par KnowDesk : tranché, rédigé ou suggéré par l'IA. |

## Ce que fournit l'intégrateur

- Un libellé court, un à cinq mots.
- Pour les statuts (success, warning, danger) : une icône de 14 px avant le mot, pour ne pas dépendre de la couleur seule.
- Pour `cx-badge--accent` : l'icône `sparkles` et un libellé qui nomme KnowDesk (« Tranché automatiquement par KnowDesk »).

## Règles

- Un statut se lit toujours avec un mot, jamais avec une pastille de couleur seule.
- Pas plus de deux badges côte à côte sur un même élément.
- `cx-badge--accent` ne sert jamais de mise en avant décorative : il dit seulement que KnowDesk a préparé l'élément.
