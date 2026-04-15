# Habit Tracker

## 1. Objectif de la feature

Créer une page de suivi d’habitudes permettant de visualiser, renseigner et analyser des habitudes quotidiennes et hebdomadaires dans une interface structurée, lisible et orientée pilotage.

La page doit permettre :
- de suivre des habitudes jour par jour sur un mois donné
- de suivre des habitudes semaine par semaine dans une vue distincte
- de gérer les habitudes via une interface dédiée
- d’afficher des statistiques détaillées de progression
- d’afficher des graphiques de progression quotidienne, hebdomadaire et mensuelle
- d’ajouter des informations complémentaires de type mood et sommeil

## 2. Vues principales

La feature comporte deux vues principales :

### A. Daily Habits
Vue mensuelle avec :
- une colonne à gauche pour les noms des habitudes
- une grille de 31 colonnes fixes représentant les jours
- une ligne par habitude quotidienne
- un panneau à droite pour les graphiques et les statistiques de ligne
- un mini tableau mood / sleep en dessous

### B. Weekly Habits
Vue distincte avec :
- une colonne par semaine du mois
- une ligne par habitude hebdomadaire
- des statistiques similaires adaptées à la logique hebdomadaire
- les mêmes grands principes de structure et de lecture

## 3. Barre d’actions

La barre d’actions doit afficher :
- un bouton "Gérer les habitudes"
- un bouton ou toggle permettant de basculer entre Daily Habits et Weekly Habits
- un sélecteur de mois et d’année

Le bouton "Gérer les habitudes" ouvre une popup permettant de :
- voir les habitudes journalières
- voir les habitudes hebdomadaires
- ajouter une habitude
- renommer une habitude
- archiver une habitude journaliere

## 4. Structure du tableau Daily Habits

### 4.1 Structure horizontale générale

La zone centrale du Daily Habits suit toujours l’organisation suivante, de gauche à droite :
- une colonne pour les noms des habitudes
- le tableau principal des jours
- un panneau d’analyse et de visualisation

Cette structure reste stable quel que soit le mois affiché.

### 4.2 Partie gauche : noms des habitudes

À gauche du tableau principal, une colonne dédiée affiche les noms des habitudes quotidiennes.

Cette colonne :
- contient une ligne par habitude
- est alignée visuellement avec les lignes du tableau principal
- sert de repère de lecture principal
- associe chaque ligne du tableau à l’habitude concernée

Le nom de l’habitude et ses données de ligne doivent toujours rester visuellement liés.

### 4.3 Partie centrale : tableau principal des habitudes

Le tableau principal affiche :
- une ligne par habitude quotidienne
- 31 colonnes fixes
- pour chaque colonne :
  - une ligne supérieure regroupée par semaine : Week 1, Week 2, etc.
  - une ligne intermédiaire avec le jour de semaine : Lu, Ma, Me, Je, Ve, Sa, Di
  - une ligne inférieure avec le numéro du jour : 1, 2, 3, etc.

Les semaines sont recalculées à chaque mois :
- la semaine 1 commence au premier jour du mois
- elle se termine au premier dimanche rencontré
- la semaine 2 commence au lundi suivant
- la dernière semaine se termine au dernier jour du mois
- le mois suivant recommence à Week 1

Le tableau garde toujours 31 colonnes.
Les colonnes qui ne correspondent pas à un jour du mois courant restent affichées mais sont grisées et inactives.

### 4.4 États possibles d’une cellule journalière

Chaque cellule quotidienne peut être dans l’un des états suivants :
- vide : aucun clic n’a encore été effectué
- faite : affichage d’une flèche verte
- pas faite : affichage d’une croix rouge
- future : cellule non modifiable

Règles d’interaction :
- premier clic sur une case vide : passe à "faite"
- clic suivant : passe à "pas faite"
- clic suivant : alterne entre "faite" et "pas faite"
- l’état vide ne réapparaît plus après un premier clic
- les jours passés et le jour courant sont modifiables
- les jours futurs ne sont pas modifiables

## 5. Panneau droit d’analyse et de visualisation du Daily Habits

À droite du tableau principal, un panneau d’analyse et de visualisation est affiché.
Il est séparé visuellement du tableau principal mais aligné sur les mêmes lignes d’habitudes.

Ce panneau regroupe :
- les statistiques de ligne
- les barres de progression
- les graphiques liés à la vue Daily Habits

Pour l’implémentation, il faut considérer ce panneau comme la troisième colonne du layout principal, après :
- les noms d’habitudes
- le tableau principal
- puis l’analyse et les graphiques

### 5.1 Bloc d’analyse par habitude

