# Habit Tracker - Product Behavior

## 1. Objet de la feature

Le Habit Tracker est une feature de suivi d'habitudes quotidiennes.

Son objectif est de rendre le suivi simple, rapide et lisible.
L'utilisateur doit pouvoir voir ses habitudes, comprendre l'état d'une journée, et valider ce qui a été fait.

Le MVP repose sur une logique volontairement simple :

- une habitude est quotidienne
- une habitude est soit faite, soit non faite pour un jour donné
- la page affiche une liste d'habitudes, une grille par jour, et un pourcentage de réussite

La feature ne cherche pas à analyser des routines complexes.
Elle sert d'abord à soutenir une régularité quotidienne.

## 2. Définition d'une habitude

Dans ce MVP, une habitude est un comportement que l'utilisateur souhaite suivre tous les jours.

Une habitude possède les propriétés fonctionnelles suivantes :

- un nom
- une date de création
- un statut : active ou archivée

Une habitude active fait partie du suivi courant.
Une habitude archivée n'est plus attendue dans le suivi quotidien, mais son historique reste conservé.

Une habitude commence à compter à partir de sa date de création.
Elle ne compte jamais avant cette date.

Une habitude n'est pas une tâche.
Elle représente une routine répétée, pas une action ponctuelle à terminer.

## 3. Définition d'une validation journalière

Une validation journalière répond à une question simple :
"Cette habitude a-t-elle été faite à cette date ?"

Pour chaque habitude et pour chaque jour :

- une case cochée signifie que l'habitude a été faite
- une case non cochée signifie que l'habitude n'a pas été faite

Le MVP utilise un état binaire.
Il n'existe pas de troisième état intermédiaire.

Une habitude ne peut avoir qu'un seul état par jour.
Une même journée ne peut pas contenir plusieurs validations différentes pour la même habitude.

Décocher une case annule la validation de cette journée.
Le jour redevient un jour non réussi pour cette habitude.

## 4. Règles temporelles

Le MVP suit le mois en cours.
La grille représente les jours du mois en cours.

Les règles temporelles sont les suivantes :

- une habitude devient éligible à partir de sa date de création
- une habitude n'est jamais comptée avant sa date de création
- une habitude archivée ne compte plus à partir de sa date d'archivage
- aujourd'hui est modifiable
- les jours passés sont modifiables
- les jours futurs ne sont pas modifiables
- les jours futurs ne sont pas pris en compte dans les calculs

L'utilisateur peut corriger un oubli sur un jour passé.
Il peut aussi corriger une erreur en décochant un jour passé ou le jour courant.

Le jour d'archivage met fin au suivi de l'habitude.
A partir de cette date, l'habitude ne fait plus partie des habitudes attendues.

## 5. Calcul du pourcentage de réussite

Le MVP retient deux calculs simples.

### Pourcentage de réussite du jour

Le pourcentage du jour se calcule ainsi :

- nombre d'habitudes cochées pour ce jour
- divisé par
- nombre d'habitudes actives et éligibles pour ce jour

Une habitude est éligible pour un jour si :

- elle a déjà été créée
- elle n'est pas encore archivée à cette date

Une habitude non cochée sur un jour éligible compte comme non faite.

Si aucune habitude n'est éligible pour un jour donné, la page n'affiche pas `0 %`.
Elle affiche un état neutre, par exemple `--`.

### Pourcentage mensuel par habitude

Le pourcentage mensuel d'une habitude se calcule ainsi :

- nombre de jours cochés pour cette habitude dans le mois en cours
- divisé par
- nombre de jours éligibles écoulés pour cette habitude dans le mois en cours

Le dénominateur :

- ne compte jamais les jours avant la création
- ne compte jamais les jours après l'archivage
- ne compte jamais les jours futurs

Ce calcul permet de mesurer la régularité réelle d'une habitude sur le mois en cours.

## 6. États vides

La page doit toujours afficher un état clair.
Elle ne doit jamais donner l'impression d'un écran cassé ou ambigu.

### Aucune habitude

Quand aucune habitude n'existe, la page affiche :

- le message `Aucune habitude pour le moment`
- une action `Créer ma première habitude`

### Aucune habitude active

Quand il n'existe plus d'habitude active, la page affiche un état vide clair.
Les habitudes archivées ne sont pas traitées comme des habitudes encore attendues.

### Aucune validation sur une journée

Quand des habitudes étaient attendues pour une journée et qu'aucune n'est cochée :

- la journée n'est pas vide
- le pourcentage du jour est `0 %`

### Aucune habitude éligible pour une journée

Quand aucune habitude n'était attendue pour une journée :

- la journée n'est pas considérée comme échouée
- le pourcentage affiché est un état neutre, par exemple `--`

## 7. Actions autorisées dans le MVP

Dans cette première version, l'utilisateur peut :

- créer une habitude
- voir la liste des habitudes actives
- voir la grille du mois en cours
- cocher une habitude pour aujourd'hui
- décocher une habitude pour aujourd'hui
- cocher une habitude pour un jour passé
- décocher une habitude pour un jour passé
- archiver une habitude
- consulter le pourcentage de réussite du jour
- consulter le pourcentage mensuel d'une habitude sur le mois en cours

Dans cette première version, l'utilisateur ne peut pas :

- cocher un jour futur
- définir une fréquence autre que quotidienne
- supprimer définitivement une habitude
- utiliser des catégories
- utiliser des couleurs comme élément fonctionnel
- suivre des streaks
- utiliser des filtres avancés
- consulter des statistiques complexes

## 8. Cas limites retenus

Les cas limites suivants font partie du comportement attendu du MVP.

### Habitude créée en milieu de mois

Une habitude créée en cours de mois ne compte pas pour les jours précédents.
Ses calculs commencent à sa date de création.

### Habitude archivée en cours de mois

Une habitude archivée en cours de mois ne compte plus à partir de sa date d'archivage.
Son historique passé reste visible.

### Journée sans donnée cochée

Si des habitudes étaient attendues et qu'aucune n'est cochée, la journée vaut `0 %`.

### Journée sans habitude attendue

Si aucune habitude n'était attendue ce jour-là, la journée affiche un état neutre.
Elle n'est pas considérée comme ratée.

### Correction d'une erreur

Un jour passé peut être corrigé.
Le recalcul des pourcentages doit suivre immédiatement cette correction.

### Habitudes archivées uniquement

Si toutes les habitudes sont archivées, la page ne doit pas afficher une réussite à `0 %`.
Elle doit afficher un état vide lié à l'absence d'habitude active.

## 9. Décisions produit volontairement remises à plus tard

Les sujets suivants ne font pas partie du MVP :

- suppression définitive d'une habitude
- fréquences autres que quotidienne
- catégories d'habitudes
- couleurs avec impact fonctionnel
- streaks
- statistiques hebdomadaires avancées
- statistiques mensuelles avancées
- visualisations avancées
- filtres
- comparaisons entre périodes

Le MVP garde une seule promesse :
suivre simplement des habitudes quotidiennes, jour après jour, avec des règles stables et lisibles.
