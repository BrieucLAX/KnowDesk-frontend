# Stepper

Le stepper montre les étapes d'un parcours et où en est l'utilisateur. Il se pose sur l'en-tête de page, juste sous le bandeau.

## Classes

- `cx-stepper` : la carte, en grille d'autant de colonnes que d'étapes (variable `--cx-steps`, 5 par défaut).
- `cx-stepper__step` : une étape ; `--done` (terminée) ou `--current` (en cours).
- `cx-stepper__dot` : le rond de 44 px, avec l'icône de l'étape, ou une coche quand elle est terminée.
- `cx-stepper__label` : le nom de l'étape.

Le trait entre deux étapes passe en `success` quand l'étape précédente est terminée.

## Ce que fournit l'intégrateur

- Une icône Lucide par étape (voir le groupe Icons), remplacée par `check` quand l'étape est terminée.
- Un nom d'étape court, trois mots au plus.
- `aria-current="step"` sur l'étape en cours.

## Règles

- Une seule étape en cours.
- Les étapes sans action de l'utilisateur (un traitement en arrière-plan) n'apparaissent pas dans le stepper.
- Sur un écran étroit, seuls les ronds restent ; le nom de l'étape en cours s'affiche dessous.
