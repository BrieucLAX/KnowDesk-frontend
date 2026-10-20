export interface HelpArticle {
  id:      string;
  title:   string;
  content: string; // Markdown
}

export interface HelpSection {
  id:       string;
  title:    string;
  icon:     string;
  articles: HelpArticle[];
}

export const HELP_CONTENT: HelpSection[] = [
  {
    id:    'whats-new',
    title: 'Nouveautés',
    icon:  '✨',
    articles: [
      {
        id:    'release-notes',
        title: 'Quoi de neuf récemment ?',
        content: `
## Quoi de neuf récemment ?

Cette page récapitule les fonctionnalités livrées sur les dernières semaines. Elle se met à jour à chaque release.

### Juin 2026

**💬 Chatbot — moteur conversationnel complet**
Le chatbot embarqué a fait un grand pas en avant en quelques sprints :
- **Persistence serveur** : chaque conversation est désormais conservée côté serveur (auditable depuis la nouvelle page **💬 Chats**, recherche par mot-clé dans les transcripts)
- **Question de clarification** : quand un visiteur pose une question trop vague, le bot pose **une** question pour préciser avant de répondre
- **Quick replies** : sous chaque réponse, le bot propose des chips cliquables avec les sources les plus pertinentes
- **Pouces 👍/👎 inline** discrets sous chaque réponse — le 👎 pousse une bulle d'empathie **dans le canal** qui demande l'email pour un contact ultérieur (plus de modale qui interrompt)
- **Bouton 🙋** dans le header pour escalader vers un humain
- **Handoff structuré** : à chaque escalade, KnowDesk peut envoyer le transcript par email à ton équipe ou poster un JSON sur ton webhook (CRM, Zendesk, Slack, n8n…). Configuration dans **Paramètres → 💬 Chatbot**
- **Topic clustering** : chaque conversation est résumée automatiquement à la clôture (3-6 mots) — alimente les **Top thématiques** dans Analytics. Bien plus utile qu'une liste de messages bruts
- **Page admin Chats** : nouvelle entrée sidebar admin pour relire les transcripts, filtrer par statut, chercher par mot-clé

→ Voir la section **💬 Chats** et **🔍 Recherche → Chatbot embarquable**.

**🛠️ Prompt système personnalisable**
Tu peux désormais voir le prompt **réellement utilisé** par le chatbot à chaque message dans **Paramètres → 💬 Chatbot → Prompt système**, et le réécrire si besoin (override total). Bouton **↺ Restaurer le défaut** pour revenir à la version générée automatiquement à partir des champs Personnalisation. À utiliser avec précaution — un prompt mal rédigé peut casser le comportement.

**📊 Analytics — Top thématiques + dédup IA**
- Le top **Top questions IA** ne pollue plus avec les versions intermédiaires d'une même requête tapée caractère par caractère. Filtrage des préfixes en fenêtre 60s par utilisateur — rétro-actif sur l'historique existant.
- Le top **Top thématiques chatbot** remplace l'ancien top messages bruts.
- Bloc Chatbot avec total / résolution / escalade / CSAT moyen.

### Mai 2026

**🔍 Barre de recherche améliorée**
Les résultats sont désormais **regroupés par type** dans le dropdown : ❓ FAQs en premier, 📄 Articles, 🌳 Processus. Chaque section a son icône, son label et son compteur. Les sections sans résultat sont masquées pour éviter le bruit.

Petit confort en plus : la barre se ferme désormais quand tu cliques en dehors, sans effacer ta requête. Tu peux la ré-ouvrir en cliquant sur l'input.

→ Voir **🔍 Recherche → Rechercher dans la base**.

**❓ FAQs éditables**
Un nouvel onglet **FAQs** est disponible dans la barre de gauche. Une FAQ, c'est une réponse courte (1-3 phrases) prête à coller dans un chat ou un email — différent d'un article qui décrit une procédure complète.

Ce qui change pour les conseillers :
- Cmd+K → tape un mot → la FAQ remonte **en premier** dans les résultats avec un badge violet
- Clic sur la FAQ → la réponse complète apparaît + bouton **Copier la réponse**
- Vote 👍 / 👎 inline pour signaler les bonnes réponses (et les mauvaises)

Ce qui change pour les admins :
- Page Analytics : nouvelle bannière ambre **« 📝 FAQs à créer »** qui suggère automatiquement les questions cherchées sans résultat (≥ 3 fois en 7 jours)
- Tab **À réviser** dans la liste : les FAQs publiées depuis plus de 6 mois sans modification sont signalées
- Historique des modifications visible dans l'éditeur

→ Voir la section **❓ FAQs**.

**📊 Analytics**
Une nouvelle page **Analytics** est disponible pour les admins et managers. Elle réunit en un coup d'œil :
- Inventaire (publiés, brouillons, tags, processus)
- Activité de l'équipe (DAU / 7 jours / 30 jours)
- Articles à mettre à jour, brouillons orphelins, articles sans tag
- Top contributeurs, couverture par catégorie
- Articles les plus / les moins consultés
- Top recherches et **recherches sans résultat** (gold mine éditoriale)

→ Voir la section **📊 Analytics**.

**🏷️ Tags libres sur les articles**
Tu peux désormais ajouter jusqu'à **10 tags** sur un article depuis l'éditeur, avec auto-complétion sur les tags déjà utilisés. Le filtre tag est intégré à la liste des articles, et les admins disposent d'une page **Paramètres → Tags** pour renommer ou supprimer en masse.

→ Voir **📄 Articles → Ajouter des tags** et **⚙️ Paramètres → Gérer les tags**.

**🔍 Recherche intelligente**
La barre de recherche (raccourci \`Cmd+K\`) tolère désormais les fautes de frappe : *rembousement* retrouve *remboursement*, *livrazon* retrouve *Livraisons*. Les admins peuvent définir des **synonymes propres à leur organisation** dans **Paramètres → Recherche**.

→ Voir la section **🔍 Recherche**.

> 💡 **Astuce** : Pour ne rater aucune nouveauté, garde un œil sur cette section après chaque mise à jour de KnowDesk.
        `.trim(),
      },
    ],
  },
  {
    id:    'getting-started',
    title: 'Premiers pas',
    icon:  '🚀',
    articles: [
      {
        id:    'create-workspace',
        title: 'Créer son espace KnowDesk',
        content: `
## Créer ton espace KnowDesk

Lors de ta première connexion, KnowDesk te guide à travers un processus d'onboarding en 3 étapes :

**1. Nom de ton organisation**
Donne un nom clair à ton espace — c'est ce que verront tes collaborateurs quand ils rejoignent l'équipe.

**2. Première catégorie**
Les catégories organisent ta base de connaissance. Commence avec une catégorie principale, tu pourras en ajouter autant que tu veux ensuite.

**3. Premier article**
Rédige un premier article pour tester l'éditeur. Il peut s'agir d'une procédure simple ou d'une FAQ.

> 💡 **Astuce** : Ne cherche pas la perfection dès le départ. Commence avec quelques articles clés, et enrichis ta base au fil du temps.
        `.trim(),
      },
      {
        id:    'invite-members',
        title: 'Inviter les premiers membres',
        content: `
## Inviter les premiers membres

Pour inviter un collaborateur dans ton espace :

1. Va dans **Équipe** depuis le menu de gauche
2. Clique sur **Inviter un membre**
3. Saisis son adresse email
4. Choisis son rôle : **Manager** ou **Conseiller**
5. Clique sur **Envoyer l'invitation**

Ton collaborateur reçoit un email avec un lien d'activation valable **7 jours**. Il choisit son mot de passe lors de sa première connexion.

> 💡 **Astuce** : Tu peux inviter plusieurs personnes en même temps en répétant l'opération.
        `.trim(),
      },
      {
        id:    'roles',
        title: 'Comprendre les rôles',
        content: `
## Les rôles dans KnowDesk

KnowDesk propose 3 niveaux d'accès :

**Admin**
- Accès complet à toutes les fonctionnalités
- Gère les membres, les paramètres et la facturation
- Crée, modifie et supprime tous les contenus
- Accède à Analytics et à la gestion des tags / synonymes

**Manager**
- Crée et publie des articles et processus guidés
- Invite et gère les conseillers
- Accède à Analytics
- Ne peut pas gérer les paramètres avancés (tags, synonymes, facturation)

**Conseiller**
- Consulte et recherche dans la base de connaissance
- Suit les processus guidés pendant les appels clients
- Ne peut pas créer ni modifier de contenu

> 💡 **Astuce** : Attribue le rôle **Manager** à tes responsables d'équipe pour qu'ils puissent maintenir la base de connaissance de façon autonome.
        `.trim(),
      },
      {
        id:    'settings-basics',
        title: 'Configurer les paramètres de base',
        content: `
## Configurer les paramètres de base

Accède aux paramètres depuis l'icône **Paramètres** en bas du menu.

**Nom de l'organisation**
Modifie le nom affiché dans l'interface et dans les emails envoyés à tes collaborateurs.

**Notifications**
Configure quels événements déclenchent une notification :
- Nouvel article publié
- Nouveau membre rejoint l'équipe
- Résumé hebdomadaire

**Mon compte**
Depuis l'icône **Mon compte** (initiales en bas du menu), tu peux modifier ton prénom, nom, adresse email et mot de passe.
        `.trim(),
      },
    ],
  },
  {
    id:    'articles',
    title: 'Articles',
    icon:  '📄',
    articles: [
      {
        id:    'create-article',
        title: 'Créer et structurer un article',
        content: `
## Créer et structurer un article

Pour créer un article :

1. Clique sur **Base de connaissance** dans le menu
2. Clique sur **+ Créer un article**
3. Saisis un titre clair et descriptif
4. Sélectionne une catégorie
5. Rédige ton contenu dans l'éditeur

**Conseils de rédaction**
- Commence par le plus important — tes conseillers lisent souvent en diagonale
- Utilise des listes à puces pour les étapes et procédures
- Sois concis : un article = un sujet
- Ajoute des exemples concrets quand c'est possible

> 💡 **Astuce** : L'éditeur sauvegarde automatiquement ton travail au fil de la frappe. Tu ne perdras jamais une modification, et le statut de sauvegarde est affiché en haut de l'écran.
        `.trim(),
      },
      {
        id:    'categories',
        title: 'Organiser par catégories',
        content: `
## Organiser par catégories

Les catégories structurent ta base de connaissance. Tu peux créer une hiérarchie jusqu'à plusieurs niveaux (univers → catégorie → sous-catégorie…).

**Créer une catégorie**
1. Va dans **Base de connaissance**
2. Clique sur **+** en haut du panneau de gauche
3. Donne-lui un nom clair
4. (Optionnel) Choisis une **catégorie parente** dans le sélecteur — laissé vide, la catégorie est créée à la racine

> 💡 **Raccourci** : si tu cliques **+** alors qu'une catégorie est sélectionnée, ce parent est pré-rempli automatiquement. Idéal pour ajouter rapidement une sous-catégorie.

**Modifier ou supprimer une catégorie**
Survole une ligne dans le panneau de gauche : un bouton **···** apparaît à droite. Il ouvre un menu avec 4 actions :
- **✎ Renommer** — édition directe sur la ligne (Entrée pour valider, Échap pour annuler)
- **+ Ajouter une sous-catégorie** — ouvre la modale avec ce parent pré-rempli
- **↗ Déplacer…** — change la catégorie parente (descendants exclus pour éviter les cycles)
- **🗑 Supprimer** — confirmation requise ; les sous-catégories sont supprimées aussi, les articles attachés perdent leur catégorisation

> ⚠ La suppression est irréversible. Les articles d'une catégorie supprimée restent accessibles mais sans rangement — pense à les replacer.

**Bonne organisation**
Pense à tes catégories comme des dossiers. Quelques exemples :
- Par thématique : *Facturation*, *Livraison*, *Retours*
- Par type de demande : *FAQ*, *Procédures*, *Scripts*
- Par produit : *Produit A*, *Produit B*
- Hiérarchie à 2 niveaux : *Mobile → Activation*, *Mobile → Réseau*

> 💡 **Astuce** : Une catégorie est unique par article. Pour des classements transversaux (saisonnalité, statut éditorial…), utilise plutôt les **tags**.
        `.trim(),
      },
      {
        id:    'add-tags',
        title: 'Ajouter des tags à un article',
        content: `
## Ajouter des tags à un article

Les tags complètent la catégorie en permettant un classement transversal — un article peut porter plusieurs tags.

**Tagger depuis l'éditeur**
1. Ouvre un article (ou crée-en un nouveau)
2. Sous le sélecteur de catégorie, tu trouves le champ **Tags**
3. Tape le début d'un tag — KnowDesk te propose les tags déjà utilisés dans ton organisation
4. Valide avec **Entrée** ou une **virgule**
5. Pour retirer un tag, clique sur le ✕ à côté

**Combien de tags ?**
- 10 tags maximum par article
- 200 tags maximum par organisation

**Bonnes pratiques**
- Évite les doublons de sens (« remboursement » et « refund » → un seul)
- Préfère des tags courts et stables
- Pour des opérations courtes (Black Friday, Soldes 2026), utilise un tag dédié — tu pourras le supprimer une fois l'opération passée

> 💡 **Astuce** : Les tags sont normalisés automatiquement. \`Black Friday\`, \`black friday\` et \`BLACK FRIDAY\` deviennent un seul tag, avec la première casse saisie comme nom affiché.
        `.trim(),
      },
      {
        id:    'filter-by-tag',
        title: 'Filtrer la liste par tag',
        content: `
## Filtrer la liste par tag

Tu peux croiser plusieurs tags pour retrouver rapidement un sous-ensemble d'articles.

**Comment filtrer**
1. Va dans **Base de connaissance**
2. Sous les onglets **Tous / Publiés / Brouillons**, une rangée de chips affiche les tags de l'organisation avec leur nombre d'articles
3. Clique sur un tag pour l'activer (il devient bleu)
4. Clique sur d'autres tags pour combiner — c'est un filtre **ET** : seuls les articles qui portent **tous** les tags sélectionnés apparaissent
5. Clique sur **Effacer** pour retirer le filtre

Le filtre tag se combine avec le filtre catégorie de la sidebar et le filtre statut. Tu peux par exemple voir uniquement les *brouillons* taggés *Black Friday* dans la catégorie *Facturation*.

> 💡 **Astuce** : Pour une recherche par tag depuis n'importe quelle page, utilise plutôt la barre de recherche globale (\`Cmd+K\`) — voir la section **Recherche**.
        `.trim(),
      },
      {
        id:    'insert-image',
        title: 'Insérer une image dans un article',
        content: `
## Insérer une image dans un article

L'éditeur accepte les images directement collées ou glissées-déposées.

**Trois manières d'insérer**
1. **Coller** : copie une image depuis ton presse-papiers et fais \`Cmd+V\` (\`Ctrl+V\`) dans l'éditeur
2. **Glisser-déposer** : fais glisser un fichier image depuis ton bureau directement dans la zone de contenu
3. **Bouton image** : clique sur l'icône image dans la barre d'outils de l'éditeur

L'image est uploadée automatiquement et apparaît à l'endroit du curseur. Tu peux ensuite cliquer dessus pour la redimensionner ou la supprimer.

**Limites**
- Formats acceptés : PNG, JPG, GIF, WebP
- Taille maximale : 5 Mo par image

> ⚠️ **Attention** : Les images sont stockées de façon permanente liée à l'article. Si tu supprimes l'article, ses images ne sont plus accessibles publiquement.

> 💡 **Astuce** : Compresse tes captures d'écran avant import — un article qui charge vite est un article qui sert.
        `.trim(),
      },
      {
        id:    'insert-link',
        title: 'Insérer un lien (interne ou externe)',
        content: `
## Insérer un lien (interne ou externe)

Tu peux pointer vers une URL externe ou vers un autre article de ta base.

**Lien externe**
1. Sélectionne le texte qui doit devenir un lien
2. Clique sur l'icône lien dans la barre d'outils (ou \`Cmd+K\`)
3. Colle l'URL et valide

**Lien vers un autre article (interne)**
1. Sélectionne le texte
2. Clique sur l'icône lien
3. Tape le titre de l'article cible — KnowDesk propose les articles correspondants
4. Clique sur l'article voulu

Quand un conseiller clique sur un lien interne dans la fiche article, il navigue directement vers l'article cible sans quitter KnowDesk.

> 💡 **Astuce** : Les liens internes sont précieux pour relier les articles connexes — un article *Politique de remboursement* peut pointer vers *Procédure de retour*.
        `.trim(),
      },
      {
        id:    'publish',
        title: 'Publier vs garder en brouillon',
        content: `
## Publier vs garder en brouillon

Un article peut avoir trois statuts :

**Brouillon**
- Visible uniquement par les admins et managers
- Utile pour préparer un contenu avant de le rendre disponible
- Sauvegardé automatiquement

**Publié**
- Visible par tous les membres de l'équipe
- Apparaît dans les résultats de recherche
- Peut être mis à jour à tout moment

**Archivé**
- Retiré des articles publiés, de la recherche et du chatbot
- Rangé dans l'onglet **Archivés** de la liste des articles
- Ne compte pas dans la limite d'articles de l'organisation

**Comment publier**
Dans l'éditeur, clique sur **Publier** en haut à droite. Si l'article était déjà publié, le bouton affiche **Mettre à jour**.

**Comment archiver**
Dans le menu **···** de la ligne, ou dans l'éditeur, clique sur **Archiver**. Pour le retrouver, ouvre l'onglet **Archivés** et clique sur **Désarchiver** : l'article revient en brouillon, à publier de nouveau.

> 💡 **Astuce** : Publie même si l'article n'est pas parfait. Il vaut mieux avoir un contenu imparfait disponible qu'un contenu parfait en brouillon.
        `.trim(),
      },
      {
        id:    'versions',
        title: 'Historique des versions',
        content: `
## Historique des versions

KnowDesk conserve l'historique de toutes les versions publiées de tes articles.

**Consulter l'historique**
1. Ouvre un article en mode édition
2. Clique sur **Historique** en haut à droite
3. Le panneau affiche toutes les versions avec leur date

**Restaurer une version**
1. Dans le panneau Historique, trouve la version souhaitée
2. Clique sur **Restaurer**
3. Le contenu de l'éditeur est remplacé par cette version, et l'article repasse en brouillon
4. Vérifie le contenu, puis clique sur **Publier** pour rendre la version restaurée disponible aux conseillers

> 💡 **Astuce** : La restauration ne publie pas automatiquement — tu peux relire et ajuster avant de remettre en ligne.
        `.trim(),
      },
    ],
  },
  {
    id:    'faqs',
    title: 'FAQs',
    icon:  '❓',
    articles: [
      {
        id:    'what-is-faq',
        title: 'Qu\'est-ce qu\'une FAQ ?',
        content: `
## Qu'est-ce qu'une FAQ ?

Une **FAQ** est une question fréquente avec une réponse courte, prête à être copiée-collée dans un chat ou un email client. C'est différent d'un article :

| | FAQ | Article |
|---|---|---|
| **Format** | Question + réponse | Titre + contenu HTML libre |
| **Longueur idéale** | 1 à 3 phrases | Aussi long que nécessaire |
| **Cas d'usage** | « Délai de livraison ? » | « Procédure complète de retour produit » |
| **Action** | Copier-coller la réponse | Lire et appliquer |
| **Mise à jour** | Rare (la réponse change peu) | Régulière (procédures évoluent) |

**Quand créer une FAQ plutôt qu'un article ?**

Si tu peux répondre en moins de 3 phrases, c'est une FAQ. Si tu as besoin de plusieurs paragraphes, d'images ou de listes à puces, c'est un article.

**Exemples de bonnes FAQs** :
- *Délai de livraison standard ?* → 3 à 5 jours ouvrés en France métropolitaine, 7 à 10 jours pour les DOM-TOM.
- *Comment annuler une commande ?* → Connecte-toi à ton compte, va dans Mes commandes, clique sur Annuler dans les 24h suivant l'achat.
- *Politique de retour ?* → Retour gratuit dans les 30 jours via le portail client.

**Exemples qui ne sont PAS des FAQs** :
- ❌ *Comment configurer son compte* → c'est un guide → article
- ❌ *Procédure de réclamation pour produit défectueux* → multi-étapes → article ou processus guidé

> 💡 **Astuce** : Une FAQ peut **renvoyer vers un article** complet via le champ « Article lié ». Idéal pour les cas où la réponse courte suffit dans 80% des cas, mais où certains clients ont besoin de plus de détails.
        `.trim(),
      },
      {
        id:    'create-faq',
        title: 'Créer une FAQ',
        content: `
## Créer une FAQ

**Réservé aux rôles Admin et Manager.**

**Deux points d'entrée :**

1. **Manuel** : depuis l'onglet **❓ FAQs** dans le menu de gauche, clique sur **+ Nouvelle FAQ**
2. **Suggéré automatiquement** : sur la page **Analytics**, la bannière ambre **📝 FAQs à créer** affiche les recherches qui ont retourné zéro résultat dans les 7 derniers jours (au moins 3 fois). Clique sur **Créer une FAQ** sur une suggestion : l'éditeur s'ouvre avec la question pré-remplie.

**Champs de l'éditeur :**

- **Question** (obligatoire, 200 caractères max) — formulée comme un client la poserait
- **Réponse** (obligatoire, 2000 caractères max — mais vise 500 max idéalement). Au-delà, envisage plutôt un article complet.
- **Catégorie** — réutilise l'arborescence existante
- **Tags** — jusqu'à 10, mêmes tags que sur les articles
- **Article lié** (optionnel) — pour les clients qui veulent plus de détails
- **Visibilité** :
  - *Interne* (défaut) — visible par ton équipe seulement
  - *Public* — préparé pour l'export web public (à venir)

**Bonnes pratiques de rédaction :**

- ✅ Va à l'essentiel — 1 à 3 phrases
- ✅ Pose la question comme un client la poserait, pas comme un agent (« Comment retourner un produit ? » plutôt que « Procédure de retour »)
- ✅ Reste cohérent dans le ton — tutoyer ou vouvoyer, mais une seule règle pour toutes les FAQs publiques
- ✅ Évite le jargon technique interne
- ❌ Ne mets pas de noms de personnes ou de raccourcis internes
- ❌ Évite les conditionnels lourds (« cela dépend si… »). Si la réponse est conditionnelle, fais plusieurs FAQs ou renvoie vers un article.

**Statut Brouillon vs Publié :**

Une FAQ en *brouillon* est invisible des conseillers. Elle n'apparaît dans la search bar qu'une fois **publiée**. Tu peux la dépublier à tout moment.

> 💡 **Astuce** : Avant de publier, demande-toi : *« Est-ce que je collerais cette réponse telle quelle dans un chat client ? »*. Si non, retravaille-la.
        `.trim(),
      },
      {
        id:    'find-faq',
        title: 'Trouver une FAQ rapidement',
        content: `
## Trouver une FAQ rapidement (pour conseillers)

C'est le cas d'usage principal de KnowDesk : tu es en ligne avec un client, tu as **3 secondes** pour répondre.

**Le bon réflexe :**

1. **Cmd+K** (Mac) ou **Ctrl+K** (Windows / Linux) — la barre de recherche est focalisée depuis n'importe quelle page
2. **Tape un mot-clé** — pas la phrase complète. *« remboursement »* suffit, pas besoin d'écrire *« Quelle est la politique de remboursement »*
3. **Repère le badge violet « FAQ »** — les FAQs sont triées en premier dans les résultats
4. **Clique sur la FAQ** — la réponse complète s'affiche en panneau bleu sous l'item
5. **Clique sur Copier la réponse** — un toast vert te confirme que c'est dans ton presse-papier
6. **Cmd+V dans ton chat** ou ton email client — c'est collé.

**Donner ton avis :**

Sous la réponse, tu peux voter :
- 👍 si la réponse a bien aidé ton client
- 👎 si elle est mal formulée, obsolète, ou si elle a généré une nouvelle question

**Pourquoi c'est important** : ton vote remonte directement chez l'admin qui voit le score helpful sur chaque FAQ. Une FAQ avec beaucoup de 👎 sera retravaillée. Une FAQ avec beaucoup de 👍 sera conservée et peut-être exportée publiquement plus tard.

> 💡 **Astuce** : Si tu cherches souvent une question pour laquelle il n'y a pas de FAQ, ne désespère pas — tes recherches sont automatiquement comptées et l'admin verra une suggestion sur sa page Analytics. Tu peux aussi en parler directement.

**Si la FAQ ne suffit pas :**

Si la FAQ a un **Article lié**, un lien apparaît pour ouvrir l'article complet (procédure détaillée, captures, etc.). Sinon, fais une recherche plus large pour trouver l'article correspondant.
        `.trim(),
      },
      {
        id:    'vote-faq',
        title: 'Donner son avis sur une FAQ',
        content: `
## Donner son avis sur une FAQ

**Disponible pour tous les rôles.**

Sous chaque réponse de FAQ (depuis la search bar), tu peux voter avec un pouce :

- 👍 **Cette réponse a aidé** — la formulation est claire, le client a compris, pas besoin de la retravailler
- 👎 **Cette réponse n'a pas aidé** — formulation floue, info périmée, ou ça a généré une nouvelle question

**Ce que ça change concrètement :**

| Côté | Effet |
|---|---|
| Admin / Manager | Voit le **score helpful** (en %) sur chaque FAQ dans la liste et dans l'éditeur. Une FAQ avec un score < 60% est priorisée pour révision. |
| Conseiller | Aide la qualité globale de la base — moins de mauvaises réponses, plus de bonnes. |
| Toi | Tu ne peux voter qu'une fois par FAQ par session de navigation (le bouton est désactivé après ton vote). |

**Anti-spam :**

Le vote est conservé dans ton navigateur (localStorage). Si tu changes de navigateur ou que tu navigues en privé, tu peux re-voter — c'est assumé. Le but est de garder un signal honnête, pas de blinder une sécurité.

> 💡 **Astuce** : Si tu votes 👎, c'est utile mais **encore plus utile** si tu signales aussi pourquoi à ton admin (« la FAQ X dit Y mais en réalité c'est Z »). Le pouce seul ne dit pas le pourquoi.
        `.trim(),
      },
      {
        id:    'pilot-faqs',
        title: 'Piloter ses FAQs (admins)',
        content: `
## Piloter ses FAQs (admins)

**Réservé aux rôles Admin et Manager.**

Une fois ta FAQ publiée, son cycle de vie continue. Trois outils pour la maintenir vivante :

### 1. Suggesteur automatique (page Analytics)

La bannière **📝 FAQs à créer** apparaît sur la page Analytics quand au moins une recherche a retourné zéro résultat **3 fois ou plus dans les 7 derniers jours**. C'est volontairement bas pour ne rater aucun signal :

- *« délai livraison Belgique »* — 12 recherches cette semaine sans résultat → tu vois la suggestion → clic « Créer une FAQ » → l'éditeur s'ouvre avec la question pré-remplie

C'est ton meilleur indicateur des angles morts de ta base.

### 2. FAQs à réviser (tab dans la liste)

Une FAQ publiée n'a pas de date d'expiration en soi, mais **6 mois sans modification** est un signal de risque (politique qui a changé, prix qui a évolué, etc.).

Le tab **À réviser** dans la liste affiche toutes les FAQs concernées. Sur chaque ligne, un badge orange « À réviser ».

Quand tu ouvres une FAQ stale, une bannière ambre apparaît en haut de l'éditeur :
- Si tu **modifies** la réponse → la date de révision est automatiquement mise à jour
- Si tu **n'as rien à changer**, clique sur **C'est à jour** — la FAQ est marquée comme révisée sans toucher au contenu

### 3. Score helpful par FAQ

Chaque FAQ affiche son score (en % et nombre de votes) dans la liste et l'éditeur. Quelques règles de pilotage :

- **Score > 80%** : la FAQ est solide, candidate à l'export public futur
- **Score entre 60% et 80%** : la formulation peut être améliorée
- **Score < 60% avec ≥ 5 votes** : à reformuler en priorité — la réponse n'aide pas
- **Aucun vote** : neutre, pas de signal

### 4. Historique des modifications

Dans l'éditeur, ouvre le panneau **Historique des modifications** pour voir qui a touché la FAQ et quand. Utile pour comprendre l'évolution d'une réponse contestée ou pour retrouver le dernier auteur à contacter.

> 💡 **Astuce** : Mets-toi un rappel mensuel pour passer 10 minutes sur :
> 1. Les suggestions « FAQs à créer » sur Analytics
> 2. Le tab « À réviser » dans la liste FAQs
> 3. Les FAQs avec score helpful < 60%
>
> 30 minutes par mois suffisent à garder une base saine, et l'effet sur l'efficacité de ton équipe est immédiat.
        `.trim(),
      },
    ],
  },
  {
    id:    'search',
    title: 'Recherche',
    icon:  '🔍',
    articles: [
      {
        id:    'search-basics',
        title: 'Rechercher dans la base',
        content: `
## Rechercher dans la base

KnowDesk dispose d'une recherche **tolérante aux fautes** qui couvre articles, processus guidés et leurs tags.

**Lancer une recherche**
- Clique sur la barre de recherche en haut de l'écran
- **Raccourci clavier** : appuie sur \`Cmd+K\` (Mac) ou \`Ctrl+K\` (Windows / Linux) depuis n'importe quelle page

**Tolérance aux fautes**
Tu n'as pas besoin de taper le mot exact. \`rembousement\` retrouve *remboursement*, \`livrazon\` retrouve *Livraisons*. La recherche corrige automatiquement les fautes courantes.

**Ce qui est cherché**
La recherche couvre, pour chaque FAQ, article ou processus publié :
- La question (FAQ) ou le titre (article / processus)
- La réponse (FAQ) ou le contenu textuel (avec extraits surlignés dans les résultats)
- La catégorie
- Les tags

**Comprendre les résultats — sections par type**
Les résultats sont **regroupés par type** avec un header dédié :
- ❓ **FAQs** en premier — réponses courtes prêtes à coller. Clic → réponse complète in-line + bouton **Copier la réponse**
- 📄 **Articles** ensuite — guides détaillés. Clic → ouvre l'article
- 🌳 **Processus** en bas — arbres de décision pour les cas complexes

Chaque section affiche un compteur. Si une section ne contient aucun résultat pour ta recherche, elle est masquée (pas de bruit).

**Naviguer au clavier**
- \`↑\` \`↓\` parcourent les résultats à travers les sections (les headers sont sautés automatiquement)
- \`Entrée\` ouvre / déplie le résultat sélectionné
- \`Échap\` ferme la barre

**Fermer la barre**
- Clavier : \`Échap\`
- Souris : clique n'importe où en dehors de la barre — le dropdown se ferme tout en gardant ta requête, tu peux la ré-ouvrir en cliquant sur l'input.

> 💡 **Astuce** : Si une recherche fréquente ne ramène rien, signale-le : c'est un signal éditorial. Côté admin/manager, ces requêtes apparaissent dans **Analytics → Recherches sans résultat** et alimentent la suggestion automatique de FAQs.
        `.trim(),
      },
      {
        id:    'ai-answer',
        title: 'Comprendre la Réponse IA ✨',
        content: `
## Comprendre la Réponse IA ✨

Quand tu poses une **question** dans la barre de recherche, une carte « Réponse IA » apparaît en haut des résultats. Elle synthétise les articles, FAQs et processus pertinents en quelques phrases — utile en appel client pour gagner du temps.

**Quand l'IA se déclenche-t-elle ?**
La Réponse IA s'active automatiquement si :
- ta requête fait **15 caractères ou plus**, OU
- elle contient un **point d'interrogation** (\`?\`), OU
- elle commence par un mot interrogatif : *comment*, *pourquoi*, *qui*, *que*, *où*, *quand*, *combien*, *quel*, *quelle*…

L'icône ✨ qui apparaît dans la barre te confirme que l'IA est active. Elle s'anime pendant la génération.

> 💡 Pour une recherche par **mot-clé** courte (ex. *RIO*, *iPhone*), l'IA ne se déclenche pas — tu obtiens directement les résultats classiques.

**Comment lire la carte**
- Le texte arrive **token par token** (effet machine à écrire) : tu peux commencer à lire avant la fin
- Les **citations** \`[1]\`, \`[2]\`, etc. renvoient aux **sources** affichées juste en-dessous
- Les **chips de sources** sont cliquables : ouvre l'article correspondant pour creuser
- **Bouton Copier** en bas : copie la réponse en texte plain (sans HTML), prêt à coller dans une conversation client

**Quand l'IA dit *« Je n'ai pas la réponse précise dans la base. »***
C'est volontaire. L'IA ne **fabrique jamais** d'information : si la réponse n'est pas dans tes articles, elle l'admet et te montre quand même les articles les plus proches. C'est une garantie anti-hallucination — en service client, mieux vaut le doute qu'une mauvaise info.

Si tu vois ce message souvent sur des questions légitimes : signale-le à ton admin. Les questions sans réponse remontent dans **Analytics → Réponse IA** et permettent de combler les manques éditoriaux.

**Ton avis compte 👍 / 👎**
À la fin de chaque réponse, deux boutons te permettent de signaler si elle a été utile. Ces votes alimentent les statistiques de qualité visibles côté admin.

> ⚠️ **Disclaimer** : L'IA peut se tromper, surtout sur des sujets sensibles (juridique, financier). **Vérifie toujours les sources citées** avant de communiquer une information critique au client.
        `.trim(),
      },
      {
        id:    'ai-config',
        title: 'Configurer l\'IA pour son organisation (admin)',
        content: `
## Configurer la Réponse IA ✨ pour son organisation

Tu peux personnaliser le comportement de l'IA depuis **Paramètres → ✨ IA** (visible uniquement aux admins). 5 leviers de configuration.

**1. Activer / désactiver la Réponse IA**
Toggle principal en haut de la section. Quand désactivée, la carte « Réponse IA » et l'icône ✨ disparaissent ; la SearchBar revient en mode classique (Meilisearch seulement). Utile pour les organisations soumises à des contraintes réglementaires strictes.

> Quand le toggle est OFF, les autres champs sont grisés.

**2. Secteur d'activité**
Champ libre (max 80 caractères). L'IA s'adapte au persona : *« assistant pour les conseillers d'un service client dans le secteur Telecom »*. Exemples : \`Telecom\`, \`Banque\`, \`Retail\`, \`Santé\`, \`Énergie\`. Laisse vide pour une formulation générique.

**3. Tonalité**
5 styles prédéfinis :
- **Professionnelle** — neutre, factuelle (défaut institutionnel)
- **Chaleureuse** — accueillante, humaine (service haut de gamme)
- **Directe** — droit au but (gain de temps conseiller)
- **Empathique** — sensible aux situations délicates (banque, santé)
- **Décontractée** — accessible, moderne (marques B2C jeunes)

L'option *« Aucune préférence »* laisse Mistral en mode neutre.

**4. Forme d'adresse**
- **Vouvoiement** — l'IA dit systématiquement *« vous »*, *« votre »*, *« vos »*
- **Tutoiement** — l'IA dit *« tu »*, *« ton »*, *« tes »*
- **Aucune préférence** — Mistral choisit selon le contexte (vouvoiement par défaut en français formel)

**5. Glossaire**
Liste de paires *« terme générique → terme préféré »* (max 30 paires, 50 caractères chacune). L'IA utilise systématiquement le terme préféré dans ses réponses.

Exemples concrets :
- \`client\` → \`abonné\`
- \`offre\` → \`forfait\`
- \`annulation\` → \`résiliation\`
- \`dépanneur\` → \`conseiller technique\`

> 💡 **Construis ton glossaire au fil de l'eau**. Inutile de tout définir d'un coup — ajoute des paires quand tu repères un mot que l'IA utilise mais qui ne correspond pas à ton vocabulaire interne.

**Suivre l'usage et la qualité**
Va dans **Analytics → ✨ Réponse IA — 30 derniers jours** pour voir :
- Nombre total de réponses générées (et combien tombent en *« sans réponse précise »*)
- Taux d'utilité (👍 / 👎) sur les feedbacks reçus
- Top 5 des questions les plus posées à l'IA
- Top 5 des questions sans réponse — chacune avec un bouton **Créer FAQ** pour combler le manque éditorial en un clic

> ℹ️ **Sous le capot** : la Réponse IA s'appuie sur **Mistral Small** (modèle français hébergé en UE). Toutes les requêtes sont scopées à votre organisation : aucune autre org KnowDesk ne voit votre contenu, et le modèle n'a accès qu'aux extraits que nous lui envoyons à chaque appel — pas d'entraînement sur vos données.
        `.trim(),
      },
      {
        id:    'chatbot-config',
        title: 'Chatbot embarquable sur votre site web 💬',
        content: `
## Chatbot embarquable sur votre site web 💬

KnowDesk peut alimenter un chatbot que vous embarquez sur le site web de votre entreprise. Vos clients posent leurs questions ; le bot répond à partir des contenus que vous avez explicitement marqués **Public**.

> ℹ️ Le chatbot et la **Réponse IA** dans la SearchBar partagent le même moteur (Mistral) et la même base. La différence : le chatbot est **public** (anonyme, exposé sur votre site) et ne lit que les contenus marqués Public ; la Réponse IA est **interne** et lit tout.

**1. Marquer un contenu comme « Public »**

Pour chaque article, FAQ ou processus guidé que vous voulez exposer au chatbot :
- **Articles** : éditeur d'article → champ **Visibilité** sous Tags → choisir *🌐 Public*
- **FAQs** : éditeur FAQ → radio **Visibilité** → *Public* (déjà existant)
- **Processus guidés** : éditeur → sélecteur dans la barre du haut → *🌐 Public*

Tout le contenu existant est par défaut **Interne** — choix volontaire pour ne rien exposer accidentellement.

**2. Configurer le chatbot**

Va dans **Paramètres → 💬 Chatbot** (admin uniquement) :

- **Chatbot activé** : toggle principal. Désactivé, l'endpoint refuse toute requête — le widget reste invisible.
- **Message d'accueil** : premier message vu par le visiteur quand il ouvre le widget. *« Bonjour 👋 Comment puis-je vous aider ? »* est un bon défaut.
- **Message de fallback** : affiché quand le bot ne sait pas répondre. **Personnalise impérativement avec tes canaux de contact** (email, téléphone, formulaire). Ex :
  > *Désolé, je n'ai pas la réponse précise. Contactez-nous au 09 XX XX XX XX ou par email à contact@exemple.fr.*
- **Couleur primaire** : couleur de la bulle flottante et des bulles message. Choix via picker ou hex.
- **Logo URL** : image carrée 64×64 px recommandée (URL publique). Affichée dans le header du widget.
- **Domaines autorisés** ⚠ : un domaine par ligne (ex. \`acme.fr\`). **Le widget ne se charge que depuis ces domaines** — sinon le serveur refuse la requête. Indispensable pour éviter qu'un site tiers détourne ton chatbot. Inclus aussi tes environnements de staging.

**3. Coller le snippet sur votre site**

Sous le formulaire de configuration, KnowDesk affiche un snippet à copier-coller juste avant la fermeture de \`</body>\` sur ton site :

\`\`\`html
<script
  src="https://app.knowdesk.fr/chat.js"
  data-org="<ton-slug>"
  defer
></script>
\`\`\`

Le widget se charge automatiquement et tient compte de tous les paramètres définis dans Settings (couleur, logo, message, fallback). Si tu modifies la config dans KnowDesk, les changements sont visibles immédiatement par les visiteurs (pas de cache).

**4. Personnalisation IA (mêmes champs que Réponse IA)**

Sous le bloc d'apparence, tu retrouves les 4 champs de personnalisation IA que tu as déjà configurés pour la Réponse IA conseiller : **Secteur**, **Tonalité**, **Forme d'adresse**, **Glossaire**. **Ces valeurs sont partagées avec la section ✨ IA recherche** — les modifier ici les met aussi à jour pour la Réponse IA. Pratique : tu configures tout depuis une seule section. Pour piloter l'identité du chatbot indépendamment de la recherche interne, on prévoit des champs séparés en P2.

**5. Prompt système (avancé)**

Le textarea **Prompt système** affiche le prompt **réellement utilisé** par le chatbot pour chaque message. Par défaut il est généré dynamiquement à partir des 4 champs ci-dessus + ton message de fallback : tu vois exactement ce que Mistral reçoit.

Tu peux le **réécrire intégralement** (override total — la personnalisation est alors ignorée pour le chatbot, mais reste active pour la Réponse IA conseiller). Le bouton **↺ Restaurer le défaut** repose le prompt généré dynamique. Min 50 caractères, max 8000. À utiliser seulement si tu sais ce que tu fais — un prompt mal rédigé peut casser le comportement (lever les garde-fous anti-jailbreak, oublier le fallback, etc.).

**6. Comportement multi-tour + slot filling**

Le chatbot tient le fil de la conversation côté serveur : conversation complète persistée en DB (audit, RGPD-ready). Si un visiteur demande *« comment résilier ? »* puis *« et combien ça coûte ? »*, le bot comprend que la deuxième question concerne la résiliation.

**Question de clarification automatique** : quand une question est trop vague (*« mon forfait ne marche pas »*, *« panne »*), le bot pose **une** question pour préciser avant de tenter une réponse. Au tour suivant, il combine la question initiale avec la précision pour interroger la base de manière ciblée. 1 clarification max par conversation pour éviter les boucles.

**Quick replies** : sous chaque réponse, le bot propose 2 chips cliquables avec les sources les plus pertinentes — le visiteur peut creuser un sujet d'un clic.

**7. Pouces inline + 👎 dans le canal**

Sous chaque réponse bot, deux petits pouces 👍/👎 discrets. **👍** signale une réponse utile (la conversation est marquée *résolue*). **👎** signale l'inverse : le bot pousse alors une bulle d'empathie **dans le canal de discussion** qui demande l'email pour un contact ultérieur.

- Si le visiteur tape une adresse email valide → POST de la demande de handoff à ton équipe (selon le mode configuré, cf article *Passage à un humain*) + bulle de confirmation. La conversation peut continuer ensuite.
- Si le visiteur tape autre chose ("non merci", une nouvelle question…) → la demande retombe et le bot répond normalement.

Le bouton 🙋 du header du widget permet aussi un handoff direct, sans passer par les pouces. Visible uniquement après le 1ᵉʳ message du visiteur.

**8. Garde-fous automatiques**

Le chatbot refuse :
- Les questions hors-scope (politique, religieuses, médicales, juridiques générales) → renvoie vers tes canaux de contact
- Les tentatives de *jailbreak* (« ignore tes instructions », « joue le rôle de… »)
- Les domaines non whitelistés (CORS dynamique par org)
- Plus de 30 messages/minute par IP visiteur (anti-spam)

**9. Suivi des conversations**

Toutes les conversations sont consultables dans la nouvelle section **💬 Chats** de la barre de gauche (admin only). Recherche par mot-clé dans les transcripts, filtre par statut, modale transcript complet. Cf article *Suivre les conversations chat*.

> 💡 **Démo rapide** : avec le widget actif sur ton site, ouvre une page, clique la bulle 💬 et pose une question dont la réponse est dans une FAQ marquée Public. Tu vois la réponse arriver token par token. Clique 👎 sous la réponse pour tester le flow de handoff dans le canal.

> ⚠️ **RGPD** : le chatbot collecte uniquement ce que le visiteur tape volontairement (incluant l'email s'il choisit de le donner suite à un 👎). Pas de fingerprint stocké côté serveur en clair, juste un identifiant anonyme localStorage. Disclaimer dans le widget et rétention configurable : prévu en V2.
        `.trim(),
      },
      {
        id:    'chatbot-handoff',
        title: 'Passage à un humain (handoff) 🙋',
        content: `
## Passage à un humain (handoff)

Quand un visiteur clique 👎 sous une réponse, ou quand il clique le bouton 🙋 du header du widget, KnowDesk peut transmettre l'historique de la conversation à ton équipe. Tu choisis comment.

**Configurer le mode**

Va dans **Paramètres → 💬 Chatbot** → bloc **Passage à un humain** (en bas).

Trois modes au choix :
- **Aucun** *(défaut)* — Le visiteur voit seulement le message de fallback (avec tes canaux de contact). Aucune notification côté équipe. Le statut de la conversation passe quand même à *escalated* dans les statistiques.
- **Email** — Tu indiques une adresse (ex \`support@ton-entreprise.fr\`). Quand un visiteur déclenche le handoff, ton équipe reçoit le transcript HTML complet de la conversation, avec l'email du visiteur s'il l'a fourni. Mode le plus simple à intégrer.
- **Webhook** — Tu indiques une URL HTTPS. KnowDesk POST un JSON \`{ orgSlug, conversationId, transcript: [...], visitorEmail, reason }\` à cette URL. Permet de créer automatiquement un ticket dans ton CRM, Zendesk, Slack, n8n, Make, etc. Timeout 8 secondes.

**Comment le visiteur déclenche le handoff**

Trois chemins, tous documentés dans l'article *Chatbot embarquable* :
1. **Pouce 👎** sous une réponse bot → bulle d'empathie dans le chat qui demande l'email → l'envoi se fait au prochain message si email valide.
2. **Bouton 🙋** dans le header du widget → ouvre directement le formulaire email + envoi.
3. **Sans email** : si le visiteur préfère ne pas donner son email, il peut continuer à converser. Le 👎 reste comptabilisé, la conversation reste *escalated*, mais aucun handoff n'est envoyé.

**Statistiques associées**

La page **Analytics** → bloc Chatbot affiche :
- **Taux de résolution** : conversations *resolved* / total clos
- **Taux d'escalade** : conversations *escalated* / total clos
- **CSAT moyen** sur les conversations notées
- Pour chaque conversation escaladée, le détail (transcript + visitor email + delivered ou non) est disponible dans la page **💬 Chats**.

> 💡 **Astuce** : commence avec le mode **Email** pour valider que le flow plaît à ton équipe, puis bascule en **Webhook** quand tu veux automatiser la création de tickets dans ton helpdesk.

> ⚠️ **Sécurité webhook** : ton endpoint doit être public (HTTPS) et accepter un POST JSON sans auth. Pour vérifier que la requête vient bien de KnowDesk, on prévoit une signature HMAC en V2 — pour l'instant, on conseille de placer un secret partagé dans l'URL elle-même (ex \`https://api.exemple.fr/hooks/knowdesk?token=XXXXX\`).
        `.trim(),
      },
      {
        id:    'synonyms',
        title: 'Définir des synonymes (admin)',
        content: `
## Définir des synonymes propres à votre organisation

Les synonymes permettent à la recherche de comprendre le vocabulaire métier de ton entreprise. Une recherche sur un terme remonte aussi les contenus utilisant ses synonymes — et vice-versa.

**Quand est-ce utile ?**
- Tes conseillers parlent de « résiliation » mais tes articles utilisent « clôture de compte »
- Tes clients disent « remboursement » alors que ton équipe écrit « avoir »
- Ton produit a un nom officiel et un surnom interne

**Créer un synonyme**
1. Va dans **Paramètres → Recherche** (visible uniquement aux admins)
2. Clique sur **+ Ajouter un synonyme**
3. Saisis le **terme** principal (ex. *annulation*)
4. Saisis un ou plusieurs **synonymes** (ex. *résiliation*, *clôture*) — Entrée ou virgule pour valider chaque chip
5. Clique sur **Créer**

**Comportement bidirectionnel**
La relation est automatiquement réciproque. Si tu déclares *annulation* ↔ *résiliation* :
- Une recherche sur *annulation* remonte aussi les articles contenant *résiliation*
- Une recherche sur *résiliation* remonte aussi les articles contenant *annulation*

Tu n'as pas à saisir les deux sens.

**Modifier ou supprimer**
Sur chaque ligne de la liste :
- **Modifier** : ajuste la liste des synonymes (le terme principal n'est pas modifiable — supprime et recrée si besoin)
- **Supprimer** : retire le synonyme. Le cache des recherches est invalidé immédiatement.

> ⚠️ **Attention** : Les synonymes sont **scopés à ton organisation**. Aucune autre organisation KnowDesk ne voit ni n'utilise tes synonymes.

> 💡 **Astuce** : Construis ton dictionnaire au fur et à mesure des cas observés. Inutile de tout définir d'un coup.
        `.trim(),
      },
    ],
  },
  {
    id:    'trees',
    title: 'Processus guidés',
    icon:  '🌳',
    articles: [
      {
        id:    'what-is-tree',
        title: 'Comprendre les processus guidés',
        content: `
## Comprendre les processus guidés

Un processus guidé est un arbre de décision que tes conseillers suivent étape par étape pendant un appel client.

**Comment ça fonctionne**
Le conseiller voit une question et plusieurs réponses possibles. Selon sa réponse, il arrive à la question suivante ou directement à une conclusion — la marche à suivre pour ce cas précis.

**Exemple concret**
> *Le client veut être remboursé*
> → Le produit est-il défectueux ?
>   - Oui → L'achat date de moins de 30 jours ?
>     - Oui → ✅ Remboursement intégral. Demander le numéro de commande.
>     - Non → ✅ Échange standard uniquement.
>   - Non → Le client a-t-il le ticket de caisse ?
>     - Oui → ✅ Remboursement sur justificatif.
>     - Non → ✅ Refus. Proposer un avoir exceptionnel.

**Avantages**
- Réduit les erreurs de traitement
- Homogénéise les réponses de l'équipe
- Accélère la formation des nouveaux conseillers
        `.trim(),
      },
      {
        id:    'create-tree',
        title: 'Créer un processus guidé',
        content: `
## Créer un processus guidé

1. Va dans **Processus** depuis le menu de gauche
2. Clique sur **+ Nouveau processus**
3. Donne-lui un titre clair (ex. *Remboursement produit*)
4. Clique sur **Créer** — l'éditeur s'ouvre automatiquement

**Dans l'éditeur**
- Clique sur **+ Ajouter un point d'entrée** pour créer la première question
- Tu peux avoir plusieurs points d'entrée pour un même processus

> 💡 **Astuce** : Commence par dessiner ton arbre sur papier avant de le saisir dans KnowDesk. C'est plus rapide.
        `.trim(),
      },
      {
        id:    'tree-nodes',
        title: 'Ajouter questions, réponses et conclusions',
        content: `
## Ajouter questions, réponses et conclusions

**Ajouter une question**
1. Clique sur **+ Ajouter un point d'entrée** ou **+ Ajouter un nœud** sous une réponse
2. Sélectionne le type **Question**
3. Saisis le texte de la question
4. Clique sur **Ajouter**

**Ajouter des réponses**
Sous chaque question, clique sur **+ Ajouter une réponse** et saisis le libellé (ex. *Oui*, *Non*, *Je ne sais pas*).

**Ajouter une conclusion**
Sous une réponse, clique sur **+ Ajouter un nœud**, sélectionne **Conclusion** et saisis la marche à suivre pour le conseiller.

**Modifier ou supprimer**
Chaque nœud a des boutons ✏️ (modifier) et 🗑 (supprimer) accessibles au survol.

> ⚠️ **Attention** : Supprimer un nœud supprime aussi tous ses nœuds enfants.
        `.trim(),
      },
      {
        id:    'tree-publish',
        title: 'Publier un processus',
        content: `
## Publier un processus

Un processus en **Brouillon** n'est pas visible par les conseillers. Pour le rendre disponible :

1. Dans l'éditeur, clique sur **Aperçu conseiller** pour vérifier le rendu
2. Navigue dans l'arbre pour t'assurer que tous les chemins mènent à une conclusion
3. Clique sur **Publier** en haut à droite

Une fois publié, le processus apparaît dans l'onglet **Processus** de la Base de connaissance — et il devient cherchable depuis la barre de recherche globale (Cmd+K).

> 💡 **Astuce** : Utilise l'aperçu conseiller pour tester tous les chemins possibles avant de publier.
        `.trim(),
      },
    ],
  },
  {
    id:    'advisors',
    title: 'Conseillers',
    icon:  '🎧',
    articles: [
      {
        id:    'find-info',
        title: 'Trouver une info pendant un appel',
        content: `
## Trouver une info pendant un appel

Quand tu es en ligne avec un client, chaque seconde compte. KnowDesk est conçu pour t'apporter la bonne réponse en quelques touches.

**Le réflexe : Cmd+K**
Depuis n'importe quelle page, appuie sur \`Cmd+K\` (Mac) ou \`Ctrl+K\` (Windows / Linux). La barre de recherche s'ouvre directement, prête à recevoir ta requête.

**Ne te casse pas la tête sur l'orthographe**
La recherche est **tolérante aux fautes** : *rembousement*, *livrazon*, *anulation* — tout ça fonctionne. Tape ce qui te vient à l'esprit.

**Tape court**
Souvent un seul mot suffit (*remboursement*, *retour*, *colis*). Plus tu tapes long, plus tu réduis tes chances de tomber sur le bon article.

**Navigue au clavier**
- \`↑\` \`↓\` parcours les résultats
- \`Entrée\` ouvre le résultat sélectionné
- \`Échap\` ferme la barre

**FAQs, Articles ou Processus**
Chaque résultat est étiqueté avec un badge :
- **FAQ** (violet) — réponse courte prête à coller. **Toujours en haut des résultats** : c'est le format le plus rapide. Clic → la réponse complète apparaît + bouton **Copier la réponse** (1 clic = 1 collage).
- **Article** (vert) — guide complet. Clic → ouvre l'article.
- **Processus** (bleu) — arbre de décision. Si la situation est complexe (un cas client qui dépend de plusieurs critères), privilégie un Processus — il te conduit étape par étape vers la bonne réponse.

**Le bon réflexe : commence par les FAQs**
Si une FAQ correspond à ta question, tu gagnes 30 secondes vs lire un article. Vote 👍 ou 👎 sous la réponse pour aider l'admin à piloter la qualité.

> 💡 **Astuce** : Si tu cherches souvent un terme qui ne donne rien, ne désespère pas — tes recherches sont automatiquement comptées. À partir de 3 occurrences identiques en 7 jours, ton admin voit une suggestion sur sa page Analytics et peut créer la FAQ manquante en 2 minutes.
        `.trim(),
      },
      {
        id:    'follow-tree',
        title: 'Suivre un processus guidé efficacement',
        content: `
## Suivre un processus guidé efficacement

Un **processus guidé** est un arbre de questions et réponses qui te conduit à la marche à suivre adaptée au cas du client.

**Ouvrir un processus**
- Depuis la barre de recherche (\`Cmd+K\`) — un badge **Processus** distingue les arbres des articles
- Depuis la **Base de connaissance** → onglet **Processus guidés**

**Pendant l'appel**
1. Lis la question affichée
2. Demande au client l'information correspondante (ex. *« L'achat date de moins de 30 jours ? »*)
3. Clique sur la réponse correspondante
4. Continue jusqu'à atteindre une **conclusion** — c'est ta marche à suivre

**Bon à savoir**
- Tu peux **revenir en arrière** à tout moment si tu t'es trompé de branche
- Certains nœuds renvoient vers un **article** complémentaire — un clic suffit pour l'ouvrir dans un autre onglet
- Si une étape n'est pas claire, signale-le (voir l'article *Signaler une info incorrecte*)

> 💡 **Astuce** : En appel, garde le processus ouvert dans un onglet séparé pour ne pas perdre le fil de ta conversation client.
        `.trim(),
      },
      {
        id:    'report-issue',
        title: 'Signaler une info incorrecte',
        content: `
## Signaler une info incorrecte

Si tu remarques une erreur dans un article — une procédure obsolète, une information fausse, un lien cassé — tu peux le faire remonter à tes managers.

**Comment signaler**
1. Ouvre l'article concerné
2. Tout en bas de l'article, clique sur **Signaler une information incorrecte**
3. Précise ce qui te semble incorrect

Le signalement est envoyé aux admins et managers de ton organisation. Ils pourront vérifier et mettre à jour l'article.

**Pourquoi c'est important**
Tu es **en première ligne** : tu détectes les contenus dépassés bien avant les managers. Chaque signalement améliore la base pour toute l'équipe.

> 💡 **Astuce** : Tu peux signaler aussi les processus guidés. Si une branche t'a mené à une mauvaise réponse, dis-le — c'est précieux pour ajuster l'arbre.
        `.trim(),
      },
      {
        id:    'advisor-notifications',
        title: 'Gérer ses notifications',
        content: `
## Gérer ses notifications

Tu reçois une notification quand un événement t'intéresse — par exemple, un article que tu utilises souvent vient d'être mis à jour.

**Consulter le panneau notifications**
Clique sur l'icône **🔔** en bas du menu de gauche. Le compteur rouge t'indique le nombre de notifications non lues.

**Marquer comme lues**
- Clique sur une notification individuelle pour la marquer comme lue
- Clique sur **Tout marquer comme lu** en haut du panneau pour tout vider d'un coup

**Personnaliser**
Va dans **Paramètres → Notifications** pour activer ou désactiver chaque type :
- **Article publié** : un nouvel article a été mis en ligne
- **Nouveau membre** : quelqu'un vient de rejoindre l'équipe

> 💡 **Astuce** : Si tu reçois trop de notifications, désactive **Nouveau membre** et garde uniquement **Article publié** — c'est ce qui impacte le plus ton quotidien.
        `.trim(),
      },
    ],
  },
  {
    id:    'use-cases',
    title: 'Cas d\'usage',
    icon:  '💼',
    articles: [
      {
        id:    'seasonal-campaign',
        title: 'Préparer une campagne saisonnière',
        content: `
## Préparer une campagne saisonnière (Black Friday, Soldes, fêtes…)

Les opérations saisonnières apportent leur lot de questions clients spécifiques. Voici comment les gérer en quelques heures.

**Étape 1 — Crée un tag dédié**
Dans l'éditeur de chaque article concerné par l'opération, ajoute un tag clair : *Black Friday 2026*, *Soldes hiver*, *Noël 2026*.

**Étape 2 — Identifie les contenus à adapter**
Regarde tes articles de référence (politique de remboursement, délais de livraison, conditions d'éligibilité…) et clone ceux qui changent le temps de l'opération.

**Étape 3 — Crée un processus guidé "FAQ campagne"**
Un arbre dédié à l'opération : qualification du cas → réponse adaptée. Bien plus rapide que de taper la question à chaque appel pour le conseiller.

**Étape 4 — Communique à l'équipe**
Publie un article de synthèse avec le tag de la campagne et les liens internes vers les processus et articles utiles. Les conseillers reçoivent une notification dans leur panneau **🔔**.

**Étape 5 — Pendant l'opération, surveille Analytics**
Utilise la carte **Top recherches** pour repérer les sujets émergents et la carte **Recherches sans résultat** pour combler les manques en cours d'opération.

**Étape 6 — Après l'opération**
Une fois la campagne terminée :
- Va dans **Paramètres → Tags**
- Supprime le tag de la campagne — les articles ne sont pas supprimés, ils perdent simplement le tag

> 💡 **Astuce** : Garde une catégorie *Saisonniers / Archives* pour ranger les articles spécifiques à une opération passée si tu veux les retrouver plus tard.
        `.trim(),
      },
      {
        id:    'measure-impact',
        title: 'Mesurer l\'impact d\'un nouveau contenu',
        content: `
## Mesurer l'impact d'un nouveau contenu

Tu viens de publier un article ou un processus guidé important — comment savoir s'il sert ?

**Avant de publier**
Note la situation de référence dans **Analytics** :
- Combien de **recherches sans résultat** sur le sujet ?
- Le sujet apparaît-il dans le **Top recherches** ?

**Publie + tag dédié**
Crée le contenu, et taggue-le avec un tag explicite (ex. *V1 procédure facturation*). Cela te permettra de retrouver tes articles "expérience" plus tard.

**Une semaine après**
Va dans **Analytics → Articles les plus consultés**. Si ton article apparaît dans le top, il rencontre son public.

**Trois semaines après**
- L'article est-il toujours dans le top consulté ? → réussi, garde-le tel quel
- L'article est-il dans **Articles peu consultés** (≤1 vue) ? → soit le sujet n'intéresse personne, soit le titre n'est pas découvrable. Vérifie avec **Top recherches** si les conseillers cherchent le sujet sans le trouver
- Les **recherches sans résultat** sur le sujet ont-elles diminué ? → oui, ton article est bien indexé et trouvé

**Si l'article ne trouve pas son public**
- Renomme-le avec des mots plus proches du vocabulaire des conseillers
- Ajoute des **synonymes** (Paramètres → Recherche) pour relier le titre à des termes alternatifs
- Place-le dans une catégorie plus visible

> 💡 **Astuce** : Garde une routine d'analyse mensuelle dans Analytics. Cinq minutes par mois suffisent à orienter la maintenance éditoriale.
        `.trim(),
      },
      {
        id:    'find-gaps',
        title: 'Identifier les sujets manquants',
        content: `
## Identifier les sujets manquants

La meilleure base de connaissance est celle qui répond aux **vraies** questions des conseillers — pas celle que les managers imaginent.

**La carte qui change tout : Recherches sans résultat**
Va dans **Analytics → Recherches sans résultat**. Cette liste contient les requêtes que tes conseillers ont tapées et qui n'ont rien retourné. Chaque ligne est une **opportunité éditoriale**.

**Comment exploiter la liste**
1. Trie mentalement les requêtes par fréquence (les plus fréquentes en haut)
2. Pour chaque ligne, demande-toi :
   - **Réponse courte (1-3 phrases) qu'on peut figer ?** → crée une **FAQ** (le plus rapide, le plus utile pour les conseillers en ligne)
   - **Sujet qui mérite une explication détaillée ?** → crée un article
   - **C'est un sujet déjà couvert sous un autre nom ?** → ajoute un **synonyme** (Paramètres → Recherche) pour relier les deux termes
   - **C'est une faute de frappe ou un terme rare ?** → ignore

**Encore plus rapide : la bannière FAQs à créer**
Depuis Mai 2026, en haut de la page Analytics, une bannière ambre **« 📝 FAQs à créer »** affiche automatiquement les requêtes zero-result qui ont au moins **3 occurrences sur les 7 derniers jours**. Clique sur **Créer une FAQ** : l'éditeur s'ouvre avec la question pré-remplie.

C'est le chemin le plus court entre un manque détecté et une réponse en production.

**Combine avec Top recherches**
Si une requête apparaît à la fois dans **Top recherches** ET ramène peu de résultats pertinents, c'est un signal fort : l'équipe cherche, mais ne trouve pas vraiment ce qu'elle veut. Crée du contenu plus précis.

**Routine mensuelle**
Réserve 30 minutes par mois pour parcourir ces deux cartes et créer ou ajuster les articles correspondants. C'est probablement le meilleur ROI éditorial que tu puisses faire.

> 💡 **Astuce** : Les recherches sans résultat sont conservées **30 jours** dans Analytics et **90 jours** dans la base brute. Plus tu agis vite, plus tu captes les tendances émergentes.
        `.trim(),
      },
      {
        id:    'delegate-maintenance',
        title: 'Déléguer la maintenance à un manager',
        content: `
## Déléguer la maintenance à un manager

Si tu es admin, tu n'es pas obligé(e) de tout faire seul(e). Le rôle **Manager** est conçu pour partager la charge de maintenance.

**Ce qu'un manager peut faire**
- Créer, publier, modifier, archiver des articles et processus guidés
- Inviter et désactiver des conseillers
- Consulter Analytics

**Ce qu'un manager ne peut PAS faire (réservé admin)**
- Gérer les **synonymes** (Paramètres → Recherche)
- Gérer les **tags** au niveau organisation (rename, suppression — Paramètres → Tags)
- Gérer la facturation
- Désactiver l'organisation

**Promouvoir quelqu'un manager**
1. Va dans **Équipe**
2. Trouve le membre dans la liste
3. Change son rôle pour **Manager**

**Bonne pratique de répartition**
- Les **conseillers** repèrent les contenus à corriger (via *Signaler une information incorrecte*)
- Les **managers** créent et maintiennent au quotidien — ils ouvrent **Analytics** chaque semaine
- L'**admin** garde le contrôle du vocabulaire (synonymes, tags) et de la stratégie

> 💡 **Astuce** : Définis avec ton manager un rendez-vous hebdomadaire de 15 min sur la page Analytics. Une routine simple maintient la base à jour sans effort héroïque.
        `.trim(),
      },
      {
        id:    'build-vocabulary',
        title: 'Construire un dictionnaire métier',
        content: `
## Construire un dictionnaire métier (synonymes)

Chaque organisation a son **vocabulaire**. Ton équipe parle peut-être de *clôture* alors que tes clients disent *résiliation*. KnowDesk te laisse cartographier ces équivalences pour que la recherche fonctionne dans les deux sens.

**Cas typiques où un synonyme est utile**
- **Vocabulaire client vs interne** : *avoir* (client) ↔ *bon de remboursement* (interne)
- **Acronymes** : *SAV* ↔ *Service après-vente*
- **Synonymes courants** : *annulation* ↔ *résiliation* ↔ *clôture*
- **Noms de produits** : nom officiel ↔ surnom interne
- **Anglicismes** : *refund* ↔ *remboursement*

**Comment t'y prendre**
1. Pendant une semaine, garde un œil sur **Analytics → Recherches sans résultat**
2. Note les requêtes qui ressemblent à des termes déjà couverts dans la base mais avec un mot différent
3. Va dans **Paramètres → Recherche → Ajouter un synonyme**
4. Saisis le **terme** principal (le mot officiel ou interne) et les **synonymes** (les mots alternatifs entendus)

**Exemple concret**

| Terme principal | Synonymes |
|---|---|
| annulation | résiliation, clôture |
| SAV | service après-vente, support technique |
| remboursement | refund, avoir |

**Bidirectionnel automatique**
Tu n'as pas besoin de saisir chaque sens. Si tu déclares *annulation* ↔ *résiliation*, une recherche sur l'un retrouve les contenus de l'autre.

> 💡 **Astuce** : Le dictionnaire se construit mieux par **petites touches au fil de l'eau** que par une grande session "tout d'un coup". Ajoute un synonyme dès que tu repères une vraie équivalence métier.
        `.trim(),
      },
      {
        id:    'industrialize-faqs',
        title: 'Industrialiser les réponses récurrentes',
        content: `
## Industrialiser les réponses récurrentes

Si tes conseillers passent un temps significatif à **reformuler les mêmes réponses** plusieurs fois par jour, tu as une opportunité de productivité majeure. Voici la méthode.

### 1. Détecter les questions répétitives

Trois sources de signal :

- **Bannière « 📝 FAQs à créer »** sur Analytics — l'outil le détecte automatiquement (≥ 3 recherches zero-result en 7 jours)
- **Top recherches** sur Analytics — les requêtes les plus fréquentes
- **Verbatim de tes conseillers** — demande-leur les 5 questions clients qu'ils répondent le plus souvent

### 2. Convertir en FAQs

Pour chaque question identifiée :
- Question formulée comme un client la pose
- Réponse en 1 à 3 phrases, copiable telle quelle
- Tag thématique pour la regrouper avec les FAQs similaires
- Catégorie pour la retrouvabilité
- Lien vers un article complet si besoin de détails

Vise **20 à 50 FAQs** pour couvrir 80% des questions du quotidien — la fameuse loi de Pareto.

### 3. Mesurer l'adoption

Au bout d'un mois, regarde :

| Indicateur | Cible | Où trouver |
|---|---|---|
| **Vues totales par FAQ** | > 5 / mois sur les FAQs phares | Liste FAQs (colonne « Vues ») |
| **Score helpful moyen** | > 70% | Liste FAQs (badge X%) |
| **% de recherches qui ouvrent une FAQ** | viser > 30% | Croisement Top recherches × Vues FAQ |
| **Recherches sans résultat** | en baisse mois après mois | Analytics → Recherches sans résultat |

### 4. Itérer

- FAQ avec score < 60% (≥ 5 votes) → reformule la réponse
- FAQ avec 0 vue après 30 jours → reformule la question (mauvais matching) ou retire-la
- Nouvelle suggestion sur Analytics → bouton « Créer une FAQ », même flow

### 5. Industrialiser à plus grande échelle (préparation P2 / P3)

Quand tu as 50+ FAQs avec un helpful moyen > 70%, deux débouchés deviennent envisageables :

- **Export web public** (à venir) : tes FAQs apparaissent automatiquement sur ton site client. Une seule édition, deux surfaces (interne + externe), zéro divergence.
- **Chatbot** (à venir) : un assistant conversationnel ingère tes FAQs et répond aux clients en self-service.

Ces deux briques amplifient le ROI éditorial de tes FAQs — mais elles ne fonctionnent bien qu'avec une base de qualité côté interne. C'est pourquoi P0 (création) et P1 (qualité) précèdent P2 et P3.

> 💡 **Astuce** : 30 minutes par mois sur l'hygiène de tes FAQs (suggesteur, fraîcheur, votes < 60%) suffit à maintenir la base saine — et l'effet sur l'efficacité de ton équipe est immédiat. C'est probablement le meilleur ROI que tu puisses obtenir d'un outil de knowledge management.
        `.trim(),
      },
    ],
  },
  {
    id:    'team',
    title: 'Équipe',
    icon:  '👥',
    articles: [
      {
        id:    'invite',
        title: 'Inviter un collaborateur',
        content: `
## Inviter un collaborateur

1. Va dans **Équipe** depuis le menu de gauche
2. Clique sur **Inviter un membre**
3. Saisis l'adresse email du collaborateur
4. Sélectionne son rôle (**Manager** ou **Conseiller**)
5. Clique sur **Envoyer l'invitation**

Le collaborateur reçoit un email avec un lien pour créer son compte. Ce lien est valable **7 jours**.

**Si le lien a expiré**
Dans la liste des membres, trouve le collaborateur avec le statut *Invitation envoyée* et clique sur **Renvoyer**.
        `.trim(),
      },
      {
        id:    'manage-roles',
        title: 'Gérer les rôles et permissions',
        content: `
## Gérer les rôles et permissions

**Changer le rôle d'un membre**
1. Va dans **Équipe**
2. Trouve le membre dans la liste
3. Clique sur son rôle actuel
4. Sélectionne le nouveau rôle dans le menu

**Les rôles disponibles**
- **Admin** : accès complet
- **Manager** : création de contenu + gestion des conseillers + Analytics
- **Conseiller** : consultation uniquement

> ⚠️ **Attention** : Tu ne peux pas rétrograder le dernier admin de l'espace.
        `.trim(),
      },
      {
        id:    'disable-member',
        title: 'Désactiver un membre',
        content: `
## Désactiver un membre

Désactiver un membre lui retire l'accès à KnowDesk sans supprimer son compte ni son historique.

1. Va dans **Équipe**
2. Trouve le membre dans la liste
3. Clique sur le bouton **Désactiver** dans la colonne *Actions*, à droite de la ligne
4. Confirme l'action

Le membre ne peut plus se connecter immédiatement. Tu peux le réactiver à tout moment depuis la même liste — le bouton **Désactiver** est remplacé par **Réactiver** sur les lignes des membres désactivés.

> 💡 **Astuce** : Préfère la désactivation à la suppression — tu conserves ainsi l'historique des contributions du membre.
        `.trim(),
      },
    ],
  },
  {
    id:    'analytics',
    title: 'Analytics',
    icon:  '📊',
    articles: [
      {
        id:    'analytics-overview',
        title: 'Lire le tableau Analytics',
        content: `
## Lire le tableau Analytics

La page **Analytics** te donne une vue d'ensemble de la santé éditoriale de ta base. Elle est visible aux **admins** et **managers**.

**Accéder à Analytics**
Clique sur l'icône Analytics (graphique en barres) dans le menu de gauche.

**Rangée du haut — Inventaire et engagement**
- **Articles publiés / brouillons / archivés** : photographie globale de ton stock
- **Tags** et **Processus guidés** : volumétrie associée
- **Actifs aujourd'hui / 7 jours / 30 jours** : utilisateurs distincts ayant consulté un article ou fait une recherche

**Bannière ambre — 📝 FAQs à créer**
Quand au moins une recherche zero-result a été faite **3 fois ou plus dans les 7 derniers jours**, une bannière ambre apparaît au-dessus du grid avec la liste des requêtes concernées. Chaque ligne a un bouton **Créer une FAQ** qui ouvre l'éditeur avec la question pré-remplie. C'est le moyen le plus rapide de combler les angles morts de ta base — utilise-le en priorité.

**Cartes orientées action**
Toutes les listes sont **cliquables** : un clic ouvre directement l'article concerné, le bouton **← Retour** te ramène sur Analytics.

- **Articles les plus consultés** — Top 10 sur 30 jours
- **Articles peu consultés** — Articles publiés depuis plus de 30 jours et lus au plus une fois sur la fenêtre. Candidats à mise à jour ou retrait
- **Top recherches** — Requêtes les plus fréquentes
- **Recherches sans résultat** — Requêtes qui n'ont rien retourné. **Gold mine éditoriale** : autant de sujets à couvrir
- **Articles à vérifier** — Publiés mais sans mise à jour depuis plus de 90 jours
- **Brouillons orphelins** — Drafts qui dorment depuis plus de 30 jours
- **Articles sans tag** — À tagger pour améliorer leur retrouvabilité
- **Top contributeurs** — Auteurs les plus actifs (total et 30 derniers jours)
- **Couverture par catégorie** — Identifie les catégories sous-documentées
- **Tags utilisés** et **Tags inutilisés** — Hygiène du vocabulaire

**Bloc Réponse IA (sous le grid)**
- **Total / Done / Unsure / Helpful%** sur les recherches IA déclenchées dans la SearchBar
- **Top questions** et **Questions sans réponse** — agrégées avec **dédup intelligente** : les variantes intermédiaires de la même recherche tapée par un user (« comment résilier », « comment résilier mon », « comment résilier mon forfait ») sont fusionnées en une seule ligne. Ne reflète que la vraie recherche finale.
- Bouton **Créer une FAQ** sur chaque question sans réponse, raccourci vers \`/faqs/new\` avec la question pré-remplie

**Bloc Chatbot (si activé)**
- **Total conversations** sur 30 jours, ventilation par statut (En cours / Résolues / Escaladées / Abandonnées)
- **Taux de résolution** = résolues / total clos
- **Taux d'escalade** = escaladées / total clos
- **CSAT moyen** sur les conversations notées
- **Top thématiques** : agrégées via clustering Mistral à la clôture de chaque conversation. Une thématique = un groupe nominal court (ex *« Résiliation forfait mobile »*, *« Activation eSIM »*). Les variantes de question sur le même sujet sont fusionnées sur la même ligne — meilleure photo des intentions visiteurs que des messages bruts.
- Pour creuser une conversation précise, aller dans **💬 Chats** (page dédiée).

**Fenêtre temporelle**
Les indicateurs basés sur l'activité (vues, recherches, engagement) couvrent les **30 derniers jours**. Les indicateurs structurels (articles à vérifier, tags inutilisés…) reflètent l'état actuel.

**Confidentialité**
Aucune donnée individuelle d'utilisation par conseiller n'est exposée. Les statistiques d'engagement sont **agrégées par organisation**. Les événements bruts sont automatiquement purgés après **90 jours**.

> 💡 **Astuce** : La carte **Recherches sans résultat** est probablement la plus actionnable. Chaque requête infructueuse est un sujet que tes conseillers cherchent et que ta base ne couvre pas — c'est le meilleur indicateur pour orienter ta création de contenu.
        `.trim(),
      },
    ],
  },
  {
    id:    'chats',
    title: 'Chats',
    icon:  '💬',
    articles: [
      {
        id:    'chats-overview',
        title: 'Suivre les conversations chat',
        content: `
## Suivre les conversations chat

La page **💬 Chats** (admin only, dans la barre de gauche entre Analytics et Settings) liste toutes les conversations menées par le chatbot embarqué sur ton site. Outil d'audit qualité, de repérage des thématiques, et de relecture pour améliorer la base.

**Accéder**

Sidebar → icône **💬 Chats**. URL canonique \`/chats\` (deep-linkable, F5 préserve l'écran).

**Vue liste**

Une ligne par conversation, triée par date décroissante. Pagination 20 par page. Chaque ligne :
- **Thématique** : 3-6 mots résumant la demande, générés automatiquement par Mistral à la clôture (ex *« Résiliation forfait mobile »*, *« Activation eSIM »*). Pour les conversations encore actives ou récentes sans thématique calculée, on affiche la 1ʳᵉ question du visiteur en italique à la place.
- **Statut** : *En cours / Résolue / Escaladée / Abandonnée*. Une conversation devient :
  - *Résolue* quand le visiteur clique 👍 sur une réponse, ou *Oui parfait* dans le formulaire feedback du header
  - *Escaladée* quand le visiteur clique 👎 ou demande explicitement un humain
  - *Abandonnée* automatiquement si elle reste *active* sans nouveau message pendant 30 minutes (cron toutes les 10 min)
- **Nombre de messages** dans la conversation
- **CSAT** étoiles ★ si le visiteur a noté
- **👍 / 👎** si le visiteur a voté
- **Date relative** (ex *« il y a 2h »*, *« hier »*)

**Recherche full-text**

Le champ de recherche en haut interroge le contenu **complet** des transcripts (côté visiteur **et** bot). Tape un mot-clé (ex *« remboursement »*, *« eSIM »*, *« facture »*) et clique **Rechercher** — la liste se filtre sur les conversations dont au moins un message contient le mot. Insensible à la casse, recherche par sous-chaîne (ILIKE Postgres).

**Filtre statut**

Le sélecteur à droite filtre par statut : utile pour audit qualité (regarde les *Escaladées*) ou pour identifier les conversations qui n'ont pas reçu de feedback (*En cours* > 30 min sont en train de devenir *Abandonnées*).

**Modale transcript**

Clique une ligne pour ouvrir le transcript complet :
- Bandeau métadonnées en haut : statut, dates, nombre de messages, CSAT et retour 👍/👎 si présents
- Bulles chat scrollables : visiteur à droite (couleur primaire), bot à gauche (blanc)
- Tu peux relire toute la conversation comme si tu étais le visiteur

**Cas d'usage typiques**

- **Audit hebdomadaire** : ouvre les conversations *Escaladées* de la semaine, relis les transcripts pour comprendre où le bot a buté → identifier les contenus manquants à créer (FAQs, articles).
- **Suivi d'incident** : un visiteur signale par email avoir eu un problème avec le bot → recherche son transcript par mot-clé pour comprendre.
- **Amélioration KB** : repère des thématiques récurrentes mais mal couvertes — la liste des thématiques est aussi disponible en agrégée dans **Analytics → Top thématiques**.

> 💡 **Astuce** : si une conversation t'aide à identifier une lacune dans la base, va directement créer une **FAQ** (\`/faqs/new\`) avec la question type — le bot s'en servira aussi grâce à l'indexation Meilisearch automatique.

> 🔒 **Confidentialité** : les transcripts contiennent uniquement ce que le visiteur a tapé volontairement. Pas de fingerprint réversible vers une identité réelle. Rétention illimitée pour l'instant ; un opt-in RGPD avec rétention configurable est prévu en V2.
        `.trim(),
      },
    ],
  },
  {
    id:    'settings',
    title: 'Paramètres',
    icon:  '⚙️',
    articles: [
      {
        id:    'org-settings',
        title: 'Paramètres de l\'organisation',
        content: `
## Paramètres de l'organisation

Accède aux paramètres depuis l'icône **⚙️** en bas du menu de gauche.

**Nom de l'organisation**
Le nom affiché dans l'interface et dans les emails envoyés à tes collaborateurs. Modifie-le et clique sur **Enregistrer**.

**Notifications**
Configure les événements qui déclenchent une notification dans le panneau **🔔** en bas du menu de gauche :
- **Article publié** : un nouvel article a été mis en ligne par ton équipe
- **Nouveau membre** : quelqu'un vient de rejoindre l'espace

> 💡 **Astuce** : Clique sur l'icône cloche **🔔** dans la barre de gauche pour ouvrir le panneau et marquer les notifications comme lues.
        `.trim(),
      },
      {
        id:    'manage-tags',
        title: 'Gérer les tags (admin)',
        content: `
## Gérer les tags de votre organisation

Les tags se créent automatiquement quand un contributeur en saisit dans l'éditeur. Cette page (visible aux **admins** uniquement) sert à faire le ménage et à uniformiser le vocabulaire.

**Accéder à la gestion**
Va dans **Paramètres → Tags**.

**Lire la liste**
Chaque ligne montre :
- Le **nom** affiché du tag
- Le **nombre d'articles** qui l'utilisent

**Renommer un tag**
1. Clique sur **Renommer** sur la ligne du tag
2. Saisis le nouveau nom dans la modale
3. Clique sur **Enregistrer**

Le nouveau nom se propage immédiatement à tous les articles qui portaient ce tag — y compris dans la fiche article et les filtres.

**Cas particulier — fusion automatique**
Si tu renommes un tag avec un nom déjà utilisé par un autre tag (insensible à la casse), KnowDesk **fusionne** les deux : tous les articles taggés avec l'ancien deviennent taggés avec le tag cible. C'est utile pour nettoyer les doublons (\`remboursement\` et \`Remboursement\`).

**Supprimer un tag**
Clique sur **Supprimer**. Une confirmation rappelle combien d'articles seront impactés. Les articles ne sont **pas** supprimés — ils perdent simplement ce tag.

> 💡 **Astuce** : Utilise la page **Analytics** pour repérer les tags inutilisés et nettoyer.
        `.trim(),
      },
      {
        id:    'account-settings',
        title: 'Modifier son profil',
        content: `
## Modifier son profil

Accède à ton profil depuis l'icône **👤** en bas du menu de gauche.

**Modifier ton prénom et nom**
Saisis tes nouvelles informations et clique sur **Enregistrer**.

**Changer ton adresse email**
1. Saisis ta nouvelle adresse email
2. Clique sur **Changer l'email**
3. Un email de confirmation est envoyé à la nouvelle adresse
4. Clique sur le lien dans l'email pour confirmer le changement

**Changer ton mot de passe**
1. Saisis ton mot de passe actuel
2. Saisis et confirme ton nouveau mot de passe (8 caractères minimum)
3. Clique sur **Changer le mot de passe**

> ⚠️ **Attention** : Pour ta sécurité, **toutes tes sessions actives sont invalidées** après un changement de mot de passe ou la confirmation d'un changement d'email. Tu seras redirigé vers la page de connexion à ta prochaine action.
        `.trim(),
      },
{
  id:    'api-keys',
  title: 'Gérer les clés API',
  content: `
## Gérer les clés API

Les clés API permettent à des applications tierces d'accéder en lecture à ta base de connaissance KnowDesk — sans que les utilisateurs aient besoin de se connecter.

**Accéder à la gestion des clés**
Va dans **Paramètres → API** depuis le menu de gauche.

**Créer une clé**
1. Clique sur **+ Créer une clé**
2. Donne-lui un nom descriptif (ex. *Intégration Hubicus*, *Site web*)
3. Clique sur **Créer**
4. Copie immédiatement la clé affichée — elle ne sera plus visible après fermeture

> ⚠️ **Attention** : La clé complète n'est affichée qu'une seule fois. Si tu la perds, tu devras en créer une nouvelle.

**Ce qu'une clé API permet de faire**
- Lire la liste des catégories
- Lire la liste des articles publiés et leur contenu
- Lire les processus guidés publiés et leur structure

**Ce qu'une clé API ne permet pas**
- Créer ou modifier du contenu
- Accéder aux brouillons
- Gérer les membres ou les paramètres

**Utiliser une clé dans une requête**
Ajoute le header \`X-API-Key\` à chaque requête :
\`\`\`
GET https://api.knowdesk.fr/public/v1/articles
X-API-Key: kd_live_ta_cle_api
\`\`\`

**Révoquer une clé**
Dans la liste des clés, clique sur **Révoquer** à droite de la clé concernée et confirme. La révocation est immédiate et irréversible — toute application utilisant cette clé perdra l'accès instantanément.

> 💡 **Astuce** : Crée une clé par application ou service qui utilise l'API. Si une clé est compromise, tu peux la révoquer sans impacter les autres intégrations.

**Consulter la documentation API complète**
La documentation détaillée avec tous les endpoints et exemples de code est disponible sur :
\`https://app.knowdesk.fr/?api-docs\`
  `.trim(),
},

    ],
  },
];

// Index pour la recherche
export const HELP_INDEX = HELP_CONTENT.flatMap(section =>
  section.articles.map(article => ({
    sectionId:    section.id,
    sectionTitle: section.title,
    articleId:    article.id,
    title:        article.title,
    content:      article.content,
  }))
);
