# Architecture des features

Ce dossier est la source de vérité pour toute nouvelle page métier.

## Structure cible

- `routes/`
  - route d'entrée fine
  - branche styles, providers et page orchestratrice
- `page/`
  - page orchestratrice
  - aucune logique métier globale
  - aucun gros rendu spécifique inline si on peut l'extraire
- `components/`
  - composants spécifiques à la feature
- `styles/`
  - styles spécifiques à la feature
- `store/`
  - hooks ou état local à la feature quand ils ne sont pas réellement transverses

## Règles

- Une nouvelle feature ne doit pas ajouter de styles métier dans `src/index.css`.
- Une nouvelle feature ne doit pas ajouter de logique métier dans `AppLayout`.
- Les routes restent fines et importent la page orchestratrice depuis `feature/page`.
- Les composants spécifiques vivent avec leur feature.
- `src/lib` reste réservé aux briques réellement transverses ou partagées entre plusieurs features.
- Si une feature n'a pas encore besoin d'un dossier `components/`, `styles/` ou `store/`, il peut être absent temporairement.

## Principes de disposition

Lors de la création d'une nouvelle page, deux principes directeurs de disposition des blocs et des textes doivent s'appliquer par défaut.

### 1. Minimalisation des informations inscrites

Le rendu doit réduire au strict minimum les textes affichés.

Cela implique :
- ne garder que les titres absolument nécessaires des blocs et des sections
- éviter les textes explicatifs affichés dans l'interface courante
- privilégier les interfaces orientées action, lecture rapide et données utiles

### 2. Économie de l'espace

Les informations prioritaires doivent tenir autant que possible dans l'espace visible d'un écran standard, sans dépendre d'un scroll vertical pour comprendre l'état principal de la page.

Cela implique :
- compacter les blocs, tableaux et graphiques quand c'est possible
- utiliser des textes courts
- accepter une taille de police plus petite si nécessaire
- conserver un peu de padding pour préserver un minimum de lisibilité

Ordre de priorité visuelle :
- d'abord la compacité
- ensuite la lisibilité

## Compatibilité

- Certains fichiers dans `src/pages/app` restent comme réexports de transition pour éviter de casser les imports existants.
- Toute nouvelle page doit partir de cette structure cible, pas de l'ancien pattern.
