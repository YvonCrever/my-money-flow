# Analyse feature - Habit Tracker

## Sources et posture

Cette analyse s'appuie sur :

- la fiche source : `docs/features/habit-tracker.md`
- la vision produit globale : `docs/app-overview.md`
- les contraintes d'architecture : `src/features/ARCHITECTURE.md`
- les patterns techniques existants du projet : routes lazy, stores local-first, IndexedDB, backup applicatif

Légende utilisée dans tout le document :

- `Explicite` : ce qui est demandé directement dans la fiche
- `Déduction` : ce qui peut être raisonnablement inféré du contexte Ycaro
- `Recommandation` : l'arbitrage conseillé pour une implémentation simple, robuste et cohérente

## 1. Reformulation précise du besoin

### Reformulation

- `Explicite` : l'utilisateur veut une page dédiée "Habit Tracker" dans son application personnelle d'organisation.
- `Explicite` : cette page doit permettre de suivre des habitudes quotidiennes dans une vue claire, visuelle et fluide.
- `Explicite` : la vue attendue comprend une liste d'habitudes, une grille avec une case par jour, la possibilité de cocher ou décocher chaque habitude pour un jour donné, un pourcentage de réussite quotidien, et à terme quelques visualisations simples.
- `Déduction` : le besoin central n'est pas d'analyser des routines complexes, mais de rendre la validation quotidienne très rapide et très lisible.
- `Déduction` : la feature doit être utilisée souvent, probablement le matin pour se situer et le soir pour valider la journée, dans la logique d'usage quotidien décrite pour Ycaro.
- `Recommandation` : cadrer la version initiale comme un tracker d'habitudes binaires quotidiennes, centré sur une vue mensuelle simple, avec une interaction en un clic et une persistance locale fiable.

### Ce que l'utilisateur veut réellement faire

- voir immédiatement quelles habitudes existent
- comprendre l'état d'avancement d'une journée en un coup d'oeil
- cocher rapidement une habitude faite
- corriger une erreur en décochant
- conserver un historique visuel simple
- sentir sa progression sans entrer dans une complexité analytique trop tôt

### Attentes principales

- simplicité d'usage
- lisibilité visuelle immédiate
- fiabilité de la sauvegarde
- cohérence avec le shell Ycaro
- bon comportement sur desktop et mobile

### Contraintes explicites et implicites

- `Explicite` : gérer les cas limites suivants : aucune habitude, création en milieu de mois, suppression d'une habitude, journée sans données, responsive.
- `Déduction` : la feature doit respecter la logique local-first de Ycaro.
- `Déduction` : une habitude ne doit pas être modélisée comme une tâche récurrente, conformément aux principes métier du projet.
- `Déduction` : la feature doit avoir sa propre frontière fonctionnelle et son propre store.
- `Recommandation` : éviter toute relation métier avec Tasks ou Calendar dans le MVP.

## 2. Objectifs produit

Repères de lecture pour cette section :

- `Explicite` : suivre facilement des habitudes quotidiennes dans une vue claire et visuelle
- `Déduction` : privilégier la rapidité d'usage, la régularité et la compréhension immédiate
- `Recommandation` : traduire cela en critères de réussite observables

### Objectif principal

- permettre un suivi quotidien d'habitudes avec le moins de friction possible

### Objectifs secondaires

- rendre la progression visible sans effort
- encourager la régularité par une vue concrète de l'historique
- créer une feature autonome, simple à consulter plusieurs fois par jour
- préparer une base saine pour des statistiques futures sans sur-architecturer

### Valeur utilisateur

- réduction de la charge mentale : plus besoin de se souvenir de tout
- satisfaction immédiate : validation rapide et visible
- compréhension simple de la journée : pourcentage de réussite
- historique actionnable : repérage des jours manqués ou irréguliers

### Critères de réussite

- l'utilisateur peut créer sa première habitude en moins d'une minute
- l'utilisateur peut valider sa journée en quelques secondes
- le pourcentage de réussite du jour est compréhensible sans explication
- le comportement des jours passés, présents et futurs est cohérent
- les données restent intactes après rechargement de la page
- la feature reste lisible même avec plusieurs habitudes sur mobile

## 3. Liste structurée des fonctionnalités

Repères de lecture pour cette section :

- `Explicite` : page dédiée, liste d'habitudes, grille journalière, cases cochables, pourcentage de réussite, sauvegarde, visualisations futures
- `Déduction` : la feature a besoin d'états vides, d'états d'erreur et d'une gestion simple du cycle de vie des habitudes pour être réellement exploitable
- `Recommandation` : distinguer nettement le coeur indispensable, le confort utile et les extensions à reporter

