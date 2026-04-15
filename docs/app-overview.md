# App Overview

> Statut du document :
> Ce document est un document de référence produit et architectural de haut niveau.
> Il décrit à la fois l’état actuel du projet, certaines orientations déjà engagées, et certaines cibles proches ou lointaines.
> En cas d’écart entre ce document et le code, le code réel fait foi pour l’implémentation immédiate, et le document doit être mis à jour dès que possible.

## 1. Vision du produit

Ycaro est une application web personnelle conçue comme un poste de pilotage du quotidien dans une seule interface.

Son objectif est de centraliser, dans un environnement simple et cohérent, plusieurs dimensions de la vie personnelle et du travail :

- le temps
- les tâches
- les habitudes
- les finances
- la lecture
- le journal personnel
- les systèmes de décision et de travail récurrents

L’application suit une logique local-first. Elle doit rester rapide, robuste, compréhensible, et agréable à utiliser plusieurs fois par jour.

Ycaro n’est pas pensé comme une juxtaposition de mini-outils sans lien. C’est un système personnel unifié, avec un shell commun, une navigation stable, des comportements homogènes, et une architecture suffisamment propre pour évoluer dans le temps.

Le projet a aussi une deuxième vocation : servir de laboratoire produit pour expérimenter des briques fonctionnelles qui pourraient, à terme, être isolées et devenir des produits autonomes.

---

## 2. Ambition long terme

Ycaro a aujourd’hui un usage personnel, mais il est conçu de manière à garder ouvertes deux trajectoires compatibles.

### 2.1. OS personnel complet

Ycaro devient un environnement central de pilotage du quotidien, utilisé tous les jours dans le navigateur, avec la possibilité à terme d’être prolongé par une application iOS liée.

### 2.2. Réservoir de produits dédiés

Certaines briques pourront être isolées à terme et transformées en produits autonomes, sur navigateur et potentiellement sur mobile.

Exemples possibles :

- outil de gestion pour indépendants
- application de suivi d’habitudes
- outil de productivité personnelle
- système de planification et d’organisation
- outil mêlant agenda, activité et facturation

Important : cette ambition de verticalisation ne doit pas conduire à sur-architecturer trop tôt. Le projet doit d’abord rester simple, cohérent et utile dans son usage personnel quotidien.

---

## 3. Objectif global de l’application

L’application doit permettre de piloter plusieurs pans du quotidien depuis une seule interface.

Elle sert notamment à :

- gérer le temps et les événements
- organiser les tâches et les priorités
- suivre les habitudes
- suivre certaines dimensions financières
- structurer des systèmes de travail récurrents
- suivre des lectures et contenus
- tenir un journal personnel
- agréger des signaux utiles dans une vue d’ensemble quotidienne

Ycaro combine donc :

- des données structurées
- des espaces de réflexion
- des outils d’organisation
- des vues synthétiques orientées usage quotidien

---

## 4. Usage quotidien visé

L’application est conçue pour être utilisée plusieurs fois par jour.

### Le matin

L’utilisateur doit pouvoir ouvrir Ycaro et comprendre immédiatement ce qui compte pour la journée :

- rendez-vous à venir
- tâches prioritaires
- éléments de suivi rapide
- signaux utiles ou inspirants

### Pendant la journée

L’application doit permettre des actions rapides et simples :

- ajouter une tâche
- modifier une tâche
- consulter le calendrier
- déplacer ou planifier une action
- capturer une information
- suivre un avancement

### Le soir

L’application doit faciliter une logique de fermeture ou de revue :

- revue de la journée
- journal
- validation des habitudes
- mise à jour de certains systèmes
- préparation implicite ou explicite du lendemain

### Conséquences produit et techniques

Comme l’application est utilisée souvent, les choix de conception doivent privilégier :

- des pages rapides à charger
- une compréhension immédiate
- une interface sans friction
- des actions fréquentes simples à exécuter
- une forte stabilité
- des comportements homogènes entre les pages

---

## 5. Principes directeurs

Le projet repose sur les principes suivants :

- local-first
- simplicité d’usage
- shell commun cohérent
- séparation claire des features
- robustesse au chargement
- progression incrémentale
- lisibilité du code
- portabilité future vers mobile
- potentiel de réutilisation produit
- pédagogie du code