Le bloc d’analyse par habitude comporte :
- un header global "Analyse"
- les colonnes suivantes :
  - Goal
  - Actual
  - Progress T
  - %T
  - Progress C
  - %C

Ce bloc est aligné ligne par ligne avec les habitudes affichées à gauche et avec les lignes du tableau principal.

### 5.2 Goal
Affiche le nombre total de jours du mois courant.

Exemples :
- avril : 30
- mai : 31

### 5.3 Actual
Affiche le nombre de jours marqués comme "faite" pour l’habitude concernée.

### 5.4 %T
Calcule :
(nombre de jours "faite" / nombre de jours du mois) * 100

Arrondi à l’unité, sans virgule.

Cette métrique ne tient pas compte du fait qu’un jour soit passé, futur ou non renseigné.
Elle mesure l’avancement total par rapport au mois entier.

### 5.5 Progress T
Barre de progression horizontale ou visuelle basée sur %T.

### 5.6 %C
Calcule :
(nombre de jours "faite" / nombre de jours écoules et renseignes dans le mois) * 100

Arrondi à l’unité, sans virgule.

Cette métrique mesure la completude sur le temps deja ecoule.

Regle complementaire :
- une cellule "vide" n'entre pas dans le denominateur
- une cellule "pas faite" entre dans le denominateur

### 5.7 Progress C
Barre de progression horizontale ou visuelle basée sur %C.

### 5.8 Bloc de graphiques et statistiques globales

Dans ce même panneau de droite, au-dessus ou au-dessous du bloc d’analyse par habitude selon le layout retenu, afficher les statistiques et graphiques globaux de la vue Daily Habits.

L’exigence structurelle est la suivante :
- les noms des habitudes restent dans la colonne de gauche
- le tableau des jours reste dans la colonne centrale
- les statistiques et graphiques restent dans la colonne de droite

## 6. Statistiques et graphiques globaux pour Daily Habits

Ces éléments appartiennent au panneau droit et non à un bandeau au-dessus du tableau.

### 6.1 Monthly Goal
Nombre d’habitudes quotidiennes actives multiplié par le nombre de jours du mois.

### 6.2 Monthly Completed
Nombre total de cellules marquées comme "faite" sur le mois.

### 6.3 Monthly Stats
Deux pie charts :
- un premier basé sur la logique %T globale du mois
- un second basé sur la logique %C globale du mois

Les noms techniques "%T" et "%C" ne sont pas affichés dans le rendu final.

### 6.4 Daily Progress
Graphique en barres fines, avec :
- axe X : jours du mois
- axe Y : pourcentage de réussite du jour

Calcul :
(nombre d’habitudes marquées "faite" ce jour-là / nombre total d’habitudes quotidiennes) * 100

### 6.5 Weekly Progress
Graphique en barres, avec :
- axe X : Week 1, Week 2, etc.
- axe Y : pourcentage de réussite hebdomadaire

Le calcul hebdomadaire est dérivé des cellules du mois regroupées par semaine interne au mois.

## 7. Bloc inférieur Mood / Sleep

Sous le tableau principal, afficher un tableau fin avec deux lignes complémentaires :
- Mood : note de 1 à 10 par jour
- Sleep : nombre d’heures de sommeil de 1 à 12 par jour

Ces données suivent le même axe horizontal que les jours du mois.
Le bloc Mood / Sleep s’aligne avec la zone centrale du tableau journalier.

## 8. Vue Weekly Habits

La vue Weekly Habits est une vue distincte de la vue Daily Habits.

Elle ne constitue pas une simple agrégation des habitudes quotidiennes.
Elle repose sur :
- un autre jeu d’habitudes
- une autre grille
- d’autres validations

Le tableau Weekly Habits affiche :
- une ligne par habitude hebdomadaire
- une colonne par semaine du mois
- les colonnes Week 1, Week 2, etc.
- des statistiques analogues adaptées à la logique hebdomadaire

Les habitudes hebdomadaires se gèrent aussi via la popup "Gérer les habitudes".

## 9. Règles globales

### 9.1 Principes directeurs de disposition des blocs et des textes

Lors de la création d’une nouvelle page liée au Habit Tracker, deux principes directeurs de disposition doivent s’appliquer.

#### 1. Minimalisation des informations inscrites

Le principe par défaut est de réduire au strict minimum les textes affichés dans l’interface.

Cela implique :
- ne garder que les titres absolument nécessaires des blocs et des sections
- ne pas afficher de textes explicatifs sous les blocs ou les sections dans le rendu normal
- éviter les sous-textes d’accompagnement, aides visuelles verbeuses ou descriptions décoratives
- privilégier une interface de lecture immédiate, centrée sur les données et les actions