### Fonctionnalités coeur de produit

- `Page dédiée Habit Tracker`
  - But : fournir un espace autonome dans Ycaro.
  - Valeur : repère clair dans la navigation.
  - Priorité : `critique`

- `Création d'une habitude`
  - But : permettre de constituer sa liste.
  - Valeur : rend la feature réellement utilisable.
  - Priorité : `critique`

- `Liste des habitudes actives`
  - But : afficher les habitudes comme lignes stables de la grille.
  - Valeur : lecture immédiate du périmètre suivi.
  - Priorité : `critique`

- `Grille journalière par jour`
  - But : visualiser le mois et l'historique récent.
  - Valeur : coeur de l'expérience visuelle demandée.
  - Priorité : `critique`

- `Cocher / décocher une habitude pour un jour`
  - But : enregistrer ou corriger une validation.
  - Valeur : interaction principale de la feature.
  - Priorité : `critique`

- `Pourcentage de réussite par jour`
  - But : synthétiser la complétion de la journée.
  - Valeur : feedback immédiat et motivant.
  - Priorité : `critique`

- `Persistance locale fiable`
  - But : conserver l'historique sans dépendance serveur.
  - Valeur : continuité d'usage dans Ycaro.
  - Priorité : `critique`

- `Etats vide / chargement / erreur`
  - But : garder une UI robuste même si la donnée manque ou se charge mal.
  - Valeur : cohérence avec les autres features et stabilité perçue.
  - Priorité : `critique`

- `Responsive`
  - But : garder la grille utilisable sur petits écrans.
  - Valeur : usage quotidien plus fiable.
  - Priorité : `critique`

### Fonctionnalités de confort

- `Edition d'une habitude`
  - But : renommer ou ajuster une habitude.
  - Valeur : évite de recréer inutilement une ligne.
  - Priorité : `importante`

- `Archivage d'une habitude`
  - But : retirer une habitude active sans perdre l'historique.
  - Valeur : meilleure gestion de l'abandon qu'une suppression brute.
  - Priorité : `importante`

- `Navigation de période`
  - But : consulter un autre mois que le mois courant.
  - Valeur : lecture historique plus utile.
  - Priorité : `importante`

- `Résumé du jour`
  - But : afficher le ratio "habitudes complétées / habitudes attendues".
  - Valeur : compréhension plus concrète que le seul pourcentage.
  - Priorité : `importante`

### Fonctionnalités optionnelles ou futures

- `Statistiques hebdomadaires`
  - But : identifier les tendances courtes.
  - Valeur : aide au pilotage sans regarder chaque cellule.
  - Priorité : `secondaire`

- `Statistiques mensuelles`
  - But : donner une vue plus macro.
  - Valeur : utile pour revue personnelle.
  - Priorité : `secondaire`

- `Pie charts ou visualisations simples`
  - But : rendre la synthèse plus visuelle.
  - Valeur : lecture rapide et plus engageante.
  - Priorité : `secondaire`

- `Streaks`
  - But : afficher les séries consécutives.
  - Valeur : levier de motivation.
  - Priorité : `secondaire`

- `Filtres`
  - But : réduire le bruit quand le nombre d'habitudes augmente.
  - Valeur : meilleure lisibilité.
  - Priorité : `secondaire`

- `Catégories d'habitudes`
  - But : organiser le tracker par thèmes.
  - Valeur : structure supplémentaire pour des usages plus riches.
  - Priorité : `secondaire`

## 4. Parcours utilisateur

Repères de lecture pour cette section :

- `Déduction` : les parcours sont reconstruits à partir du besoin exprimé et du contexte d'usage quotidien de Ycaro
- `Recommandation` : chaque parcours doit rester simple, corrigeable et cohérent avec une feature locale et personnelle

### Premier usage

- l'utilisateur ouvre la page et ne voit encore aucune habitude
- l'interface doit présenter un état vide explicite avec une action claire de création
- l'utilisateur crée une première habitude
- la ligne apparaît immédiatement dans la grille
- le jour courant devient éligible à la validation

### Usage quotidien

- l'utilisateur ouvre la page
- il voit le mois courant et ses habitudes actives
- il coche ou décoche les habitudes du jour
- le pourcentage de réussite du jour se met à jour instantanément
- il peut éventuellement corriger un jour passé récent

