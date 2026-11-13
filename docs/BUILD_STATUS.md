# ELOQIA PWA V2.1 — état de livraison

## Produit et interface

- Marque ELOQIA, version française uniquement.
- PWA React + TypeScript + Vite, adaptée aux petits écrans.
- Navigation mobile fixe en bas : Accueil, Parcours, Coach, Lecture, Progrès.
- Mode clair par défaut et mode sombre sélectionnable.
- Police Poppins avec Verdana en solution de repli.
- Écrans d'inscription et de connexion responsive ; connexion automatique si Supabase renvoie une session ou si la confirmation email est désactivée.

## Fonctionnalités

- Coach conversationnel texte via Agnes AI, Gemini en secours.
- Dialogue vocal push-to-talk : capture du microphone, transcription française, réponse écrite, lecture audio et onde animée.
- Choix de voix TTS : Achernar (féminine), Charon (masculine) via Gemini TTS.
- Parcours de 20 étapes pédagogiques, 5 questions par étape, explications, scores, XP, seuil de 80 % et déblocage automatique.
- Téléprompteur plein écran avec 15 textes français, réglage de taille et de vitesse, défilement automatique, pause/reprise et analyse de lecture.
- Défi oral : sujet aléatoire, 10 secondes de préparation, 60 secondes d'enregistrement, analyse et note sur 100.
- Progression alimentée par les exercices, les lectures et les défis.

## Backend et sécurité

- Supabase Auth et les cinq tables historiques conservés : `profiles`, `conversations`, `messages`, `exercises`, `user_progress`.
- RLS existant conservé. Les nouvelles tables d'historique ont des politiques RLS par utilisateur.
- Fonctions serverless Vercel : `/api/chat`, `/api/transcribe-voice`, `/api/speech`, `/api/analyze-reading`, `/api/analyze-speech`.
- Les clés privées Agnes/Gemini restent dans l'environnement serveur.
- Les audios bruts ne sont pas conservés dans les tables Supabase ni le cache PWA.

## Migrations additives

À exécuter uniquement si elles n'ont pas déjà été installées :

- `supabase/migrations/20261112_exercise_attempts.sql`
- `supabase/migrations/20261113_eloqia_challenges.sql`
- `supabase/migrations/20261113_eloqia_reading_attempts.sql`

`supabase/ai_chat_security.sql` avait déjà été exécutée par le propriétaire du projet selon le récapitulatif fourni.

## Démarrage

```bash
npm install
npm run dev:full
```

Ouvrir `http://localhost:3000`. `npm run dev` lance Vite seul sur le port 5173 et ne sert pas les fonctions `/api`.

Pour la production Vercel : Build Command `npm run build`, Output Directory `dist`. Après changement d'une variable d'environnement, effectuer un nouveau déploiement.

## Limites et contrôles restants

- La conversation vocale est en push-to-talk, pas en streaming temps réel.
- Agnes AI est utilisé pour les réponses textuelles ; la documentation publique consultée ne décrit pas de synthèse vocale Agnes. Gemini TTS produit donc les réponses audio.
- L'accès au microphone nécessite HTTPS en production et un navigateur compatible `getUserMedia` / `MediaRecorder`.
- Les achats Premium, les notifications push, le tableau de bord administrateur complet et le binaire natif App Store/Play Store restent hors du périmètre de cette PWA.
- Les fichiers TS/TSX ont passé une vérification de transpilation syntaxique. L'installation npm et le build complet ont expiré ou n'ont pas pu être exécutés dans l'environnement de préparation ; il faut confirmer `npm install` et `npm run build` sur le poste de développement ou dans Vercel.