#### 2. Économie de l’espace

Le principe par défaut est de faire tenir les informations les plus importantes dans l’espace visible d’un écran standard, sans dépendre d’un scroll vertical pour comprendre l’état principal de la page.

Cela implique :
- les informations prioritaires ne doivent pas dépasser la largeur et la hauteur utiles d’un écran normal
- les tableaux, blocs et graphiques doivent être dimensionnés pour apparaître directement dans la page autant que possible
- les textes doivent rester courts et compacts
- la taille de police peut être réduite si nécessaire
- les tableaux peuvent être resserrés si cela permet de préserver la vue d’ensemble
- un padding léger doit être conservé pour maintenir un minimum de lisibilité

Ordre de priorité pour l’implémentation visuelle :
- d’abord la compacité
- ensuite la lisibilité

- Tous les pourcentages sont arrondis à l’unité, sans virgule.
- Le layout reste stable d’un mois à l’autre.
- L’organisation horizontale du Daily Habits reste toujours : noms des habitudes, tableau principal, panneau d’analyse et graphiques.
- Le tableau journalier garde toujours 31 colonnes.
- Les jours inexistants dans le mois affiché sont grisés.
- Les jours futurs sont visibles mais non modifiables.
- Les jours passés et le jour courant sont modifiables.
- Les statistiques et graphiques doivent être dérivés des données existantes.
- Les visualisations ne doivent jamais porter la logique métier principale.

## 10. Hors MVP immédiat

Les éléments suivants ne sont pas prioritaires dans le premier socle :
- animations avancées
- filtres complexes
- catégories d’habitudes
- drag and drop
- rappels
- objectifs personnalisés par habitude
- export

## 11. Points critiques

### Comment gérer la dualité Daily/Weekly dans le code ?

Le premier cycle de persistance reelle couvre Daily Habits et Mood / Sleep.
La vue Weekly reste active en prototype local temporaire, avec sa logique metier centralisee mais sans stockage persistant dans ce cycle.

### Dépendance Mood/Sleep

**Est-ce que Mood/Sleep dépend de l’existence d’habitudes quotidiennes ?**

Non. Mood/Sleep est complètement indépendant. L’utilisateur peut saisir mood/sleep sans aucune habitude créée.

**Caractéristiques du tableau Mood/Sleep :**

- Tableau secondaire, aligné avec le tableau principal (Daily Habits)
- 2 lignes : Mood (notes 1–10) et Sleep (heures 1–12)
- 31 colonnes, alignées avec les jours du mois
- Les jours inexistants du mois restent grisés et inactifs
- Les jours futurs ne sont pas modifiables
- Les jours passés et le jour courant sont modifiables
- Les données sont persistées

**Structure visuelle rappelée pour l’implémentation :**

De gauche à droite dans la vue Daily Habits :
- noms des habitudes
- tableau principal
- panneau de droite avec Goal, Actual, %T, %C, Progress T, Progress C et les graphiques

**Graphique Mood/Sleep :**

Au-dessous du tableau Mood/Sleep, afficher un graphique en courbes simples :
- Axe X : jours du mois (alignés avec le tableau et le tableau principal)
- Axe Y : numérotation 1–10
- Deux courbes en lignes simples :
  - Courbe Sleep : bleue
  - Courbe Mood : verte
- Le graphique affiche les deux métriques sur le même axe Y (0–12 pour accommoder Sleep 1–12, avec Mood sur 1–10)

### Mois futur vs. mois passé

**Si l’utilisateur regarde un mois futur :**

Aucun jour n’est modifiable (tous les jours sont futurs).

**Si l’utilisateur regarde un mois passé :**

Tous les jours du mois sont modifiables (tous les jours sont passés).

### État "vide" qui ne reparaît jamais

Une fois qu’une cellule a été cliquée pour la première fois, elle sort de l’état "vide" et ne peut plus y revenir. Elle alterne entre "faite" et "pas faite".

**Implication métier :**

Une cellule "vide" et une cellule "pas faite" ne se comportent pas de manière similaire, car elles n’ont pas le même poids dans les statistiques.

- **Cellule "vide"** : non comptabilisée dans les calculs %T et %C (l’habitude n’a jamais été touchée pour ce jour)
- **Cellule "pas faite"** : comptabilisée dans le dénominateur de %T et %C (l’habitude a été touchée mais marquée comme non réalisée)

Cette distinction est critique pour le calcul de %C en particulier, où on mesure "complétion sur les jours écoulés et renseignés".