Ces principes ne sont pas seulement déclaratifs. Ils doivent guider les arbitrages au quotidien.

Exemples :

- une solution simple et lisible est préférée à une solution plus abstraite si le gain réel est faible
- une feature doit d’abord être utile dans Ycaro avant d’être pensée comme un futur produit indépendant
- une page peut être volontairement minimale si cela améliore sa stabilité et sa compréhension
- un comportement homogène est préféré à une logique spécifique si cela réduit la charge mentale

### 5.1. Principes directeurs de disposition des pages

La conception visuelle des pages doit également suivre deux principes directeurs de disposition.

#### 1. Minimalisation des informations inscrites

Par défaut, l'interface doit afficher le moins de texte possible.

Cela implique :
- ne garder que les titres absolument nécessaires des blocs et des sections
- éviter les textes explicatifs visibles dans le rendu courant
- privilégier les interfaces de lecture immédiate, centrées sur les données et les actions

#### 2. Économie de l'espace

Les informations les plus importantes doivent tenir autant que possible dans l'espace visible d'un écran standard.

Cela implique :
- éviter qu'un utilisateur doive scroller pour comprendre l'état principal d'une page
- compacter les tableaux, blocs et graphiques quand c'est possible
- utiliser des textes courts
- accepter une taille de police plus petite si nécessaire
- conserver un peu de padding pour maintenir un niveau minimal de lisibilité

Ordre de priorité visuelle :
- d'abord la compacité
- ensuite la lisibilité

---

## 6. Périmètre actuel et statut des modules

Toutes les briques citées dans ce document n’ont pas le même niveau de maturité.

### 6.1. Modules existants ou déjà présents dans le shell

- Accueil
- Calendrier
- Finances
- Lecture
- Journal

### 6.2. Modules en cours de structuration ou de refonte

- Accueil
- Tasks
- Habit Tracker
- Systems
- amélioration du Calendrier

### 6.3. Module supprimé

- Extraction — suppression effectuée. La page et ses routes ont été retirées du code. Les données déjà importées dans le Journal sont conservées dans IndexedDB.

### 6.4. Modules à fort potentiel de verticalisation

- Finances
- Habit Tracker
- certains systèmes de productivité
- certaines briques de gestion de tâches et de planification

Cette distinction permet de séparer clairement ce qui existe, ce qui est en construction, ce qui est exploratoire, et ce qui relève d’une ambition plus long terme.

---

## 7. Stack technique actuelle

La stack actuelle est la suivante :

- React
- Vite
- TypeScript

Le shell principal repose actuellement sur :

- `App.tsx`
- `AppLayout.tsx`

Le routing utilise un chargement lazy des routes.

Ce choix vise à garder une application légère, avec une base moderne, simple à faire évoluer, et adaptée à un projet personnel ambitieux mais progressif.

---

## 8. Shell et navigation globale

Ycaro repose sur un shell commun qui doit garantir une expérience stable et cohérente entre les modules.

### Navigation principale actuelle

- Accueil
- Calendrier
- Finances
- Lecture
- Journal

### Responsabilités du shell

Le shell gère les éléments globaux suivants :

- masthead global
- navigation principale
- drawer contextuel
- options globales
- thèmes
- motion et transitions
- structure générale des pages

Le hub `AppOptionsMenu.tsx` centralise les actions secondaires.

### Injection de contenu dans le shell par les features

Chaque feature peut injecter ses propres options ou outils dans le drawer contextuel du masthead via le hook `useAppPageChrome`. Ce mécanisme est géré par `src/components/AppChromeProvider.tsx`. Il permet à chaque feature d’étendre le shell sans modifier `AppLayout`. C’est le moyen attendu pour ajouter des actions contextuelles à une page.

### Rôle architectural du shell

Le shell n’est pas seulement un conteneur visuel. Il doit :

- assurer une continuité d’usage
- éviter les ruptures de comportement entre les pages
- supporter proprement les états de chargement ou d’erreur
- permettre l’ajout de nouvelles features sans casser la structure d’ensemble

---

## 9. Pages et modules principaux

## 9.1. Accueil

