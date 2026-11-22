# KnowDeskContent

Signale ce que KnowDesk a préparé : un contenu pré-rempli, une décision prise automatiquement, un article rédigé ou une suggestion. L'utilisateur sait toujours ce qui vient de l'IA et peut le corriger.

## Classes

- `cx-kd` : la mention, en prune, avec l'icône `sparkles` (« Préparé par KnowDesk », « Rédigé par KnowDesk à partir de 3 documents »).
- `cx-kd-block` : l'encart en `accent-soft` qui contient la mention et le contenu préparé.
- `cx-badge--accent` : la version badge (« Tranché automatiquement par KnowDesk »).

## Ce que fournit l'intégrateur

- Une mention qui nomme KnowDesk et dit ce qu'il a fait : préparé, tranché, rédigé, suggéré, trouvé.
- Si possible, la source (« à partir de 3 documents », « trouvée dans le titre »).
- Un moyen de corriger à côté : « Modifier », « Changer la réponse ».

## Règles

- La prune ne s'emploie jamais sans le mot KnowDesk : pas de légende de couleur dans les écrans.
- Ce que l'utilisateur a ajouté lui-même n'est jamais en prune : il est en `primary-soft` (« Ajouté par vous »).
- Pas de bordure colorée sur un seul côté : l'encart se distingue par son fond.
