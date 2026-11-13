# Rédaction de l'interface

Résumé des règles de la section « Ton et rédaction » du README et des fiches Button, Modal, TextField et Alert, appliquées aux textes de KnowDesk. Le contenu des clients (articles, FAQ, réponses du chatbot, messages qu'ils ont enregistrés) n'est pas concerné.

## Règles

- **Registre** : « vous » partout, jamais « tu ».
- **Phrases courtes**, avec le vocabulaire du client. Pas de jargon interne ni d'anglicisme quand un mot français juste existe (voir le glossaire). Un terme technique reste quand il n'a pas d'équivalent clair et que l'écran vise un public technique (documentation de l'API, superadmin).
- **Boutons** : à l'infinitif, ils disent ce qui va se passer (« Publier l'article », « Enregistrer les modifications »). Jamais « OK », ni « Valider » ou « Oui » seuls.
- **Erreurs** : ce qui s'est passé, puis quoi faire (« Le serveur ne répond pas. Vérifiez votre connexion, puis réessayez. »). « Erreur. Réessayez. » ne suffit pas.
- **Ponctuation** : pas de point d'exclamation, pas de MAJUSCULES pour insister.
- **Emojis** : aucun dans l'interface. Les pictos viennent de Lucide (`icons/README.md`).
- **Modales de confirmation** : le titre est une question qui reprend l'action (« Supprimer cet article ? ») ; le texte dit la conséquence et si elle est réversible (« Il sera retiré de la base. Cette action est définitive. ») ; le bouton de confirmation répète l'action (« Supprimer l'article ») ; l'autre bouton est « Annuler ».
- **Champs** : un libellé court qui nomme la donnée (« Adresse e-mail »), une aide qui dit le format ou l'usage, une erreur qui dit comment corriger (« Saisissez une adresse e-mail valide, par exemple nom@entreprise.fr. »).
- **Encarts** : le texte reste neutre et dit quoi faire ; la couleur et l'icône portent l'état.
- **Typographie française** : guillemets « », espace insécable avant « : ; ? », « e-mail », nombres et unités séparés (« 30 jours », « 10 Mo »).
- **Libellés voulus par le porteur** : ceux que cite `CLAUDE.md` (par exemple le libellé de `image_note`, les libellés des contrôles d'audit) restent mot pour mot.

## Glossaire

Un même objet porte le même nom partout.

| Terme retenu | À éviter | Remarque |
|---|---|---|
| article | fiche, page, doc | Contenu de la base de connaissance. |
| FAQ (invariable) | FAQs, Q/R | « 3 FAQ », « une FAQ ». |
| processus | arbre, tree, arbre de décision | Processus guidé pas à pas ; « processus guidé » au premier emploi d'un écran si besoin. |
| base de connaissance, la base | KB, knowledge base | « KB Health Score » devient « Santé de la base ». |
| catégorie | dossier, rubrique | |
| tag | étiquette, label | Usage établi dans l'app, gardé. |
| parcours | formation (pour l'objet) | Le module de l'app s'appelle « Formations » ; un parcours contient des modules. |
| module | leçon, chapitre | Partie d'un parcours, avec ses ressources et son quiz. |
| ressource | contenu lié | Article, FAQ ou processus ajouté à un module. |
| organisation | org, workspace, espace, compte client | |
| membre | utilisateur, collaborateur, user | Personne de l'organisation ; les rôles sont administrateur, manager, conseiller. |
| conseiller | agent, collaborateur | Rôle de lecture, au contact des clients. |
| conversation | chat, session, transcript | Échange d'un visiteur avec le chatbot. |
| chatbot | bot, assistant (pour l'outil) | Le widget est « le chatbot de votre site ». |
| tableau de bord | dashboard | |
| analyse (écran Analyse) | analytics | |
| paramètres | settings, réglages, config | |
| suivi de marque | brand monitoring | Module qui suit la présence de la marque dans les réponses des IA. |
| question suivie | prompt | Question posée aux IA par le suivi de marque. Dans les réglages du chatbot, « consigne » pour le prompt système. |
| modèle d'IA, IA | LLM | |
| votre marque | owner, marque owner | |
| analyse (du suivi de marque) | run | « Lancer une analyse ». |
| thème | topic, thématique | |
| serveur | backend, back | |
| brouillon, publié, archivé | draft, published | |
| Onboarding | — | Nom du module des testeurs (projets, documents, fiche de cadrage), gardé tel quel : c'est son nom chez le porteur (`CLAUDE.md`). |
