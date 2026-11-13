# SearchBar

La barre de recherche est le point d'entrée principal de la base de connaissance, côté agent comme côté client.

## Variantes

- `cx-search` : dans l'en-tête des pages, sans bouton (la touche Entrée lance la recherche).
- `cx-search cx-search--lg` avec un `cx-btn--primary` : en tête de page d'accueil, où la recherche est l'action principale.

## Ce que fournit l'intégrateur

- Un `<form role="search">` contenant un `<input type="search">` et son `<label>` (masqué visuellement mais lu par les lecteurs d'écran).
- Un placeholder qui donne un exemple formulé avec les mots du client.

## Règles

- La recherche porte sur les titres, les contenus et les synonymes : le placeholder doit inviter à écrire naturellement, pas à saisir des mots-clés.
- Anneau `focus` sur toute la barre quand le champ a le focus.