### Suivi dans le temps

- l'utilisateur observe la continuité ou les trous dans la grille
- il consulte éventuellement un mois précédent
- il identifie visuellement sa régularité
- les statistiques futures viendront compléter cette lecture, mais ne doivent pas être nécessaires pour comprendre l'état actuel

### Modification, suppression, oubli, abandon

- `Modification`
  - `Recommandation` : autoriser au MVP la modification du nom et éventuellement de la couleur, sans toucher à l'historique.

- `Suppression`
  - `Recommandation` : en pratique, préférer un archivage.
  - `Recommandation` : si une suppression définitive existe plus tard, elle doit être explicitement confirmée car elle détruit l'historique.

- `Oubli`
  - `Recommandation` : autoriser la validation rétroactive des jours passés visibles.
  - `Recommandation` : interdire les validations futures.

- `Abandon`
  - `Recommandation` : passer l'habitude au statut archivé, ce qui la retire de la vue active tout en conservant ses anciennes validations.

## 5. Structure des données

Repères de lecture pour cette section :

- `Explicite` : la fiche ne détaille pas le modèle de données
- `Déduction` : il faut un modèle distinct de celui des tâches et compatible avec le local-first existant
- `Recommandation` : garder un modèle minimal, lisible et extensible

### Recommandation de modélisation

- `Recommandation` : utiliser une entité principale de feature, par exemple `HabitTrackerState`, stockée comme dataset singleton dans IndexedDB, sur le même modèle que les autres domaines Ycaro.
- `Recommandation` : distinguer clairement la définition d'une habitude et ses validations journalières.
- `Recommandation` : ne pas stocker les statistiques calculées. Elles doivent être dérivées à la lecture.

### Entité 1 : Habit

- Rôle : définir ce qu'est une habitude suivie
- Champs principaux :
  - `id`
  - `name`
  - `position`
  - `startDate`
  - `archivedAt`
  - `color`
  - `createdAt`
  - `updatedAt`
  - `scheduleType`
  - `categoryId`
- Relations :
  - une habitude possède plusieurs validations journalières
- Remarques :
  - `scheduleType` peut rester limité à `daily` au MVP mais ouvre la voie à des fréquences futures
  - `categoryId` peut rester `null` tant que les catégories ne sont pas implémentées

### Entité 2 : HabitCompletion

- Rôle : représenter la validation d'une habitude pour un jour donné
- Champs principaux :
  - `id`
  - `habitId`
  - `date`
  - `updatedAt`
- Relations :
  - chaque validation appartient à une habitude
- Remarques :
  - `id` peut être dérivé de `habitId + date` pour garantir l'unicité
  - l'absence de validation signifie "non cochée"
  - un décochage supprime l'enregistrement ou le rend absent du dataset

### Entité 3 : HabitTrackerPreferences

- Rôle : mémoriser l'état de vue de la page
- Champs principaux :
  - `selectedMonth`
  - `showArchived`
- Relations :
  - aucune relation métier forte, seulement de l'UI

### Entité racine : HabitTrackerState

- Rôle : contenir l'ensemble du domaine Habit Tracker
- Champs principaux :
  - `schemaVersion`
  - `habits`
  - `completions`
  - `preferences`
  - `lastUpdatedAt`

### Contraintes métier et validations

- `name` doit être non vide, nettoyé et raisonnablement court
- `startDate` doit être stockée comme date locale au format `YYYY-MM-DD`
- une seule validation est autorisée par couple `habitId + date`
- une validation n'est autorisée que pour une date éligible à l'habitude
- les dates futures doivent être bloquées en écriture
- les statistiques et pourcentages restent dérivés, jamais persistés

### Cas particuliers importants

- une habitude créée en milieu de mois ne doit pas compter avant sa date de début
- une habitude archivée ne doit plus compter après sa date d'archivage
- une journée sans habitude éligible ne doit pas être interprétée comme un échec

## 6. Règles métier

Repères de lecture pour cette section :

- `Explicite` : cocher, décocher, calculer un pourcentage quotidien et gérer les cas limites
- `Déduction` : les jours éligibles et non éligibles doivent être distingués pour éviter des statistiques incohérentes
- `Recommandation` : formaliser dès maintenant des règles strictes sur les dates, l'archivage et le calcul des ratios

