# Eloquia PWA V3.0.0 — état de livraison

## Refonte produit et interface

- Mission : éloquence et prise de parole, V1 française uniquement.
- Public : étudiants, professionnels, entrepreneurs, grand public et orateurs.
- Thème clair par défaut, vert émeraude, mode sombre secondaire et police Poppins avec Verdana de repli.
- Navigation mobile à cinq onglets : Accueil, Exercices, Coach IA, Téléprompteur, Profil. La progression est accessible depuis l’accueil et le profil.
- Accueil simplifié et sans photo : niveau/XP, série, accès principal à l’entraînement, outils rapides et lien de progression.
- Onboarding personnalisé en quatre étapes. Dans cette livraison, les préférences sont conservées dans le localStorage du navigateur, par utilisateur.
- Icônes PWA remplacées par un symbole microphone temporaire ; le logo de marque final reste à concevoir.

## Fonctionnalités et corrections intégrées

- Coach vocal push-to-talk par intervention : appuyer pour démarrer, appuyer de nouveau pour arrêter, transcription, réponse textuelle et réponse vocale activable.
- Grande onde centrale avec animations distinctes pour l’écoute, le traitement et la réponse. L’onde est une animation d’état ; elle n’est pas encore un visualiseur d’amplitude audio mesurée.
- Historique des conversations disponible sur grand écran et dans un panneau repliable sur téléphone.
- Téléprompteur : taille de texte 24–44 px, vitesse réglable, mode plein écran, enregistrement audio, pause/reprise et analyse IA. Le défilement utilise une boucle `requestAnimationFrame` basée sur le temps écoulé et s’arrête à la fin du texte.
- Défi oral du jour : 10 secondes de préparation, 60 secondes de parole, analyse et attribution d’XP.
- Parcours de 20 étapes pédagogiques, cinq questions par étape et validation à 80 %. La prochaine étape se déverrouille automatiquement après validation.
- XP, niveaux, séries et badges calculés à partir des tentatives enregistrées.
- Les erreurs de configuration du quota Supabase sont distinguées d’un dépassement réel de quota dans les endpoints de transcription et du défi.

## Données et sécurité

- Les tables historiques `profiles`, `conversations`, `messages`, `exercises` et `user_progress` ne sont ni supprimées ni recréées.
- Les clés fournisseurs Agnes/Gemini restent exclusivement côté serveur ; aucune clé privée n’est exposée par une variable `VITE_`.
- Les API vérifient la session Supabase, limitent les tailles d’entrée et ne mettent pas les réponses/audio privés en cache.
- La vérification de quota requiert `supabase/ai_chat_security.sql`. Vérifier dans Supabase que la fonction `consume_ai_chat_quota` existe avant de l’exécuter ; ne pas réexécuter aveuglément.
- Migrations additives disponibles :
  - `20261112_exercise_attempts.sql`
  - `20261113_eloqia_challenges.sql`
  - `20261113_eloqia_reading_attempts.sql`
  - `20261113_eloqia_exercise_xp.sql`
- Vérifier leur état dans Supabase avant exécution. Les trois premières créent des tables de tentatives supplémentaires ; la dernière ajoute la colonne XP à `exercise_attempts`. Aucune migration ne réinitialise les tables historiques.

## Limites connues / non couvertes

- Capture vidéo avec caméra dans le téléprompteur : non implémentée ; l’analyse repose sur l’audio.
- Synchronisation des réponses d’onboarding entre appareils : non implémentée ; données locales sur l’appareil.
- Les préférences d’onboarding ne pilotent pas encore automatiquement la difficulté des 20 étapes.
- Le barème de niveau (500 XP par niveau) est provisoire.
- Paiement Premium, notifications push, classement multi-utilisateurs et application native : hors périmètre.
- L’onde du Coach est animée selon l’état du dialogue, mais ne représente pas encore le volume sonore mesuré en temps réel.

## Vérifications réalisées dans l’environnement de préparation

- 34 fichiers TypeScript/TSX (application, API et configuration) passés par vérification syntaxique sans diagnostic.
- Les endpoints `api/*.ts` passent `tsc --noEmit --strict`.
- Le CSS a été parsé par PostCSS sans erreur.
- `package.json`, `vercel.json`, `tsconfig.json` et `tsconfig.app.json` sont des JSON valides.
- Les imports relatifs locaux ont été parcourus ; un seul import CSS est attendu et résolu par Vite.

## Vérifications non réalisées

- L’installation npm a expiré dans l’environnement de préparation ; le dossier `node_modules` n’est pas complet. Le build Vite/TypeScript global (`npm run build`) n’a donc pas pu être validé.
- Pas de test d’exécution navigateur, Android ou iOS dans cette session.
- Pas d’appel réel aux comptes Supabase, Agnes AI ou Gemini ; les variables serveur et les quotas doivent être vérifiés dans l’environnement de déploiement.
- Les permissions microphone et la compatibilité des codecs (`audio/webm`, `audio/mp4`, etc.) doivent être testées sur appareils réels.

**Statut :** archive de développement corrigée et contrôles statiques passés ; ne pas considérer la version comme validée pour production avant un `npm install`, `npm run build`, puis des tests fonctionnels avec les clés et migrations du projet réel.
