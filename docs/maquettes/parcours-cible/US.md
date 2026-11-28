<!-- Copie texte des US (artefact « KnowDesk – US du parcours d'onboarding », 22/11/2026), reçue le 28/11/2026. Mise en forme minimale. -->

KnowDesk – US du parcours d'onboarding
22 nov. 2026 · @Emilie
Contexte
L'onboarding transforme les documents d'un client en une base de connaissance prête à être relue par ses équipes, en 5 étapes et un écran de fin. Il remplace les 5 onglets actuels (Documents, Fiche de cadrage, Analyse, À clarifier, Nouvelle base).
- Utilisateur cible : chargé qualité ou chargé de formation. Il connaît le métier mais n'est pas technicien, et fait cet onboarding une seule fois ou presque.
- Objectif : une base fiable, sur laquelle l'utilisateur garde la main, avec un minimum de décisions à prendre.
- Maquettes de référence : KnowDesk – Parcours d'onboarding cible. Chaque US renvoie à son écran.
Étape
Écran
Ce que fait l'utilisateur
1
Documents
Importe ses documents, vérifie leur type, leur usage et leur date
2
Contexte métier
Vérifie la fiche pré-remplie et classe les types de document par priorité
—
Analyse
Rien : elle tourne en arrière-plan, l'utilisateur est prévenu par e-mail
3
Questions
Répond aux questions que ses règles n'ont pas réglées
4
Plan
Ajuste le plan de la base puis le valide
5
Relecture et publication
Relit les articles, complète ceux sans source, publie
Fin
Base publiée
Invite ses relecteurs
Règles transverses
Ces règles s'appliquent à tous les écrans du parcours et servent de critères d'acceptation communs.
1.  Structure d'écran : en-tête pétrole (PageHeader) avec le nom du client, le titre de l'étape et une phrase d'introduction ; stepper (Stepper) posé dessus, avec une icône par étape et son statut (terminée en vert, en cours en pétrole, à venir en gris) ; barre d'action (ActionBar) qui reste visible en bas de l'écran. L'analyse n'est pas une étape.
2.  Une seule action principale par écran, dans la barre d'action, qui mène à l'étape suivante.
3.  Textes d'interface génériques : aucun texte d'interface (titres, aides, options, boutons) ne fait référence au secteur ou au corpus d'un client. Seul le contenu généré (titres de cartes, valeurs comparées, articles, données pré-remplies) peut être spécifique.
4.  Vocabulaire métier : pas de termes techniques (appels à l'IA, passages couverts, chunks, versions de fiche…). Les statistiques et l'historique des versions ne s'affichent pas dans le parcours.
5.  Traçabilité : toute valeur extraite par l'IA donne accès à sa phrase source (document + page), dépliée sur place.
6.  L'IA décide, l'utilisateur corrige : les décisions de l'IA s'appliquent directement et restent visibles et modifiables. L'utilisateur n'a pas à valider chaque décision une par une.
7.  On sait toujours qui a fait quoi : ce que KnowDesk a préparé (pré-rempli, réglé, rédigé, suggéré, trouvé) est en prune (accent), avec l'icône sparkles et une mention qui nomme KnowDesk (composant KnowDeskContent). Ce que l'utilisateur a ajouté est en pétrole clair (primary-soft). Pas de légende de couleur. La mention se place au niveau de l'unité que l'utilisateur valide (la liste des documents, une rubrique, une question, un article, une suggestion), pas sur chaque élément ; quand l'utilisateur modifie l'unité, elle devient « Préparé par KnowDesk · modifié par vous ».
8.  Mise en page : sur un écran d'ordinateur, une liste et son détail restent côte à côte ; le détail s'affiche en haut de la zone de droite. Ils s'empilent seulement sur un écran étroit.
9.  Design system CX : uniquement les tokens et composants cx-. Le rouge (danger) est réservé aux actions irréversibles, toujours avec l'icône trash-2 pour une suppression.
10.  Aide : sur toutes les étapes, un lien discret « Besoin d'aide ? Contactez-nous » en bas de la navigation de gauche (gris, avec l'icône point d'interrogation). C'est le recours du client quand le résultat ne lui convient pas, par exemple un plan à revoir entièrement.
Étape 1 · Documents
Maquette
US 1.1 – Importer ses documents
En tant que chargé qualité, je veux importer tous les documents qui servent à répondre aux clients, afin que KnowDesk construise la base à partir de mon existant.
- L'écran liste les types de documents utiles : conditions générales et contrats, tarifs, descriptions d'offres, procédures internes, supports de formation, communications aux clients, base ou FAQ existante.
- Formats acceptés : PDF, Word, PowerPoint, Excel, Markdown, archive .zip.
- Les doublons sont écartés et les documents illisibles signalés, avec leur nombre et un lien vers la liste.
- Le consentement au texte d'information est demandé au premier import seulement.
Tests d'acceptance
Scénario : import d'une archive avec doublons
- Étant donné une archive .zip de 38 fichiers dont 5 doublons et 1 fichier illisible
- Quand l'utilisateur la dépose
- Alors 32 documents apparaissent dans la liste
- Et la ligne de synthèse indique « 5 doublons écartés · 1 document illisible » avec un lien vers ce document
Scénario : format non accepté
- Étant donné un fichier .exe
- Quand l'utilisateur le dépose
- Alors le fichier est refusé avec un message qui liste les formats acceptés
Scénario : consentement demandé une seule fois
- Étant donné un utilisateur qui a déjà accepté le texte d'information
- Quand il importe un nouveau document
- Alors le texte d'information ne lui est pas redemandé
US 1.2 – Vérifier le type et l'usage de chaque document
En tant que chargé qualité, je veux voir et corriger le type et l'usage proposés pour chaque document, afin que les règles de priorité s'appliquent correctement et que rien d'interne ne soit montré aux clients.
- Type de document : KnowDesk range chaque document dans l'un des 7 types ci-dessus. Les documents sont groupés par type, avec leur nombre ; un menu déroulant permet de changer le type.
- Usage : KnowDesk propose pour chaque document l'usage Client ou Interne ; un menu déroulant permet de le changer.
  - Client : le contenu peut servir dans les parties d'articles visibles par les clients (et par les conseillers).
  - Interne : le contenu ne peut servir que dans les parties réservées aux conseillers.
- Une aide sous le titre de la liste explique l'usage : « L'usage indique si un document peut servir à répondre aux clients. Le contenu d'un document interne ne sera repris que dans les parties réservées aux conseillers. »
- Mention KnowDesk au niveau de la liste : « Types, usages et dates proposés par KnowDesk · modifiables » (prune).
- Un document dont le type est incertain porte le badge « À vérifier » ; un encadré en haut de la liste indique combien de documents sont concernés.
Tests d'acceptance
Scénario : changer le type d'un document
- Étant donné un document rangé par KnowDesk dans « Supports de formation »
- Quand l'utilisateur choisit « Tarifs » dans le menu « Type de document »
- Alors le document passe dans le groupe « Tarifs » et les compteurs des deux groupes se mettent à jour
Scénario : passer un document en usage interne
- Étant donné un document proposé en usage Client
- Quand l'utilisateur choisit « Interne »
- Alors son contenu ne pourra apparaître que dans les parties d'articles réservées aux conseillers
Scénario : type incertain
- Étant donné un document que KnowDesk n'a pas pu classer avec certitude
- Quand la liste s'affiche
- Alors le document porte le badge « À vérifier » et l'encadré en haut de la liste le compte
- Et le badge disparaît quand l'utilisateur confirme ou change son type
US 1.3 – Vérifier et compléter la date de chaque document
En tant que chargé qualité, je veux vérifier la date de chaque document, afin que KnowDesk sache lequel est le plus récent.
- KnowDesk cherche une date dans le titre, puis dans le corps du document.
- Date trouvée : affichée avec son origine et un lien « Modifier » (ex. « 1er sept. 2026 · trouvée dans le titre · Modifier »). La mention KnowDesk est portée par la liste (US 1.2).
- Aucune date trouvée : « Aucune date trouvée » en jaune, avec le lien « Ajouter une date (facultatif) ».
- Les deux liens ouvrent sur place un sélecteur de date (pré-rempli si une date existe), avec « Enregistrer » et « Annuler ».
- La date est facultative et ne bloque jamais la suite.
- Une date saisie par l'utilisateur remplace la date trouvée par KnowDesk.
Tests d'acceptance
Scénario : date trouvée dans le titre
- Étant donné un fichier nommé « Grille_v2_2026-09-01.pdf »
- Quand l'import est terminé
- Alors la ligne de date affiche « 1er sept. 2026 · trouvée dans le titre · Modifier »
Scénario : date trouvée dans le corps du document
- Étant donné un fichier sans date dans son titre mais daté en page 1
- Quand l'import est terminé
- Alors la ligne de date indique « trouvée dans le document, page 1 »
Scénario : aucune date trouvée
- Étant donné un fichier sans date ni dans le titre ni dans le corps
- Quand l'import est terminé
- Alors la ligne affiche « Aucune date trouvée » en jaune avec « Ajouter une date (facultatif) »
- Et l'utilisateur peut passer à l'étape suivante sans saisir de date
Scénario : corriger une date trouvée
- Étant donné une date trouvée par KnowDesk
- Quand l'utilisateur clique sur « Modifier », choisit une autre date et enregistre
- Alors la nouvelle date s'affiche sans l'origine « trouvée dans… »
- Et c'est elle qui est utilisée par la règle « le plus récent fait foi »
Scénario : annuler la modification
- Étant donné le sélecteur de date ouvert
- Quand l'utilisateur clique sur « Annuler »
- Alors la date d'origine est conservée
Étape 2 · Contexte métier
Maquette
US 2.1 – Vérifier la fiche de cadrage pré-remplie
En tant que chargé qualité, je veux partir d'un brouillon rédigé par KnowDesk à partir de mes documents, afin de corriger plutôt que d'écrire sur une page blanche.
- La fiche est obligatoire. Elle remplace le choix « texte libre / formulaire » et le Markdown.
- 5 rubriques, chacune avec une pastille d'icône et un statut (Validé, À valider, Facultatif) :
    1.  Votre entreprise : qui vous êtes, où vous intervenez.
    2.  Vos offres : une étiquette par offre (nom · gamme · public), modifiable, avec « + Ajouter ».
    3.  Vos publics : la liste des publics du client (ex. particuliers, professionnels, revendeurs). Cette liste alimente partout ailleurs le choix et l'affichage du public d'un article ; aucun public n'est prédéfini dans l'interface.
    4.  Vos documents de référence (US 2.2).
    5.  Changements à venir (facultatif) : une hausse de tarif, une nouvelle offre ou une offre qui s'arrête prochainement.
- Mention KnowDesk par rubrique : chaque rubrique pré-remplie porte dans son en-tête « Préparé par KnowDesk » (prune). Quand l'utilisateur la modifie, la mention devient « Préparé par KnowDesk · modifié par vous ». Le contenu lui-même n'est pas teinté.
- Ce que l'utilisateur ajoute dans une rubrique (une offre, un public) s'affiche en pétrole clair avec « Ajouté par vous ».
- Une rubrique validée s'affiche en version compacte ; la rubrique à traiter a un contour pétrole et la mention « À valider ». Une progression en segments indique le nombre de rubriques validées.
- Aide sous « Vos offres » : « Listez les offres, produits ou services que vos conseillers présentent aux clients. L'analyse saura ainsi que deux informations différentes, un prix ou un délai par exemple, ne se contredisent pas quand elles portent sur deux offres, deux options ou deux publics différents. »
- Il est possible d'importer une fiche déjà rédigée, et de finir plus tard.
- Action principale : « Valider et lancer l'analyse ». L'analyse tourne en arrière-plan (jusqu'à une heure) et l'utilisateur est prévenu par e-mail.
Tests d'acceptance
Scénario : fiche pré-remplie à l'arrivée
- Étant donné des documents importés à l'étape 1
- Quand l'utilisateur arrive à l'étape 2
- Alors les rubriques Votre entreprise, Vos offres, Vos publics et Vos documents de référence portent la mention « Préparé par KnowDesk » (ou « Ordre proposé par KnowDesk »)
- Et la rubrique Changements à venir est marquée « Facultatif », sans mention si KnowDesk n'a rien trouvé
Scénario : modifier une rubrique pré-remplie
- Étant donné la rubrique Votre entreprise pré-remplie
- Quand l'utilisateur modifie le texte et enregistre
- Alors la mention devient « Préparé par KnowDesk · modifié par vous »
Scénario : ajouter une offre
- Étant donné la rubrique Vos offres
- Quand l'utilisateur ajoute une offre
- Alors elle s'affiche en pétrole clair avec « Ajouté par vous »
Scénario : valider une rubrique
- Étant donné la rubrique Vos offres à valider
- Quand l'utilisateur la valide
- Alors elle passe en version compacte avec le badge « Validé » et une pastille verte, et la progression avance d'un segment
Scénario : lancer l'analyse avec une rubrique obligatoire non validée
- Étant donné une rubrique obligatoire encore à valider
- Quand l'utilisateur clique sur « Valider et lancer l'analyse »
- Alors l'analyse ne démarre pas et l'écran l'amène à la rubrique à valider
Scénario : lancer l'analyse
- Étant donné toutes les rubriques obligatoires validées
- Quand l'utilisateur clique sur « Valider et lancer l'analyse »
- Alors l'analyse démarre en arrière-plan et l'utilisateur reçoit un e-mail quand elle est terminée
Scénario : finir plus tard
- Étant donné une fiche partiellement validée
- Quand l'utilisateur clique sur « Finir plus tard » puis revient
- Alors il retrouve la fiche telle qu'il l'a laissée
US 2.2 – Classer les types de document par priorité
En tant que chargé qualité, je veux indiquer quel type de document fait foi en cas de désaccord, afin que KnowDesk règle à ma place les cas couverts par mes règles.
- Les types sont ceux de l'étape 1, avec leur nombre de documents. KnowDesk propose un ordre par défaut (mention « Ordre proposé par KnowDesk »).
- L'utilisateur réordonne les types avec des flèches ↑↓.
- Pour chaque type, une règle entre deux documents de ce type : « Le plus récent fait foi » ou « Me demander à chaque fois ».
- Aides affichées :
  - « Un type placé plus haut l'emporte, même si son document est plus ancien. »
  - « Un type en bas de la liste reste utile : son contenu est repris tant qu'aucun document mieux classé ne dit le contraire. »
  - « Pour un document sans date, nous vous poserons la question à l'étape Questions. »
- Il n'y a pas d'option « ne fait jamais foi » : la dernière position suffit.
Règle de décision (appliquée par l'analyse) :
1.  Un document d'un type mieux classé l'emporte toujours.
2.  Pour deux documents d'un même type réglé sur « le plus récent », la date départage : celle trouvée par KnowDesk, ou à défaut celle saisie par l'utilisateur.
3.  S'il manque une des deux dates, ou si le type est réglé sur « Me demander », une question est créée à l'étape 3.
Tests d'acceptance
Scénario : un type mieux classé l'emporte, même plus ancien
- Étant donné « Conditions générales et contrats » classé au-dessus de « Supports de formation »
- Et des CGV datées de 2024 qui contredisent un support de formation daté de 2026
- Quand l'analyse se termine
- Alors l'information des CGV est retenue
- Et la question apparaît dans « Réglées par KnowDesk · Remplacé par une information prioritaire »
Scénario : le plus récent l'emporte pour un même type
- Étant donné le type « Tarifs » réglé sur « Le plus récent fait foi »
- Et deux grilles tarifaires datées d'août 2025 et de septembre 2026 qui se contredisent
- Quand l'analyse se termine
- Alors la valeur de septembre 2026 est retenue
- Et la question apparaît dans « Réglées par KnowDesk · Remplacé par une information plus récente »
Scénario : type réglé sur « Me demander »
- Étant donné le type « Procédures internes » réglé sur « Me demander à chaque fois »
- Et deux procédures datées qui se contredisent
- Quand l'analyse se termine
- Alors une question est créée dans « À vous de répondre · Contradictions »
Scénario : document sans date
- Étant donné un type réglé sur « Le plus récent fait foi »
- Et deux documents qui se contredisent, dont l'un sans date
- Quand l'analyse se termine
- Alors une question est créée dans « À vous de répondre · Documents sans date »
Scénario : réordonner les types
- Étant donné l'ordre proposé par défaut
- Quand l'utilisateur clique sur ↑ pour un type
- Alors il échange sa place avec celui du dessus et les numéros se mettent à jour
- Et la flèche ↑ du premier type et la flèche ↓ du dernier sont désactivées
Étape 3 · Questions
Maquette · Changer une réponse
L'étape s'appelle « Questions ». Le vocabulaire est celui de la question et de la réponse : « À vous de répondre », « Réglées par KnowDesk », « N réponses sur M ». Le mot « trancher » n'est plus utilisé.
US 3.1 – Voir les questions qui attendent une réponse et celles réglées par KnowDesk
En tant que chargé qualité, je veux séparer les questions qui demandent ma réponse de celles que mes règles ont réglées, afin de ne traiter que l'essentiel.
- En-tête : « Vos règles ont réglé N questions automatiquement. M attendent votre réponse. »
- La progression (« N réponses sur M ») ne compte que les questions qui attendent une réponse de l'utilisateur.
- Colonne de gauche, deux blocs, chacun en catégories repliables (cliquer ouvre la liste complète de la catégorie) :
  - À vous de répondre : Contradictions, Documents sans date, Erreurs probables, Informations incomplètes. Chaque catégorie affiche son avancement (« 1 / 7 »).
  - Réglées par KnowDesk (prune) : Remplacé par une information plus récente, Remplacé par une information prioritaire. Chaque catégorie affiche son nombre de questions.
- Par défaut, seule la catégorie de la question en cours est ouverte.
- Statut dans la liste : un picto « cercle coché » vert, à droite du libellé, pour une question qui a une réponse ; rien pour une question en attente. La question affichée est surlignée. Les questions réglées par KnowDesk portent le même picto, en prune. Aucun picto à gauche du libellé, pour ne pas le confondre avec une puce.
Tests d'acceptance
Scénario : en-tête et progression
- Étant donné une analyse qui a produit 19 questions, dont 7 réglées par les règles
- Quand l'utilisateur arrive à l'étape 3
- Alors l'en-tête indique « Vos règles ont réglé 7 questions automatiquement. 12 attendent votre réponse. »
- Et la progression affiche « 0 réponse sur 12 »
Scénario : statut dans la liste
- Étant donné une catégorie ouverte avec une question répondue et deux en attente
- Quand la liste s'affiche
- Alors seule la question répondue porte le picto vert
Scénario : ouvrir une catégorie
- Étant donné la catégorie « Erreurs probables » repliée
- Quand l'utilisateur clique dessus
- Alors toutes ses questions s'affichent, et un second clic la replie
Scénario : aucune question en attente
- Étant donné une analyse dont toutes les questions ont été réglées par les règles
- Quand l'utilisateur arrive à l'étape 3
- Alors l'écran indique qu'aucune question n'attend sa réponse et propose de passer au plan
- Et le bloc « Réglées par KnowDesk » reste consultable
US 3.2 – Répondre à une question
En tant que chargé qualité, je veux voir le désaccord et y répondre au même endroit, afin d'avancer vite.
- Titre de la carte en langage métier, sans nom de fichier ; une ligne rappelle la règle de l'étape 2 qui a conduit à poser la question (ex. « pour ce type de document, vous avez choisi « Me demander à chaque fois » »).
- Une seule question, générée pour le point (ex. « Quel est le délai de réponse à une réclamation ? »).
- Les valeurs en désaccord sont directement les réponses : deux encadrés cliquables de même hauteur, chacun avec la valeur, son document et sa date. Un clic sélectionne l'encadré (contour pétrole, pastille cochée).
- « Voir l'extrait » dans chaque encadré, en dehors de la zone de sélection : il déplie la phrase source, le document et la page, sans choisir la valeur.
- Troisième choix : « Autre réponse, ou réponses différentes selon les cas ». Il ouvre la question générée, l'aide « Indiquez la réponse à retenir. Si elle dépend de la situation, précisez chaque cas et la réponse qui s'y applique. » et un exemple généré à partir des valeurs (ex. « Réclamation écrite : 10 jours ouvrés. Réclamation par téléphone : 15 jours. »).
- Navigation : Précédent, Passer, Question suivante.
Tests d'acceptance
Scénario : choisir une valeur
- Étant donné une question « Contradiction » avec deux valeurs
- Quand l'utilisateur clique sur l'encadré d'une des valeurs
- Alors l'encadré est sélectionné, la question est cochée dans la liste et la progression avance d'une réponse
Scénario : voir l'extrait sans choisir
- Étant donné aucune valeur sélectionnée
- Quand l'utilisateur clique sur « Voir l'extrait » dans un encadré
- Alors la phrase source, le document et la page s'affichent sous la valeur
- Et aucune valeur n'est sélectionnée
Scénario : autre réponse, ou réponses différentes selon les cas
- Étant donné une question affichée
- Quand l'utilisateur choisit « Autre réponse, ou réponses différentes selon les cas »
- Alors la question générée, l'aide et un exemple construit à partir des valeurs s'affichent avec un champ de saisie
- Et la question n'a une réponse qu'une fois ce champ rempli
Scénario : passer une question
- Étant donné une question obligatoire
- Quand l'utilisateur clique sur « Passer »
- Alors la question suivante s'affiche et la question passée reste sans picto
US 3.3 – Revoir et changer une réponse réglée par KnowDesk
En tant que chargé qualité, je veux voir ce que KnowDesk a décidé, pourquoi, et pouvoir le changer, afin de garder le contrôle.
- La fiche affiche le badge prune « Réglé automatiquement par KnowDesk », la valeur écartée (barrée) et la valeur retenue, chacune avec « Voir l'extrait » ; elle indique la règle appliquée et les autres documents traités de la même façon.
- Actions : « Changer la réponse », « Modifier mes règles ».
- Écran « Changer la réponse » :
  - rappel de la décision : « KnowDesk a retenu [document], prioritaire sur [document]. Choisissez une autre réponse si cette règle ne s'applique pas ici. » ;
  - la question générée et les deux valeurs comme réponses cliquables (comme l'US 3.2), celle de KnowDesk marquée « Choix de KnowDesk » ;
  - « Autre réponse, ou réponses différentes selon les cas », avec aide et exemple ;
  - la portée : la réponse ne s'applique qu'à cette question ; une case permet de l'appliquer aussi aux autres documents réglés par la même règle pour cette valeur ;
  - « Enregistrer ma réponse » ramène à la fiche, qui affiche « Réponse modifiée par vous » en pétrole clair ; « Annuler » ramène à la fiche sans changement.
- Une réponse changée compte désormais parmi les réponses données par l'utilisateur (voir US 3.4).
Tests d'acceptance
Scénario : comprendre une décision automatique
- Étant donné une question réglée par la priorité entre types de document
- Quand l'utilisateur l'ouvre
- Alors la fiche affiche le badge prune « Réglé automatiquement par KnowDesk », la valeur écartée barrée, la valeur retenue et la règle appliquée
Scénario : changer la réponse
- Étant donné l'écran « Changer la réponse », avec la valeur de KnowDesk présélectionnée
- Quand l'utilisateur choisit l'autre valeur et clique sur « Enregistrer ma réponse »
- Alors la fiche affiche « Réponse modifiée par vous » et la nouvelle valeur est retenue
- Et les autres documents réglés par la même règle gardent la réponse de KnowDesk
Scénario : appliquer aux autres documents
- Étant donné l'écran « Changer la réponse »
- Quand l'utilisateur coche « Appliquer aussi ma réponse à… » puis enregistre
- Alors la réponse s'applique aussi aux documents concernés
Scénario : annuler
- Étant donné l'écran « Changer la réponse »
- Quand l'utilisateur clique sur « Annuler »
- Alors la fiche s'affiche sans changement
US 3.4 – Modifier ses règles en cours de route
En tant que chargé qualité, je veux être prévenu avant de perdre mes réponses, afin de ne pas les effacer par erreur.
- Toute modification validée de l'étape 2 relance l'analyse et réinitialise l'étape 3 (questions réglées par KnowDesk et réponses de l'utilisateur).
- Si l'utilisateur a déjà répondu à au moins une question, une fenêtre de confirmation s'affiche : « Modifier vos règles ? Vous avez déjà répondu à N questions. Si vous modifiez votre contexte métier, l'analyse sera relancée et ces réponses seront effacées. » Boutons : « Annuler », « Modifier quand même » (en rouge).
- Si l'étape 3 n'a pas été commencée, pas de confirmation.
Tests d'acceptance
Scénario : modifier les règles après avoir répondu
- Étant donné 3 réponses données par l'utilisateur
- Quand l'utilisateur clique sur « Modifier mes règles »
- Alors la fenêtre de confirmation indique « Vous avez déjà répondu à 3 questions »
Scénario : annuler
- Étant donné la fenêtre de confirmation ouverte
- Quand l'utilisateur clique sur « Annuler »
- Alors il reste à l'étape 3 et ses réponses sont conservées
Scénario : modifier quand même
- Étant donné la fenêtre de confirmation ouverte
- Quand l'utilisateur clique sur « Modifier quand même », change une règle et relance l'analyse
- Alors l'étape 3 repart de zéro, sans aucune réponse de l'utilisateur
Scénario : étape 3 pas encore commencée
- Étant donné aucune réponse donnée par l'utilisateur
- Quand l'utilisateur revient à l'étape 2
- Alors aucune fenêtre de confirmation ne s'affiche
Étape 4 · Plan
Maquette
US 4.1 – Voir le plan proposé
En tant que chargé qualité, je veux voir le plan complet de ma future base, afin de juger s'il couvre ce dont mes conseillers ont besoin.
- Le plan s'affiche par catégorie, avec le nombre d'articles par catégorie.
- Ligne de synthèse : « N articles pour tous les publics · N pour [public 1] · N pour [public 2]… », avec un segment par public saisi à l'étape 2 (rubrique « Vos publics »). Pas de filtre par public.
- Chaque article affiche son titre (formulé comme la question du client), son public et son nombre de documents sources.
- En dépliant un article : « Cet article répondra à » (les questions clients) et « Documents sources ».
- Une seule ligne d'information sur ce que l'IA a écarté : « N passages de vos documents ne sont repris dans aucun article », avec « Voir les passages ».
Règles de construction du plan (appliquées par l'IA, sans demander de validation) :
- Chaque réponse donnée à l'étape 3 apparaît dans au moins un article : l'IA la rattache à un article existant ou en crée un.
- Des passages jugés utiles mais non couverts donnent directement lieu à de nouveaux articles.
- Seuls les passages qui n'ont pas fait l'objet d'une réponse à l'étape 3 peuvent être écartés comme inutiles.
- Les fusions d'articles sont appliquées directement ; l'utilisateur peut séparer l'article.
Tests d'acceptance
Scénario : synthèse adaptée aux publics du client
- Étant donné trois publics saisis à l'étape 2
- Quand le plan s'affiche
- Alors la ligne de synthèse compte les articles pour tous les publics, puis un segment par public, avec leurs noms
Scénario : chaque réponse de l'étape 3 est reprise
- Étant donné 12 réponses données à l'étape 3
- Quand le plan est généré
- Alors chacune des 12 réponses apparaît dans les sources d'au moins un article
Scénario : passages écartés
- Étant donné 21 passages que l'IA n'a repris dans aucun article
- Quand le plan s'affiche
- Alors une seule ligne l'indique, avec « Voir les passages »
- Et aucun de ces passages ne provient d'une réponse de l'étape 3
Scénario : déplier un article
- Étant donné un article du plan
- Quand l'utilisateur le déplie
- Alors il voit « Cet article répondra à » et « Documents sources »
US 4.2 – Modifier le plan directement
En tant que chargé qualité, je veux modifier le plan moi-même, afin de ne pas dépendre de l'IA pour chaque ajustement.
- Menu « ⋯ » par article : Renommer (champ sur place), Déplacer vers une catégorie, Fusionner avec un article, Séparer en deux articles, Changer le public, Supprimer l'article (en rouge, avec l'icône corbeille).
- Glisser-déposer d'un article d'une catégorie à l'autre.
- Renommer une catégorie.
- Pas de commentaire sur les articles.
Tests d'acceptance
Scénario : renommer un article
- Étant donné un article du plan
- Quand l'utilisateur choisit « Renommer », saisit un nouveau titre et enregistre
- Alors le nouveau titre s'affiche dans le plan
Scénario : déplacer un article
- Étant donné un article de la catégorie A
- Quand l'utilisateur le glisse dans la catégorie B, ou choisit « Déplacer vers une catégorie »
- Alors l'article apparaît dans B et les compteurs des deux catégories se mettent à jour
Scénario : supprimer un article
- Étant donné un article du plan
- Quand l'utilisateur choisit « Supprimer l'article »
- Alors l'article disparaît du plan et le compteur de sa catégorie diminue
- Et si l'article portait une réponse de l'étape 3, l'utilisateur est prévenu avant la suppression
Scénario : séparer un article fusionné par l'IA
- Étant donné un article qui réunit deux sujets
- Quand l'utilisateur choisit « Séparer en deux articles »
- Alors deux articles apparaissent, chacun avec ses sources
US 4.3 – Ajouter un article
En tant que chargé qualité, je veux ajouter un article que l'IA n'a pas prévu, afin que la base couvre toutes les questions de mes clients.
- « + Ajouter un article » dans chaque catégorie ouvre un formulaire sur place : titre formulé comme la question du client (obligatoire), ce que l'article doit couvrir (facultatif), public.
- L'utilisateur ne rédige pas de contenu à cette étape.
- À la validation, l'IA cherche les sources. L'article porte le badge pétrole clair « Ajouté par vous » et le résultat :
  - « N passages trouvés dans N documents » : l'article sera rédigé comme les autres ;
  - « Aucune source trouvée · à rédiger par vous » (en jaune) : l'article sera créé vide et rédigé par l'utilisateur à l'étape 5, ou après ajout d'un document à l'étape 1.
Tests d'acceptance
Scénario : sources trouvées
- Étant donné un titre auquel des passages des documents répondent
- Quand l'utilisateur ajoute l'article
- Alors l'article porte le badge « Ajouté par vous » et « N passages trouvés dans N documents »
- Et il sera rédigé avec les autres
Scénario : aucune source trouvée
- Étant donné un titre auquel aucun passage ne répond
- Quand l'utilisateur ajoute l'article
- Alors l'article affiche « Aucune source trouvée · à rédiger par vous » en jaune
- Et il apparaît à l'étape 5 avec le statut « À rédiger »
Scénario : titre manquant
- Étant donné le formulaire d'ajout ouvert
- Quand l'utilisateur valide sans titre
- Alors l'article n'est pas ajouté et le message « Ajoutez un titre pour créer l'article. » s'affiche
US 4.4 – Ajouter une catégorie
En tant que chargé qualité, je veux créer une catégorie, afin d'organiser la base selon ma logique.
- Un seul champ : le nom de la catégorie.
- La catégorie apparaît vide avec le badge pétrole clair « Nouvelle » et un texte qui explique comment la remplir.
- Trois façons de la remplir : y déplacer des articles, « + Ajouter un article », « Suggérer des articles » (l'IA propose des articles tirés des documents, notamment des passages non repris, chacun avec « Ajouter », dans un encart prune « Suggéré par KnowDesk »).
Tests d'acceptance
Scénario : créer une catégorie
- Étant donné le plan affiché
- Quand l'utilisateur clique sur « + Ajouter une catégorie », saisit un nom et crée la catégorie
- Alors elle apparaît vide, avec le badge « Nouvelle » et le texte qui explique comment la remplir
Scénario : suggestions de KnowDesk
- Étant donné une nouvelle catégorie vide
- Quand l'utilisateur clique sur « Suggérer des articles »
- Alors des articles tirés des documents s'affichent dans un encadré « Suggéré par KnowDesk »
- Et un clic sur « Ajouter » place l'article dans la catégorie et le retire des suggestions
US 4.5 – Valider le plan
En tant que chargé qualité, je veux valider le plan pour lancer la rédaction, afin d'obtenir mes articles.
- Le plan doit être validé avant la rédaction des articles.
- Action principale : « Valider le plan et rédiger les articles ». Mention : « La rédaction prend quelques minutes. Vous pourrez encore ajouter ou supprimer des articles ensuite. »
- Pas de bouton pour demander un tout nouveau plan : si le plan ne convient pas du tout, le client appelle l'équipe KnowDesk, qui l'aide à comprendre et à corriger.
Tests d'acceptance
Scénario : valider le plan
- Étant donné le plan affiché
- Quand l'utilisateur clique sur « Valider le plan et rédiger les articles »
- Alors la rédaction démarre et l'utilisateur arrive à l'étape 5
Étape 5 · Relecture
Maquette
US 5.1 – Suivre la relecture article par article
En tant que chargé qualité, je veux voir où j'en suis dans la relecture, afin de savoir ce qu'il me reste à faire.
- Progression comptée en articles : « N articles relus sur M ».
- Colonne de gauche : catégories repliables avec leur avancement (« 2 / 4 »), comme à l'étape 3. L'article s'affiche à droite.
- Statuts d'article :
Statut
Quand
N à vérifier
L'article contient des phrases que les documents ne confirment pas mot pour mot
À rédiger
Aucune source n'a été trouvée
En rédaction
L'article vient d'être ajouté et l'IA le rédige
À relire
L'article n'a ni phrase à vérifier ni validation de l'utilisateur
Relu
Toutes ses phrases à vérifier sont traitées, ou l'utilisateur l'a marqué comme relu
Tests d'acceptance
Scénario : un article passe à « Relu »
- Étant donné un article avec 1 phrase à vérifier
- Quand l'utilisateur traite cette phrase
- Alors l'article passe à « Relu », l'avancement de sa catégorie et la progression globale augmentent de 1
Scénario : marquer comme relu
- Étant donné un article « À relire » sans phrase à vérifier
- Quand l'utilisateur clique sur « Marquer comme relu »
- Alors l'article passe à « Relu »
Scénario : article en rédaction
- Étant donné un article ajouté à l'étape 5
- Quand la rédaction est terminée
- Alors son statut passe de « En rédaction » à « N à vérifier » ou « À relire »
US 5.2 – Vérifier une phrase
En tant que chargé qualité, je veux vérifier les phrases que l'IA a reformulées, afin de ne publier que des informations exactes.
- La phrase est surlignée en jaune. Une bulle explique pourquoi (ex. « cette phrase réunit deux passages de vos documents »).
- Actions : « C'est juste », « Modifier » (la phrase devient modifiable sur place), « Voir les sources » (déplie les extraits sous la phrase).
- Quand la dernière phrase à vérifier est traitée, l'article passe à « Relu ».
Tests d'acceptance
Scénario : valider une phrase
- Étant donné une phrase surlignée
- Quand l'utilisateur clique sur « C'est juste »
- Alors le surlignage disparaît et la phrase compte comme vérifiée
Scénario : corriger une phrase
- Étant donné une phrase surlignée
- Quand l'utilisateur clique sur « Modifier », corrige la phrase et enregistre
- Alors la phrase corrigée remplace l'ancienne et compte comme vérifiée
Scénario : voir les sources
- Étant donné une phrase surlignée
- Quand l'utilisateur clique sur « Voir les sources »
- Alors les extraits, avec document et page, se déplient sous la phrase
US 5.3 – Modifier un article
En tant que chargé qualité, je veux retoucher tout le texte d'un article, afin de corriger ce qui n'est pas signalé.
- « Modifier l'article » ouvre un éditeur avec mise en forme simple (gras, italique, liste, lien).
- Menu « ⋯ » : Déplacer vers une catégorie, Supprimer l'article (en rouge, avec l'icône corbeille). Un article rédigé par l'IA porte la mention prune « Rédigé par KnowDesk à partir de N documents ».
- Public et usage modifiables en un clic : en haut de l'article, à côté de la catégorie, une étiquette cliquable affiche « [Public] · [Usage] » (ex. « Tous les publics · Clients et conseillers »). Elle ouvre un petit panneau avec deux sélecteurs, Public (les cibles définies à l'étape 2) et Usage (Clients et conseillers / Réservé aux conseillers), puis Annuler et Enregistrer. Le menu « ⋯ » ne propose plus « Changer le public ».
- Pas de badge « N phrases à vérifier » en haut de l'article : la phrase surlignée et sa bulle suffisent. Le haut de l'article affiche « Relu » une fois l'article relu ; le statut reste visible dans la liste des articles à gauche.
Tests d'acceptance
Scénario : modifier tout l'article
- Étant donné un article relu
- Quand l'utilisateur clique sur « Modifier l'article », change le texte et enregistre
- Alors le nouveau texte s'affiche
Scénario : annuler une modification
- Étant donné l'éditeur ouvert avec des changements
- Quand l'utilisateur clique sur « Annuler »
- Alors le texte d'origine est conservé
Scénario : modifier le public et l'usage d'un article
- Étant donné un article « Tous les publics · Clients et conseillers »
- Quand l'utilisateur clique sur l'étiquette, choisit « Réservé aux conseillers » puis enregistre
- Alors l'étiquette affiche « Tous les publics · Réservé aux conseillers »
- Et l'article ne sera jamais montré aux clients
Scénario : annuler la modification du public
- Étant donné le panneau Public et usage ouvert avec une nouvelle valeur choisie
- Quand l'utilisateur clique sur Annuler
- Alors le panneau se ferme et l'étiquette garde l'ancienne valeur
US 5.4 – Rédiger un article sans source
En tant que chargé qualité, je veux rédiger moi-même un article pour lequel KnowDesk n'a trouvé aucune source, afin que la base soit complète.
- L'article vide rappelle qu'aucun passage ne répond à la question et ce qu'il doit couvrir (saisi à l'étape 4).
- Un éditeur permet de rédiger la réponse. « Ajouter un document à la place » mène à l'étape 1.
- Mention : « S'il reste vide, l'article sera publié comme « À compléter » et signalé aux relecteurs. »
Tests d'acceptance
Scénario : rédiger un article sans source
- Étant donné un article « À rédiger »
- Quand l'utilisateur saisit un texte et clique sur « Enregistrer l'article »
- Alors l'article passe à « Relu »
Scénario : article laissé vide
- Étant donné un article « À rédiger » toujours vide
- Quand l'utilisateur publie la base
- Alors l'article est publié avec le statut « À compléter » et signalé aux relecteurs
Scénario : ajouter un document à la place
- Étant donné un article « À rédiger »
- Quand l'utilisateur clique sur « Ajouter un document à la place »
- Alors il arrive à l'étape 1
US 5.5 – Ajouter un article après la rédaction
En tant que chargé qualité, je veux encore ajouter un article, afin de combler un manque découvert en relisant.
- « + Ajouter un article » en bas de la liste. Formulaire de l'étape 4, avec en plus le choix de la catégorie.
- Seul ce nouvel article est rédigé ; il apparaît avec le statut « En rédaction » et l'utilisateur continue à relire les autres.
- Une réorganisation complète du plan relance la rédaction, après une confirmation du même type qu'à l'US 3.4.
Tests d'acceptance
Scénario : ajouter un article pendant la relecture
- Étant donné l'étape 5 en cours
- Quand l'utilisateur ajoute un article avec titre, catégorie et public
- Alors l'article apparaît dans sa catégorie avec le statut « En rédaction »
- Et les autres articles restent tels quels
- Et l'utilisateur peut continuer à relire pendant la rédaction
Publication et écran de fin
Maquette
US 6.1 – Publier la base pour relecture
En tant que chargé qualité, je veux publier la base à tout moment, afin que mes équipes commencent à la relire. C'est la fin de l'onboarding.
- Un bandeau en bas de l'étape 5 résume ce qui sera signalé aux relecteurs, et se met à jour au fil de la relecture (ex. « 5 articles ne sont pas encore relus et 1 article est à compléter : ils seront signalés aux relecteurs. Vous pourrez continuer à tout modifier après la publication. »).
- La publication n'est jamais bloquée : les articles non relus et les articles vides sont publiés et signalés, les articles vides avec le statut « À compléter ».
- Action principale : « Publier pour relecture ».
Tests d'acceptance
Scénario : bandeau à jour
- Étant donné 5 articles non relus et 1 article à compléter
- Quand l'utilisateur relit un article de plus
- Alors le bandeau indique 4 articles non relus et 1 à compléter
Scénario : publier avec des articles non relus
- Étant donné des articles non relus et un article vide
- Quand l'utilisateur clique sur « Publier pour relecture »
- Alors la base est publiée
- Et les articles non relus et « À compléter » sont signalés aux relecteurs
Scénario : tout est relu
- Étant donné tous les articles relus
- Quand l'utilisateur regarde le bandeau
- Alors il indique « Tous les articles sont relus »
US 6.2 – Inviter les relecteurs
En tant que chargé qualité, je veux inviter mes relecteurs dès la publication, afin de lancer la relecture sans attendre.
- Confirmation : « Votre base est publiée pour relecture », avec le bilan (N relus par vous, N non relus signalés, N à compléter signalés).
- Invitation par e-mail (adresses séparées par des virgules) avec « Envoyer les invitations », ou lien de relecture à copier.
- Les relecteurs lisent, commentent et modifient les articles ; l'utilisateur est prévenu à chaque commentaire.
- Bloc « Et ensuite ? » : vos équipes relisent, vous corrigez, vous ouvrez la base.
- Action principale : « Aller à ma base ».
Tests d'acceptance
Scénario : bilan de publication
- Étant donné une base publiée avec 28 articles relus, 5 non relus et 1 à compléter
- Quand l'écran de fin s'affiche
- Alors le bilan affiche ces trois nombres
Scénario : inviter par e-mail
- Étant donné deux adresses saisies, séparées par une virgule
- Quand l'utilisateur clique sur « Envoyer les invitations »
- Alors chaque relecteur reçoit une invitation et la confirmation « Invitations envoyées » s'affiche
Scénario : adresse invalide
- Étant donné une adresse mal formée
- Quand l'utilisateur envoie les invitations
- Alors aucune invitation n'est envoyée pour cette adresse et un message indique laquelle corriger
Scénario : relecteur
- Étant donné un relecteur invité
- Quand il ouvre la base
- Alors il peut lire, commenter et modifier les articles
- Et l'utilisateur est prévenu à chaque commentaire
Modèle de données et statuts
Un projet d'onboarding réunit tous les objets ci-dessous. Les noms sont indicatifs : votre collègue les adapte à son code. Chaque objet produit par l'IA garde son origine (knowdesk ou utilisateur), qui décide de l'affichage en prune ou en pétrole clair.
Objets
Objet
Champs principaux
Lié à
Projet
nom, client, étape en cours, statut, date de publication
Tous les objets ci-dessous
Document
nom de fichier, titre lisible, type de document, usage (client, interne), origine du type et de l'usage, à vérifier (oui/non), date, origine de la date (titre, corps page N, utilisateur, aucune), état (lu, doublon, illisible)
Projet
Type de document
nom (7 par défaut), rang de priorité, règle interne (plus_recent ou demander)
Projet, Documents
Fiche de cadrage
une entrée par rubrique : contenu, origine, statut (a_valider, valide, facultatif)
Projet
Offre
nom, gamme, public(s), origine
Fiche de cadrage
Public
nom
Fiche de cadrage ; référencé par Offres et Articles
Analyse
statut, date de lancement, date de fin, version des règles utilisées
Projet
Question
type, catégorie d'affichage, titre, question générée, exemple de réponse, valeurs comparées (valeur, document, page, extrait, date), règle appliquée, réponse (valeur A, valeur B ou texte libre), origine de la réponse (knowdesk, utilisateur), statut, documents concernés
Analyse
Plan
version, statut (propose, valide)
Projet
Catégorie d'articles
nom, ordre, origine
Plan
Article
titre, catégorie, public, questions couvertes, ce qu'il doit couvrir, sources (passages), origine, statut, texte
Plan
Phrase à vérifier
article, position dans le texte, motif, extraits sources, statut (a_verifier, validee, corrigee)
Article
Passage écarté
document, page, extrait
Plan
Invitation
adresse e-mail, date d'envoi, statut
Projet
Statut du projet
1.  documents : import et classement (étape 1).
2.  contexte : fiche de cadrage et priorités (étape 2).
3.  analyse_en_cours : l'analyse tourne ; l'utilisateur reçoit un e-mail à la fin.
4.  questions : questions (étape 3).
5.  plan : plan proposé, modifiable (étape 4).
6.  redaction_en_cours : rédaction des articles après validation du plan.
7.  relecture : relecture (étape 5).
8.  publie : base publiée pour relecture par les équipes.
Retours en arrière : une modification validée de l'étape 2 ramène le projet à analyse_en_cours et efface les questions et les réponses (US 3.4).
Statuts d'une question
Statut
Quand
Compté dans la progression
a_repondre
Créée par l'analyse, aucune règle ne s'applique
Oui
reglee_auto
Une règle de l'étape 2 s'applique (remplace_plus_recent ou remplace_prioritaire)
Non
repondue
L'utilisateur a répondu, ou a changé une réponse réglée par KnowDesk
Oui, si elle attendait une réponse
Types de questions : contradiction, sans_date, erreur_probable, incomplet.
Statuts d'un article
Statut
Quand
en_redaction
Ajouté après validation du plan, en cours de rédaction par l'IA
a_verifier
Au moins une phrase à vérifier non traitée
a_rediger
Aucune source trouvée et texte vide
a_relire
Ni phrase à vérifier ni validation de l'utilisateur
relu
Toutes ses phrases traitées, marqué comme relu, ou rédigé par l'utilisateur
a_completer
Publié alors qu'il était encore vide
Lots de livraison
Cinq lots, à livrer dans l'ordre : chacun s'appuie sur le précédent et se teste de bout en bout avant de passer au suivant.
Lot
Contenu
US
Testable quand
1. Socle
Modèle de données, statut du projet, structure d'écran (en-tête, stepper, barre d'action), composants du design system
Règles transverses
Un projet vide s'ouvre sur l'étape 1 avec le stepper à jour
2. Documents et contexte
Import, classement, dates, fiche de cadrage pré-remplie, priorités entre catégories, lancement de l'analyse et e-mail de fin
1.1 à 1.3, 2.1, 2.2
Une analyse se lance sur un jeu de test et l'e-mail arrive
3. Questions
Application des règles, liste par catégories, cartes de questions, questions réglées par KnowDesk et changement de réponse, réinitialisation
3.1 à 3.4
Les scénarios de l'US 2.2 donnent les bonnes questions à l'étape 3
4. Plan
Plan modifiable, ajout d'article et de catégorie, suggestions, validation
4.1 à 4.5
Chaque réponse de l'étape 3 se retrouve dans un article
5. Relecture et publication
Rédaction, statuts d'articles, phrases à vérifier, articles à rédiger, ajout tardif, publication, invitations
5.1 à 5.5, 6.1, 6.2
Un relecteur invité ouvre la base, la commente et la modifie
Conseil pour le vibecoding : donner à chaque lot les US concernées, leurs tests d'acceptance, le lien de l'écran de maquette et le design system ; faire passer les tests d'acceptance avant de commencer le lot suivant.
Améliorations possibles et hypothèses
Améliorations possibles (hors périmètre de ces US) :
- Matrice de droits : définir les rôles et ce que chacun peut faire dans KnowDesk (lire, commenter, modifier, administrer).
Hypothèses à confirmer :
[x] L'ouverture de la base aux conseillers est une étape qui suit la relecture, hors onboarding.
[x] Seules les personnes de l'organisation du client peuvent ouvrir le lien de relecture.
[x] Les 7 catégories de documents et leur ordre par défaut conviennent à tous les secteurs.
[ ] Pour démarrer, un seul rôle de relecteur, qui peut lire, commenter et modifier les articles. Un modèle de droits plus fin viendra plus tard.