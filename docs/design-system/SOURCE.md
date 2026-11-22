# Source

Copie du « Design system CX », validé pour Knowdesk le 13/11/2026, mise à jour le 22/11/2026 (version 1795350125-d314 de l'artefact).
Artefact d'origine : https://claude.ai/artifact/QdxViMQdw8fGJy3QU62Mc5 (il fait foi en cas d'écart).

- `README.md` : principes, ton, couleurs, typographie, espacements, structure d'un écran de parcours, icônes.
- `tokens.css` / `tokens.json` : valeurs de référence. Dans l'app, la source est `src/styles/tokens.css`.
- `components/<Nom>/README.md` + `preview.html` : fiche et rendu de référence de chaque composant (13 depuis le 22/11 : + PageHeader, Stepper, IconTile, ActionBar, KnowDeskContent) ; `components/bundle.css` : leur CSS de référence (préfixe `cx-`).
- `icons/README.md` : sélection d'icônes Lucide et leur sens, plus les ajouts propres à KnowDesk.
- `redaction.md` : glossaire et règles de rédaction de l'app (lot 5).

Écart corrigé dans cette copie : la version du 22/11 de l'artefact donne la prune (`accent` #9b3b8c, `accent-soft` #f6e6f3) dans `README.md` et `tokens.json`, mais son `tokens.css` garde l'ancienne framboise (#a8375e / #f7e4ea). Cette copie suit la prune, décision du porteur du 22/11 : « tout selon la dernière version ».

Référence de lecture seulement : ces fichiers ne sont pas importés par l'app.
