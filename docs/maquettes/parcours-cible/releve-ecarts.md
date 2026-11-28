# Relevé des écarts : parcours cible (US.md, maquettes) et application actuelle

Relevé du 28/11/2026, lot étape A (PR KnowDesk-frontend#79). Il a été fait en lisant le code, sans rien coder. Sources lues : le front (cette branche), le back (`KnowDesk`, `main` du 22/11) et le pipeline (`KnowDesk-pipeline`, `origin/main` du 22/11). Chaque ligne donne un écart et son classement : « déjà conforme », « front seul », « besoin back » ou « besoin pipeline ». Quand une ligne relève de plusieurs classements, on retient celui qui conditionne le reste.

## Synthèse : ce qui manque côté back et pipeline, et ce qui en dépend

1. **Socle** — back : statut et étape en cours du projet, origine (KnowDesk ou utilisateur) sur chaque objet, e-mail de fin d'analyse. En dépendent le stepper cible et toutes les mentions « Préparé par KnowDesk · modifié par vous ».
2. **Documents** — pipeline : type (7), usage client/interne, date et son origine, titre lisible, confiance ; back : stocker ces champs, écarter les doublons au lieu de tout refuser, développer les .zip, accepter Excel. En dépendent les US 1.2 et 1.3 et toute la règle de priorité.
3. **Contexte métier** — pipeline : pré-remplissage de la fiche ; back : 5 rubriques avec statut et brouillon, types classés avec la règle « Le plus récent fait foi / Me demander », lancement à la validation. Dépend des Documents.
4. **Questions** — pipeline : règles qui règlent seules (`reglee_auto` plus récente ou prioritaire), types cibles (`sans_date`…), question générée, exemple, valeurs datées ; back : réponse d'origine KnowDesk, changer une réponse réglée, portée « Appliquer aussi à… », relance et remise à zéro. Dépend des deux étapes précédentes.
5. **Plan** — pipeline : plusieurs questions par article, article ajouté (avec ou sans source), séparer un article réuni, suggestions, chaque réponse dans un article ; back : statut proposé/validé, catégorie vide, « Changer le public ». Dépend des Questions.
6. **Relecture** — back : statuts d'article et de phrase à vérifier, texte et usage modifiables ; pipeline : rédiger un seul article (ajout tardif), position de chaque phrase. Dépend du Plan.
7. **Fin** — back : publication jamais bloquée avec signalement aux relecteurs et « À compléter », invitations de relecteurs liées au projet, commentaires d'article et notifications. Dépend de la Relecture.
8. **Faisable en front seul dès maintenant** : noms d'écrans et textes, liste et détail côte à côte, catégories repliables, retrait des statistiques et historiques, lien « Besoin d'aide ? », une seule action principale par écran.

## Règles transverses, étapes 1 (Documents) et 2 (Contexte métier), modèle de données associé

Remarque sur le pipeline : le checkout `main` local de /Users/brieuclanglois/Knowdesk/KnowDesk-pipeline date du 24/10 et est en retard. J'ai donc vérifié le pipeline sur `origin/main` (22/11) avec `git grep` et `git show`. Le back `main` local est daté du 22/11, comme `origin/main`.

**Règles transverses**
- [Transverse 1] L'en-tête pétrole existe (`ParcoursHeader`, retour, eyebrow, titre, phrase) — déjà conforme (src/shared/components/layout/ParcoursHeader.tsx)
- [Transverse 1] L'eyebrow affiche le nom du projet (`project.name`), pas le nom du client. Le projet n'a pas de champ client en base ; le nom de l'organisation est disponible côté front — front seul si on prend le nom de l'organisation, besoin back si le client est un champ du projet (OnboardingProjectPage.tsx)
- [Transverse 1] Le stepper a une icône par étape ; terminée en vert (`--success`), en cours en pétrole, à venir en gris — déjà conforme (src/shared/components/ui/Stepper.tsx, Stepper.css)
- [Transverse 1] Le stepper compte 5 étapes, dont « Analyse ». La cible a Documents, Contexte métier, Questions, Plan, Relecture et publication, et l'analyse n'est pas une étape. Les libellés diffèrent aussi (« Fiche de cadrage », « À clarifier », « Nouvelle base ») — front seul (lib/steps.ts)
- [Transverse 1] La barre d'action collée en bas existe (`ActionBarHost` / `ActionBarContent`) — déjà conforme (src/shared/components/ui/ActionBar.tsx)
- [Transverse 1] L'état « terminée » des étapes est déduit côté front (`doneSteps`, `StepFacts`). Il n'existe aucun statut de projet persisté — besoin back (lib/steps.ts)
- [Transverse 2] Fiche de cadrage : l'action principale est « Enregistrer une nouvelle version », qui ne mène pas à l'étape suivante. La cible attend « Valider et lancer l'analyse » — front seul (CadrageTab.tsx)
- [Transverse 2] Documents : la barre montre « Continuer : Fiche de cadrage » (fallback), une seule action — déjà conforme (OnboardingProjectPage.tsx)
- [Transverse 3] Des textes d'interface citent des publics précis : l'aide des segments dit « (particuliers, professionnels…) », et l'étiquette et le filtre de public sont figés « Particuliers / Professionnels » (`lib/audience.ts`, `AudienceFilter`). La valeur vient de la liste fermée du pipeline — besoin pipeline (CadrageSections.tsx `HINTS`, lib/audience.ts)
- [Transverse 4] L'onglet Analyse affiche « Appels à l'IA », « Fiche : version N », le quota et l'historique des analyses — front seul (AnalysisProgress.tsx l.42-43, AnalysisTab.tsx)
- [Transverse 4] La fiche de cadrage affiche « Version N (libre/structurée) » et l'historique des versions (`CadrageHistory`) — front seul (CadrageTab.tsx, CadrageHistory.tsx)
- [Transverse 4] Documents affiche des statistiques techniques : taille, format, « n / max documents, x Mo / y Mo », jauge de volume de texte — front seul (UploadZone.tsx, DocumentsTab.tsx)
- [Transverse 5] Étapes 1-2 : aucune valeur extraite par l'IA (type, date, rubriques pré-remplies) n'a de phrase source, puisque ces valeurs n'existent pas. L'extrait déplié sur place existe ailleurs (`AuditSource`) — besoin pipeline
- [Transverse 6] Étapes 1-2 : aucune décision de l'IA appliquée directement (type, usage, date, fiche, ordre des types) — besoin pipeline
- [Transverse 7] Les composants d'origine existent (`KnowDeskMention`, `KnowDeskBlock`, `KnowDeskBadge` avec sparkles et prune, `ByYouBadge` en primary). `Origin.test.tsx` protège `--accent` — déjà conforme (src/shared/components/ui/Origin.tsx)
- [Transverse 7] Le composant se nomme `KnowDeskMention` / `KnowDeskBlock`, pas `KnowDeskContent` (nommé seulement dans Origin.css). Aucune variante « Préparé par KnowDesk · modifié par vous » : `ByYouBadge` dit seulement « Modifié par vous » — front seul (Origin.tsx)
- [Transverse 7] Aucune origine (knowdesk ou utilisateur) n'est stockée sur les documents ni sur les rubriques de la fiche, donc aucune mention possible aux étapes 1-2 — besoin back
- [Transverse 8] Étapes 1-2 : pas de liste et détail dans la cible, les grilles existantes s'empilent sous 800-960 px — déjà conforme (onboardingProjects.css ; non vérifié pour les autres étapes)
- [Transverse 9] Les tokens de tokens.css ont les valeurs CX (#0e5c61, #9b3b8c, #2e7045, identiques aux maquettes). Le retrait de document utilise `trash-2` avec une confirmation `danger` — déjà conforme (src/styles/tokens.css, DocumentsTab.tsx)
- [Transverse 9] `variant="danger"` sert aussi à des confirmations qui ne sont pas des suppressions (« Changer de type de fiche ? », « Quitter sans enregistrer ») et `ConfirmDialog` n'y met pas d'icône. C'est discutable, car la perte des modifications est réelle — front seul (CadrageTab.tsx, OnboardingProjectPage.tsx)
- [Transverse 10] La navigation de gauche a un bouton « Aide » (LifeBuoy) qui ouvre le centre d'aide, et seulement avec le module help. Pas de lien gris « Besoin d'aide ? Contactez-nous » avec icône point d'interrogation — front seul (src/shared/components/layout/SideNav.tsx l.113-125)

**US 1.1**
- [US 1.1] La liste des 7 types de documents utiles (« Ce qui est utile ») n'apparaît pas sur l'écran — front seul (DocumentsTab.tsx)
- [US 1.1] Formats : PDF, Word, PowerPoint, Markdown et .zip sont acceptés. Excel (.xlsx) est refusé par le front et par le back, alors que le pipeline lit déjà xlsx (`origin/main:src/knowdesk_pipeline/inputs.py` l.31, `parsing/xlsx.py`). Le back est à ouvrir : `ONBOARDING_FORMATS`, contrainte `onboarding_documents_format_check`, `ONBOARDING_ARCHIVE.documentExtensions`, mesure — besoin back (onboarding.limits.ts, lib/checkSelection.ts)
- [US 1.1] Format non accepté (.exe) : refusé avant l'envoi, avec un message qui liste les formats acceptés — déjà conforme (lib/checkSelection.ts ; la liste devra inclure Excel)
- [US 1.1] Doublons : l'import est en tout ou rien. Un doublon de nom ou de contenu fait refuser tout l'envoi (`DUPLICATE_FILENAME` / `DUPLICATE_CONTENT`), au lieu de l'écarter et de le compter — besoin back (onboarding.service.ts l.155-166)
- [US 1.1] Une archive .zip est stockée comme un seul document et n'est pas développée. On ne peut pas afficher « 32 documents » ni écarter les doublons qu'elle contient — besoin back (onboarding.upload.ts `assertArchive`)
- [US 1.1] Document illisible : une archive illisible fait refuser l'envoi. Un fichier illisible n'est ni signalé, ni compté, ni lié dans la liste, et aucun état « lu / doublon / illisible » n'existe. La mesure renvoie null ou 0 pour un PDF scanné, mais la lisibilité réelle se joue au parsing — besoin pipeline (onboarding.measure.ts)
- [US 1.1] La ligne de synthèse « 5 doublons écartés · 1 document illisible » avec un lien n'existe pas — besoin back
- [US 1.1] Le consentement est demandé avant le premier import (`NoticeGate` remplace la zone d'import), puis n'est plus redemandé. L'acceptation est gardée par utilisateur et par version : il est redemandé seulement si le texte change — déjà conforme (NoticeGate.tsx, table `onboarding_notice_acceptances`)

**US 1.2**
- [US 1.2] Aucun type de document (7 types) n'est proposé par KnowDesk : rien dans le pipeline (son `SourceType` sert à autre chose : fiche, procedure, email, faq, formation…), rien dans le back — besoin pipeline
- [US 1.2] Aucun groupement par type avec compteurs, aucun menu « Type de document ». Les compteurs des deux groupes doivent se mettre à jour au changement de type — front seul, mais conditionné par le stockage du type (besoin back)
- [US 1.2] Aucun usage Client/Interne proposé ni modifiable (menu déroulant) — besoin pipeline (proposition) et besoin back (stockage)
- [US 1.2] Un document passé en Interne ne doit servir que dans les parties réservées aux conseillers. Aucune règle de ce type dans la construction du pipeline (`InternalCard` n'existe qu'à l'affichage) — besoin pipeline
- [US 1.2] Absence de l'aide sous le titre de la liste sur l'usage (texte imposé) — front seul
- [US 1.2] Absence de la mention de liste « Types, usages et dates proposés par KnowDesk · modifiables » (prune) — front seul (une fois les données disponibles)
- [US 1.2] Aucun badge « À vérifier » sur un type incertain, aucun encadré de comptage, et le badge ne disparaît pas à la confirmation : aucune confiance de classement n'est produite et aucun champ « à vérifier » n'est stocké — besoin pipeline

**US 1.3**
- [US 1.3] Aucune date de document cherchée dans le titre puis dans le corps. Le pipeline lit seulement les métadonnées `created_at` / `modified_at` (pdf, docx, pptx) ; le back ne stocke aucune date — besoin pipeline (origin/main `models/document.py` `DocumentProperties`)
- [US 1.3] Absence de la ligne de date avec son origine (« trouvée dans le titre », « trouvée dans le document, page 1 ») et du lien « Modifier » — besoin pipeline (origine et page)
- [US 1.3] Absence de « Aucune date trouvée » en jaune avec « Ajouter une date (facultatif) » — front seul (conditionné par la donnée)
- [US 1.3] Pas de sélecteur de date sur place (pré-rempli, Enregistrer / Annuler, date d'origine gardée à l'annulation) ; aucune route pour enregistrer une date utilisateur — besoin back
- [US 1.3] Une date saisie remplace la date trouvée et s'affiche sans origine. Elle doit servir à « le plus récent fait foi » : la règle n'existe pas dans l'analyse — besoin pipeline
- [US 1.3] La date est facultative et ne bloque pas la suite : aucune date n'est exigée aujourd'hui (rien ne bloque le passage) — déjà conforme

**US 2.1**
- [US 2.1] Aucun brouillon rédigé par KnowDesk à partir des documents. Le pipeline lit une fiche écrite par l'expert (prompt `read_cadrage`) mais ne la produit pas, et il n'a aucune tâche de pré-remplissage (tâches : analysis, correction, plan, build) — besoin pipeline
- [US 2.1] Le choix « Texte libre / Formulaire structuré (facultatif) » et le Markdown existent encore. La cible les supprime : une seule fiche, obligatoire — front seul pour l'écran, besoin back si le kind `free` est retiré (CadrageTab.tsx `MODES`, FreeCadrageEditor.tsx)
- [US 2.1] Fiche obligatoire : le back refuse l'analyse sans fiche (`CADRAGE_REQUIRED`), mais une fiche structurée vide passe et toutes les sections sont « Facultative ». Les rubriques obligatoires et leur validation n'existent pas — besoin back (onboarding.service.ts l.302, onboarding.cadrage.ts)
- [US 2.1] Les rubriques sont 6, pas 5 (offres, segments, services, notions, hiérarchie des sources, documents à durée limitée). Il manque « Votre entreprise » et « Changements à venir » ; « services » et « notions » n'existent plus dans la cible — besoin back (schéma `cadrageFormSchema`)
- [US 2.1] La pastille d'icône par rubrique existe (`IconTile`). Le statut « Validé / À valider / Facultatif » n'existe pas : seuls « Facultative » et « N erreurs » s'affichent — besoin back (statut par rubrique à stocker) (CadrageSections.tsx `SectionFrame`)
- [US 2.1] Offres : une offre a nom et description ; la cible attend une étiquette « nom · gamme · public » avec « + Ajouter » — besoin back (schéma `namedItem`)
- [US 2.1] Publics : `segments` (nom et description) existe, mais n'alimente pas le public des articles. Le public d'un article est une liste fermée du pipeline (particuliers, professionnels, tous) et il est prédéfini dans l'interface — besoin pipeline
- [US 2.1] Changements à venir (hausse de tarif, nouvelle offre, offre qui s'arrête) : seulement approché par `services.status: upcoming` et `limitedDocuments` — besoin back
- [US 2.1] Absence de la mention par rubrique « Préparé par KnowDesk », qui devient « … · modifié par vous » après modification : aucune origine stockée — besoin back
- [US 2.1] Absence de « Ajouté par vous » en pétrole clair sur une offre ou un public ajouté (`ByYouBadge` existe) — front seul (conditionné par l'origine stockée)
- [US 2.1] Pas de version compacte d'une rubrique validée (badge « Validé », pastille verte), pas de contour pétrole sur la rubrique « À valider », pas de progression en segments « N rubriques sur 5 validées » — front seul pour l'affichage, besoin back pour persister les statuts
- [US 2.1] L'aide sous « Vos offres » est absente (texte imposé ; l'aide actuelle dit « Ce que vous vendez : offres, gammes, abonnements. ») — front seul
- [US 2.1] Importer une fiche déjà rédigée : on importe aujourd'hui un .md ou .txt en texte libre ; la cible veut le répartir dans les 5 rubriques — besoin pipeline (FreeCadrageEditor.tsx)
- [US 2.1] Finir plus tard : aucun brouillon. Chaque enregistrement crée une version immuable (trigger `onboarding_cadrages_no_update`) et quitter sans enregistrer perd les modifications (confirmation `beforeunload`) — besoin back
- [US 2.1] L'action « Valider et lancer l'analyse » n'existe pas : l'analyse se lance dans un onglet à part (« Lancer l'analyse » avec confirmation) — front seul (la route POST analyses existe ; AnalysisTab.tsx)
- [US 2.1] Lancer avec une rubrique obligatoire non validée doit bloquer et amener à la rubrique. Il n'y a aucun contrôle de ce type — besoin back (statuts), puis front seul pour le défilement
- [US 2.1] L'analyse tourne en arrière-plan avec une limite d'une heure (`deadlineAt`, 60 min ; worker côté back) — déjà conforme (types.ts `OnboardingAnalysis`, onboarding.analysisWorker.ts)
- [US 2.1] Aucun e-mail en fin d'analyse : le module onboarding n'appelle jamais `infrastructure/email`, qui ne sert qu'à l'authentification et au compte — besoin back

**US 2.2**
- [US 2.2] Les types de documents de l'étape 1, avec leur nombre de documents, n'existent pas. On a à la place des « niveaux » libres de la hiérarchie des sources (intitulé, précisions, documents rattachés par nom de fichier) — besoin back (dépend du type de l'US 1.2, besoin pipeline)
- [US 2.2] Pas d'ordre proposé par défaut ni de mention « Ordre proposé par KnowDesk » — besoin back (7 types et ordre par défaut à porter), puis front seul
- [US 2.2] Les flèches ↑↓ existent, la première ↑ et la dernière ↓ sont grisées, les numéros « Niveau i » se mettent à jour — déjà conforme sur le mécanisme (CadrageSections.tsx l.246-251) ; à porter sur les types
- [US 2.2] La règle par type « Le plus récent fait foi » / « Me demander à chaque fois » n'existe pas — besoin back (stockage), et besoin pipeline (application)
- [US 2.2] Les trois aides imposées sont absentes (type placé plus haut, type en bas, document sans date) — front seul
- [US 2.2] Pas d'option « ne fait jamais foi » — déjà conforme
- [US 2.2] La règle de décision n'est pas appliquée par l'analyse : un type mieux classé gagne, puis la date départage dans un même type, puis une question si une date manque ou si le type est sur « Me demander ». Le pipeline produit des cartes avec recommandation (`reading/recommendation.py`), sans réglage automatique par priorité — besoin pipeline
- [US 2.2] Les catégories de résultat « Réglées par KnowDesk · Remplacé par une information prioritaire / plus récente » et « À vous de répondre · Contradictions / Documents sans date » n'existent pas (statuts `reglee_auto`, types `sans_date`…) — besoin pipeline

**Maquette Documents**
- [Maquette Documents] Le titre « Importez vos documents » et la phrase d'introduction diffèrent : l'en-tête montre aujourd'hui « Documents » et une autre phrase — front seul (lib/steps.ts `lead`)
- [Maquette Documents] Le retour s'intitule « ← Mes projets » ; il dit aujourd'hui « Tous les projets » — front seul
- [Maquette Documents] L'encart « Ce qui est utile » (7 types) est absent — front seul
- [Maquette Documents] La zone de dépôt annonce « PDF, Word, PowerPoint, Excel, Markdown ou archive .zip » ; aujourd'hui, pas d'Excel et la mention « export Notion » — besoin back (Excel)
- [Maquette Documents] L'en-tête de liste « 33 documents classés », avec la mention KnowDesk et la synthèse doublons / illisible, est absent ; on a aujourd'hui « Documents importés N » — besoin back
- [Maquette Documents] L'encadré « 1 document est difficile à classer et 1 document n'a pas de date… » est absent — besoin pipeline
- [Maquette Documents] Les groupes par type (« 2 documents ») et « Voir tous les documents · 24 autres de 4 types » sont absents ; on a une liste plate — besoin pipeline
- [Maquette Documents] La ligne de document montre un titre lisible et, dessous, le nom de fichier ; on a aujourd'hui le nom de fichier, le format, la taille et la date d'import. Aucun titre lisible n'est stocké — besoin pipeline
- [Maquette Documents] Par document : menu Type, menu Usage (Client/Interne), ligne de date et sélecteur sur place, badge « À vérifier » ; rien de tout cela n'existe — besoin pipeline
- [Maquette Documents] La maquette ne montre pas de bouton « Retirer » ; il existe aujourd'hui (corbeille et confirmation). C'est à trancher, la spec ne dit rien — front seul
- [Maquette Documents] La barre d'action porte la note « 33 documents classés · 2 à vérifier » et « Continuer vers le contexte métier → » ; on a aujourd'hui « Continuer : Fiche de cadrage » sans note — front seul (le compteur « à vérifier » dépend du pipeline)
- [Maquette Documents] Le lien « Besoin d'aide ? Contactez-nous » en bas de la navigation de gauche est absent — front seul

**Maquette Main**
- [Maquette Main] Le titre « Votre contexte métier » et la phrase « Nous avons préparé un brouillon à partir de vos N documents… » sont absents — front seul (le brouillon lui-même : besoin pipeline)
- [Maquette Main] Le stepper « Documents · Contexte métier · Questions · Plan · Relecture et publication » (5 étapes, sans Analyse) diffère — front seul
- [Maquette Main] La progression « 3 rubriques sur 5 validées » en segments est absente — besoin back
- [Maquette Main] Une rubrique validée est compacte, avec son contenu, « Modifier » et « Validé » ; « Vos offres » montre des étiquettes (nom · énergie · public) et « [Offre ajoutée] · Ajouté par vous » avec « + Ajouter ». Rien de cela n'existe ; on a aujourd'hui des formulaires toujours ouverts — besoin back
- [Maquette Main] « Vos documents de référence » est marquée « À VALIDER » et propose : liste numérotée des types avec compteur, ↑↓, choix « Entre eux : Le plus récent fait foi / Me demander à chaque fois », aide, bouton « Valider cet ordre ». Rien de cela n'existe — besoin back, et besoin pipeline pour l'application de la règle
- [Maquette Main] « Changements à venir » est marquée « Facultatif » et n'a pas de mention si rien n'est trouvé ; cette rubrique n'existe pas — besoin back
- [Maquette Main] La barre d'action porte la note « L'analyse prend jusqu'à une heure. Nous vous prévenons par e-mail. », un bouton secondaire « Finir plus tard » et l'action principale « Valider et lancer l'analyse → ». On a aujourd'hui la seule action « Enregistrer une nouvelle version » — besoin back (e-mail, brouillon)
- [Maquette Main] La maquette n'a ni historique des versions, ni choix texte libre / formulaire, ni rubriques « Notions » et « Services » ; tout cela existe aujourd'hui — front seul (retrait d'écran)
- [Maquette Main] Le lien d'import d'une fiche déjà rédigée, demandé par l'US 2.1, n'est pas visible dans le texte de la maquette (non vérifié visuellement, je n'ai pas exécuté le rendu)

**Modèle de données**
- Projet : table `onboarding_projects` (id, org_id, name, created_by, created_at, updated_at) ; type front `OnboardingProject` (name, documentsCount, totalBytes, limits, cadrageVersion, textChars). Il manque client, étape en cours, statut et date de publication.
- Document : table `onboarding_documents` (filename, format pdf/docx/pptx/md/zip, size_bytes, sha256 unique par projet, storage_key, locked_at, uploaded_by, created_at, text_chars) ; type front `OnboardingDocument`. Il manque titre lisible, type, usage, origine du type et de l'usage, à vérifier, date, origine de la date (titre, corps page N, utilisateur, aucune) et état (lu, doublon, illisible). Un zip occupe une seule ligne et les doublons ne sont jamais stockés (refus).
- Type de document : absent. Le plus proche est `form.sourceHierarchy.levels` (label, detail, documents[] par nom de fichier, ordre du tableau = rang), avec des intitulés libres. Le `SourceType` du pipeline (fiche, procedure, email, faq, formation, capture_ecran, glossaire, autre) ne correspond pas aux 7 types. Il manque les 7 noms par défaut, le rang et la règle plus_recent/demander.
- Fiche de cadrage : table `onboarding_cadrages` (version immuable, kind free/structured, form jsonb, markdown, source_filename, created_by) ; types front `Cadrage` / `CadrageForm` (6 sections). Il manque une entrée par rubrique (contenu, origine, statut a_valider/valide/facultatif), les rubriques « Votre entreprise » et « Changements à venir », et un brouillon modifiable (le trigger interdit l'UPDATE).
- Offre : `form.offers[]` = `NamedItem` {name, description}. Il manque gamme, public(s) (référence à un Public) et origine.
- Public : `form.segments[]` = `NamedItem` {name, description}, qui n'est référencé ni par les offres ni par les articles. Le public des articles est la liste fermée du pipeline (`audience` : particuliers, professionnels, tous ; front `lib/audience.ts`). Il manque la liste propre au client, utilisée partout, et l'origine.
- Analyse : table `onboarding_analyses` (status queued/running/succeeded/failed, stage, done/total, llm_calls, cadrage_id et cadrage_version figés, documents figés en jsonb, created_at = lancement, finished_at = fin, deadline à 60 min) ; type front `OnboardingAnalysis`. Ça existe pour l'essentiel. La « version des règles » se réduit à `cadrage_version`, faute de règles de priorité. Il manque la trace de l'e-mail de fin.
- Statut du projet (documents, contexte, analyse_en_cours, questions, plan, redaction_en_cours, relecture, publie) : absent du back. Le front le déduit (`doneSteps` et `StepFacts` dans lib/steps.ts, à partir de documentsCount, cadrageVersion et des faits lus par les écrans). Le retour en arrière (modifier l'étape 2 ramène à analyse_en_cours et efface les questions) n'existe pas en tant que statut. Une nouvelle analyse a de fait ses propres décisions, rattachées par analysis_id, et le front oublie ses faits quand une analyse est lancée (OnboardingProjectPage.tsx).

## Étape 3 (Questions, Changer une réponse), modèle Question et statuts

**Point clé : non. Aujourd'hui, aucune règle de priorité entre types de document (US 2.2) n'est appliquée par du code pour régler une question.**
- **Pipeline**, `origin/articles-vides`, la branche la plus récente (le `main` local date d'avant 0.16.0) :
  - `src/knowdesk_pipeline/reading/versions.py` l'écrit en tête : « No rule « the most recent wins »: the dates read are shown, they decide nothing. »
  - Le prompt `prompts/lecture_globale/v2.toml` demande au modèle de retenir « la valeur de la source qui fait foi […] pas celle d'un document parce qu'il est le plus récent ». Ce n'est qu'une recommandation : l'utilisateur doit toujours la suivre lui-même.
  - `prompts/read_cadrage/v*.toml` (`source_ranks`) et `SourceType` (`models/common.py`) sont des restes de l'ancienne chaîne : aucun code de `src` ne les lit.
- **Back** : la fiche de cadrage a une section `sourceHierarchy.levels` (niveaux ordonnés, libre, documents nommés par fichier) dans `src/modules/onboarding/onboarding.cadrage.ts`. Elle part au pipeline seulement comme texte Markdown (`renderCadrageMarkdown`), injecté dans `$cadrage` du prompt. Il n'y a ni rang typé, ni règle `plus_recent` / `demander`, ni type de document par fichier.

**Ce qui s'en approche dans l'audit 0.16.0 : les cartes de versions.**
- `remplacement_version` (« X annule et remplace Y ») et `reprise_version_remplacee`.
- Le code y range les cartes ligne par ligne qu'elles règlent (`rangedCards`, `_settled_by` / `_certain`). Ces cartes ne sont plus posées, et un point du modèle rangé devient un point écarté `ranged_under_version` (avec `versionCardId`).
- Mais la carte de versions est elle-même une affirmation que l'utilisateur doit confirmer : elle bloque tant qu'elle n'a pas de réponse (`NATURES.blocking`, `versionCardsWaiting`).
- Une carte rangée ne porte que `cardId`, `rank`, `nature`, `subject`, `documentIds`, `origin` : ni valeurs, ni valeur retenue ou écartée, ni règle, ni extrait pour une carte du code.
- On ne peut pas y répondre : `findReadingCard` du back ne cherche que dans `cards`.
- C'est donc l'ébauche la plus proche d'un « remplacé par une information plus récente ». Il n'existe rien pour « remplacé par une information prioritaire ».

Le lot étape A (cette PR) livre déjà : les groupes « À vous de répondre » et « Réglées par KnowDesk », « N réponses sur M », le picto à droite du libellé et « Question suivante ». Ces points ne sont pas relistés.

### Écarts

- [Transverse 5] Chaque passage cité montre son document, sa page et son extrait, mais toujours déplié, sans « Voir l'extrait » à déplier sur place (`components/audit/AuditSource.tsx`, `ReadingCardView.tsx`) — front seul
- [Transverse 5] Une carte rangée du code n'a aucun extrait ; une carte rangée du modèle n'a ses passages que dans les points écartés `ranged_under_version` (`reading/versions.py` `_ranged`, `lib/reading.ts` `RangedCard`) — besoin pipeline
- [Transverse 5] Une carte à valeurs (0.16.0 `valueGroups`) ou un contrôle du code relie bien chaque valeur à ses citations vérifiées (`ReadingCardView.tsx` `ValueGroups`) — déjà conforme
- [Transverse 6] Aucune décision de KnowDesk ne s'applique d'elle-même : la recommandation (« Je suis la recommandation de l'IA ») se valide carte par carte, et même la carte de versions doit être confirmée pour que ses cartes rangées soient réglées (`CardAnswers.tsx`, `lib/reading.ts` `NATURES.blocking`) — besoin pipeline
- [Transverse 6] Une réponse se change ou s'annule à tout moment, rien n'est effacé (journal) (`CardAnswers.tsx`, `hooks/useArbitration.ts`) — déjà conforme
- [Transverse 7] Les composants de provenance existent (`KnowDeskMention`, `KnowDeskBadge`, `ByYouBadge`), mais la mention est posée sur des blocs (analyse, recommandation, relevé) et non sur l'unité « question ». « Préparé par KnowDesk · modifié par vous » n'existe pas (`shared/components/ui/Origin.tsx`, `ReadingCardView.tsx`) — front seul
- [Transverse 7] Une réponse n'a pas d'origine knowdesk : toute décision est sérialisée `origin: 'user'`, et aucune réponse de KnowDesk n'est stockée pour une question réglée (back `onboarding.decisions.ts` vers la ligne 331) — besoin pipeline
- [Transverse 8] La session met la liste et la carte côte à côte, empilées sous 800 px (`onboardingProjects.css` `.obp-arb__body`, `ClarifySession.tsx`) — déjà conforme
- [Transverse 8] La vue d'ensemble (`ClarifyView`) est un écran séparé, en liste seule sans détail ; il faut cliquer « Commencer » / « Reprendre » pour arriver à la liste avec son détail (`ClarifyView.tsx`, `AuditTab.tsx`) — front seul
- [US 3.1] L'en-tête « Vos règles ont réglé N questions automatiquement. M attendent votre réponse. » est absent ; l'existant dit « N cartes à clarifier » plus un résumé par nature et « bloquent la publication ». N n'a pas de source fiable, faute de règles (`ClarifyView.tsx`, `describeSummary`) — besoin pipeline
- [US 3.1] Les catégories « Contradictions / Documents sans date / Erreurs probables / Informations incomplètes » ne correspondent pas aux natures actuelles. Il n'y a aucune catégorie « document sans date » ; à la place on a « Changements datés », « Incomplets ou périmés », deux natures de versions et quatre contrôles du code (`lib/reading.ts` `NATURES`, `CHECKS`) — besoin pipeline
- [US 3.1] Les catégories réglées « Remplacé par une information plus récente » / « … prioritaire » n'existent pas : seules les cartes rangées sous une carte de versions existent, sans raison distinguée (`VersionCardBody.tsx` `Ranged`, `reading/versions.py`) — besoin pipeline
- [US 3.1] Catégories repliables, avancement « 1 / 7 » par catégorie, nombre de questions pour les réglées, seule la catégorie en cours ouverte par défaut : rien de cela n'existe, les groupes sont toujours ouverts sans compteur dans la navigation (`ClarifySession.tsx` `nav`) — front seul
- [US 3.1] Le libellé de statut « Plus tard » et le statut `later` sont absents de la cible (`lib/reading.ts` `CARD_STATUS_LABEL`, `cardStatus`) — front seul
- [US 3.1] Test « aucune question en attente » : il n'y a pas d'écran « aucune question n'attend votre réponse, passer au plan » avec le bloc des réglées consultable. L'existant affiche « Aucune carte à clarifier » plus `PlanEntry` en mode construire (`ClarifyView.tsx`, `AuditTab.tsx`) — front seul
- [US 3.2] Le titre est le sujet rédigé par l'IA, en langage métier (`cardTitle`). Celui d'une carte de versions contient les chemins de fichiers (« X annule et remplace Y »), et une ligne « Documents : » suit toujours le titre (`reading/versions.py` vers la ligne 670, `ReadingCardView.tsx`) — besoin pipeline
- [US 3.2] Il n'y a pas de ligne rappelant la règle de l'étape 2 (« pour ce type de document, vous avez choisi … ») : ni type de document, ni règle par type (`ReadingCardView.tsx` ; back `onboarding.cadrage.ts`) — besoin pipeline
- [US 3.2] La question générée par point est absente : une question générique par nature ou contrôle s'affiche à la place (« Quelle valeur est juste ? ») (`lib/reading.ts` `sidesQuestion`) — besoin pipeline
- [US 3.2] Les valeurs comme réponses directes (deux encadrés cliquables de même hauteur, avec valeur, document et date) n'existent pas : l'existant montre d'un côté des blocs de citations, de l'autre des boutons « Retenir X ». Une carte du modèle sans `valueGroups` n'a d'ailleurs aucune valeur par côté (`CardAnswers.tsx`, `ReadingCardView.tsx`) — besoin pipeline
- [US 3.2] La date d'une valeur n'existe pas, sauf `dateRead` sur les documents d'une carte de versions (`lib/reading.ts` `VersionDocument`) — besoin pipeline
- [US 3.2] Sélection visuelle (contour pétrole, pastille cochée) et « Voir l'extrait » hors de la zone de sélection : absents (`CardAnswers.tsx`) — front seul
- [US 3.2] Test « choisir une valeur » : un clic sur « Retenir … » enregistre tout de suite et la progression avance (`CardAnswers.tsx` `submit`) — déjà conforme
- [US 3.2] Le troisième choix unique « Autre réponse, ou réponses différentes selon les cas » n'existe pas. L'existant propose `other_answer`, `distinct_cases`, `same_meaning`, `different_subjects`, `example_only`, `complete`, `remove`, `not_a_problem`, `out_of_scope`, `later` et « Je suis la recommandation » (`lib/reading.ts` `ANSWERS`, `CardAnswers.tsx`) — front seul
- [US 3.2] L'aide « Indiquez la réponse à retenir… » est absente : l'avertissement actuel parle d'arbitrage, de « saisi par l'expert » et de « Commentaire » (`CardAnswers.tsx` `ARBITRAGE_WARNING`) — front seul
- [US 3.2] L'exemple généré à partir des valeurs est absent (`CardAnswers.tsx`) — besoin pipeline
- [US 3.2] Test « la question n'a une réponse qu'une fois le champ rempli » : un texte vide est refusé (« Saisissez votre réponse. ») (`CardAnswers.tsx`) — déjà conforme
- [US 3.2] Il n'y a pas de bouton « Passer » : on a « Précédente » / « Suivante », plus « Plus tard », qui enregistre une décision (`ClarifySession.tsx`) — front seul
- [US 3.2] L'écran montre des éléments hors cible : « Carte N sur M », « Bloque la publication » (« Obligatoire » dans la maquette), « Analyse proposée par l'IA », l'historique de la carte et le commentaire (`ReadingCardView.tsx`, `ClarifySession.tsx`, `CardHistory.tsx`) — front seul
- [US 3.3] Il n'y a pas de fiche par question réglée : une carte rangée n'est qu'une ligne (sujet et documents) dans un `<details>` sous la carte de versions (`VersionCardBody.tsx` `Ranged`) — front seul
- [US 3.3] Le badge dit « Tranché automatiquement par KnowDesk » au lieu de « Réglé automatiquement par KnowDesk », alors que le mot « trancher » est banni (`VersionCardBody.tsx`, `audit/AuditView.tsx`) — front seul
- [US 3.3] La valeur écartée (barrée) et la valeur retenue, chacune avec son extrait, sont absentes : une carte rangée ne porte ni valeurs ni côté retenu (`reading/versions.py` `_ranged`, back `onboarding.audit.ts` `RangedCard`) — besoin pipeline
- [US 3.3] La règle appliquée (« les Tarifs sont prioritaires sur les Supports de formation ») est absente : pas de règle dans le contrat (`lib/reading.ts`) — besoin pipeline
- [US 3.3] « Les autres documents traités de la même façon » est absent ; les cartes sœurs rangées sous une même carte de versions pourraient s'en approcher, mais par paire de versions et non par règle (`VersionCardBody.tsx`) — besoin pipeline
- [US 3.3] Action « Changer la réponse » impossible : le back ne trouve une carte qu'à partir de `reading.cards`, et une carte rangée refuse toute décision (back `onboarding.audit.ts` `findReadingCard`, `onboarding.decisions.ts`) — besoin back
- [US 3.3] Action « Modifier mes règles » : pas de lien de la carte vers l'étape 2 (`ReadingCardView.tsx`) — front seul
- [US 3.3] Une réponse changée sur une question réglée doit être relue par la construction à la place du choix de KnowDesk : aucun chemin ne le permet aujourd'hui (pipeline `construction/answers.py` `VERSION_NATURES`, non vérifié en détail) — besoin pipeline
- [US 3.3] Elle doit aussi compter parmi les réponses de l'utilisateur, ce qui suppose une décision stockée pour cette question (back `onboarding.decisions.ts`) — besoin back
- [US 3.3] Test « annuler » : ce retour est faisable à l'écran, mais l'écran « Changer la réponse » n'existe pas (aucun fichier) — front seul
- [US 3.4] Une modification de l'étape 2 ne relance pas l'analyse : il faut la relancer à la main dans l'onglet Analyse, qui consomme le quota. Les anciennes réponses ne sont pas effacées, elles restent attachées à l'ancien audit, en lecture seule (`components/AnalysisTab.tsx`, `CadrageTab.tsx` ; back) — besoin back
- [US 3.4] La confirmation « Modifier vos règles ? Vous avez déjà répondu à N questions… » avec « Annuler » / « Modifier quand même » (rouge) n'est pas là où il faut : seul le lancement d'une analyse montre un avertissement (« Vos N décisions restent consultables… ne seront pas reportées »), qui compte aussi les « Plus tard » (`AnalysisTab.tsx` `decisionsNotice`) — front seul
- [US 3.4] Les tests « étape 3 pas commencée, pas de confirmation » et « Annuler, réponses conservées » sont faisables avec le compte de `listDecisions` (`AnalysisTab.tsx`, `ConfirmDialog`) — front seul
- [US 3.4] Le test « l'étape 3 repart de zéro » est déjà vrai de fait : un nouvel audit n'a aucune décision (`hooks/useArbitration.ts`, par `analysisId`) — déjà conforme
- [Maquette Carte] Le sur-titre « Selon vos règles de l'étape 2 » du bloc des réglées et la vue « auto » (badge, « Remplacé par une information prioritaire », écartée / « Retenue dans la base », règle appliquée, « traitée de la même façon ») ne peuvent pas être alimentés (`VersionCardBody.tsx`) — besoin pipeline
- [Maquette Carte] Le badge « Obligatoire » remplace « Bloque la publication » (`ReadingCardView.tsx`) — front seul
- [Maquette Carte] Dans les encadrés, la valeur, le document et sa date (« Procédure réclamations · mars 2026 ») puis la page sous l'extrait : la date manque (`AuditSource.tsx`) — besoin pipeline
- [Maquette Carte] Le bouton dit « Point suivant » alors que l'US dit « Question suivante » (traité par le lot, à harmoniser dans la maquette) — front seul
- [Maquette Changer] Le rappel « KnowDesk a retenu [document], prioritaire sur [document] » et la valeur présélectionnée marquée « Choix de KnowDesk » sont absents (`lib/reading.ts` `RangedCard`) — besoin pipeline
- [Maquette Changer] La portée et la case « Appliquer aussi ma réponse à … » sont absentes : aucune décision ne vaut pour plusieurs cartes ou documents dans le contrat de décision 0.10.0 (back `schemas/decision-0.10.0.schema.json`) — besoin back
- [Maquette Changer] « Enregistrer ma réponse » ramène à la fiche, qui affiche « Réponse modifiée par vous » ; le badge primary existe (`ByYouBadge modified`) (`Origin.tsx`) — front seul
- [Maquette Changer] La fenêtre de confirmation rouge est techniquement possible (`ConfirmDialog variant="danger"`, déjà utilisé dans `CadrageTab.tsx`) — front seul

### Modèle de données

**Objet Question : champs de US.md face à l'existant**
- Question · type : existe sous la forme `ReadingCard.nature` (`CardNature`), plus `check.kind` pour les cartes du code. La liste fermée diffère de la cible, voir le mapping plus bas (`lib/reading.ts`, pipeline `models/reading.py`).
- Question · catégorie d'affichage : calculée côté front (`NATURES[].plural`, `CHECKS[].plural`, `groupByNature`). Les catégories des questions réglées manquent.
- Question · titre : existe, `analysis.subject` via `cardTitle`. Pour une carte de versions, le code y écrit les chemins de fichiers.
- Question · question générée : manque. `sidesQuestion` est une question générique écrite côté front.
- Question · exemple de réponse : manque.
- Question · valeurs comparées, valeur : existe seulement pour les cartes à `valueGroups` (`label`), les écarts du code (`GapValue`) et les différences de versions (`oldValue` / `newValue`). Une carte du modèle n'a que des citations par côté.
- Question · valeurs comparées, document, page, extrait : existent par citation (`SourceRef` : `documentId`, `page` ou `slide`, `excerpt`), via `AuditSource` et `sourceLocation`.
- Question · valeurs comparées, date : manque. Seul `VersionDocument.dateRead` existe, sur les cartes de versions.
- Question · règle appliquée : manque. Ni type de document ni règle par type dans le back, ni règle appliquée dans le pipeline.
- Question · réponse (valeur A, valeur B ou texte libre) : existe dans la décision du back (`accept_side`, `retain_value`, `other_answer`, `distinct_cases` avec texte), plus d'autres codes hors cible (`lib/decisions.ts`, `lib/reading.ts` `CardAction`).
- Question · origine de la réponse (knowdesk, utilisateur) : manque. Toute décision vaut `origin: 'user'` ; la recommandation est une proposition, pas une réponse de KnowDesk (back `onboarding.decisions.ts`).
- Question · statut : calculé côté front (`cardStatus` : `open`, `answered`, `later`). Rien n'est stocké, il n'y a pas de `reglee_auto`.
- Question · documents concernés : existe, `ReadingCard.documentIds` (et `RangedCard.documentIds`).
- Objets liés (contexte) : Analyse · « version des règles utilisées » manque. Type de document (rang de priorité, règle `plus_recent` / `demander`) manque. Le plus proche est `sourceHierarchy.levels` de la fiche de cadrage (ordonné, libre, transmis en texte au modèle) (back `onboarding.cadrage.ts`).

**Statuts d'une question face à l'existant**
- `a_repondre` correspond à `open` (aucune décision courante), et aussi à `later`, qui reste « à traiter » pour les cartes bloquantes (`cardStatus`, `versionCardsWaiting`).
- `reglee_auto` (règle `remplace_plus_recent`) : l'équivalent partiel est une carte rangée sous une carte de versions. Elle n'est réglée qu'une fois la carte de versions confirmée par l'utilisateur, et ne porte ni réponse ni règle (`rangedCards`, point écarté `ranged_under_version`).
- `reglee_auto` (règle `remplace_prioritaire`) : aucun équivalent.
- `repondue` correspond à `answered`, toute décision courante autre que `later`. Une « réponse changée sur une réglée » n'existe pas, puisqu'on ne peut pas répondre à une carte rangée.
- « Plus tard » (`later`) : aucun statut cible correspondant ; « Passer » de la cible n'enregistre rien.
- Compté dans la progression : aujourd'hui `cardProgress` compte toutes les cartes de `reading.cards`, cartes de versions comprises. Les cartes rangées en sont déjà exclues.

**Types de questions face aux natures actuelles**
- `contradiction` ← `contradiction`, et le contrôle du code `value_gap` (« Écart entre documents »). Une `dated_change` réglée sur « Me demander » ou sans date irait aussi ici.
- `sans_date` ← aucune nature. `date_without_year` (« Date sans année ») porte sur une date écrite sans année dans le contenu, pas sur un document sans date. À créer.
- `erreur_probable` ← `probable_error`.
- `incomplet` ← `incomplete_or_outdated`, et probablement `period_gap` (« Période sans règle ») ; `outdated_content` (« Contenu périmé ») est sans cible claire.
- Sans type cible : `dated_change` (devrait devenir `reglee_auto` « plus récente » ou une `contradiction` selon la règle) ; `remplacement_version` et `reprise_version_remplacee` (sont, dans la cible, le mécanisme de `reglee_auto` « plus récente » et non des questions posées) ; « Notes temporaires » (`TemporaryNote`, rien à répondre).


## Étapes 4 (Plan), 5 (Relecture), Fin, modèle Plan/Article et statuts

### Écarts

- [Transverse 2] La vue Plan a deux boutons forts : « Modifier le plan », qui passe en primary une fois ouvert, et « Rédiger les N articles » dans la barre d'action. Avec un plan prêt, « À clarifier » met « Préparer à nouveau le plan » à côté de « Voir le plan ». Avec une rédaction faite, la barre met « Rédiger à nouveau » à côté de « Voir les articles rédigés ». Attendu : une seule action, qui mène à l'étape suivante — front seul (PlanTab.tsx, PlanEntry.tsx, BuildView.tsx/BuildEntry)
- [Transverse 2] Vue Articles rédigés : une seule action principale, « Créer la base de connaissance », dans la barre (ActionBarContent) — déjà conforme (BuildKnowledgeBase.tsx)
- [Transverse 5] Chaque source donne son document et sa page (ou diapositive) et se déplie sur place (AuditSource dans un `<details>`), dans le plan comme dans les articles — déjà conforme (audit/AuditSource.tsx, PlanTab.tsx/SubjectBlock)
- [Transverse 6] Les réunions faites par l'IA et le plan s'appliquent sans validation. En revanche, le plan ne se lance pas seul après les questions : il faut cliquer « Préparer le plan » dans « À clarifier ». Et le plan ne se modifie qu'après avoir ouvert le mode « Modifier le plan ». Attendu : plan présent d'office et modifiable directement — front seul (PlanEntry.tsx, PlanTab.tsx)
- [Transverse 7] Mention prune : le plan entier porte « Plan préparé par KnowDesk à partir de N documents », un article rédigé porte « Rédigé par KnowDesk à partir de N documents » — déjà conforme (PlanTab.tsx/PlanView, BuildView.tsx/ArticleView)
- [Transverse 7] Un article ou une catégorie modifiés prennent un badge à part « Modifié par vous ». Attendu : la mention de l'unité devient « Préparé par KnowDesk · modifié par vous ». Il y a aussi des mentions prune en trop, sur des sous-parties : « Réunis par KnowDesk », « Retiré par KnowDesk… », « Retirées par KnowDesk… », « Trouvées par KnowDesk » dans la légende — front seul (PlanEditing.tsx/ModifiedTag, Origin.tsx, BuildView.tsx)
- [Transverse 8] Le plan et les articles sont une seule colonne de catégories repliables (`<details>`). Attendu : la liste à gauche et le détail en haut à droite, côte à côte sur un écran d'ordinateur — front seul (PlanTab.tsx, BuildView.tsx)
- [Transverse 9] Aucun token ni composant préfixé cx- dans le front (`src/styles/tokens.css` : 0 occurrence ; le surlignage utilise `--color-warning-bg`) — front seul (onboardingProjects.css)
- [Transverse 9] Le rouge sert à « Retirer du plan » sans l'icône trash-2 (ConfirmDialog n'a pas d'icône). Il sert aussi à « Revenir au plan proposé », qui n'est pas une suppression — front seul (PlanEditing.tsx, shared/components/ui/ConfirmDialog.tsx)
- [Transverse 10] Le lien « Besoin d'aide ? Contactez-nous » n'existe nulle part dans la navigation de gauche (aucune occurrence dans src) — front seul (OnboardingProjectPage.tsx)
- [US 4.1] Le plan s'affiche par catégorie, mais sans le nombre d'articles de chaque catégorie (« Catégorie i · titre » seulement) — front seul (PlanTab.tsx/PlanView)
- [US 4.1] La synthèse dit « N catégories · N articles · N passages couverts sur M », ce qui est une statistique (transverse 4). Attendu : « N articles pour tous les publics · N pour [public]… » — front seul (lib/plan.ts/planSummary)
- [US 4.1] Les publics sont une liste fermée dans le code (particuliers / professionnels / tous, repérés par expressions régulières dans le pipeline). La fiche de cadrage n'a pas de rubrique « Vos publics ». Attendu : un segment par public saisi à l'étape 2, sans libellé de secteur dans l'interface — besoin pipeline (P plan/audience.py ; puis B onboarding.cadrage.ts, F lib/audience.ts)
- [US 4.1] Un filtre par public s'affiche (`AudienceFilter`), alors que la spec n'en veut pas — front seul (PlanTab.tsx, Audience.tsx)
- [US 4.1] Le titre n'est pas formulé comme la question du client : le pipeline écrit `title` et une seule `question` à part — besoin pipeline (P models/plan.py PlanSubject)
- [US 4.1] Chaque article affiche « Sources (n) », c'est-à-dire un nombre de passages. Attendu : le nombre de documents sources, puis, une fois déplié, « Documents sources » — front seul (PlanTab.tsx/SubjectBlock)
- [US 4.1] « Cet article répondra à : » est suivi d'une seule phrase. Attendu : la liste des questions clients (la maquette en montre plusieurs) — besoin pipeline (P models/plan.py `question: NonEmptyStr`)
- [US 4.1] Le plan montre une section « Points d'attention » à quatre groupes : documents écartés, passages sans article avec leur raison, articles réunis, « À savoir » (cartes non rattachées, titres rejetés, citations introuvables), plus les cartes liées. Attendu : une seule ligne « N passages de vos documents ne sont repris dans aucun article » avec « Voir les passages » — front seul (PlanTab.tsx/PlanView)
- [US 4.1 règle] Une réponse de l'étape 3 peut ne figurer dans aucun article : `unattached_cards` et `card_without_article` existent, et le front les affiche. Attendu : l'IA la rattache à un article ou en crée un, toujours — besoin pipeline (P plan/run.py, models/plan.py UnattachedCard)
- [US 4.1 règle] Les passages utiles non couverts donnent de nouveaux articles par un second passage (`plan_complement`) — déjà conforme (P plan/run.py)
- [US 4.1 règle] Rien ne garantit qu'un passage écarté ne vient pas d'une réponse de l'étape 3 : `uncovered_units` ne filtre pas les passages des cartes — besoin pipeline (P plan/run.py ; garantie non vérifiée par un test)
- [US 4.1 règle] Les réunions d'articles s'appliquent directement — déjà conforme (P plan/run.py `_merge`, `merged_subjects`)
- [US 4.2] Pas de menu « ⋯ » par article : les boutons sont alignés et n'apparaissent qu'en mode modification. Renommer ouvre une fenêtre, pas un champ sur place. « Réunir dans… » s'appelle autrement que « Fusionner avec un article » — front seul (PlanEditing.tsx)
- [US 4.2] Renommer, déplacer vers une catégorie, réunir, retirer un article et renommer une catégorie existent, enregistrés par le back. Les compteurs bougent parce que le plan est rechargé — déjà conforme (B onboarding.planEdits.ts, F lib/planEdits.ts)
- [US 4.2] Il n'y a pas d'opération « Changer le public » : les opérations du back sont rename_chapter, rename_subject, move_subject, move_chapter, merge_subjects, remove_subject — besoin back (B onboarding.planEdits.ts)
- [US 4.2] « Séparer en deux articles » n'existe pas. Le plan ne garde que les titres des articles que l'IA a réunis (`merged_subjects.titles`), pas leurs sources séparées — besoin pipeline (P models/plan.py MergedSubjects)
- [US 4.2] Pas de glisser-déposer : seuls « Déplacer… » et ↑↓ existent. L'opération move_subject suffit côté back — front seul (PlanEditing.tsx)
- [US 4.2] Le plan a des commentaires, un par article et un pour le plan. Attendu : aucun commentaire sur les articles — front seul (PlanTab.tsx/PlanCommentBox)
- [US 4.2] La suppression prévient quand l'article portait une réponse : « Vos réponses à ses N cartes liées apparaîtront… ». Mais le libellé est « Retirer du plan », sans rouge ni corbeille sur l'entrée — front seul (PlanEditing.tsx/removeDescription)
- [US 4.3] Impossible d'ajouter un article. Le pipeline n'a pas de tâche qui cherche les sources d'un titre. Le back n'a pas d'opération add_subject, ni de champ « ce qu'il doit couvrir », ni d'origine « utilisateur » (origin ne vaut que plan_sujets ou plan_complement) — besoin pipeline (P plan/run.py ; B onboarding.planEdits.ts)
- [US 4.3] Impossible d'avoir un article sans source : le schéma impose au moins une source par article (`sources` min_length=1), et les articles sans citation vérifiée sont écartés (`rejected_subjects`). Il faut donc aussi le badge « Ajouté par vous », « N passages trouvés dans N documents » et « Aucune source trouvée · à rédiger par vous » — besoin pipeline (P models/plan.py)
- [US 4.3] Le formulaire sur place, avec le message « Ajoutez un titre pour créer l'article. », n'existe pas. Il dépend des deux lignes ci-dessus — front seul (PlanTab.tsx)
- [US 4.4] Une catégorie ne se crée qu'en y déplaçant un article (« + Nouvelle catégorie… ») et disparaît avec son dernier article. Attendu : un champ nom seul, une catégorie vide avec le badge « Nouvelle » et un texte d'aide — besoin back (B onboarding.planEdits.ts l.21 et 212)
- [US 4.4] « Suggérer des articles » n'existe pas, ni l'encart « Suggéré par KnowDesk ». La décision C-Q11 interdit d'ailleurs aujourd'hui toute suggestion de l'IA — besoin pipeline (P plan/ ; F CLAUDE.md C-Q11)
- [US 4.5] Le plan n'a pas de statut « validé » : ses statuts sont queued, running, succeeded, failed. Lancer la rédaction tient lieu de validation, et le plan reste modifiable ensuite, ce qui fait refuser la création de la base (PLAN_CHANGED) — besoin back (B onboarding.plans.ts, onboarding.knowledgeBase.ts)
- [US 4.5] Le bouton dit « Rédiger les N articles », avec la note « Environ 5 à 10 minutes… ». Attendu : « Valider le plan et rédiger les articles », avec « La rédaction prend quelques minutes. Vous pourrez encore ajouter ou supprimer des articles ensuite. » — front seul (BuildView.tsx/BuildEntry)
- [US 4.5] Après le lancement, on reste dans l'onglet « Nouvelle base » : seule la vue passe à « Articles rédigés ». Attendu : l'utilisateur arrive à l'étape 5 du stepper — front seul (PlanTab.tsx/launchBuild, lib/steps.ts)
- [US 4.5] « Préparer à nouveau le plan » contredit l'US 4.5, qui ne veut aucun bouton pour demander un tout nouveau plan. La phrase « … puis préparer le plan à nouveau » sous le plan et la rédaction la contredit aussi. Le recours prévu est le lien d'aide — front seul (PlanEntry.tsx, BuildView.tsx/BuildEntry, PlanTab.tsx/PlanView footer)
- [US 4.5 et Transverse 4] Le plan affiche un historique : sélecteur « Version » des plans, « Voir le plan proposé / modifié », panneau « Vos modifications (N) » avec auteur et date, section « Retirés ou réunis » — front seul (PlanTab.tsx, PlanEditing.tsx/EditsPanel)
- [US 5.1] Aucun statut de relecture par article, et rien pour compter « N articles relus sur M ». La rédaction stockée n'est jamais modifiée (`construction: ColumnType<unknown, string, never>`) — besoin back (B onboarding.buildRepository.ts, infrastructure/database/index.ts OnboardingBuildVersionsTable)
- [US 5.1] Il manque la colonne de gauche par catégorie avec son avancement « 2 / 4 », et l'article affiché à droite — front seul (BuildView.tsx/BuildArticles)
- [US 5.1] Statut « N à vérifier » : le compte se calcule déjà à partir de `toVerify`. Il manque le compte des phrases non traitées et le badge dans la liste — besoin back (lib/build.ts)
- [US 5.1] Statut « En rédaction » impossible : la rédaction porte sur tout le plan (`run_build` rédige tous les articles) — besoin pipeline (P construction/run.py)
- [US 5.1] Il n'y a ni « Marquer comme relu » ni passage automatique à « Relu » — besoin back (B onboarding.builds.ts)
- [US 5.2] La phrase est surlignée en jaune (`--color-warning-bg`) — déjà conforme (BuildView.tsx/Highlighted)
- [US 5.2] La raison s'affiche sur une ligne à part sous le bloc, pas dans une bulle. Le texte diffère : « cette phrase relie deux passages différents… » au lieu de « cette phrase réunit deux passages de vos documents » — front seul (BuildView.tsx, lib/build.ts/TO_VERIFY_LABEL)
- [US 5.2] Ni « C'est juste », ni « Modifier » sur place : aucun statut ni texte corrigé n'est enregistré par phrase. Le mode correction a un équivalent (`onboarding_modification_reviews`), les rédactions non — besoin back (B onboarding.builds.ts)
- [US 5.2] « Voir les sources » : les sources du bloc se déplient (« Sources (n) »), mais pas propres à la phrase et sans le libellé attendu — front seul (BuildView.tsx/BlockView)
- [US 5.3] Ni « Modifier l'article » ni éditeur (gras, italique, liste, lien) : le texte de la rédaction ne s'écrit pas — besoin back (B infrastructure/database/index.ts OnboardingBuildVersionsTable)
- [US 5.3] Pas de menu « ⋯ » (Déplacer, Supprimer) après la rédaction. Le plan se modifie encore, mais la création de la base est alors refusée (PLAN_CHANGED) — besoin back (B onboarding.knowledgeBase.ts KB_BUILD_MESSAGES)
- [US 5.3] La mention « Rédigé par KnowDesk à partir de N documents » est présente — déjà conforme (BuildView.tsx/ArticleView)
- [US 5.3] Pas d'étiquette « [Public] · [Usage] » modifiable. L'usage (Clients et conseillers / Réservé aux conseillers) n'existe ni dans le plan, ni dans la rédaction, ni dans la base (les articles sont tous créés « internes ») — besoin back (B onboarding.knowledgeBase.ts ; le public vient en plus de la liste fermée du pipeline)
- [US 5.3] Le badge « N phrases à vérifier » en haut de l'article est retiré par le lot étape A — déjà conforme (BuildView.tsx/ArticleView)
- [US 5.3] Le haut de l'article n'affiche pas « Relu » : ce statut n'existe pas — besoin back (B onboarding.builds.ts)
- [US 5.4] Un article vide montre « Aucun texte gardé : <raison> », sans éditeur, sans le rappel de ce qu'il doit couvrir (le champ n'existe pas), sans « Ajouter un document à la place » et sans la mention « À compléter ». Aucun article sans source ne vient de l'étape 4 — besoin pipeline (P models/plan.py ; puis B pour enregistrer le texte saisi)
- [US 5.4] Un article vide n'est pas importé dans la base : il est exclu avec `excluded: empty|no_text`. Attendu : publié « À compléter » et signalé aux relecteurs — besoin back (B onboarding.knowledgeBaseBuild.ts l.200-202)
- [US 5.5] On ne peut pas ajouter un article après la rédaction : il faudrait rédiger un seul article. Le pipeline rédige tout le plan. Il n'y a ni « + Ajouter un article » avec choix de la catégorie, ni « Ajouter et rédiger », ni encart « Rédaction en cours » — besoin pipeline (P construction/run.py)
- [US 5.5] Une réorganisation relance la rédaction après une confirmation (« Rédiger à nouveau »). Mais cette confirmation ne vient pas d'une réorganisation et ne parle pas de réponses perdues — front seul (BuildView.tsx/BuildEntry)
- [Maquette Relecture] L'écran montre des blocs qui ne sont pas dans la maquette : encarts « N de vos réponses ne figurent dans aucun article », « N lignes … donnent une valeur qu'aucun article n'écrit », « Retiré de cet article », « Redites retirées », « Cartes liées », commentaires pour l'équipe, filtre par public, synthèse chiffrée, titre « Articles rédigés le …, à partir du plan du …, modifié (N modifications) ». Il manque la ligne « Sources : … » en bas de l'article — front seul (BuildView.tsx, PlanTab.tsx)
- [US 6.1] Il n'y a pas de bandeau qui se met à jour avec « N articles ne sont pas encore relus et N à compléter… ». Ces nombres demandent les statuts d'article — besoin back (B onboarding.builds.ts)
- [US 6.1] La publication peut être bloquée : administrateur seulement, module `knowledge` activé, base vide obligatoire, plan ou réponses inchangés, rédaction 0.3.0 et la plus récente. Il faut aussi passer par un aperçu puis une confirmation. Attendu : jamais bloquée — besoin back (B onboarding.knowledgeBase.ts KB_BUILD_MESSAGES)
- [US 6.1] Les articles sont publiés directement (`articlesService.publish`, `status: published`), sans rien qui les signale aux relecteurs. Les phrases à vérifier sont « publiées sans marque » — besoin back (B onboarding.knowledgeBase.ts l.760-775)
- [US 6.1] Le bouton dit « Créer la base de connaissance ». Attendu : « Publier pour relecture » — front seul (BuildKnowledgeBase.tsx)
- [US 6.2 et Maquette Fin] Il n'y a pas d'écran de fin « Votre base est publiée pour relecture ». Après la création, un simple message et « Ouvrir la base de connaissance » s'affichent dans le bloc — front seul (BuildKnowledgeBase.tsx)
- [US 6.2] Le bilan (N relus par vous, N non relus signalés, N à compléter signalés) ne peut pas se calculer sans statuts d'article — besoin back (B onboarding.knowledgeBase.ts)
- [US 6.2] Il n'y a pas d'invitation de relecteurs pour le projet. Il existe une invitation de membre de l'organisation : une adresse à la fois, administrateur seulement, rôles admin / manager / advisor, sans rôle relecteur, sans lien au projet. Il n'y a pas non plus d'envoi groupé avec message par adresse invalide — besoin back (B ../members/members.router.ts POST /invite, ../members/invitations.service.ts)
- [US 6.2] Pas de lien de relecture à copier, réservé à l'organisation — besoin back (B ../members/)
- [US 6.2] Les relecteurs ne peuvent pas commenter les articles de la base (aucune table de commentaires d'article) et ne sont pas prévenus à chaque commentaire. Seuls les commentaires de l'onboarding existent — besoin back (B infrastructure/database/index.ts)
- [US 6.2] Pas de bloc « Et ensuite ? » en trois temps — front seul (BuildKnowledgeBase.tsx)
- [US 6.2] « Ouvrir la base de connaissance » existe. Attendu : « Aller à ma base » — front seul (BuildKnowledgeBase.tsx)
- [Maquette Plan] L'en-tête dit « Le plan de votre base », « 33 articles répartis en 8 catégories… » et « Valider le plan… ». Le front garde le titre d'étape « Nouvelle base » et la phrase « Relisez la nouvelle base préparée… » — front seul (lib/steps.ts)
- [Maquette Relecture et Fin] Les étapes 5 et Fin n'existent pas dans le stepper. Le front a 5 étapes : Documents, Fiche de cadrage, Analyse, À clarifier, Nouvelle base. Le plan et la relecture sont deux vues du même onglet — front seul (lib/steps.ts, PlanTab.tsx)

### Modèle de données

- Plan · version : `generation` existe (`onboarding_plans`), avec plusieurs plans par analyse — existe (B infrastructure/database/index.ts OnboardingPlansTable)
- Plan · statut propose / valide : absent. Seuls queued, running, succeeded, failed existent, et un plan modifié reste modifiable après la rédaction — manque (B onboarding.plans.ts)
- Plan modifié : un journal `onboarding_plan_edits` et une copie envoyée à la rédaction (`onboarding_build_plans`, `planEditCount`) — existe (B onboarding.planEdits.ts, onboarding.builds.ts)
- Catégorie · nom et ordre : `chapters[].title` et l'ordre du tableau (`subject_ids`), dans le plan en JSON — existe (P models/plan.py PlanChapter)
- Catégorie · origine : absente. Seul `changedChapterIds` signale une catégorie touchée, et une catégorie vide est interdite — manque (B onboarding.planEdits.ts)
- Article · titre : `title` — existe (P models/plan.py PlanSubject)
- Article · catégorie : `chapter_id` — existe (même fichier)
- Article · public : `audience`, chaîne libre que le pipeline remplit avec la liste fermée particuliers / professionnels / tous. Pas de lien avec un objet Public de la fiche — partiel (P plan/audience.py, F lib/audience.ts)
- Article · questions couvertes : une seule `question` — partiel, la liste manque (P models/plan.py)
- Article · ce qu'il doit couvrir : absent — manque
- Article · sources (passages) : `sources` (ReadingSourceRef12, au moins une) et `units` — existe, mais rend impossible un article sans source (P models/plan.py)
- Article · origine knowdesk / utilisateur : `origin` ne vaut que plan_sujets ou plan_complement, pas « utilisateur » — manque (P models/plan.py)
- Article · statut : la rédaction ne connaît que `status: written|empty` et `empty_reason`. Aucun statut de relecture — manque (P models/construction.py BuiltArticle)
- Article · texte : `blocks` de la rédaction (intertitle, text, list, table, avec `origin` document ou expert). Il ne se modifie jamais : `construction` en `never` à la mise à jour — partiel (B infrastructure/database/index.ts OnboardingBuildVersionsTable)
- Article · usage : absent du plan, de la rédaction et de la création de la base, où tout est « interne » — manque (B onboarding.knowledgeBase.ts)
- Phrase à vérifier · motif et passages : `blocks[].to_verify[] {reason, passages}` — existe (P models/construction.py ToVerify, F lib/build.ts)
- Phrase à vérifier · identifiant et position dans le texte : absents. Le front retrouve la phrase avec `indexOf` sur le texte du bloc — manque (F BuildView.tsx/Highlighted)
- Phrase à vérifier · extraits sources : seulement les sources du bloc, pas celles de la phrase — partiel (P models/construction.py Block.sources)
- Phrase à vérifier · statut a_verifier / validee / corrigee : absent, rien n'est enregistré — manque (B onboarding.builds.ts)
- Passage écarté · document, page, extrait : `attention.uncovered_units[] {unit{document_id, kind, number, heading_path}, document_path, excerpt, reason}` — existe. La raison est en plus, et la garantie « jamais une réponse de l'étape 3 » n'est pas vérifiée (P models/plan.py UncoveredUnit)
- Invitation · e-mail, date d'envoi, statut : la table `invitations` (org_id, email, role, token, invited_by, expires_at, accepted_at, created_at) est au niveau de l'organisation. Pas de lien au projet, pas de rôle relecteur, statut à déduire d'`accepted_at` et `expires_at` — partiel (B infrastructure/database/index.ts InvitationsTable)
- Statut d'article en_redaction : absent. La rédaction d'un seul article est impossible — manque (P construction/run.py)
- Statut d'article a_verifier : se déduit côté front du nombre de `to_verify`, mais rien ne marque une phrase traitée — partiel (F lib/build.ts readConstruction)
- Statut d'article a_rediger : absent. Seul un article `empty`, avec raison no_source, all_removed ou invalid_output, s'en approche — manque (P models/construction.py EmptyReason)
- Statut d'article a_relire : absent — manque
- Statut d'article relu : absent — manque
- Statut d'article a_completer : absent. Les articles vides sont exclus de la base — manque (B onboarding.knowledgeBaseBuild.ts)
- Statut de projet (les quatre) : `onboarding_projects` n'a ni statut, ni étape en cours, ni date de publication (id, org_id, name, created_by, created_at, updated_at). Le front déduit les étapes de ce que les écrans ont chargé (`useStepFact`) — manque (B infrastructure/database/index.ts OnboardingProjectsTable, F lib/steps.ts)
- Statut de projet plan : se déduit d'un plan `succeeded` — partiel, à déduire (B onboarding.plans.ts)
- Statut de projet redaction_en_cours : se déduit d'une rédaction queued ou running — partiel, à déduire (B onboarding.builds.ts)
- Statut de projet relecture : aucun équivalent — manque
- Statut de projet publie : se déduit de `knowledge_base_creations.status = succeeded` (source build), sans date de publication sur le projet — partiel (B onboarding.knowledgeBase.ts)

### À savoir

- La copie locale `main` du pipeline est très en retard (audit 0.11.0, aucun module plan ni construction). J'ai donc lu `origin/main` avec `git show`, sans toucher à la copie de travail.
- Le plan 0.2.0 (raisons détaillées des passages écartés) est sur la branche `articles-vides` du pipeline, pas sur `origin/main`, alors que le front l'accepte déjà.

### Fichiers

- F = /Users/brieuclanglois/Knowdesk/KnowDesk-frontend/src/features/onboardingProjects/ (components/base/PlanTab.tsx, PlanEditing.tsx, PlanEntry.tsx, BuildView.tsx, Audience.tsx ; components/knowledgeBase/BuildKnowledgeBase.tsx ; components/audit/AuditSource.tsx ; lib/plan.ts, planEdits.ts, build.ts, audience.ts, steps.ts ; onboardingProjects.css) ; aussi /Users/brieuclanglois/Knowdesk/KnowDesk-frontend/src/shared/components/ui/Origin.tsx, ConfirmDialog.tsx et /Users/brieuclanglois/Knowdesk/KnowDesk-frontend/src/styles/tokens.css
- B = /Users/brieuclanglois/Knowdesk/KnowDesk/src/modules/onboarding/ (onboarding.router.ts, onboarding.plans.ts, onboarding.planEdits.ts, onboarding.planEditing.ts, onboarding.builds.ts, onboarding.buildRepository.ts, onboarding.knowledgeBase.ts, onboarding.knowledgeBaseBuild.ts, onboarding.cadrage.ts) ; aussi /Users/brieuclanglois/Knowdesk/KnowDesk/src/infrastructure/database/index.ts et /Users/brieuclanglois/Knowdesk/KnowDesk/src/modules/members/members.router.ts, invitations.service.ts
- P = /Users/brieuclanglois/Knowdesk/KnowDesk-pipeline, lu sur `origin/main` : src/knowdesk_pipeline/models/plan.py, models/construction.py, plan/run.py, plan/audience.py, construction/run.py
- Spec et maquettes : /Users/brieuclanglois/Knowdesk/KnowDesk-frontend/docs/maquettes/parcours-cible/US.md, Plan.dc.html, Relecture.dc.html, Fin.dc.html