- `Recommandation` : dans le MVP, une habitude est binaire et quotidienne.
- `Recommandation` : la granularité officielle est le jour local, pas le timestamp UTC complet.
- `Recommandation` : la formule du pourcentage quotidien doit être :
  - nombre d'habitudes cochées pour la date
  - divisé par
  - nombre d'habitudes actives et éligibles pour cette date

- `Recommandation` : si aucune habitude n'est éligible pour une date donnée, afficher un état `N/A` ou `--` plutôt que `0%`.
- `Recommandation` : les jours futurs sont visibles si la grille mensuelle l'exige, mais non interactifs.
- `Recommandation` : les jours passés et le jour courant peuvent être corrigés.
- `Recommandation` : les cellules antérieures à `startDate` sont désactivées visuellement et exclues des pourcentages.
- `Recommandation` : l'édition d'une habitude ne doit pas casser l'historique.
- `Recommandation` : au MVP, ne pas autoriser la modification libre de la date de début après création, pour éviter des effets de bord sur les statistiques.
- `Recommandation` : l'archivage est la sortie standard d'une habitude abandonnée.
- `Recommandation` : la suppression définitive, si elle existe un jour, doit être exceptionnelle.
- `Déduction` : les streaks futurs devront être calculés uniquement sur les jours où l'habitude était éligible.
- `Déduction` : une "journée sans données" doit être distinguée selon le contexte :
  - si des habitudes étaient attendues et rien n'est coché, le résultat est `0%`
  - si aucune habitude n'était attendue, le résultat est `N/A`

## 7. Proposition de MVP

Repères de lecture pour cette section :

- `Explicite` : la fiche fournit déjà une base de MVP
- `Déduction` : certains éléments indispensables au fonctionnement réel n'y sont pas écrits mais doivent exister
- `Recommandation` : inclure uniquement ce qui sert la boucle coeur de la feature

### Ce qu'il faut absolument inclure

- une route dédiée dans l'application
- un écran de page clair avec état vide
- la création d'habitudes
- l'affichage des habitudes actives
- une grille sur le mois courant
- le cochage et décochage sur les jours passés et présents
- le pourcentage de réussite du jour
- la persistance locale dans IndexedDB
- un contrat de chargement cohérent avec les autres features : `isLoaded`, `loadError`
- un comportement responsive acceptable
- un archivage simple des habitudes

### Ce qu'il vaut mieux reporter

- pie charts
- statistiques hebdomadaires et mensuelles avancées
- streaks
- filtres
- catégories
- fréquences autres que quotidienne
- intégrations cross-feature

### Pourquoi ce découpage est pertinent

- il couvre totalement la boucle de valeur principale : créer, visualiser, valider, relire
- il respecte le besoin explicite sans ajouter de complexité conceptuelle
- il laisse les statistiques futures s'appuyer sur une donnée déjà propre
- il évite d'introduire trop tôt des choix de produit lourds comme les catégories ou les fréquences custom

## 8. Roadmap d'implémentation

Repères de lecture pour cette section :

- `Déduction` : la roadmap doit respecter l'architecture réelle de Ycaro, pas seulement le besoin produit
- `Recommandation` : construire d'abord le socle de données et de persistance, puis l'UI, puis les enrichissements

### Phase 1 : socle métier et persistance

- définir le périmètre officiel : habitudes binaires quotidiennes
- créer les types métier du domaine Habit Tracker
- créer le store IndexedDB dédié
- brancher la validation de schéma et la lecture tolérante
- prévoir l'intégration au mécanisme de backup applicatif
- ajouter les tests unitaires sur :
  - l'éligibilité d'une habitude à une date
  - le calcul du pourcentage quotidien
  - la gestion création en milieu de mois
  - la gestion archivage

Pourquoi maintenant :

- c'est la base de fiabilité de toute la feature
- les décisions de modèle de données conditionnent tout le reste

Dépendances :

- validation du comportement `archive` versus `delete`
- validation du format de date local

### Phase 2 : MVP UI complet

- ajouter la route lazy au shell
- ajouter l'entrée de navigation
- créer la page orchestratrice de feature
- afficher l'état vide, l'état de chargement, l'état d'erreur
- construire le formulaire minimal de création
- construire la grille mensuelle responsive
- permettre le toggle des cellules éligibles
- afficher le pourcentage du jour et le résumé simple
- ajouter les tests de rendu et d'interaction principaux

Pourquoi maintenant :

- une fois le domaine stabilisé, l'UI peut être construite sans dette métier
- c'est la première version directement utile au quotidien

Dépendances :

- disponibilité du store et des helpers de calcul