L’accueil est en refonte majeure.

Il doit devenir le point d’entrée principal du quotidien.

### Rôle

Donner immédiatement une vision utile de la journée.

### Orientation produit

L’accueil n’a pas vocation à tout afficher. Il doit d’abord répondre à une logique de valeur immédiate.

### Widgets envisagés

- calendrier du jour
- tâches
- météo
- mood tracker
- citations
- news scientifiques
- leçon du jour

### Positionnement

L’accueil est un dashboard personnel dynamique, orienté usage réel et récurrence quotidienne.

---

## 9.2. Calendrier

### Rôle

Piloter le temps et les événements planifiés.

### Évolution prévue

- intégration avec les tâches
- drag and drop de tâches vers le calendrier
- distinction claire entre tâche non planifiée et événement planifié

### Frontière fonctionnelle

Le calendrier gère ce qui est placé dans le temps. Il ne doit pas devenir un doublon de la liste de tâches.

---

## 9.3. Tasks

### Rôle

Gérer les tâches non planifiées ou pas encore ancrées dans un créneau précis.

### Fonctionnement cible

- création de tâches
- stockage persistant
- modification rapide
- possibilité de glisser une tâche vers le calendrier
- distinction claire entre "à faire" et "planifié"

### Frontière fonctionnelle

Une tâche reste une tâche tant qu’elle n’est pas transformée en élément planifié dans le temps.

---

## 9.4. Habit Tracker

### Rôle

Suivre les habitudes quotidiennes.

### Fonctionnalités envisagées

- grille journalière
- validation simple
- statistiques
- pourcentage de réussite
- visualisations utiles

### Usage

Usage quotidien.

### Potentiel

Fort potentiel de verticalisation.

---

## 9.5. Systems

### Rôle

Structurer des systèmes répétables.

Un système correspond à une logique réutilisable, par exemple :

- une suite d’actions
- une logique décisionnelle
- un enchaînement de tâches
- une routine explicite

### Objectif

Externaliser certaines routines mentales pour rendre l’action plus simple et plus constante.

### Point d’attention

Cette feature est conceptuellement riche. Il faudra donc la faire commencer par un MVP très simple, avec un modèle de données minimal.

---

## 9.6. Finances

### Rôle

Mini-app interne dédiée à certaines dimensions financières et d’activité.

### Périmètre actuellement envisagé

- facturation
- suivi d’activité
- clients

### Potentiel

Fort potentiel de produit autonome.

### Point d’attention

Le périmètre doit rester bien délimité pour éviter qu’elle ne devienne trop vite un outil métier trop lourd dans l’application principale.

---

## 9.7. Lecture

### Rôle

Suivi de contenus et de lectures.

Cette feature doit rester simple tant que ses usages exacts ne sont pas stabilisés.

---

## 9.8. Journal

### Rôle

Espace de suivi personnel, de réflexion et de revue.

Cette feature relève d’un usage personnel. Elle peut rester sobre si cela améliore la régularité d’usage.

---

## 10. Principes de modélisation métier

Le projet doit éviter un modèle métier flou.

Quelques distinctions doivent être maintenues dès le départ :

- une tâche n’est pas un événement
- une habitude n’est pas une tâche récurrente par défaut
- un système n’est pas une simple liste de tâches
- une donnée doit avoir un propriétaire fonctionnel clair
- une relation entre deux features doit être explicite et limitée

### Conséquence pratique

Chaque nouvelle feature doit répondre à trois questions avant d’être développée :

1. Quelle est son entité principale ?
2. Où s’arrête son périmètre ?
3. Quelles relations autorisées a-t-elle avec les autres modules ?

Cette discipline est importante pour garder une architecture saine.

### Relation Finance ↔ Calendrier

La feature Finance et la feature Calendrier sont connectées via un mécanisme de synchronisation explicite. Les entrées de revenus et de dépenses peuvent porter des métadonnées calendaires (champ `calendarMeta`). Une synchronisation cross-domain est démarrée au bootstrap de l’application (`src/lib/calendarExternalSyncRuntime.ts`), indépendamment de l’ouverture de la page Calendrier. C’est la seule relation cross-domain actuellement autorisée et documentée entre deux features.

