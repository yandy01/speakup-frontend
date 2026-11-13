# Eloquia PWA — version 3.0.0

Cette archive reprend le projet React/TypeScript existant et applique la refonte mobile Eloquia décidée dans la conversation.

## Changements visibles

- Navigation mobile : Accueil, Exercices, Coach IA, Téléprompteur, Profil.
- Accueil allégé, sans photo de personnage, avec XP, niveau, série et accès à l’entraînement.
- Première connexion personnalisée en français.
- Coach vocal par prise de parole manuelle (appuyer pour commencer, appuyer de nouveau pour arrêter), avec une grande onde animée et réponse texte + voix.
- Téléprompteur avec taille de texte, vitesse, pause/reprise, mode plein écran et analyse audio.
- Défi oral d’une minute, parcours pédagogique, XP et badges.
- Icônes PWA provisoires vert émeraude.

## Avant de remplacer le projet sur votre ordinateur

1. Faites une copie de votre dossier actuel.
2. Conservez votre fichier `.env.local` (les clés Supabase/Agnes/Gemini n’ont pas été intégrées à cette archive).
3. Conservez le dossier `.git` et `.vercel` de votre projet local si vous souhaitez garder exactement la même connexion GitHub/Vercel.
4. Copiez les fichiers de cette archive dans le projet existant sans écraser `.env.local`, `.git` ou `.vercel`.
5. Installez les dépendances avec `npm install`, puis exécutez `npm run build`.
6. Pour tester les fonctions API localement, utilisez `npm run dev:full` et ouvrez `http://localhost:3000`.
7. Vérifiez l’état des migrations Supabase avant d’exécuter une migration. Ne réinitialisez pas la base et ne supprimez aucune politique RLS.

## Variables serveur

Les secrets `AGNES_AI_API_KEY`, `GEMINI_API_KEY`, ainsi que les variables serveur `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` restent à configurer dans `.env.local` pour les essais locaux et dans Vercel pour la production. Ne pas préfixer les clés privées Agnes/Gemini par `VITE_`.

## Ce qui n’est pas inclus ou pas encore vérifié

- La caméra/vidéo du téléprompteur n’est pas implémentée : l’analyse porte sur l’audio.
- L’onboarding est local à l’appareil et ne synchronise pas les préférences entre appareils.
- Le build Vite complet, les intégrations réelles aux fournisseurs et les essais microphone Android/iOS doivent être validés après installation des dépendances et ajout des clés.
- Le logo affiché reste un symbole microphone provisoire.

Voir `docs/BUILD_STATUS.md` pour le détail des vérifications et limites.
