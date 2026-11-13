import { Briefcase, ChartColumn, CircleHelp, FileText, Headphones, ListOrdered, MessageCircle, Newspaper, Rocket, Search, Settings, Users, type LucideIcon } from 'lucide-react';
export interface HelpArticle {
  id:      string;
  title:   string;
  content: string; // Markdown
}

export interface HelpSection {
  id:       string;
  title:    string;
  icon:     LucideIcon;
  articles: HelpArticle[];
}

export const HELP_CONTENT: HelpSection[] = [
  {
    id:    'whats-new',
    title: 'Nouveautés',
    icon:  Newspaper,
    articles: [
      {
        id:    'release-notes',
        title: 'Quoi de neuf récemment ?',
        content: `
## Quoi de neuf récemment ?

Cette page récapitule les fonctionnalités livrées ces dernières semaines. Elle est mise à jour à chaque nouvelle version.

### Juin 2026

**Chatbot : un moteur de conversation complet**
Le chatbot de votre site a beaucoup progressé :
- **Conversations conservées** : chaque conversation est désormais enregistrée sur le serveur. Vous la relisez depuis la nouvelle page **Conversations**, avec une recherche par mot-clé.
- **Question de clarification** : quand un visiteur pose une question trop vague, le chatbot pose **une** question pour préciser avant de répondre.
- **Réponses rapides** : sous chaque réponse, le chatbot propose des boutons vers les sources les plus pertinentes.
- **Avis sous chaque réponse** : deux pouces discrets permettent au visiteur de donner son avis. Un avis négatif affiche, dans la conversation, un message qui propose de laisser son adresse e-mail pour être recontacté. Aucune fenêtre ne vient interrompre l'échange.
- **Bouton de contact** dans l'en-tête du chatbot pour demander à parler à une personne.
- **Passage à un humain** : à chaque demande, KnowDesk peut envoyer la conversation par e-mail à votre équipe ou l'envoyer à votre webhook (CRM, Zendesk, Slack, n8n…). Le réglage se trouve dans **Paramètres > Chatbot public**.
- **Thèmes des conversations** : chaque conversation est résumée automatiquement à sa clôture, en 3 à 6 mots. Ces résumés alimentent les thèmes les plus fréquents dans **Analyse**, plus utiles qu'une liste de messages bruts.
- **Page Conversations** : une nouvelle entrée du menu de gauche, réservée aux administrateurs, pour relire les conversations, les filtrer par statut et les rechercher par mot-clé.

Pour en savoir plus, consultez les rubriques **Conversations** et **Recherche**, article « Chatbot à intégrer à votre site web ».

**Consigne du chatbot personnalisable**
Vous pouvez désormais voir la consigne **réellement utilisée** par le chatbot à chaque message, dans **Paramètres > Chatbot public**, et la réécrire entièrement si besoin. Le bouton **Restaurer le défaut** revient à la version générée à partir des champs de personnalisation. Modifiez-la avec précaution : une consigne mal rédigée peut dérégler le chatbot.

**Analyse : thèmes des conversations et questions dédoublonnées**
- La liste **Top questions** de la Réponse IA ne contient plus les versions intermédiaires d'une même question saisie lettre par lettre. Les saisies successives d'un même membre en moins de 60 secondes sont regroupées, y compris dans l'historique.
- Les thèmes les plus fréquents des conversations remplacent l'ancienne liste de messages bruts.
- Un bloc Chatbot affiche le total des conversations, le taux de résolution, le taux de passage à un humain et la satisfaction moyenne.

### Mai 2026

**Barre de recherche améliorée**
Les résultats sont désormais **regroupés par type** dans la liste : les FAQ d'abord, puis les articles, puis les processus. Chaque groupe a son icône, son nom et son nombre de résultats. Les groupes sans résultat sont masqués.

Autre confort : la barre se ferme quand vous cliquez en dehors, sans effacer votre recherche. Cliquez dans le champ pour la rouvrir.

Pour en savoir plus, consultez l'article **Rechercher dans la base** de la rubrique **Recherche**.

**FAQ modifiables**
Une nouvelle entrée **FAQ** est disponible dans le menu de gauche. Une FAQ est une réponse courte (1 à 3 phrases), prête à coller dans une conversation ou un e-mail. Un article, lui, décrit une procédure complète.

Ce qui change pour les conseillers :
- Avec Cmd+K, saisissez un mot : la FAQ apparaît **en premier** dans les résultats, avec un badge violet.
- Cliquez sur la FAQ : la réponse complète s'affiche, avec le bouton **Copier la réponse**.
- Donnez votre avis avec les pouces pour signaler les bonnes réponses, et les mauvaises.

Ce qui change pour les administrateurs :
- Page Analyse : un nouvel encart **FAQ à créer** propose automatiquement les questions recherchées sans résultat (au moins 3 fois en 7 jours).
- Onglet **À réviser** dans la liste : les FAQ publiées et non modifiées depuis plus de 6 mois y sont signalées.
- L'historique des modifications est visible dans l'éditeur.

Pour en savoir plus, consultez la rubrique **FAQ**.

**Analyse**
Une nouvelle page **Analyse** est disponible pour les administrateurs et les managers. Elle réunit en un coup d'œil :
- l'inventaire (articles publiés, brouillons, tags, processus) ;
- l'activité de l'équipe (membres actifs aujourd'hui, sur 7 jours et sur 30 jours) ;
- les articles à mettre à jour, les brouillons orphelins et les articles sans tag ;
- les principaux contributeurs et la couverture par catégorie ;
- les articles les plus et les moins consultés ;
- les recherches les plus fréquentes et les **recherches sans résultat**, la meilleure source d'idées de contenu.

Pour en savoir plus, consultez la rubrique **Analyse**.

**Tags libres sur les articles**
Vous pouvez désormais ajouter jusqu'à **10 tags** à un article depuis l'éditeur, avec une saisie semi-automatique à partir des tags déjà utilisés. Le filtre par tag est intégré à la liste des articles. Les administrateurs disposent d'une page **Paramètres > Tags** pour renommer ou supprimer des tags.

Pour en savoir plus, consultez les articles **Ajouter des tags à un article** (rubrique **Articles**) et **Gérer les tags** (rubrique **Paramètres**).

**Recherche intelligente**
La barre de recherche (raccourci \`Cmd+K\`) tolère désormais les fautes de frappe : *rembousement* retrouve *remboursement*, *livrazon* retrouve *Livraisons*. Les administrateurs peuvent définir des **synonymes propres à leur organisation** dans **Paramètres > Synonymes**.

Pour en savoir plus, consultez la rubrique **Recherche**.

> 💡 **Astuce** : Pour ne manquer aucune nouveauté, consultez cette rubrique après chaque mise à jour de KnowDesk.
        `.trim(),
      },
    ],
  },
  {
    id:    'getting-started',
    title: 'Premiers pas',
    icon:  Rocket,
    articles: [
      {
        id:    'create-workspace',
        title: 'Créer votre organisation KnowDesk',
        content: `
## Créer votre organisation KnowDesk

Lors de votre première connexion, KnowDesk vous guide en 3 étapes :

**1. Nom de votre organisation**
Choisissez un nom clair : c'est ce que verront les membres qui rejoignent votre équipe.

**2. Première catégorie**
Les catégories organisent votre base de connaissance. Commencez par une catégorie principale ; vous pourrez en ajouter autant que vous voulez ensuite.

**3. Premier article**
Rédigez un premier article pour essayer l'éditeur. Une procédure simple suffit.

> 💡 **Astuce** : Ne cherchez pas la perfection dès le départ. Commencez par quelques articles clés, puis enrichissez votre base au fil du temps.
        `.trim(),
      },
      {
        id:    'invite-members',
        title: 'Inviter les premiers membres',
        content: `
## Inviter les premiers membres

Pour inviter une personne dans votre organisation :

1. Ouvrez **Équipe** dans le menu de gauche.
2. Cliquez sur **Inviter un membre**.
3. Saisissez son adresse e-mail.
4. Choisissez son rôle : **Manager** ou **Conseiller**.
5. Cliquez sur **Envoyer l'invitation**.

La personne reçoit un e-mail avec un lien d'activation valable **7 jours**. Elle choisit son mot de passe lors de sa première connexion.

> 💡 **Astuce** : Pour inviter plusieurs personnes, répétez l'opération pour chacune.
        `.trim(),
      },
      {
        id:    'roles',
        title: 'Comprendre les rôles',
        content: `
## Les rôles dans KnowDesk

KnowDesk propose 3 niveaux d'accès :

**Administrateur**
- Accès complet à toutes les fonctionnalités
- Gère les membres, les paramètres et la facturation
- Crée, modifie et supprime tous les contenus
- Accède à la page Analyse et à la gestion des tags et des synonymes

**Manager**
- Crée et publie des articles et des processus guidés
- Invite et gère les conseillers
- Accède à la page Analyse
- Ne gère pas les paramètres avancés (tags, synonymes, facturation)

**Conseiller**
- Consulte la base de connaissance et y fait des recherches
- Suit les processus guidés pendant les appels clients
- Ne crée ni ne modifie de contenu

> 💡 **Astuce** : Donnez le rôle **Manager** à vos responsables d'équipe : ils pourront tenir la base de connaissance à jour de façon autonome.
        `.trim(),
      },
      {
        id:    'settings-basics',
        title: 'Régler les paramètres de base',
        content: `
## Régler les paramètres de base

Ouvrez les paramètres depuis l'icône **Paramètres**, en bas du menu.

**Nom de l'organisation**
Modifiez le nom affiché dans l'interface et dans les e-mails envoyés aux membres.

**Notifications**
Choisissez les événements qui déclenchent une notification :
- nouvel article publié ;
- nouveau membre dans l'équipe ;
- résumé hebdomadaire.

**Mon compte**
Depuis l'icône **Mon compte** (vos initiales, en bas du menu), vous pouvez modifier votre prénom, votre nom, votre adresse e-mail et votre mot de passe.
        `.trim(),
      },
    ],
  },
  {
    id:    'articles',
    title: 'Articles',
    icon:  FileText,
    articles: [
      {
        id:    'create-article',
        title: 'Créer et structurer un article',
        content: `
## Créer et structurer un article

Pour créer un article :

1. Ouvrez **Articles** dans le menu.
2. Cliquez sur **Nouvel article**.
3. Saisissez un titre clair et descriptif.
4. Choisissez une catégorie.
5. Rédigez votre contenu dans l'éditeur.

**Conseils de rédaction**
- Commencez par le plus important : les conseillers lisent souvent en diagonale.
- Utilisez des listes à puces pour les étapes et les procédures.
- Soyez concis : un article, un sujet.
- Ajoutez des exemples concrets quand c'est possible.

> 💡 **Astuce** : L'éditeur enregistre automatiquement votre travail pendant la saisie. Aucune modification n'est perdue, et l'état de l'enregistrement est affiché en haut de l'écran.
        `.trim(),
      },
      {
        id:    'categories',
        title: 'Organiser par catégories',
        content: `
## Organiser par catégories

Les catégories structurent votre base de connaissance. Vous pouvez créer plusieurs niveaux (univers, catégorie, sous-catégorie…).

**Créer une catégorie**
1. Ouvrez **Articles**.
2. Cliquez sur **+** en haut du panneau de gauche.
3. Donnez-lui un nom clair.
4. Si vous le souhaitez, choisissez une **catégorie parente**. Sans catégorie parente, la catégorie est créée au premier niveau.

> 💡 **Raccourci** : si vous cliquez sur **+** alors qu'une catégorie est sélectionnée, elle est proposée comme catégorie parente. Pratique pour ajouter rapidement une sous-catégorie.

**Modifier ou supprimer une catégorie**
Survolez une ligne du panneau de gauche : un bouton **···** apparaît à droite. Il ouvre un menu de 4 actions :
- **Renommer** : modifiez le nom directement sur la ligne (Entrée pour enregistrer, Échap pour annuler).
- **Ajouter une sous-catégorie** : ouvre la fenêtre de création avec cette catégorie comme parente.
- **Déplacer** : change la catégorie parente (ses sous-catégories ne sont pas proposées, pour éviter les boucles).
- **Supprimer** : une confirmation est demandée. Les sous-catégories sont supprimées aussi ; leurs articles perdent leur catégorie.

> ⚠️ **Attention** : La suppression est définitive. Les articles d'une catégorie supprimée restent accessibles, mais sans catégorie. Pensez à les reclasser.

**Bien organiser**
Voyez vos catégories comme des classeurs. Quelques exemples :
- par thème : *Facturation*, *Livraison*, *Retours* ;
- par type de demande : *Questions courantes*, *Procédures*, *Scripts* ;
- par produit : *Produit A*, *Produit B* ;
- sur 2 niveaux : *Mobile > Activation*, *Mobile > Réseau*.

> 💡 **Astuce** : Un article n'a qu'une catégorie. Pour un classement transversal (saison, état éditorial…), utilisez plutôt les **tags**.
        `.trim(),
      },
      {
        id:    'add-tags',
        title: 'Ajouter des tags à un article',
        content: `
## Ajouter des tags à un article

Les tags complètent la catégorie : ils permettent un classement transversal, et un article peut en porter plusieurs.

**Ajouter des tags depuis l'éditeur**
1. Ouvrez un article, ou créez-en un.
2. Sous le choix de la catégorie, repérez le champ **Tags**.
3. Saisissez le début d'un tag : KnowDesk propose les tags déjà utilisés dans votre organisation.
4. Appuyez sur **Entrée** ou saisissez une **virgule** pour ajouter le tag.
5. Pour retirer un tag, cliquez sur la croix à côté.

**Combien de tags ?**
- 10 tags au plus par article
- 200 tags au plus par organisation

**Bonnes pratiques**
- Évitez les tags de même sens (« remboursement » et « refund » : gardez-en un seul).
- Préférez des tags courts et durables.
- Pour une opération ponctuelle (Black Friday, Soldes 2026), créez un tag dédié. Vous pourrez le supprimer une fois l'opération terminée.

> 💡 **Astuce** : Les tags sont harmonisés automatiquement. \`Black Friday\`, \`black friday\` et \`BLACK FRIDAY\` forment un seul tag, affiché tel qu'il a été saisi la première fois.
        `.trim(),
      },
      {
        id:    'filter-by-tag',
        title: 'Filtrer la liste par tag',
        content: `
## Filtrer la liste par tag

Vous pouvez combiner plusieurs tags pour retrouver rapidement un ensemble d'articles.

**Filtrer**
1. Ouvrez **Articles**.
2. Sous les onglets **Tous**, **Publiés** et **Brouillons**, une rangée affiche les tags de l'organisation avec leur nombre d'articles.
3. Cliquez sur un tag pour l'activer (il devient bleu).
4. Cliquez sur d'autres tags pour les combiner : seuls les articles qui portent **tous** les tags sélectionnés apparaissent.
5. Cliquez sur **Effacer** pour retirer le filtre.

Le filtre par tag se combine avec le filtre par catégorie du panneau de gauche et avec le filtre par statut. Vous pouvez par exemple n'afficher que les *brouillons* qui portent le tag *Black Friday* dans la catégorie *Facturation*.

> 💡 **Astuce** : Pour chercher par tag depuis n'importe quelle page, utilisez plutôt la barre de recherche (\`Cmd+K\`). Consultez la rubrique **Recherche**.
        `.trim(),
      },
      {
        id:    'insert-image',
        title: 'Insérer une image dans un article',
        content: `
## Insérer une image dans un article

L'éditeur accepte les images collées ou glissées-déposées.

**Trois façons d'insérer une image**
1. **Coller** : copiez une image, puis appuyez sur \`Cmd+V\` (\`Ctrl+V\`) dans l'éditeur.
2. **Glisser-déposer** : faites glisser un fichier image depuis votre ordinateur dans la zone de contenu.
3. **Bouton image** : cliquez sur l'icône image dans la barre d'outils de l'éditeur.

L'image est envoyée automatiquement et apparaît à l'endroit du curseur. Cliquez dessus pour la redimensionner ou la supprimer.

**Limites**
- Formats acceptés : PNG, JPG, GIF, WebP
- Taille maximale : 5 Mo par image

> ⚠️ **Attention** : Les images sont conservées avec l'article. Si vous supprimez l'article, ses images ne sont plus accessibles publiquement.

> 💡 **Astuce** : Compressez vos captures d'écran avant de les importer : un article qui s'affiche vite est un article lu.
        `.trim(),
      },
      {
        id:    'insert-link',
        title: 'Insérer un lien (interne ou externe)',
        content: `
## Insérer un lien (interne ou externe)

Un lien peut mener vers une adresse web ou vers un autre article de votre base.

**Lien externe**
1. Sélectionnez le texte qui deviendra un lien.
2. Cliquez sur l'icône lien dans la barre d'outils (ou appuyez sur \`Cmd+K\`).
3. Collez l'adresse, puis confirmez.

**Lien vers un autre article (interne)**
1. Sélectionnez le texte.
2. Cliquez sur l'icône lien.
3. Saisissez le titre de l'article visé : KnowDesk propose les articles correspondants.
4. Cliquez sur l'article voulu.

Quand un conseiller clique sur un lien interne dans un article, il ouvre directement l'article visé, sans quitter KnowDesk.

> 💡 **Astuce** : Les liens internes relient les articles qui se complètent : un article *Politique de remboursement* peut mener vers *Procédure de retour*.
        `.trim(),
      },
      {
        id:    'publish',
        title: 'Publier ou garder en brouillon',
        content: `
## Publier ou garder en brouillon

Un article a l'un de ces trois statuts :

**Brouillon**
- Visible uniquement par les administrateurs et les managers
- Utile pour préparer un contenu avant de le rendre disponible
- Enregistré automatiquement

**Publié**
- Visible par tous les membres de l'équipe
- Présent dans les résultats de recherche
- Modifiable à tout moment

**Archivé**
- Retiré des articles publiés, de la recherche et du chatbot
- Rangé dans l'onglet **Archivés** de la liste des articles
- Non compté dans la limite d'articles de l'organisation

**Publier un article**
Dans l'éditeur, cliquez sur **Publier** en haut à droite. Si l'article est déjà publié, le bouton devient **Mettre à jour**.

**Archiver un article**
Dans le menu **···** de la ligne, ou dans l'éditeur, cliquez sur **Archiver**. Pour le retrouver, ouvrez l'onglet **Archivés** et cliquez sur **Désarchiver** : l'article revient en brouillon et devra être publié de nouveau.

> 💡 **Astuce** : Publiez même si l'article n'est pas parfait. Un contenu imparfait mais disponible sert davantage qu'un contenu parfait resté en brouillon.
        `.trim(),
      },
      {
        id:    'versions',
        title: 'Historique des versions',
        content: `
## Historique des versions

KnowDesk conserve toutes les versions publiées de vos articles.

**Consulter l'historique**
1. Ouvrez un article dans l'éditeur.
2. Cliquez sur **Historique** en haut à droite.
3. Le panneau affiche toutes les versions avec leur date.

**Restaurer une version**
1. Dans le panneau Historique, repérez la version souhaitée.
2. Cliquez sur **Restaurer**.
3. Le contenu de l'éditeur est remplacé par cette version, et l'article repasse en brouillon.
4. Vérifiez le contenu, puis cliquez sur **Publier** pour rendre la version restaurée disponible aux conseillers.

> 💡 **Astuce** : La restauration ne publie rien automatiquement : vous pouvez relire et ajuster avant de remettre l'article en ligne.
        `.trim(),
      },
    ],
  },
  {
    id:    'faqs',
    title: 'FAQ',
    icon:  CircleHelp,
    articles: [
      {
        id:    'what-is-faq',
        title: 'Qu\'est-ce qu\'une FAQ ?',
        content: `
## Qu'est-ce qu'une FAQ ?

Une **FAQ** est une question fréquente avec une réponse courte, prête à être copiée dans une conversation ou un e-mail client. Elle se distingue d'un article :

| | FAQ | Article |
|---|---|---|
| **Format** | Question et réponse | Titre et contenu libre |
| **Longueur idéale** | 1 à 3 phrases | Aussi long que nécessaire |
| **Exemple** | « Délai de livraison ? » | « Procédure complète de retour d'un produit » |
| **Usage** | Copier-coller la réponse | Lire et appliquer |
| **Mise à jour** | Rare (la réponse change peu) | Régulière (les procédures évoluent) |

**Quand créer une FAQ plutôt qu'un article ?**

Si vous pouvez répondre en moins de 3 phrases, c'est une FAQ. S'il vous faut plusieurs paragraphes, des images ou des listes à puces, c'est un article.

**Exemples de bonnes FAQ** :
- *Délai de livraison standard ?* Réponse : 3 à 5 jours ouvrés en France métropolitaine, 7 à 10 jours pour l'outre-mer.
- *Comment annuler une commande ?* Réponse : connectez-vous à votre compte, ouvrez Mes commandes, puis cliquez sur Annuler dans les 24 heures qui suivent l'achat.
- *Politique de retour ?* Réponse : retour gratuit sous 30 jours depuis l'espace client.

**Exemples qui ne sont pas des FAQ** :
- *Comment configurer son compte* : c'est un guide, donc un article.
- *Procédure de réclamation pour un produit défectueux* : plusieurs étapes, donc un article ou un processus guidé.

> 💡 **Astuce** : Une FAQ peut **renvoyer vers un article** complet grâce au champ « Article lié ». Pratique quand la réponse courte suffit dans 80 % des cas, mais que certains clients ont besoin de plus de détails.
        `.trim(),
      },
      {
        id:    'create-faq',
        title: 'Créer une FAQ',
        content: `
## Créer une FAQ

**Réservé aux administrateurs et aux managers.**

**Deux façons de commencer :**

1. **À la main** : depuis **FAQ** dans le menu de gauche, cliquez sur **Nouvelle FAQ**.
2. **À partir d'une suggestion** : sur la page **Analyse**, l'encart **FAQ à créer** affiche les recherches restées sans résultat au moins 3 fois ces 7 derniers jours. Cliquez sur **Créer une FAQ** à côté d'une suggestion : l'éditeur s'ouvre avec la question déjà remplie.

**Champs de l'éditeur :**

- **Question** (obligatoire, 200 caractères au plus) : formulée comme un client la poserait.
- **Réponse** (obligatoire, 2 000 caractères au plus ; visez plutôt 500). Au-delà, préférez un article complet.
- **Catégorie** : les mêmes catégories que les articles.
- **Tags** : jusqu'à 10, les mêmes que sur les articles.
- **Article lié** (facultatif) : pour les clients qui veulent plus de détails.
- **Visibilité** :
  - *Interne* (par défaut) : visible par votre équipe seulement.
  - *Public* : prête pour une future publication sur le web.

**Bonnes pratiques de rédaction :**

- Allez à l'essentiel : 1 à 3 phrases.
- Posez la question comme un client, pas comme un conseiller (« Comment retourner un produit ? » plutôt que « Procédure de retour »).
- Gardez un ton cohérent : tutoiement ou vouvoiement, mais une seule règle pour toutes les FAQ publiques.
- Évitez le jargon interne.
- N'indiquez ni noms de personnes ni abréviations internes.
- Évitez les réponses pleines de conditions (« cela dépend si… »). Si la réponse dépend du cas, créez plusieurs FAQ ou renvoyez vers un article.

**Brouillon ou publiée :**

Une FAQ en *brouillon* est invisible pour les conseillers. Elle n'apparaît dans la barre de recherche qu'une fois **publiée**. Vous pouvez la dépublier à tout moment.

> 💡 **Astuce** : Avant de publier, demandez-vous : *« Est-ce que je collerais cette réponse telle quelle dans une conversation client ? »*. Si ce n'est pas le cas, retravaillez-la.
        `.trim(),
      },
      {
        id:    'find-faq',
        title: 'Trouver une FAQ rapidement',
        content: `
## Trouver une FAQ rapidement (conseillers)

C'est l'usage principal de KnowDesk : vous êtes en ligne avec un client et vous avez **quelques secondes** pour répondre.

**Le bon réflexe :**

1. **Cmd+K** (Mac) ou **Ctrl+K** (Windows, Linux) : la barre de recherche s'active depuis n'importe quelle page.
2. **Saisissez un mot-clé**, pas une phrase complète. *« remboursement »* suffit, inutile d'écrire *« Quelle est la politique de remboursement »*.
3. **Repérez le badge violet « FAQ »** : les FAQ apparaissent en premier dans les résultats.
4. **Cliquez sur la FAQ** : la réponse complète s'affiche dans un encadré bleu, sous le résultat.
5. **Cliquez sur Copier la réponse** : un message vert confirme qu'elle est copiée.
6. **Collez-la (Cmd+V) dans votre conversation** ou votre e-mail client.

**Donner votre avis :**

Sous la réponse, vous pouvez voter :
- pouce levé si la réponse a aidé votre client ;
- pouce baissé si elle est mal formulée, périmée ou si elle a suscité une nouvelle question.

**Pourquoi c'est important** : votre vote remonte aux administrateurs, qui voient le Score helpful de chaque FAQ. Une FAQ souvent jugée inutile sera retravaillée. Une FAQ souvent jugée utile sera conservée, et pourra être publiée plus tard.

> 💡 **Astuce** : Si vous cherchez souvent une question qui n'a pas de FAQ, vos recherches sont comptées automatiquement : les administrateurs verront une suggestion sur la page Analyse. Vous pouvez aussi leur en parler directement.

**Si la FAQ ne suffit pas :**

Si la FAQ a un **article lié**, un lien permet d'ouvrir l'article complet (procédure détaillée, captures…). Sinon, lancez une recherche plus large pour trouver l'article correspondant.
        `.trim(),
      },
      {
        id:    'vote-faq',
        title: 'Donner votre avis sur une FAQ',
        content: `
## Donner votre avis sur une FAQ

**Disponible pour tous les rôles.**

Sous chaque réponse de FAQ affichée dans la barre de recherche, vous pouvez voter avec un pouce :

- **Pouce levé, « Cette réponse a aidé »** : la formulation est claire, le client a compris, rien à retravailler.
- **Pouce baissé, « Cette réponse n'a pas aidé »** : formulation floue, information périmée, ou nouvelle question suscitée.

**Ce que cela change :**

| Pour qui | Effet |
|---|---|
| Administrateur, manager | Voit le **Score helpful** (en %) de chaque FAQ, dans la liste et dans l'éditeur. Une FAQ sous 60 % est à réviser en priorité. |
| Conseiller | Améliore la qualité de la base : moins de mauvaises réponses, plus de bonnes. |
| Vous | Vous ne votez qu'une fois par FAQ dans une même session (le bouton est désactivé après votre vote). |

**Limite des votes :**

Votre vote est enregistré dans votre navigateur. Si vous changez de navigateur ou passez en navigation privée, vous pouvez voter de nouveau : c'est voulu. Le but est d'obtenir un avis sincère, pas de verrouiller le vote.

> 💡 **Astuce** : Un vote négatif est utile, mais il l'est **encore plus** si vous expliquez aussi pourquoi à un administrateur (« la FAQ X dit Y, mais en réalité c'est Z »). Le pouce seul ne dit pas ce qui ne va pas.
        `.trim(),
      },
      {
        id:    'pilot-faqs',
        title: 'Suivre vos FAQ (administrateurs)',
        content: `
## Suivre vos FAQ (administrateurs)

**Réservé aux administrateurs et aux managers.**

Une FAQ publiée doit être entretenue. Quatre outils vous y aident :

### 1. Suggestions automatiques (page Analyse)

L'encart **FAQ à créer** apparaît sur la page Analyse dès qu'une recherche est restée sans résultat **au moins 3 fois ces 7 derniers jours**. Ce seuil est volontairement bas pour ne manquer aucun besoin.

Exemple : *« délai livraison Belgique »* a été cherché 12 fois cette semaine sans résultat. La suggestion apparaît ; cliquez sur « Créer une FAQ » et l'éditeur s'ouvre avec la question déjà remplie.

C'est votre meilleur indicateur des sujets que votre base ne couvre pas.

### 2. FAQ à réviser (onglet de la liste)

Une FAQ publiée n'expire pas, mais **6 mois sans modification** est un signal d'alerte (politique modifiée, prix changé…).

L'onglet **À réviser** de la liste affiche toutes les FAQ concernées, chacune avec un badge orange « À réviser ».

Quand vous ouvrez une FAQ à réviser, un encart apparaît en haut de l'éditeur :
- si vous **modifiez** la réponse, la date de révision est mise à jour automatiquement ;
- si **rien n'est à changer**, cliquez sur **C'est à jour** : la FAQ est marquée comme révisée, sans modifier son contenu.

### 3. Score helpful de chaque FAQ

Chaque FAQ affiche son score (en % et en nombre de votes) dans la liste et dans l'éditeur. Quelques repères :

- **Plus de 80 %** : la FAQ est solide, elle pourra être publiée sur le web plus tard.
- **Entre 60 % et 80 %** : la formulation peut être améliorée.
- **Moins de 60 % avec au moins 5 votes** : reformulez-la en priorité, la réponse n'aide pas.
- **Aucun vote** : pas encore d'avis.

### 4. Historique des modifications

Dans l'éditeur, ouvrez le panneau **Historique des modifications** pour voir qui a modifié la FAQ et quand. Utile pour comprendre l'évolution d'une réponse contestée ou retrouver la dernière personne à l'avoir modifiée.

> 💡 **Astuce** : Prévoyez chaque mois quelques minutes pour passer en revue :
> 1. Les suggestions « FAQ à créer » de la page Analyse
> 2. L'onglet « À réviser » de la liste des FAQ
> 3. Les FAQ dont le Score helpful est sous 60 %
>
> 30 minutes par mois suffisent à garder une base saine, et votre équipe y gagne tout de suite.
        `.trim(),
      },
    ],
  },
  {
    id:    'search',
    title: 'Recherche',
    icon:  Search,
    articles: [
      {
        id:    'search-basics',
        title: 'Rechercher dans la base',
        content: `
## Rechercher dans la base

La recherche de KnowDesk **tolère les fautes** et couvre les articles, les FAQ, les processus guidés et leurs tags.

**Lancer une recherche**
- Cliquez sur la barre de recherche en haut de l'écran.
- **Raccourci clavier** : appuyez sur \`Cmd+K\` (Mac) ou \`Ctrl+K\` (Windows, Linux) depuis n'importe quelle page.

**Tolérance aux fautes**
Inutile de saisir le mot exact. \`rembousement\` retrouve *remboursement*, \`livrazon\` retrouve *Livraisons*. La recherche corrige automatiquement les fautes courantes.

**Ce qui est cherché**
Pour chaque FAQ, article ou processus publié, la recherche porte sur :
- la question (FAQ) ou le titre (article, processus) ;
- la réponse (FAQ) ou le texte du contenu, avec les passages trouvés surlignés dans les résultats ;
- la catégorie ;
- les tags.

**Lire les résultats, regroupés par type**
Les résultats sont **regroupés par type**, chaque groupe sous son propre titre :
- **FAQ** d'abord : des réponses courtes, prêtes à coller. Cliquez pour afficher la réponse complète et le bouton **Copier la réponse**.
- **Articles** ensuite : des guides détaillés. Cliquez pour ouvrir l'article.
- **Processus** en dernier : des processus guidés pour les cas complexes.

Chaque groupe indique son nombre de résultats. Un groupe sans résultat est masqué.

**Naviguer au clavier**
- \`↑\` \`↓\` parcourent les résultats d'un groupe à l'autre (les titres de groupe sont sautés).
- \`Entrée\` ouvre ou déplie le résultat sélectionné.
- \`Échap\` ferme la barre.

**Fermer la barre**
- Au clavier : \`Échap\`.
- À la souris : cliquez n'importe où en dehors de la barre. La liste se ferme mais votre recherche est conservée ; cliquez dans le champ pour la rouvrir.

> 💡 **Astuce** : Si une recherche fréquente ne donne rien, signalez-le : c'est un sujet à couvrir. Les administrateurs et les managers retrouvent ces recherches sur la page **Analyse**, dans la carte **Recherches sans résultat**, et elles alimentent les suggestions de FAQ.
        `.trim(),
      },
      {
        id:    'ai-answer',
        title: 'Comprendre la Réponse IA',
        content: `
## Comprendre la Réponse IA

Quand vous posez une **question** dans la barre de recherche, une carte « Réponse IA » apparaît en haut des résultats. Elle résume en quelques phrases les articles, FAQ et processus pertinents : un gain de temps pendant un appel client.

**Quand l'IA répond-elle ?**
La Réponse IA se déclenche automatiquement si votre recherche :
- fait **15 caractères ou plus** ;
- ou contient un **point d'interrogation** (\`?\`) ;
- ou commence par un mot interrogatif : *comment*, *pourquoi*, *qui*, *que*, *où*, *quand*, *combien*, *quel*, *quelle*…

Une icône apparaît alors dans la barre pour indiquer que l'IA est active. Elle s'anime pendant la rédaction de la réponse.

> 💡 **Recherche par mot-clé** : pour une recherche courte (par exemple *RIO*, *iPhone*), l'IA ne se déclenche pas. Vous obtenez directement les résultats habituels.

**Lire la carte**
- Le texte s'affiche **au fur et à mesure** : vous pouvez commencer à lire avant la fin.
- Les **renvois** \`[1]\`, \`[2]\`, etc. correspondent aux **sources** affichées juste en dessous.
- Les **sources** sont cliquables : ouvrez l'article correspondant pour en savoir plus.
- Le **bouton Copier**, en bas, copie la réponse en texte simple, prête à coller dans une conversation client.

**Quand l'IA répond *« Je n'ai pas la réponse précise dans la base. »***
C'est voulu. L'IA **n'invente jamais** d'information : si la réponse ne figure pas dans vos articles, elle le dit et affiche tout de même les articles les plus proches. En service client, mieux vaut un doute qu'une information fausse.

Si ce message apparaît souvent sur des questions légitimes, signalez-le à un administrateur. Les questions sans réponse sont visibles sur la page **Analyse**, dans le bloc **Réponse IA**, et aident à repérer les contenus manquants.

**Votre avis compte**
À la fin de chaque réponse, deux boutons pouce vous permettent de dire si elle a été utile. Ces votes alimentent les statistiques de qualité visibles par les administrateurs.

> ⚠️ **Avertissement** : L'IA peut se tromper, surtout sur des sujets sensibles (juridique, financier). **Vérifiez toujours les sources citées** avant de transmettre une information importante au client.
        `.trim(),
      },
      {
        id:    'ai-config',
        title: 'Régler l\'IA pour votre organisation (administrateurs)',
        content: `
## Régler la Réponse IA pour votre organisation

Vous pouvez personnaliser le comportement de l'IA dans **Paramètres > Recherche interne** (réservé aux administrateurs). Cinq réglages sont disponibles.

**1. Activer ou désactiver la Réponse IA**
L'interrupteur principal est en haut de la section. Quand la Réponse IA est désactivée, sa carte et son icône disparaissent : la barre de recherche n'affiche plus que les résultats habituels. Utile pour les organisations soumises à des contraintes réglementaires strictes.

> Quand l'interrupteur est désactivé, les autres champs sont grisés.

**2. Secteur d'activité**
Champ libre (80 caractères au plus). L'IA adapte sa présentation, par exemple *« assistant pour les conseillers d'un service client dans le secteur Telecom »*. Exemples : \`Telecom\`, \`Banque\`, \`Retail\`, \`Santé\`, \`Énergie\`. Laissez vide pour une formulation générale.

**3. Tonalité**
5 styles au choix :
- **Professionnelle** : neutre, factuelle (pour un ton institutionnel)
- **Chaleureuse** : accueillante, humaine (service haut de gamme)
- **Directe** : droit au but (gain de temps pour le conseiller)
- **Empathique** : attentive aux situations délicates (banque, santé)
- **Décontractée** : accessible, moderne (marques grand public jeunes)

L'option *« Aucune préférence »* laisse l'IA sur un ton neutre.

**4. Forme d'adresse**
- **Vouvoiement** : l'IA écrit toujours *« vous »*, *« votre »*, *« vos »*.
- **Tutoiement** : l'IA écrit *« tu »*, *« ton »*, *« tes »*.
- **Aucune préférence** : l'IA choisit selon le contexte (vouvoiement par défaut, en français soutenu).

**5. Glossaire**
Liste de paires *« terme courant, terme préféré »* (30 paires au plus, 50 caractères chacune). L'IA emploie toujours le terme préféré dans ses réponses.

Exemples :
- \`client\` remplacé par \`abonné\`
- \`offre\` remplacé par \`forfait\`
- \`annulation\` remplacé par \`résiliation\`
- \`dépanneur\` remplacé par \`conseiller technique\`

> 💡 **Astuce** : Construisez votre glossaire au fil de l'eau. Inutile de tout définir d'un coup : ajoutez une paire quand vous repérez un mot employé par l'IA qui ne correspond pas à votre vocabulaire.

**Suivre l'usage et la qualité**
Sur la page **Analyse**, le bloc **Réponse IA** couvre les 30 derniers jours :
- le nombre de réponses générées, dont celles « sans réponse précise » ;
- la part de votes positifs parmi les avis reçus ;
- les 5 questions les plus posées à l'IA ;
- les 5 principales questions sans réponse, chacune avec un bouton **Créer une FAQ** pour combler le manque en un clic.

> **Fonctionnement** : la Réponse IA repose sur **Mistral Small**, un modèle d'IA français hébergé dans l'Union européenne. Chaque recherche reste limitée à votre organisation : aucune autre organisation KnowDesk ne voit votre contenu, et le modèle ne reçoit que les extraits envoyés à chaque question. Vos données ne servent pas à entraîner le modèle.
        `.trim(),
      },
      {
        id:    'chatbot-config',
        title: 'Chatbot à intégrer à votre site web',
        content: `
## Chatbot à intégrer à votre site web

KnowDesk peut alimenter un chatbot que vous intégrez au site web de votre entreprise. Vos clients posent leurs questions ; le chatbot répond à partir des contenus que vous avez explicitement rendus **publics**.

> Le chatbot et la **Réponse IA** de la barre de recherche utilisent le même modèle d'IA et la même base. La différence : le chatbot est **public** (visiteurs anonymes de votre site) et ne lit que les contenus publics ; la Réponse IA est **interne** et lit tous les contenus.

**1. Rendre un contenu public**

Pour chaque article, FAQ ou processus guidé que le chatbot doit pouvoir utiliser :
- **Articles** : dans l'éditeur, champ **Visibilité** sous les tags, choisissez *Public*.
- **FAQ** : dans l'éditeur, option **Visibilité**, choisissez *Public*.
- **Processus guidés** : dans l'éditeur, liste de la barre du haut, choisissez *Public*.

Tous les contenus existants sont **internes** par défaut, pour ne rien exposer par erreur.

**2. Régler le chatbot**

Ouvrez **Paramètres > Chatbot public** (réservé aux administrateurs) :

- **Chatbot activé** : interrupteur principal. Quand il est désactivé, le serveur refuse toutes les questions et le chatbot reste invisible.
- **Message d'accueil** : premier message que voit le visiteur en ouvrant le chatbot. *« Bonjour, comment puis-je vous aider ? »* convient bien.
- **Message de repli** : affiché quand le chatbot ne sait pas répondre. **Indiquez-y vos moyens de contact** (e-mail, téléphone, formulaire). Par exemple :
  > *Désolé, je n'ai pas la réponse précise. Contactez-nous au 09 XX XX XX XX ou par e-mail à contact@exemple.fr.*
- **Couleur principale** : couleur de la bulle flottante et des messages. Choisissez-la dans le sélecteur ou saisissez son code.
- **Adresse du logo** : image carrée de 64 × 64 px conseillée, à une adresse publique. Affichée dans l'en-tête du chatbot.
- **Domaines autorisés** : un domaine par ligne (par exemple \`acme.fr\`). **Le chatbot ne s'affiche que sur ces domaines** ; ailleurs, le serveur refuse les questions. Indispensable pour qu'un autre site ne puisse pas utiliser votre chatbot. Ajoutez aussi vos sites de test.

**3. Coller le code sur votre site**

Sous les réglages, KnowDesk affiche un code à copier-coller juste avant la balise \`</body>\` de votre site :

\`\`\`html
<script
  src="https://app.knowdesk.fr/chat.js"
  data-org="<identifiant-de-votre-organisation>"
  defer
></script>
\`\`\`

Le chatbot se charge automatiquement avec tous les réglages définis dans les paramètres (couleur, logo, messages). Toute modification faite dans KnowDesk est visible immédiatement par les visiteurs.

**4. Personnalisation de l'IA (mêmes champs que la Réponse IA)**

Sous l'apparence, vous retrouvez les 4 champs de personnalisation déjà réglés pour la Réponse IA des conseillers : **Secteur**, **Tonalité**, **Forme d'adresse**, **Glossaire**. **Ces valeurs sont communes avec Paramètres > Recherche interne** : les modifier ici les modifie aussi pour la Réponse IA. Vous réglez ainsi tout au même endroit. Des champs propres au chatbot sont prévus plus tard.

**5. Consigne du chatbot (avancé)**

La zone **Consigne** affiche la consigne **réellement utilisée** par le chatbot à chaque message. Par défaut, elle est générée à partir des 4 champs ci-dessus et de votre message de repli : vous voyez exactement ce que reçoit le modèle d'IA.

Vous pouvez la **réécrire entièrement**. La personnalisation est alors ignorée pour le chatbot, mais reste active pour la Réponse IA des conseillers. Le bouton **Restaurer la consigne par défaut** rétablit la consigne générée. Elle doit compter entre 50 et 8 000 caractères. Ne la modifiez que si vous savez ce que vous faites : une consigne mal rédigée peut dérégler le chatbot (protections contre le détournement levées, message de repli oublié…).

**6. Conversation suivie et précisions**

Le chatbot suit le fil de la conversation, enregistrée en entier sur le serveur. Si un visiteur demande *« comment résilier ? »* puis *« et combien ça coûte ? »*, le chatbot comprend que la deuxième question porte sur la résiliation.

**Question de clarification automatique** : quand une question est trop vague (*« mon forfait ne marche pas »*, *« panne »*), le chatbot pose **une** question pour préciser avant de répondre. Au message suivant, il combine la question de départ et la précision pour chercher dans la base de façon ciblée. Une seule clarification par conversation, pour éviter de tourner en rond.

**Réponses rapides** : sous chaque réponse, le chatbot propose 2 boutons vers les sources les plus pertinentes ; le visiteur peut approfondir un sujet en un clic.

**7. Avis sous chaque réponse**

Sous chaque réponse du chatbot, deux pouces discrets. Le **pouce levé** signale une réponse utile (la conversation est marquée *résolue*). Le **pouce baissé** signale l'inverse : le chatbot affiche alors **dans la conversation** un message qui propose au visiteur de laisser son adresse e-mail pour être recontacté.

- Si le visiteur saisit une adresse e-mail valide, la demande est transmise à votre équipe (selon le mode choisi, voir l'article *Passage à un humain*) et un message de confirmation s'affiche. La conversation peut continuer ensuite.
- Si le visiteur saisit autre chose (« non merci », une nouvelle question…), la demande est abandonnée et le chatbot répond normalement.

Le bouton de contact, dans l'en-tête du chatbot, permet aussi de demander directement à parler à une personne, sans passer par les pouces. Il n'apparaît qu'après le premier message du visiteur.

**8. Protections automatiques**

Le chatbot refuse :
- les questions hors sujet (politique, religion, santé, questions juridiques générales) et renvoie vers vos moyens de contact ;
- les tentatives de détournement (« ignore tes instructions », « joue le rôle de… ») ;
- les sites dont le domaine n'est pas autorisé ;
- plus de 30 messages par minute depuis un même visiteur (protection contre les abus).

**9. Suivi des conversations**

Toutes les conversations sont consultables dans la page **Conversations** du menu de gauche (réservée aux administrateurs) : recherche par mot-clé, filtre par statut, lecture de la conversation complète. Consultez l'article *Suivre les conversations*.

> 💡 **Essai rapide** : une fois le chatbot actif sur votre site, ouvrez une page, cliquez sur la bulle et posez une question dont la réponse figure dans une FAQ publique. La réponse s'affiche au fur et à mesure. Cliquez sur le pouce baissé pour essayer la demande de contact dans la conversation.

> ⚠️ **RGPD** : le chatbot ne recueille que ce que le visiteur saisit volontairement (y compris son adresse e-mail s'il choisit de la donner après un avis négatif). Aucune empreinte de l'appareil n'est conservée en clair sur le serveur, seulement un identifiant anonyme enregistré dans son navigateur. Un avertissement dans le chatbot et une durée de conservation réglable sont prévus dans une prochaine version.
        `.trim(),
      },
      {
        id:    'chatbot-handoff',
        title: 'Passage à un humain',
        content: `
## Passage à un humain

Quand un visiteur clique sur le pouce baissé sous une réponse, ou sur le bouton de contact dans l'en-tête du chatbot, KnowDesk peut transmettre la conversation à votre équipe. Vous choisissez comment.

**Choisir le mode**

Ouvrez **Paramètres > Chatbot public**, réglages du **passage à un humain**.

Trois modes au choix :
- **Aucun** *(par défaut)* : le visiteur voit seulement le message de repli (avec vos moyens de contact). Votre équipe n'est pas prévenue. La conversation est tout de même comptée comme *escaladée* dans les statistiques.
- **E-mail** : indiquez une adresse (par exemple \`support@votre-entreprise.fr\`). À chaque demande, votre équipe reçoit la conversation complète, avec l'adresse e-mail du visiteur s'il l'a donnée. C'est le mode le plus simple à mettre en place.
- **Webhook** : indiquez une adresse HTTPS. KnowDesk y envoie (POST) un JSON \`{ orgSlug, conversationId, transcript: [...], visitorEmail, reason }\`. Vous pouvez ainsi créer automatiquement un ticket dans votre CRM, Zendesk, Slack, n8n, Make, etc. Délai d'attente : 8 secondes.

**Comment le visiteur demande à parler à une personne**

Trois cas, tous décrits dans l'article *Chatbot à intégrer à votre site web* :
1. **Pouce baissé** sous une réponse : un message dans la conversation demande l'adresse e-mail ; la demande est envoyée au message suivant si l'adresse est valide.
2. **Bouton de contact** dans l'en-tête du chatbot : ouvre directement le formulaire d'adresse e-mail, puis envoie la demande.
3. **Sans adresse e-mail** : si le visiteur préfère ne pas la donner, il peut continuer la conversation. Son avis négatif reste compté et la conversation reste *escaladée*, mais rien n'est transmis à votre équipe.

**Statistiques**

Sur la page **Analyse**, le bloc Chatbot affiche :
- le **taux de résolution** : conversations *résolues* sur le total des conversations closes ;
- le **taux d'escalade** : conversations *escaladées* sur le total des conversations closes ;
- la **satisfaction moyenne** des conversations notées.

Le détail de chaque conversation escaladée (échange complet, adresse e-mail du visiteur, transmission réussie ou non) est disponible dans la page **Conversations**.

> 💡 **Astuce** : Commencez par le mode **E-mail** pour vérifier que le fonctionnement convient à votre équipe, puis passez au mode **Webhook** pour créer automatiquement des tickets dans votre outil de support.

> ⚠️ **Sécurité du webhook** : votre adresse doit être publique (HTTPS) et accepter un POST JSON sans authentification. Une signature permettant de vérifier que la requête vient de KnowDesk est prévue dans une prochaine version. En attendant, ajoutez un code secret dans l'adresse elle-même (par exemple \`https://api.exemple.fr/hooks/knowdesk?token=XXXXX\`).
        `.trim(),
      },
      {
        id:    'synonyms',
        title: 'Définir des synonymes (administrateurs)',
        content: `
## Définir des synonymes propres à votre organisation

Les synonymes aident la recherche à comprendre le vocabulaire de votre entreprise. Une recherche sur un terme fait aussi apparaître les contenus qui emploient ses synonymes, et inversement.

**Quand est-ce utile ?**
- Vos conseillers parlent de « résiliation », mais vos articles disent « clôture de compte ».
- Vos clients disent « remboursement », alors que votre équipe écrit « avoir ».
- Votre produit a un nom officiel et un surnom interne.

**Créer un synonyme**
1. Ouvrez **Paramètres > Synonymes** (réservé aux administrateurs).
2. Cliquez sur **Ajouter un synonyme**.
3. Saisissez le **terme** principal (par exemple *annulation*).
4. Saisissez un ou plusieurs **synonymes** (par exemple *résiliation*, *clôture*). Appuyez sur Entrée ou saisissez une virgule après chacun.
5. Cliquez sur **Créer**.

**Dans les deux sens**
La relation vaut automatiquement dans les deux sens. Si vous associez *annulation* et *résiliation* :
- une recherche sur *annulation* fait aussi apparaître les articles qui contiennent *résiliation* ;
- une recherche sur *résiliation* fait aussi apparaître les articles qui contiennent *annulation*.

Inutile de saisir les deux sens.

**Modifier ou supprimer**
Sur chaque ligne de la liste :
- **Modifier** : ajustez la liste des synonymes. Le terme principal ne se modifie pas : supprimez-le et recréez-le si besoin.
- **Supprimer** : retire le synonyme. La recherche en tient compte immédiatement.

> ⚠️ **Attention** : Les synonymes sont **propres à votre organisation**. Aucune autre organisation KnowDesk ne les voit ni ne les utilise.

> 💡 **Astuce** : Construisez votre liste au fil des cas rencontrés. Inutile de tout définir d'un coup.
        `.trim(),
      },
    ],
  },
  {
    id:    'trees',
    title: 'Processus guidés',
    icon:  ListOrdered,
    articles: [
      {
        id:    'what-is-tree',
        title: 'Comprendre les processus guidés',
        content: `
## Comprendre les processus guidés

Un processus guidé est une suite de questions que vos conseillers suivent étape par étape pendant un appel client.

**Fonctionnement**
Le conseiller voit une question et plusieurs réponses possibles. Selon la réponse choisie, il passe à la question suivante ou arrive à une conclusion : la marche à suivre pour ce cas précis.

**Exemple**
> *Le client veut être remboursé.*
> Première question : le produit est-il défectueux ?
> Si oui : l'achat date-t-il de moins de 30 jours ? Si oui, conclusion : remboursement intégral, demander le numéro de commande. Si non, conclusion : échange standard uniquement.
> Si non : le client a-t-il le ticket de caisse ? Si oui, conclusion : remboursement sur justificatif. Si non, conclusion : refus, proposer un avoir exceptionnel.

**Avantages**
- Moins d'erreurs de traitement
- Des réponses homogènes dans toute l'équipe
- Une formation plus rapide des nouveaux conseillers
        `.trim(),
      },
      {
        id:    'create-tree',
        title: 'Créer un processus guidé',
        content: `
## Créer un processus guidé

1. Ouvrez **Processus** dans le menu de gauche.
2. Cliquez sur **Nouveau processus**.
3. Donnez-lui un titre clair (par exemple *Remboursement produit*).
4. Cliquez sur **Créer** : l'éditeur s'ouvre automatiquement.

**Dans l'éditeur**
- Cliquez sur **Ajouter un point d'entrée** pour créer la première question.
- Un même processus peut avoir plusieurs points d'entrée.

> 💡 **Astuce** : Dessinez votre processus sur papier avant de le saisir dans KnowDesk : vous irez plus vite.
        `.trim(),
      },
      {
        id:    'tree-nodes',
        title: 'Ajouter questions, réponses et conclusions',
        content: `
## Ajouter questions, réponses et conclusions

**Ajouter une question**
1. Cliquez sur **Ajouter un point d'entrée**, ou sur **Ajouter une étape** sous une réponse.
2. Choisissez le type **Question**.
3. Saisissez le texte de la question.
4. Cliquez sur **Ajouter**.

**Ajouter des réponses**
Sous chaque question, cliquez sur **Ajouter une réponse** et saisissez son libellé (par exemple *Oui*, *Non*, *Je ne sais pas*).

**Ajouter une conclusion**
Sous une réponse, cliquez sur **Ajouter une étape**, choisissez **Conclusion** et saisissez la marche à suivre pour le conseiller.

**Modifier ou supprimer**
Chaque étape a un bouton de modification et un bouton de suppression, visibles au survol.

> ⚠️ **Attention** : Supprimer une étape supprime aussi toutes les étapes qui en dépendent.
        `.trim(),
      },
      {
        id:    'tree-publish',
        title: 'Publier un processus',
        content: `
## Publier un processus

Un processus en **brouillon** n'est pas visible par les conseillers. Pour le rendre disponible :

1. Dans l'éditeur, cliquez sur **Aperçu conseiller** pour vérifier l'affichage.
2. Parcourez le processus pour vous assurer que chaque chemin mène à une conclusion.
3. Cliquez sur **Publier** en haut à droite.

Une fois publié, le processus apparaît dans la page **Processus** et devient accessible depuis la barre de recherche (Cmd+K).

> 💡 **Astuce** : Utilisez l'aperçu conseiller pour essayer tous les chemins possibles avant de publier.
        `.trim(),
      },
    ],
  },
  {
    id:    'advisors',
    title: 'Conseillers',
    icon:  Headphones,
    articles: [
      {
        id:    'find-info',
        title: 'Trouver une information pendant un appel',
        content: `
## Trouver une information pendant un appel

Quand vous êtes en ligne avec un client, chaque seconde compte. KnowDesk est conçu pour vous donner la bonne réponse en quelques touches.

**Le réflexe : Cmd+K**
Depuis n'importe quelle page, appuyez sur \`Cmd+K\` (Mac) ou \`Ctrl+K\` (Windows, Linux). La barre de recherche s'ouvre, prête à recevoir votre recherche.

**Ne vous souciez pas de l'orthographe**
La recherche **tolère les fautes** : *rembousement*, *livrazon*, *anulation* fonctionnent. Saisissez ce qui vous vient à l'esprit.

**Restez court**
Un seul mot suffit souvent (*remboursement*, *retour*, *colis*). Plus la recherche est longue, moins vous avez de chances de tomber sur le bon article.

**Naviguer au clavier**
- \`↑\` \`↓\` parcourent les résultats.
- \`Entrée\` ouvre le résultat sélectionné.
- \`Échap\` ferme la barre.

**FAQ, articles ou processus**
Chaque résultat porte un badge :
- **FAQ** (violet) : une réponse courte, prête à coller. Les FAQ sont **toujours en haut des résultats**, car c'est le format le plus rapide. Cliquez pour afficher la réponse complète et le bouton **Copier la réponse** : un clic suffit pour la copier.
- **Article** (vert) : un guide complet. Cliquez pour ouvrir l'article.
- **Processus** (bleu) : un processus guidé. Pour une situation complexe (un cas client qui dépend de plusieurs critères), préférez un processus : il vous mène étape par étape à la bonne réponse.

**Le bon réflexe : commencez par les FAQ**
Si une FAQ répond à votre question, vous gagnez du temps par rapport à la lecture d'un article. Votez avec les pouces sous la réponse pour aider les administrateurs à suivre la qualité.

> 💡 **Astuce** : Si une recherche fréquente ne donne rien, sachez qu'elle est comptée automatiquement. À partir de 3 recherches identiques en 7 jours, les administrateurs voient une suggestion sur la page Analyse et peuvent créer la FAQ manquante en 2 minutes.
        `.trim(),
      },
      {
        id:    'follow-tree',
        title: 'Suivre un processus guidé efficacement',
        content: `
## Suivre un processus guidé efficacement

Un **processus guidé** est une suite de questions et de réponses qui vous mène à la marche à suivre adaptée au cas du client.

**Ouvrir un processus**
- Depuis la barre de recherche (\`Cmd+K\`) : un badge **Processus** distingue les processus des articles.
- Depuis la page **Processus** du menu de gauche.

**Pendant l'appel**
1. Lisez la question affichée.
2. Demandez au client l'information correspondante (par exemple *« L'achat date-t-il de moins de 30 jours ? »*).
3. Cliquez sur la réponse correspondante.
4. Continuez jusqu'à une **conclusion** : c'est votre marche à suivre.

**Bon à savoir**
- Vous pouvez **revenir en arrière** à tout moment si vous vous êtes trompé de réponse.
- Certaines étapes renvoient vers un **article** complémentaire ; un clic suffit pour l'ouvrir dans un autre onglet.
- Si une étape n'est pas claire, signalez-le (voir l'article *Signaler une information incorrecte*).

> 💡 **Astuce** : Pendant un appel, gardez le processus ouvert dans un onglet à part pour ne pas perdre le fil de la conversation.
        `.trim(),
      },
      {
        id:    'report-issue',
        title: 'Signaler une information incorrecte',
        content: `
## Signaler une information incorrecte

Si vous remarquez une erreur dans un article (procédure périmée, information fausse, lien cassé), vous pouvez la signaler à vos responsables.

**Signaler une erreur**
1. Ouvrez l'article concerné.
2. Tout en bas de l'article, cliquez sur **Signaler une information incorrecte**.
3. Précisez ce qui vous semble incorrect.

Le signalement est envoyé aux administrateurs et aux managers de votre organisation, qui pourront vérifier et mettre à jour l'article.

**Pourquoi c'est important**
Vous êtes **en première ligne** : vous repérez les contenus dépassés bien avant les managers. Chaque signalement améliore la base pour toute l'équipe.

> 💡 **Astuce** : Vous pouvez aussi signaler un problème dans un processus guidé. Si une réponse vous a mené à une mauvaise conclusion, dites-le : c'est précieux pour corriger le processus.
        `.trim(),
      },
      {
        id:    'advisor-notifications',
        title: 'Gérer vos notifications',
        content: `
## Gérer vos notifications

Vous recevez une notification quand un événement vous concerne, par exemple quand un article que vous utilisez souvent vient d'être mis à jour.

**Ouvrir les notifications**
Cliquez sur l'icône **Notifications** (une cloche), en bas du menu de gauche. Le compteur rouge indique le nombre de notifications non lues.

**Marquer comme lues**
- Cliquez sur une notification pour la marquer comme lue.
- Cliquez sur **Tout marquer comme lu** en haut du panneau pour toutes les marquer d'un coup.

**Personnaliser**
Ouvrez **Paramètres > Notifications** pour activer ou désactiver chaque type :
- **Article publié** : un nouvel article a été mis en ligne.
- **Nouveau membre** : une personne vient de rejoindre l'équipe.

> 💡 **Astuce** : Si vous recevez trop de notifications, désactivez **Nouveau membre** et gardez seulement **Article publié** : c'est ce qui compte le plus au quotidien.
        `.trim(),
      },
    ],
  },
  {
    id:    'use-cases',
    title: 'Cas d\'usage',
    icon:  Briefcase,
    articles: [
      {
        id:    'seasonal-campaign',
        title: 'Préparer une campagne saisonnière',
        content: `
## Préparer une campagne saisonnière (Black Friday, soldes, fêtes…)

Les opérations saisonnières amènent leur lot de questions clients particulières. Voici comment vous y préparer en quelques heures.

**Étape 1 : créez un tag dédié**
Dans l'éditeur de chaque article concerné par l'opération, ajoutez un tag clair : *Black Friday 2026*, *Soldes hiver*, *Noël 2026*.

**Étape 2 : repérez les contenus à adapter**
Passez en revue vos articles de référence (politique de remboursement, délais de livraison, conditions…) et dupliquez ceux qui changent le temps de l'opération.

**Étape 3 : créez un processus guidé pour la campagne**
Un processus dédié à l'opération : qualification du cas, puis réponse adaptée. Bien plus rapide pour le conseiller que de chercher la question à chaque appel.

**Étape 4 : prévenez l'équipe**
Publiez un article de synthèse avec le tag de la campagne et des liens vers les processus et articles utiles. Les conseillers reçoivent une notification dans leur panneau **Notifications**.

**Étape 5 : pendant l'opération, suivez la page Analyse**
Utilisez la carte **Top recherches** pour repérer les nouveaux sujets, et la carte **Recherches sans résultat** pour combler les manques en cours d'opération.

**Étape 6 : après l'opération**
Une fois la campagne terminée :
- ouvrez **Paramètres > Tags** ;
- supprimez le tag de la campagne. Les articles ne sont pas supprimés, ils perdent seulement ce tag.

> 💡 **Astuce** : Gardez une catégorie *Saisonniers / Archives* pour ranger les articles d'une opération passée, si vous voulez les retrouver plus tard.
        `.trim(),
      },
      {
        id:    'measure-impact',
        title: 'Mesurer l\'impact d\'un nouveau contenu',
        content: `
## Mesurer l'impact d'un nouveau contenu

Vous venez de publier un article ou un processus guidé important : comment savoir s'il sert ?

**Avant de publier**
Notez la situation de départ sur la page **Analyse** :
- Combien de **recherches sans résultat** portent sur le sujet ?
- Le sujet apparaît-il dans le **Top recherches** ?

**Publiez et ajoutez un tag dédié**
Créez le contenu et ajoutez-lui un tag explicite (par exemple *V1 procédure facturation*). Vous retrouverez ainsi facilement vos articles « à l'essai ».

**Une semaine après**
Sur la page **Analyse**, ouvrez la carte **Articles les plus consultés**. Si votre article y figure, il trouve son public.

**Trois semaines après**
- L'article figure-t-il toujours parmi les plus consultés ? C'est réussi : gardez-le tel quel.
- L'article figure-t-il dans **Articles peu consultés** (une vue au plus) ? Soit le sujet n'intéresse personne, soit le titre n'est pas assez parlant. Vérifiez dans **Top recherches** si les conseillers cherchent le sujet sans le trouver.
- Les **recherches sans résultat** sur le sujet ont-elles diminué ? Si oui, votre article est bien trouvé.

**Si l'article ne trouve pas son public**
- Renommez-le avec des mots plus proches du vocabulaire des conseillers.
- Ajoutez des **synonymes** (Paramètres > Synonymes) pour relier le titre à d'autres termes.
- Placez-le dans une catégorie plus visible.

> 💡 **Astuce** : Consultez la page Analyse une fois par mois. Cinq minutes suffisent pour savoir quels contenus entretenir.
        `.trim(),
      },
      {
        id:    'find-gaps',
        title: 'Repérer les sujets manquants',
        content: `
## Repérer les sujets manquants

La meilleure base de connaissance répond aux **vraies** questions des conseillers, pas à celles qu'imaginent les managers.

**La carte essentielle : Recherches sans résultat**
Sur la page **Analyse**, ouvrez la carte **Recherches sans résultat**. Elle liste les recherches de vos conseillers qui n'ont rien donné. Chaque ligne est un **sujet à couvrir**.

**Exploiter la liste**
1. Classez les recherches par fréquence (les plus fréquentes en haut).
2. Pour chaque ligne, demandez-vous :
   - **Une réponse courte (1 à 3 phrases) peut-elle suffire ?** Créez une **FAQ** : c'est le plus rapide, et le plus utile aux conseillers en ligne.
   - **Le sujet mérite-t-il une explication détaillée ?** Créez un article.
   - **Le sujet est-il déjà couvert sous un autre nom ?** Ajoutez un **synonyme** (Paramètres > Synonymes) pour relier les deux termes.
   - **S'agit-il d'une faute de frappe ou d'un terme rare ?** Ignorez-la.

**Encore plus rapide : l'encart FAQ à créer**
Depuis mai 2026, l'encart **FAQ à créer**, en haut de la page Analyse, affiche automatiquement les recherches sans résultat faites **au moins 3 fois ces 7 derniers jours**. Cliquez sur **Créer une FAQ** : l'éditeur s'ouvre avec la question déjà remplie.

C'est le chemin le plus court entre un manque repéré et une réponse publiée.

**Croisez avec Top recherches**
Si une recherche figure dans **Top recherches** et donne peu de résultats pertinents, c'est un signal fort : l'équipe cherche, mais ne trouve pas vraiment ce qu'elle veut. Créez un contenu plus précis.

**Une fois par mois**
Prévoyez 30 minutes par mois pour parcourir ces deux cartes et créer ou ajuster les articles correspondants. C'est sans doute le temps le plus rentable que vous puissiez consacrer à votre base.

> 💡 **Astuce** : Les recherches sans résultat restent visibles **30 jours** sur la page Analyse et sont conservées **90 jours** au total. Plus vous agissez vite, mieux vous captez les nouveaux besoins.
        `.trim(),
      },
      {
        id:    'delegate-maintenance',
        title: 'Confier l\'entretien de la base à un manager',
        content: `
## Confier l'entretien de la base à un manager

Si vous êtes administrateur, vous n'avez pas à tout faire seul. Le rôle **Manager** permet de partager l'entretien de la base.

**Ce qu'un manager peut faire**
- Créer, publier, modifier et archiver des articles et des processus guidés
- Inviter et désactiver des conseillers
- Consulter la page Analyse

**Ce qu'un manager ne peut pas faire (réservé aux administrateurs)**
- Gérer les **synonymes** (Paramètres > Synonymes)
- Gérer les **tags** de l'organisation (renommer, supprimer : Paramètres > Tags)
- Gérer la facturation
- Désactiver l'organisation

**Nommer une personne manager**
1. Ouvrez **Équipe**.
2. Repérez le membre dans la liste.
3. Changez son rôle en **Manager**.

**Une bonne répartition**
- Les **conseillers** repèrent les contenus à corriger (avec *Signaler une information incorrecte*).
- Les **managers** créent et entretiennent la base au quotidien, et consultent la page **Analyse** chaque semaine.
- L'**administrateur** garde la main sur le vocabulaire (synonymes, tags) et sur les orientations.

> 💡 **Astuce** : Fixez avec votre manager un rendez-vous hebdomadaire de 15 minutes sur la page Analyse. Une habitude simple suffit à garder la base à jour.
        `.trim(),
      },
      {
        id:    'build-vocabulary',
        title: 'Construire un dictionnaire métier',
        content: `
## Construire un dictionnaire métier (synonymes)

Chaque organisation a son **vocabulaire**. Votre équipe parle peut-être de *clôture* alors que vos clients disent *résiliation*. KnowDesk vous permet d'associer ces termes pour que la recherche fonctionne dans les deux sens.

**Cas où un synonyme est utile**
- **Vocabulaire client et vocabulaire interne** : *avoir* (client) et *bon de remboursement* (interne)
- **Sigles** : *SAV* et *Service après-vente*
- **Synonymes courants** : *annulation*, *résiliation* et *clôture*
- **Noms de produits** : nom officiel et surnom interne
- **Anglicismes** : *refund* et *remboursement*

**Comment vous y prendre**
1. Pendant une semaine, surveillez la carte **Recherches sans résultat** de la page **Analyse**.
2. Notez les recherches qui ressemblent à des sujets déjà couverts dans la base, mais avec un autre mot.
3. Ouvrez **Paramètres > Synonymes** et cliquez sur **Ajouter un synonyme**.
4. Saisissez le **terme** principal (le mot officiel ou interne) et ses **synonymes** (les autres mots entendus).

**Exemple**

| Terme principal | Synonymes |
|---|---|
| annulation | résiliation, clôture |
| SAV | service après-vente, support technique |
| remboursement | refund, avoir |

**Dans les deux sens, automatiquement**
Inutile de saisir chaque sens. Si vous associez *annulation* et *résiliation*, une recherche sur l'un retrouve les contenus de l'autre.

> 💡 **Astuce** : Le dictionnaire se construit mieux **par petites touches, au fil de l'eau**, qu'en une seule longue séance. Ajoutez un synonyme dès que vous repérez une vraie équivalence.
        `.trim(),
      },
      {
        id:    'industrialize-faqs',
        title: 'Systématiser les réponses récurrentes',
        content: `
## Systématiser les réponses récurrentes

Si vos conseillers passent beaucoup de temps à **reformuler les mêmes réponses** plusieurs fois par jour, vous pouvez gagner beaucoup de temps. Voici la méthode.

### 1. Repérer les questions répétitives

Trois sources :

- **L'encart « FAQ à créer »** de la page Analyse : il repère automatiquement les recherches restées sans résultat au moins 3 fois en 7 jours.
- **Top recherches**, sur la page Analyse : les recherches les plus fréquentes.
- **Vos conseillers** : demandez-leur les 5 questions clients auxquelles ils répondent le plus souvent.

### 2. En faire des FAQ

Pour chaque question repérée :
- une question formulée comme le client la pose ;
- une réponse en 1 à 3 phrases, à copier telle quelle ;
- un tag de thème, pour la regrouper avec les FAQ proches ;
- une catégorie, pour la retrouver facilement ;
- un lien vers un article complet si des détails sont nécessaires.

Visez **20 à 50 FAQ** pour couvrir 80 % des questions courantes.

### 3. Mesurer l'adoption

Au bout d'un mois, regardez :

| Indicateur | Objectif | Où le trouver |
|---|---|---|
| **Vues par FAQ** | plus de 5 par mois pour les FAQ principales | Liste des FAQ (colonne « Vues ») |
| **Score helpful moyen** | plus de 70 % | Liste des FAQ (colonne « Score helpful ») |
| **Part des recherches qui ouvrent une FAQ** | plus de 30 % | Top recherches comparé aux vues des FAQ |
| **Recherches sans résultat** | en baisse d'un mois à l'autre | Page Analyse, carte Recherches sans résultat |

### 4. Améliorer

- FAQ sous 60 % (au moins 5 votes) : reformulez la réponse.
- FAQ sans vue après 30 jours : reformulez la question (elle n'est pas trouvée) ou retirez-la.
- Nouvelle suggestion sur la page Analyse : bouton « Créer une FAQ », même démarche.

### 5. Aller plus loin

Quand vous avez plus de 50 FAQ avec un Score helpful moyen supérieur à 70 %, deux usages deviennent possibles :

- **Publication sur le web** (à venir) : vos FAQ apparaissent automatiquement sur votre site. Une seule rédaction pour deux usages (interne et externe), sans écart entre les deux.
- **Chatbot** (à venir) : un chatbot s'appuie sur vos FAQ pour répondre directement aux clients.

Ces deux usages démultiplient l'intérêt de vos FAQ, mais ils ne fonctionnent bien qu'avec une base interne de qualité. C'est pourquoi la création et la qualité des FAQ viennent d'abord.

> 💡 **Astuce** : 30 minutes par mois sur l'entretien de vos FAQ (suggestions, FAQ à réviser, scores sous 60 %) suffisent à garder la base saine, et votre équipe y gagne tout de suite.
        `.trim(),
      },
    ],
  },
  {
    id:    'team',
    title: 'Équipe',
    icon:  Users,
    articles: [
      {
        id:    'invite',
        title: 'Inviter un membre',
        content: `
## Inviter un membre

1. Ouvrez **Équipe** dans le menu de gauche.
2. Cliquez sur **Inviter un membre**.
3. Saisissez l'adresse e-mail de la personne.
4. Choisissez son rôle (**Manager** ou **Conseiller**).
5. Cliquez sur **Envoyer l'invitation**.

La personne reçoit un e-mail avec un lien pour créer son compte. Ce lien est valable **7 jours**.

**Si le lien a expiré**
Dans la liste des membres, repérez la personne au statut *Invitation envoyée* et cliquez sur **Renvoyer**.
        `.trim(),
      },
      {
        id:    'manage-roles',
        title: 'Gérer les rôles et les droits',
        content: `
## Gérer les rôles et les droits

**Changer le rôle d'un membre**
1. Ouvrez **Équipe**.
2. Repérez le membre dans la liste.
3. Cliquez sur son rôle actuel.
4. Choisissez le nouveau rôle dans le menu.

**Les rôles disponibles**
- **Administrateur** : accès complet
- **Manager** : création de contenu, gestion des conseillers et page Analyse
- **Conseiller** : consultation uniquement

> ⚠️ **Attention** : Vous ne pouvez pas retirer son rôle au dernier administrateur de l'organisation.
        `.trim(),
      },
      {
        id:    'disable-member',
        title: 'Désactiver un membre',
        content: `
## Désactiver un membre

Désactiver un membre lui retire l'accès à KnowDesk, sans supprimer son compte ni son historique.

1. Ouvrez **Équipe**.
2. Repérez le membre dans la liste.
3. Cliquez sur **Désactiver**, dans la colonne *Actions*, à droite de la ligne.
4. Confirmez.

Le membre ne peut plus se connecter, immédiatement. Vous pouvez le réactiver à tout moment depuis la même liste : sur la ligne d'un membre désactivé, le bouton **Désactiver** est remplacé par **Réactiver**.

> 💡 **Astuce** : Préférez la désactivation à la suppression : vous conservez ainsi l'historique des contributions du membre.
        `.trim(),
      },
    ],
  },
  {
    id:    'analytics',
    title: 'Analyse',
    icon:  ChartColumn,
    articles: [
      {
        id:    'analytics-overview',
        title: 'Lire la page Analyse',
        content: `
## Lire la page Analyse

La page **Analyse** donne une vue d'ensemble de la santé éditoriale de votre base. Elle est réservée aux **administrateurs** et aux **managers**.

**Ouvrir la page Analyse**
Cliquez sur **Analyse** (icône en forme de graphique) dans le menu de gauche.

**Rangée du haut : inventaire et activité**
- **Articles publiés, brouillons, archivés** : l'état global de vos contenus.
- **Tags** et **Processus guidés** : leur nombre.
- **Actifs aujourd'hui, sur 7 jours, sur 30 jours** : nombre de membres différents qui ont consulté un article ou fait une recherche.

**Encart FAQ à créer**
Quand une recherche est restée sans résultat **au moins 3 fois ces 7 derniers jours**, un encart apparaît au-dessus des cartes avec la liste des recherches concernées. Chaque ligne a un bouton **Créer une FAQ** qui ouvre l'éditeur avec la question déjà remplie. C'est le moyen le plus rapide de couvrir les sujets manquants : utilisez-le en priorité.

**Des cartes pour agir**
Toutes les listes sont **cliquables** : un clic ouvre l'article concerné, et le bouton **Retour** vous ramène sur la page Analyse.

- **Articles les plus consultés** : les 10 premiers sur 30 jours.
- **Articles peu consultés** : articles publiés depuis plus de 30 jours et lus une fois au plus sur la période. À mettre à jour ou à retirer.
- **Top recherches** : les recherches les plus fréquentes.
- **Recherches sans résultat** : les recherches qui n'ont rien donné. Autant de sujets à couvrir.
- **Articles à vérifier** : publiés, mais pas mis à jour depuis plus de 90 jours.
- **Brouillons orphelins** : brouillons non modifiés depuis plus de 30 jours.
- **Articles sans tag** : à compléter pour qu'ils soient plus faciles à trouver.
- **Top contributeurs** : les auteurs les plus actifs (au total et sur 30 jours).
- **Couverture par catégorie** : pour repérer les catégories peu documentées.
- **Tags les plus utilisés** et **Tags inutilisés** : pour garder un vocabulaire propre.

**Bloc Réponse IA (sous les cartes)**
- **Réponses générées, réponses précises, sans réponse, satisfaction** pour les Réponses IA de la barre de recherche.
- **Top questions** et **Questions sans réponse** : les variantes intermédiaires d'une même recherche saisie par un membre (« comment résilier », « comment résilier mon », « comment résilier mon forfait ») sont regroupées sur une seule ligne. Seule la recherche finale compte.
- Un bouton **Créer une FAQ** sur chaque question sans réponse ouvre l'éditeur avec la question déjà remplie.

**Bloc Chatbot (s'il est activé)**
- **Total des conversations** sur 30 jours, réparti par statut (en cours, résolues, escaladées, abandonnées).
- **Taux de résolution** : conversations résolues sur le total des conversations closes.
- **Taux d'escalade** : conversations escaladées sur le total des conversations closes.
- **Satisfaction moyenne** des conversations notées.
- **Thèmes des conversations** : chaque conversation est résumée par un thème court à sa clôture (par exemple *« Résiliation forfait mobile »*, *« Activation eSIM »*). Les questions sur un même sujet sont regroupées sur la même ligne : une meilleure image des besoins des visiteurs que les messages bruts.
- Pour examiner une conversation précise, ouvrez la page **Conversations**.

**Période couverte**
Les indicateurs d'activité (vues, recherches, membres actifs) couvrent les **30 derniers jours**. Les indicateurs sur les contenus (articles à vérifier, tags inutilisés…) reflètent l'état actuel.

**Confidentialité**
Aucune donnée d'utilisation individuelle par conseiller n'est affichée. Les statistiques d'activité sont **calculées pour l'organisation entière**. Les données détaillées sont supprimées automatiquement après **90 jours**.

> 💡 **Astuce** : La carte **Recherches sans résultat** est sans doute la plus utile. Chaque recherche sans résultat est un sujet que vos conseillers cherchent et que votre base ne couvre pas : c'est le meilleur indicateur pour choisir les contenus à créer.
        `.trim(),
      },
    ],
  },
  {
    id:    'chats',
    title: 'Conversations',
    icon:  MessageCircle,
    articles: [
      {
        id:    'chats-overview',
        title: 'Suivre les conversations',
        content: `
## Suivre les conversations

La page **Conversations** (réservée aux administrateurs, dans le menu de gauche) liste toutes les conversations du chatbot de votre site. Elle sert à contrôler la qualité des réponses, à repérer les thèmes fréquents et à relire les échanges pour améliorer la base.

**Ouvrir la page**

Dans le menu de gauche, cliquez sur **Conversations**. La page a sa propre adresse : vous pouvez la mettre en favori ou la recharger sans perdre l'écran.

**La liste**

Une ligne par conversation, de la plus récente à la plus ancienne, 20 par page. Chaque ligne indique :
- **Thème** : 3 à 6 mots qui résument la demande, générés automatiquement à la clôture (par exemple *« Résiliation forfait mobile »*, *« Activation eSIM »*). Pour une conversation en cours ou trop récente, la première question du visiteur s'affiche à la place, en italique.
- **Statut** : *En cours*, *Résolue*, *Escaladée* ou *Abandonnée*. Une conversation devient :
  - *Résolue* quand le visiteur donne un avis positif sur une réponse, ou répond *Oui, parfait* dans le formulaire d'avis de l'en-tête ;
  - *Escaladée* quand le visiteur donne un avis négatif ou demande explicitement à parler à une personne ;
  - *Abandonnée* automatiquement quand elle reste *en cours* sans nouveau message pendant 30 minutes.
- **Nombre de messages** de la conversation.
- **Note de satisfaction** (étoiles), si le visiteur a noté.
- **Avis** (pouce levé ou baissé), si le visiteur a voté.
- **Date**, par exemple *« il y a 2 h »*, *« hier »*.

**Recherche dans les conversations**

Le champ de recherche, en haut, porte sur le texte **complet** des conversations (messages du visiteur **et** du chatbot). Saisissez un mot-clé (par exemple *« remboursement »*, *« eSIM »*, *« facture »*) et cliquez sur **Rechercher** : la liste n'affiche plus que les conversations dont au moins un message contient ce mot. Les majuscules sont ignorées, et le mot peut faire partie d'un mot plus long.

**Filtre par statut**

La liste à droite filtre par statut. Utile pour contrôler la qualité (consultez les conversations *Escaladées*) ou pour repérer celles qui n'ont reçu aucun avis (une conversation *En cours* depuis plus de 30 minutes va devenir *Abandonnée*).

**Lire une conversation**

Cliquez sur une ligne pour ouvrir la conversation complète :
- en haut, les informations : statut, dates, nombre de messages, note et avis s'il y en a ;
- en dessous, les messages : ceux du visiteur à droite (couleur principale), ceux du chatbot à gauche (en blanc) ;
- vous relisez toute la conversation comme le visiteur l'a vue.

**Usages courants**

- **Contrôle hebdomadaire** : ouvrez les conversations *Escaladées* de la semaine et relisez-les pour comprendre où le chatbot a buté. Vous repérez ainsi les contenus à créer (FAQ, articles).
- **Suivi d'un incident** : un visiteur signale par e-mail un problème avec le chatbot ; retrouvez sa conversation par mot-clé pour comprendre.
- **Amélioration de la base** : repérez les thèmes fréquents mais mal couverts. Les thèmes sont aussi regroupés sur la page **Analyse**, dans le bloc Chatbot.

> 💡 **Astuce** : Si une conversation révèle un manque dans la base, créez directement une **FAQ** avec la question type. Le chatbot l'utilisera dès qu'elle sera publique.

> **Confidentialité** : les conversations ne contiennent que ce que le visiteur a saisi volontairement. Rien ne permet de remonter à son identité réelle. Les conversations sont conservées sans limite pour l'instant ; une durée de conservation réglable, avec consentement RGPD, est prévue dans une prochaine version.
        `.trim(),
      },
    ],
  },
  {
    id:    'settings',
    title: 'Paramètres',
    icon:  Settings,
    articles: [
      {
        id:    'org-settings',
        title: 'Paramètres de l\'organisation',
        content: `
## Paramètres de l'organisation

Ouvrez les paramètres depuis l'entrée **Paramètres**, en bas du menu de gauche.

**Nom de l'organisation**
C'est le nom affiché dans l'interface et dans les e-mails envoyés aux membres. Modifiez-le, puis cliquez sur **Enregistrer**.

**Notifications**
Choisissez les événements qui déclenchent une notification dans le panneau **Notifications**, en bas du menu de gauche :
- **Article publié** : un nouvel article a été mis en ligne par votre équipe.
- **Nouveau membre** : une personne vient de rejoindre l'organisation.

> 💡 **Astuce** : Cliquez sur l'icône en forme de cloche, dans le menu de gauche, pour ouvrir le panneau et marquer les notifications comme lues.
        `.trim(),
      },
      {
        id:    'manage-tags',
        title: 'Gérer les tags (administrateurs)',
        content: `
## Gérer les tags de votre organisation

Les tags sont créés automatiquement quand un membre en saisit dans l'éditeur. Cette page (réservée aux **administrateurs**) sert à faire le tri et à harmoniser le vocabulaire.

**Ouvrir la gestion des tags**
Ouvrez **Paramètres > Tags**.

**Lire la liste**
Chaque ligne indique :
- le **nom** affiché du tag ;
- le **nombre d'articles** qui le portent.

**Renommer un tag**
1. Cliquez sur **Renommer** sur la ligne du tag.
2. Saisissez le nouveau nom dans la fenêtre.
3. Cliquez sur **Enregistrer**.

Le nouveau nom s'applique immédiatement à tous les articles qui portaient ce tag, y compris dans l'affichage des articles et dans les filtres.

**Cas particulier : fusion automatique**
Si vous donnez à un tag le nom d'un autre tag existant (sans tenir compte des majuscules), KnowDesk **fusionne** les deux : tous les articles qui portaient l'ancien tag portent désormais l'autre. Pratique pour supprimer les doublons (\`remboursement\` et \`Remboursement\`).

**Supprimer un tag**
Cliquez sur **Supprimer**. La confirmation indique combien d'articles sont concernés. Les articles ne sont **pas** supprimés : ils perdent seulement ce tag.

> 💡 **Astuce** : Utilisez la page **Analyse** pour repérer les tags inutilisés et faire le tri.
        `.trim(),
      },
      {
        id:    'account-settings',
        title: 'Modifier votre profil',
        content: `
## Modifier votre profil

Ouvrez votre profil depuis l'entrée **Mon compte**, en bas du menu de gauche.

**Modifier votre prénom et votre nom**
Saisissez vos nouvelles informations, puis cliquez sur **Enregistrer**.

**Changer votre adresse e-mail**
1. Saisissez votre nouvelle adresse e-mail.
2. Cliquez sur **Changer l'adresse e-mail**.
3. Un e-mail de confirmation est envoyé à la nouvelle adresse.
4. Cliquez sur le lien de cet e-mail pour confirmer le changement.

**Changer votre mot de passe**
1. Saisissez votre mot de passe actuel.
2. Saisissez puis confirmez votre nouveau mot de passe (8 caractères au moins).
3. Cliquez sur **Changer le mot de passe**.

> ⚠️ **Attention** : Pour votre sécurité, **vous êtes déconnecté de tous vos appareils** après un changement de mot de passe ou la confirmation d'une nouvelle adresse e-mail. À votre prochaine action, vous serez renvoyé vers la page de connexion.
        `.trim(),
      },
{
  id:    'api-keys',
  title: 'Gérer les clés API',
  content: `
## Gérer les clés API

Les clés API permettent à d'autres applications de lire votre base de connaissance KnowDesk, sans que leurs utilisateurs aient à se connecter.

**Ouvrir la gestion des clés**
Ouvrez **Paramètres > API**.

**Créer une clé**
1. Cliquez sur **Créer une clé**.
2. Donnez-lui un nom parlant (par exemple *Intégration Hubicus*, *Site web*).
3. Cliquez sur **Créer**.
4. Copiez tout de suite la clé affichée : elle ne sera plus visible après la fermeture de la fenêtre.

> ⚠️ **Attention** : La clé complète n'est affichée qu'une seule fois. Si vous la perdez, vous devrez en créer une autre.

**Ce qu'une clé API permet**
- Lire la liste des catégories
- Lire la liste des articles publiés et leur contenu
- Lire les processus guidés publiés et leur structure

**Ce qu'une clé API ne permet pas**
- Créer ou modifier du contenu
- Accéder aux brouillons
- Gérer les membres ou les paramètres

**Utiliser une clé dans une requête**
Ajoutez l'en-tête \`X-API-Key\` à chaque requête :
\`\`\`
GET https://api.knowdesk.fr/public/v1/articles
X-API-Key: kd_live_votre_cle_api
\`\`\`

**Révoquer une clé**
Dans la liste des clés, cliquez sur **Révoquer** à droite de la clé concernée, puis confirmez. La révocation est immédiate et définitive : toute application qui utilise cette clé perd aussitôt l'accès.

> 💡 **Astuce** : Créez une clé par application ou service qui utilise l'API. Si une clé est compromise, vous pourrez la révoquer sans toucher aux autres intégrations.

**Consulter la documentation complète de l'API**
La documentation détaillée, avec toutes les routes et des exemples de code, est disponible à l'adresse :
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
