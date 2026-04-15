# Barre secondaire du masthead

## 1. Objet

Ce document définit l’architecture de la barre secondaire du masthead de l’application.

Il sert de référence pour :
- comprendre où cette barre est créée dans le shell
- comprendre comment les pages y injectent leurs actions contextuelles
- normaliser l’usage des zones disponibles
- fournir un pattern stable pour toute nouvelle page métier

Cette barre ne doit pas être recréée localement dans les pages. Elle est fournie par le shell global et enrichie par les features via un mécanisme d’injection contrôlé.

---

## 2. Terminologie

### Masthead principal
Barre supérieure permanente de l’application.

Elle contient :
- la marque
- la navigation principale
- le bouton `Options`

### Barre secondaire du masthead
Deuxième barre horizontale, affichée sous le masthead principal.

Elle porte les actions contextuelles de la page active.

Dans le code, elle est rendue par `AppChromeDrawer`.

### Shell applicatif
Structure globale stable de l’application.

Le shell est responsable de :
- la navigation principale
- le masthead
- la barre secondaire
- le cadre commun des pages

### Page orchestratrice
Composant principal d’une feature.

La page orchestratrice :
- se branche au shell
- décide de la composition de la barre secondaire pour sa feature
- distribue si besoin des slots aux sous-composants

### Slot
Zone de rendu réservée dans la barre secondaire.

Trois slots sont disponibles :
- `leading`
- `inlineTools`
- `actions`

### Injection par portal
Mécanisme qui permet à une page de déclarer un élément dans son arbre React tout en l’affichant dans la barre secondaire du shell.

Ce mécanisme repose sur `ToolbarPortal`.

### Options contextuelles de page
Actions secondaires affichées dans le menu global `Options`, et non dans la barre secondaire.

Elles sont publiées via `useAppPageOptions`.

---

## 3. Principe d’architecture

La barre secondaire suit le principe suivant :

- le shell global crée la structure visuelle une seule fois
- les pages compatibles s’enregistrent comme propriétaires du contenu contextuel
- les pages injectent leur contenu dans des slots dédiés
- des sous-composants peuvent compléter certains slots si la page leur transmet explicitement une cible

Cette architecture permet :
- une continuité visuelle entre les pages
- l’ajout de nouvelles features sans modifier le shell global
- une séparation claire entre structure applicative et logique métier de page

---

## 4. Fichiers de référence

### Shell et routing
- [src/App.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/App.tsx)
- [src/features/shell/components/AppLayout.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/features/shell/components/AppLayout.tsx)

### Système de barre secondaire
- [src/components/AppChromeProvider.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/AppChromeProvider.tsx)
- [src/components/ui/toolbar-portal.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/ui/toolbar-portal.tsx)

### Menu d’options global
- [src/components/AppOptionsMenu.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/AppOptionsMenu.tsx)

### Documentation existante
- [docs/app-overview.md](/Users/robinkerjosse/Documents/GitHub/mon-projet/docs/app-overview.md)
- [src/features/ARCHITECTURE.md](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/features/ARCHITECTURE.md)

---

## 5. Flux global

Le flux de fonctionnement est le suivant :

1. `App.tsx` monte l’application et route les pages dans `AppLayout`
2. `AppLayout` affiche le masthead principal et la barre secondaire
3. `AppLayout` enveloppe le contenu dans `AppChromeProvider`
4. une page appelle `useAppPageChrome(ownerId)`
5. la page récupère les slots disponibles
6. la page injecte son contenu dans ces slots via `ToolbarPortal`
7. les sous-composants peuvent injecter eux aussi des actions si la page leur transmet une cible
8. la barre secondaire affiche le contenu correspondant à la page active

---

## 6. Responsabilités par couche

### `App.tsx`
Responsabilités :
- monter l’application
- brancher les routes dans le shell

Ne doit pas :
- contenir de logique métier de page
- connaître le contenu de la barre secondaire

### `AppLayout.tsx`
Responsabilités :
- afficher le masthead principal
- afficher la barre secondaire
- brancher `AppChromeProvider`
- garantir la structure globale de l’application

Ne doit pas :
- contenir de logique métier spécifique à une feature
- être modifié pour ajouter une action de page

### `AppChromeProvider.tsx`
Responsabilités :
- gérer l’état d’activation de la barre secondaire
- exposer les cibles DOM des slots
- enregistrer les options contextuelles de page
- servir de couche de coordination entre le shell et les pages

Ne doit pas :
- porter de logique métier feature
- décider du contenu fonctionnel des pages

### `ToolbarPortal`
Responsabilités :
- rendre un contenu React dans un slot du shell

Ne doit pas :
- contenir de logique métier
- arbitrer la structure de la barre secondaire

### Page orchestratrice
Responsabilités :
- se connecter au système de barre secondaire
- choisir quels éléments vont dans quels slots
- transmettre certains slots à des sous-composants si nécessaire
- garder la cohérence d’ensemble de la feature