### Phase 3 : enrichissements utiles et stabilisation

- navigation entre mois
- amélioration du confort visuel
- édition légère des habitudes
- vue des habitudes archivées
- premières statistiques supplémentaires
- éventuelle visualisation simple si la lecture y gagne vraiment
- consolidation des tests de non-régression

Pourquoi à ce moment-là :

- on enrichit après avoir validé l'usage réel du coeur de feature
- les besoins avancés seront plus faciles à arbitrer à partir d'un usage concret

Dépendances :

- stabilité des règles métier de base
- confirmation du besoin réel en charts et filtres

### Projection technique concrète pour Ycaro

- `Recommandation` : structure cible de feature :
  - `src/features/habits/routes/`
  - `src/features/habits/page/`
  - `src/features/habits/components/`
  - `src/features/habits/styles/`
  - `src/features/habits/store/` si nécessaire

- `Recommandation` : points transverses à prévoir :
  - ajout d'une route dans `src/App.tsx`
  - ajout d'un item dans `src/features/navigation/appRoutes.ts`
  - ajout d'un store IndexedDB dans `src/lib/appStorageDb.ts`
  - ajout du schéma dans `src/lib/storageSchemas.ts`
  - ajout des types backup si la feature doit être restaurable comme les autres domaines

## 9. Risques, ambiguïtés et points à trancher

Repères de lecture pour cette section :

- `Explicite` : certaines zones restent ouvertes dans la fiche
- `Déduction` : plusieurs risques proviennent du contexte technique local-first et des frontières métier du projet
- `Recommandation` : trancher tôt les sujets qui peuvent fausser les statistiques ou compliquer la suite

- `Ambiguïté` : le MVP doit-il permettre seulement le mois courant, ou aussi la consultation des mois précédents ?
  - `Recommandation` : mois courant au départ, navigation de période en phase 3.

- `Ambiguïté` : faut-il permettre la validation rétroactive ?
  - `Recommandation` : oui, pour les jours passés visibles.

- `Ambiguïté` : faut-il supprimer ou archiver une habitude ?
  - `Recommandation` : archiver par défaut, supprimer plus tard si nécessaire.

- `Ambiguïté` : le pourcentage quotidien doit-il compter toutes les habitudes ou seulement les habitudes éligibles ce jour-là ?
  - `Recommandation` : seulement les habitudes éligibles.

- `Ambiguïté` : quelle route et quel nom de dossier choisir ?
  - `Recommandation` : utiliser `habits` comme slug et nom technique, tout en gardant le label produit "Habit Tracker".
  - Motif : plus simple, plus lisible et plus cohérent avec `calendar`, `reading`, `journal`.

- `Risque` : mélanger habitudes et tâches récurrentes.
  - `Recommandation` : maintenir une séparation stricte.

- `Risque` : stocker des statistiques calculées.
  - `Recommandation` : ne stocker que les sources de vérité.

- `Risque` : mauvaise gestion des dates à cause des fuseaux horaires.
  - `Recommandation` : manipuler des clés de jour locales `YYYY-MM-DD`, jamais des comparaisons UTC brutes pour la logique de grille.

- `Risque` : introduire trop tôt catégories, streaks, filtres et charts.
  - `Recommandation` : attendre que le coeur d'usage soit stable.

- `Risque` : oublier l'intégration au backup.
  - `Recommandation` : l'anticiper dès la phase 1, même si l'UI de backup n'évolue pas tout de suite.

## 10. Recommandation finale

Le meilleur point de départ est un Habit Tracker autonome, local-first, centré sur des habitudes binaires quotidiennes, avec une vue mensuelle simple, une interaction de validation en un clic et un pourcentage de réussite calculé à partir des seules habitudes éligibles du jour.

Le bon arbitrage pour démarrer n'est pas de viser un produit d'analyse avancée, mais un outil quotidien extrêmement fiable et lisible. La donnée à stocker doit rester minimale : des habitudes, des validations journalières, et quelques préférences d'affichage. Les statistiques, charts et enrichissements doivent rester dérivés et venir ensuite.

Le périmètre conseillé pour la première implémentation est donc :

- page dédiée
- création d'habitude
- liste active
- grille mensuelle
- toggle jour par jour
- pourcentage du jour
- archivage simple
- persistance IndexedDB
- gestion propre des états vide, chargement et erreur

Si cette base est bien exécutée, elle couvrira déjà l'essentiel du besoin tout en préparant proprement les extensions futures.