---

## 11. Données et stockage

Ycaro suit une logique local-first.

Les données sont stockées localement pour garantir :

- rapidité
- autonomie d’usage
- simplicité de déploiement initial
- robustesse dans un contexte personnel

### Stores locaux concernés

- finances
- calendrier
- journal
- lecture
- tâches
- habitudes

### Contrat minimal attendu pour chaque store

- `isLoaded`
- `loadError`

### Objectif

Ne jamais casser l’UI à cause d’un problème de chargement ou de lecture de données.

### Règles attendues

Chaque store doit, à terme, documenter clairement :

- sa responsabilité
- son format de données principal
- son cycle de chargement
- sa stratégie de persistance
- sa stratégie de réparation ou de tolérance en cas de données invalides

### Système de sauvegarde

Un système de sauvegarde et de restauration est implémenté dans `src/lib/appBackup.ts`. Il permet des sauvegardes manuelles et automatiques de toutes les données locales dans un dossier choisi par l'utilisateur, via l'API File System Access du navigateur. La planification automatique est gérée dans `src/lib/backupScheduler.ts`. Ce système est la stratégie actuelle de résilience des données et couvre toutes les features (finances, journal, lecture, calendrier).

---

## 12. Robustesse et comportement de l’interface

Le principe "ne jamais casser l’UI" doit être appliqué concrètement.

Chaque page ou feature doit pouvoir gérer proprement les états suivants :

- chargement
- erreur
- état vide
- état nominal

### Exigences

- l’échec d’un module ne doit pas bloquer toute l’application
- une donnée absente ne doit pas produire une UI cassée
- une erreur locale doit rester locale autant que possible
- un état vide doit être compréhensible et acceptable
- une feature partiellement implémentée doit rester intégrable sans dégrader le shell

---

## 13. Architecture cible

L’architecture suit un découpage par feature.

### Pattern visé par feature

- routes
- page
- components
- styles
- store

### Objectif

Éviter un monolithe et garder une structure lisible.

### Règle importante

Le découpage par feature ne doit pas empêcher une séparation claire entre :

- logique métier
- logique de données
- logique d’interface

Autrement dit, un dossier de feature ne doit pas devenir un endroit où tout est mélangé sans règle.

### Référence d’implémentation

Les règles précises d’organisation d’une feature sont documentées dans `src/features/ARCHITECTURE.md`. Ce fichier est la référence d’implémentation pour toute nouvelle page métier. Il décrit la structure cible, les interdictions à respecter (notamment : ne pas ajouter de logique métier dans `AppLayout`, ne pas ajouter de styles métier dans `index.css`), et les invariants à maintenir. Toute nouvelle feature doit partir de ce document, pas des anciens patterns.

### Hooks de données — règle de localisation

Les hooks de données des features existantes (`useFinanceData`, `useReadingData`, `useJournalData`) se trouvent dans `src/hooks/` pour des raisons historiques. Ce dossier est en attente de migration.

Règle pour toute nouvelle feature : les hooks et l’état local doivent être placés dans `src/features/[feature]/store/`, conformément aux règles de `src/features/ARCHITECTURE.md`.

---

## 14. Principes de conception pour l’évolution

Chaque feature doit :

- commencer en MVP simple
- rester lisible
- éviter la complexité prématurée
- séparer autant que possible métier, UI et data
- pouvoir évoluer indépendamment
- rester compatible avec une logique mobile future
- s’intégrer proprement au shell global

### Règle d’évolution

Une feature doit être construite pour son besoin actuel, tout en gardant des frontières assez propres pour être améliorée ou isolée plus tard.

Il ne faut ni coder uniquement pour aujourd’hui, ni coder trop tôt pour cinq futurs possibles.

---

## 15. Performance

Les choix actuels incluent :

- lazy loading
- découpage en chunks
- optimisation progressive

### Priorité réelle

La performance perçue compte plus que la sophistication technique.

En pratique, cela signifie notamment :

- charger vite les routes principales
- rendre les vues fréquentes immédiatement utiles
- éviter des composants trop lourds pour des usages quotidiens
- optimiser progressivement à partir des points réellement sensibles

---

## 16. Philosophie de code et montée en compétence

