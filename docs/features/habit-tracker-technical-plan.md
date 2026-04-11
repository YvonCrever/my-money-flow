# Habit Tracker - Technical Plan

## 1. Objectif technique

L'objectif technique est de préparer une implémentation incrémentale du Habit Tracker dans l'architecture actuelle de l'application.

La feature doit permettre :

- d'afficher les habitudes actives
- d'afficher une grille sur le mois en cours
- de cocher ou décocher une habitude pour aujourd'hui et les jours passés
- de calculer le pourcentage de réussite du jour
- de calculer le pourcentage mensuel par habitude

L'implémentation doit rester simple.
Elle doit séparer clairement l'affichage, la logique métier et l'accès aux données.

## 2. Entités de données

Le MVP repose sur trois entités simples.

### Habit

Cette entité représente une habitude suivie dans le temps.
Elle porte son identité et son cycle de vie.

### HabitEntry

Cette entité représente l'état d'une habitude pour une date donnée.
Elle permet de savoir si l'habitude est complétée ou non pour ce jour.

### HabitTrackerState

Cette entité regroupe les données de la feature.
Elle contient la collection des habitudes et la collection des validations journalières.
Elle sert de source de vérité pour le tracker.

## 3. Structure minimale des données

La structure minimale retenue pour le MVP est la suivante.

### Habit

- `id`
- `name`
- `createdDate`
- `status`
- `archivedAt`
- `createdAt`
- `updatedAt`

### HabitEntry

- `id`
- `habitId`
- `date`
- `completed`
- `updatedAt`

### HabitTrackerState

- `habits`
- `entries`
- `lastUpdatedAt`

Les statistiques ne sont pas stockées.
Elles sont toujours calculées à partir des habitudes et des validations.

## 4. Contraintes d’intégrité

Les contraintes suivantes doivent être appliquées dès le départ.

- une habitude a toujours un nom non vide
- une habitude a toujours une date de création
- une habitude a toujours un statut valide
- une validation pointe toujours vers une habitude existante
- une seule validation est autorisée par couple habitude + date
- une validation n'existe jamais pour un jour futur
- une validation n'existe jamais avant la date de création d'une habitude
- une validation n'existe jamais à partir de la date d'archivage d'une habitude
- une habitude archivée conserve son historique
- les pourcentages ne sont jamais persistés

Les dates utilisées pour la grille et les calculs doivent suivre un format de jour stable et unique.

## 5. Opérations techniques nécessaires

La feature doit couvrir un ensemble limité d'opérations.

### Lectures

- charger les habitudes du tracker
- charger les validations du mois en cours
- récupérer les habitudes actives
- récupérer les validations d'un jour donné
- récupérer les validations d'une habitude sur le mois en cours

### Écritures

- créer une habitude
- renommer une habitude si cette action est gardée dans le MVP technique
- archiver une habitude
- créer ou mettre à jour une validation journalière
- décocher une validation existante

### Calculs métier

- déterminer si une habitude est éligible pour une date
- déterminer si une case est modifiable
- calculer le pourcentage de réussite du jour
- calculer le pourcentage mensuel d'une habitude
- déterminer les états vides et les états neutres

## 6. Répartition des responsabilités

La feature doit être découpée en quatre niveaux clairs.

### Page

La page orchestre la feature.
Elle charge les données, gère les états globaux et assemble les composants.
Elle ne contient pas les règles métier détaillées.

### Composants UI

Les composants affichent la liste, la grille, les pourcentages et les états vides.
Ils déclenchent des actions simples.
Ils ne décident pas des règles de calcul.

### Logique métier

La logique métier décide :

- si une habitude est éligible pour une date
- si une case est modifiable
- comment calculer les pourcentages
- comment traiter les cas limites

Cette logique doit rester indépendante de l'affichage.

### Accès aux données

La couche d'accès aux données lit et écrit les habitudes et les validations.
Elle expose une interface simple au reste de la feature.
Elle ne contient pas de logique d'affichage.

## 7. Composants et modules pressentis

Le découpage retenu doit rester simple et cohérent avec l'architecture existante.

### Structure de feature

- `src/features/habits/routes/`
- `src/features/habits/page/`
- `src/features/habits/components/`
- `src/features/habits/styles/`

### Modules techniques

- un module de types métier
- un module de persistance pour le tracker
- un module de logique métier
- un hook de feature pour exposer les données à la page

### Composants principaux

- `HabitTrackerRoute`
- `HabitTrackerPage`
- `HabitTrackerHeader`
- `HabitCreateForm` ou `HabitCreateDialog`
- `HabitGrid`
- `HabitRow`
- `HabitDayCell`
- `HabitDailySummary`
- `HabitEmptyState`

Ce découpage suffit pour le MVP.
Il évite de disperser la logique dans trop de fichiers.

## 8. Ordre d’implémentation

L'ordre d'implémentation retenu est le suivant.

### 1. Définir les types métier

Créer les structures de données du tracker.
Figer les noms de champs et les types utiles au MVP.

### 2. Mettre en place la persistance

Créer le conteneur de données de la feature.
Prévoir la lecture, l'écriture et la mise à jour des habitudes et des validations.

### 3. Écrire la logique métier

Implémenter les calculs et les règles :

- éligibilité
- modification autorisée
- pourcentage du jour
- pourcentage mensuel par habitude

### 4. Créer le hook de feature

Exposer un état simple à la page :

- données prêtes à afficher
- actions utilisateur
- états de chargement et d'erreur

### 5. Construire la page en lecture

Afficher les habitudes, la grille et les états vides.
Vérifier la lisibilité avant d'ajouter les interactions.

### 6. Ajouter la création d'habitude

Permettre l'ajout d'une habitude active avec sa date de création.

### 7. Ajouter le cochage et le décochage

Brancher les cases sur les validations journalières.
Respecter les règles temporelles du MVP.

### 8. Ajouter l'archivage

Retirer l'habitude de la vue active sans supprimer son historique.

### 9. Brancher la navigation

Ajouter la route et l'entrée de navigation dans l'application.

### 10. Ajouter les tests ciblés

Valider les calculs métier et les cas limites principaux.

## 9. Points d’attention

Plusieurs points demandent de la discipline dès le début.

- ne pas mélanger logique métier et logique d'affichage
- ne pas stocker les pourcentages
- ne pas compter une habitude avant sa création
- ne pas compter une habitude après son archivage
- ne pas autoriser les jours futurs
- ne pas créer plusieurs validations pour la même habitude et le même jour
- ne pas traiter une journée sans habitude éligible comme un échec
- ne pas surdécouper la feature pour un MVP
- ne pas introduire de logique avancée non demandée

La gestion des dates est un point sensible.
Le tracker doit utiliser une représentation de jour simple et stable pour éviter les incohérences dans la grille et les calculs.

## 10. Éléments volontairement laissés hors MVP

Les éléments suivants restent hors périmètre :

- suppression définitive d'une habitude
- fréquences autres que quotidienne
- catégories d'habitudes
- couleurs avec rôle fonctionnel
- streaks
- filtres
- statistiques avancées
- comparaisons entre périodes
- visualisations avancées

Le MVP reste centré sur une seule promesse :
suivre proprement des habitudes quotidiennes avec une architecture simple et stable.