Ne doit pas :
- recréer une barre secondaire locale
- déléguer la structure globale de la barre à des composants enfants

### Composants métier enfants
Responsabilités :
- injecter des actions très contextuelles si la page leur transmet explicitement un slot

Ne doivent pas :
- se connecter directement au shell sans passer par la page
- devenir responsables de la composition globale de la barre secondaire

---

## 7. Structure officielle des slots

La barre secondaire expose trois zones.

### `leading`
Zone principale à gauche.

Usages attendus :
- navigation secondaire
- action principale structurante
- changement de mode de page
- combinaison navigation + action principale

### `inlineTools`
Zone d’outils contextuels proches du contenu actif.

Usages attendus :
- bouton `Ajouter`
- action locale à la sous-vue active
- outil fréquent mais non structurant

### `actions`
Zone d’actions à droite.

Usages attendus :
- filtres globaux
- sélecteurs de contexte
- contrôles transverses à l’ensemble de la page

---

## 8. Règles d’usage des slots

### Règle 1 : `leading` porte la structure d’usage
La zone `leading` doit recevoir ce qui structure la lecture ou l’interaction principale de la page.

Exemples :
- navigation secondaire
- bouton principal de page
- switch de mode

### Règle 2 : `inlineTools` porte l’action contextuelle locale
La zone `inlineTools` doit recevoir des actions liées à la sous-vue active, sans prendre le rôle de navigation ou de filtre global.

### Règle 3 : `actions` porte le contexte global
La zone `actions` doit accueillir les filtres ou sélecteurs qui impactent toute la page.

### Règle 4 : une même feature doit rester cohérente
Une page doit conserver une grammaire stable dans le temps. Les mêmes types d’actions doivent rester dans les mêmes zones.

### Règle 5 : la barre secondaire ne doit pas devenir un fourre-tout
Avant d’ajouter un élément, vérifier :
- s’il est réellement contextuel à la page
- s’il doit être visible en permanence
- s’il est plus pertinent dans `Options`
- s’il appartient à la page entière ou à une sous-vue

---

## 9. Distinction entre barre secondaire et menu `Options`

Deux mécanismes distincts coexistent dans le shell.

### Barre secondaire
Usage :
- actions visibles directement dans le haut de page
- navigation secondaire
- filtres
- action principale
- outil contextuel fréquent

### Menu `Options`
Usage :
- actions secondaires
- réglages ou commandes moins fréquents
- compléments contextuels ne nécessitant pas une visibilité permanente

Convention :
- ce qui structure l’usage quotidien d’une page doit aller dans la barre secondaire
- ce qui reste utile mais secondaire peut aller dans `Options`

---

## 10. Implémentation technique de référence

### Activation de la barre secondaire
Le hook `useAppPageChrome(ownerId)` :
- active la barre secondaire pour la page courante
- associe cette activation à un identifiant de propriétaire
- retourne les cibles utilisables par la page

Slots retournés :
- `leadingTarget`
- `inlineToolsTarget`
- `actionsTarget`

### Injection du contenu
Le composant `ToolbarPortal` :
- reçoit une cible
- rend le contenu dans cette cible via un portal

### Publication d’options contextuelles
Le hook `useAppPageOptions(ownerId, section)` :
- publie une section d’options contextuelles de page
- cette section est ensuite lue par `AppOptionsMenu`

---

## 11. Cas de référence existants

## 11.1 Finances

### Fichiers
- [src/features/finance/routes/FinanceRoute.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/features/finance/routes/FinanceRoute.tsx)
- [src/features/finance/page/FinancePage.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/features/finance/page/FinancePage.tsx)
- [src/components/RevenueTab.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/RevenueTab.tsx)
- [src/components/ExpenseTab.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/ExpenseTab.tsx)
- [src/components/ClientTab.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/ClientTab.tsx)

### Répartition des slots
- `leading` : navigation secondaire `Dashboard`, `Revenus`, `Dépenses`, `Clients`
- `actions` : filtre `MonthYearFilter`
- `inlineTools` : bouton `Ajouter` injecté par l’onglet actif

### Lecture architecturale
Finances constitue le cas de référence le plus complet :
- navigation secondaire stable
- filtre global explicite
- action contextuelle déléguée au sous-module actif

C’est le meilleur exemple pour une feature riche avec plusieurs sous-vues.

---

## 11.2 Journal

### Fichiers
- [src/features/journal/page/JournalPage.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/features/journal/page/JournalPage.tsx)
- [src/components/AppOptionsMenu.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/AppOptionsMenu.tsx)

### Répartition des slots
- `leading` : bouton `Ajouter` + changement de mode
- `inlineTools` : non utilisé
- `actions` : non utilisé

### Options contextuelles
Le journal publie également une action de page dans le menu `Options`.