Le projet est développé dans un contexte où le développeur principal est débutant en code.

Cette réalité doit être prise au sérieux dans les choix d’implémentation.

Le code doit viser un double objectif :

- être suffisamment propre, stable et évolutif pour soutenir l’application dans le temps
- être suffisamment explicite pour permettre une montée en compétence progressive

À qualité fonctionnelle équivalente, il faut privilégier la solution la plus compréhensible plutôt que la plus sophistiquée.

### Conséquences concrètes

- noms explicites
- structures simples
- abstractions introduites seulement lorsqu’elles apportent un vrai gain
- logique lisible
- commentaires utiles sur l’intention et le contexte
- découpage compréhensible des composants et fichiers

### Ce que la pédagogie du code ne veut pas dire

- commenter chaque ligne sans valeur ajoutée
- garder volontairement du mauvais code sous prétexte de simplicité
- refuser toute abstraction utile
- renoncer à la qualité technique

L’objectif est un code propre, efficace, lisible et pédagogique.

---

## 17. Conventions de développement

Les conventions de développement du projet sont les suivantes :

- code simple
- code modulaire
- code explicable
- progression étape par étape
- pas d’over-engineering
- séparation claire entre logique, UI et data
- noms explicites
- commentaires utiles
- composants centrés sur une responsabilité claire
- duplication temporaire acceptée si elle évite une abstraction prématurée
- refactorisation quand un motif est réellement stabilisé

Ces conventions doivent guider les contributions futures au projet.

---

## 18. Décisions prises, différées et hors périmètre immédiat

## 18.1. Décisions déjà prises

- application web personnelle
- logique local-first
- stack React + Vite + TypeScript
- shell commun
- chargement lazy des routes
- découpage par feature
- orientation vers un usage quotidien
- priorité donnée à la lisibilité et à la pédagogie du code

## 18.2. Décisions différées

- stratégie détaillée de synchronisation
- stratégie iOS
- structure détaillée des stores
- design system complet
- modèle de données détaillé des nouvelles features
- conventions de routing plus fines

## 18.3. Hors périmètre immédiat

- synchronisation multi-device complète
- mobile-first complet
- industrialisation produit de briques verticales
- architecture pensée d’abord pour des équipes multiples
- complexité technique anticipant des besoins non prouvés

---

## 19. Priorités actuelles

### Priorités immédiates

- refonte de l’accueil
- construction de Tasks
- construction du Habit Tracker
- structuration de Systems
- amélioration du Calendrier
- ~~suppression de Extraction~~ — effectuée

### Priorités de stabilisation

- clarifier les frontières entre tâches et calendrier
- clarifier les contrats des stores
- améliorer l’homogénéité d’usage entre pages
- consolider les états de chargement, erreur et vide

---

## 20. Limitations actuelles

À ce stade, le projet présente plusieurs limites assumées :

- pas de logique mobile-first complète
- pas de synchronisation multi-device
- forte dépendance au local
- certaines features encore conceptuellement denses
- certaines frontières fonctionnelles encore à stabiliser

Ces limitations sont acceptables à ce stade tant qu’elles restent explicites.

---

## 21. Points à documenter ensuite

Les sujets suivants devront être documentés plus précisément dans des documents complémentaires :

- routing détaillé
- structure des stores
- stratégie de persistance
- conventions de modélisation de données
- design system
- conventions de chargement et de gestion d’erreur
- stratégie iOS future
- stratégie éventuelle de synchronisation
- conventions de nommage et d’organisation des fichiers

---

## 22. Résumé de l’intention

Ycaro doit rester un système personnel léger, robuste et compréhensible.

Le projet doit être :

- suffisamment utile pour être utilisé tous les jours
- suffisamment propre pour évoluer sans se dégrader
- suffisamment simple pour rester maîtrisable
- suffisamment bien structuré pour permettre, à terme, l’extraction de certaines briques
- suffisamment pédagogique pour faire progresser son développeur au fil du projet

La bonne direction n’est ni le prototype jetable, ni l’architecture trop ambitieuse.

La bonne direction est un produit personnel sérieux, construit progressivement, avec de bonnes frontières, une vraie cohérence, et un code qui reste lisible dans le temps.