### Lecture architecturale
Journal illustre un cas mixte :
- la barre secondaire porte les actions principales
- `Options` porte une action secondaire complémentaire

---

## 11.3 Lecture

### Fichiers
- [src/features/reading/page/LecturePage.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/features/reading/page/LecturePage.tsx)
- [src/components/ReadingTab.tsx](/Users/robinkerjosse/Documents/GitHub/mon-projet/src/components/ReadingTab.tsx)

### Répartition des slots
- `leading` : non utilisé
- `inlineTools` : bouton `Ajouter`
- `actions` : non utilisé

### Lecture architecturale
Lecture illustre un cas léger :
- pas de navigation secondaire
- pas de filtre global
- une action contextuelle principale seulement

---

## 12. Pattern standard pour une nouvelle feature

Toute nouvelle page qui utilise la barre secondaire doit suivre l’ordre de conception suivant.

### Étape 1 : définir la grammaire de page
Avant implémentation, expliciter :
- l’action principale visible
- l’existence ou non d’une navigation secondaire
- l’existence ou non de filtres globaux
- l’existence ou non d’outils locaux à une sous-vue

### Étape 2 : répartir les éléments dans les slots
Documenter explicitement :
- ce qui va dans `leading`
- ce qui va dans `inlineTools`
- ce qui va dans `actions`

### Étape 3 : brancher la page orchestratrice
La page orchestratrice appelle `useAppPageChrome(ownerId)` et devient responsable de la composition de la barre secondaire.

### Étape 4 : transmettre les slots utiles aux sous-composants
Les composants enfants ne doivent recevoir un slot que si leur action est réellement locale à leur périmètre.

### Étape 5 : réserver `Options` aux actions secondaires
Les options contextuelles de page ne doivent pas remplacer la barre secondaire.

---

## 13. Anti-patterns à éviter

### Ajouter une logique métier de feature dans `AppLayout`
Le shell ne doit jamais connaître les détails fonctionnels d’une page.

### Recréer une barre secondaire locale dans une page
Toute barre secondaire spécifique à une feature doit passer par le système officiel du shell.

### Laisser des composants profonds piloter la structure globale
Les composants enfants peuvent injecter des actions, mais la page orchestratrice doit rester responsable de la composition générale.

### Utiliser `Options` comme substitut de barre secondaire
Les actions principales d’une page ne doivent pas être cachées dans le menu `Options`.

### Mélanger navigation, filtres et actions sans convention stable
Chaque zone doit garder un rôle clair et constant.

---

## 14. Checklist d’ajout d’une nouvelle page

Avant validation d’une nouvelle page compatible, vérifier :

- la page appelle `useAppPageChrome` avec un `ownerId` stable
- la page n’ajoute aucune logique métier dans `AppLayout`
- chaque action a un slot explicitement justifié
- les composants enfants ne reçoivent un slot que si nécessaire
- les actions principales et secondaires sont bien distinguées
- la grammaire visuelle de la page reste stable
- la répartition des slots est documentée dans la feature

---

## 15. Format de documentation attendu pour chaque feature

Toute feature utilisant la barre secondaire doit documenter les points suivants.

### Identité shell
- route d’entrée
- page orchestratrice
- `ownerId` utilisé

### Répartition des slots
- contenu de `leading`
- contenu de `inlineTools`
- contenu de `actions`

### Composants injecteurs
- liste des composants qui injectent un contenu dans la barre secondaire

### Options contextuelles
- liste des actions publiées dans `Options`, s’il y en a

### Justification
- raison du placement de chaque élément dans chaque zone

---

## 16. Décision d’architecture

La barre secondaire du masthead est un service du shell applicatif.

La séparation des responsabilités doit rester la suivante :
- le shell possède la structure
- la page orchestratrice possède la composition
- les composants métier possèdent uniquement leurs actions locales
- la documentation possède la grammaire d’usage

Cette séparation constitue la base attendue pour toute extension future du système de pages.

---

## 17. Référence de compatibilité

Les anciens fichiers de `src/pages/app/` qui réexportent certaines pages ne sont pas la source de vérité architecturale.

Les références à utiliser pour toute nouvelle implémentation doivent être :
- `src/features/.../routes`
- `src/features/.../page`
- `src/components/AppChromeProvider.tsx`
- `src/components/ui/toolbar-portal.tsx`

La documentation et les nouvelles pages doivent s’aligner sur cette structure.

---

## 18. Résumé opérationnel

Pour ajouter une page compatible avec la barre secondaire :
- connecter la page au shell via `useAppPageChrome`
- utiliser les slots officiels
- faire porter la composition globale à la page orchestratrice
- transmettre les slots aux sous-composants uniquement si nécessaire
- réserver `Options` aux actions secondaires
- documenter explicitement la répartition choisie

Cette règle doit être considérée comme la convention officielle du repository.
