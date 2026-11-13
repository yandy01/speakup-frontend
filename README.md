# SpeakUp AI — PWA (V2.0.0)

## Correctif de build Vercel / Workbox

Le logo principal a été converti en WebP optimisé de 512 × 512 (environ 55 Ko) et la configuration Workbox inclut désormais les fichiers `.webp` dans le précache. Cela corrige l’échec causé par l’ancien `public/speakup-mark.png` de 2,15 Mo, qui dépassait la limite Workbox de 2 MiB. Le build sépare également les bibliothèques principales en chunks afin de réduire le poids du bundle initial.

Après remplacement des fichiers dans GitHub, pousser le commit sur la branche `main` ou déclencher un nouveau déploiement Vercel. Aucune variable d’environnement ni migration Supabase supplémentaire n’est nécessaire pour ce correctif.

Frontend React + TypeScript + Vite du projet SpeakUp AI. Cette livraison reprend le socle déjà créé dans Supabase et ne réinitialise aucune table.

## Contenu livré

- Authentification Supabase : inscription, connexion, réinitialisation du mot de passe, OAuth Google/Apple (si activé dans Supabase).
- Tableau de bord alimenté par les données Supabase disponibles.
- Conversations enregistrées dans `conversations` et `messages`.
- Interface du coach IA reliée à la fonction serverless Vercel `/api/chat`.
- Bibliothèque depuis `exercises`.
- Téléprompteur bilingue (FR/EN) avec défilement réglable, taille de texte, enregistrement du microphone, pause/reprise et analyse IA après lecture.
- Bilan de lecture : transcription, points forts, axes d’amélioration, habitudes à éviter et exercice recommandé.
- Chaque bilan peut être poursuivi sous forme de conversation sauvegardée avec le coach dans `conversations` et `messages`.
- Depuis le rapport de lecture, le bouton « Continuer avec mon tuteur » ouvre le Coach IA sur la conversation liée au bilan pour poser des questions et poursuivre l'entraînement.
- Le navigateur doit prendre en charge `getUserMedia` et `MediaRecorder`. En production, HTTPS est obligatoire pour accéder au microphone.
- Progression depuis `user_progress`.
- Profil utilisateur depuis `profiles`.
- Identité visuelle sombre et or, avec l'emblème fourni en WebP optimisé (512 × 512) pour réduire le poids de téléchargement et permettre le précache PWA.
- Documentation et requête SQL de diagnostic non destructive.

## Téléprompteur et retour du tuteur après chaque lecture

1. Connecte-toi à SpeakUp AI.
2. Ouvre **Exercices**, puis **Lecture avec téléprompteur**, ou sélectionne directement **Téléprompteur** dans la navigation.
3. Choisis la langue et le texte, puis ouvre le téléprompteur.
4. Ajuste la taille et la vitesse de défilement. Appuie sur **Commencer la lecture** : le microphone s'active et le texte défile.
5. Mets en pause ou reprends si nécessaire, puis appuie sur **Terminer et analyser**.
6. Le tuteur IA renvoie un bilan avec les points forts, les améliorations, les habitudes à éviter/surveiller, une transcription et un exercice suivant.
7. Appuie sur **Continuer avec mon tuteur** pour ouvrir le Coach IA dans une conversation qui contient déjà le texte lu et le bilan. Tu peux alors poser des questions et poursuivre l'entraînement.

L'analyse audio est traitée par le endpoint serveur `/api/analyze-reading` avec Gemini. Le coach conversationnel texte utilise Agnes AI en premier et Gemini en secours via `/api/chat`. Les deux fonctions exigent une session Supabase valide. Le navigateur doit autoriser le microphone ; HTTPS est requis en production. L'audio n'est pas conservé par l'endpoint de lecture. Le bilan textuel est conservé dans les tables `conversations` et `messages` existantes.

## 1. Prérequis

- Node.js 22.16 ou plus récent (le plugin PWA 2.x nécessite Node.js 20.19+).
- npm.
- Le projet Supabase existant.
- Un compte Vercel pour héberger le frontend et les fonctions backend `/api/chat` et `/api/analyze-reading`.
- Une clé API Agnes AI et, en secours, une clé Gemini.

## 2. Installation locale

```bash
npm install
cp .env.example .env.local
```

Renseigner `.env.local` avec les valeurs publiques du frontend et les secrets serveur nécessaires au test local :

```env
VITE_SUPABASE_URL=https://ohiqnploffjhvocenlft.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE_PUBLIQUE
VITE_API_BASE_URL=/api

# Serveur local uniquement : secrets conservés dans .env.local (jamais dans Git)
SUPABASE_URL=https://ohiqnploffjhvocenlft.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE_PUBLIQUE
AGNES_AI_API_KEY=VOTRE_CLE_AGNES
AGNES_AI_MODEL=agnes-3.0-flash
GEMINI_API_KEY=VOTRE_CLE_GEMINI
GEMINI_MODEL=gemini-3.8-flash
GEMINI_AUDIO_MODEL=gemini-3.8-flash
```

Utiliser exclusivement la clé Supabase publishable/anon dans le navigateur. Ne jamais placer `service_role`, clé secrète Supabase, clé Agnes AI ou clé Gemini dans une variable `VITE_`.

## 3. Lancer le projet complet en local

**Important : `npm run dev` lance Vite seul sur le port 5173. Vite ne sert pas les fonctions Vercel placées dans `api/`.** Si tu utilises cette commande, un appel à `/api/chat` ou `/api/analyze-reading` peut donc répondre `404 Not Found`. Ce 404 ne signifie pas que Supabase ou Agnes AI sont mal configurés : la fonction backend n’est simplement pas lancée par Vite.

Pour lancer le frontend ET les fonctions API avec le même serveur local, utilise :

```bash
npm run dev:full
```

Puis ouvre **http://localhost:3000** (et non http://localhost:5173). Cette commande lance `vercel dev`, qui reproduit localement le routage des fonctions Vercel. Le CLI peut demander de te connecter et de lier le dossier au projet Vercel.

Si Vercel CLI demande une authentification, connecte-toi avec `npx vercel login`. Si le dossier n’est pas encore lié, exécute `npx vercel link` depuis la racine du projet, puis relance `npm run dev:full`.

Alias disponible : `npm run dev:vercel`.

Pour travailler uniquement sur l’interface sans backend :

```bash
npm run dev:vite-only
```

Dans ce mode frontend seul, les appels `/api/*` ne fonctionneront pas.

Documentation officielle : https://vercel.com/docs/cli/dev

Vérifications frontend :

```bash
npm run typecheck
npm run build
npm run preview
```

## 3.1 Configuration du backend Vercel

Dans Vercel > Project > Settings > Environment Variables, ajouter les variables serveur suivantes (Production, Preview et Development selon les besoins) :

```env
SUPABASE_URL=https://ohiqnploffjhvocenlft.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE_PUBLIQUE
AGNES_AI_API_KEY=VOTRE_CLE_AGNES
AGNES_AI_MODEL=agnes-3.0-flash
GEMINI_API_KEY=VOTRE_CLE_GEMINI
GEMINI_MODEL=gemini-3.8-flash
GEMINI_AUDIO_MODEL=gemini-3.8-flash
```

La variable `AGNES_AI_MODEL` reste configurable. Le code utilise `agnes-3.0-flash` par défaut, conformément à la référence API Agnes consultée le 12 novembre 2026. Si ton compte Agnes AI confirme l'accès à `agnes-2.5-flash`, tu peux conserver ce modèle en remplaçant la valeur dans Vercel.

`GEMINI_MODEL` doit correspondre à un modèle activé dans ton projet Google AI Studio. L'exemple utilise `gemini-3.8-flash` ; vérifie sa disponibilité et les quotas dans ta console avant déploiement.

Si le frontend est hébergé sur un autre domaine que l'API, ajouter `ALLOWED_ORIGINS` avec les origines exactes séparées par des virgules. Pour un déploiement frontend + API sur le même projet Vercel, cette variable n'est pas nécessaire.

**Ne jamais ajouter ces secrets dans `.env.local` avec des préfixes `VITE_`, dans Git, ni dans un fichier livré au navigateur.**

## 3.2 Installer la protection anti-abus Supabase

Avant d'utiliser le coach, ouvrir Supabase > SQL Editor et exécuter une seule fois :

```text
supabase/ai_chat_security.sql
```

Cette migration est additive. Elle crée uniquement `ai_chat_rate_events` et la fonction `consume_ai_chat_quota`. Elle ne modifie ni ne supprime les cinq tables existantes. Elle applique une limite de 8 requêtes par utilisateur sur une fenêtre glissante de 60 secondes.

La fonction utilise le JWT de l'utilisateur et `auth.uid()`. Elle ne nécessite pas la clé `service_role`.

## 3.3 Fonction backend `/api/chat`

Le projet contient maintenant `api/chat.ts`, une fonction serverless Vercel, avec une durée maximale configurée à 60 secondes.

Séquence sécurisée :

1. Vérifier le JWT avec Supabase Auth.
2. Vérifier que la conversation appartient à l'utilisateur via les politiques RLS.
3. Consommer une requête du quota anti-abus persistant.
4. Charger les 20 derniers messages de cette conversation.
5. Vérifier que le dernier message utilisateur correspond au message demandé.
6. Appeler Agnes AI côté serveur.
7. En cas d'échec d'Agnes, appeler Gemini côté serveur.
8. Retourner `{ "reply": "...", "provider": "agnes" }` ou `provider: "gemini"`.

Le backend n'utilise pas `SUPABASE_SERVICE_ROLE_KEY` : les requêtes de données sont faites avec le JWT de l'utilisateur, ce qui permet à Supabase d'appliquer les politiques RLS existantes.

L'endpoint attend les colonnes `conversations.id`, `conversations.user_id`, `messages.conversation_id`, `messages.user_id`, `messages.role`, `messages.content` et `messages.created_at`. Ce sont les champs utilisés par le frontend existant ; confirme leur présence avec `supabase/diagnostics.sql` avant la mise en service.

## 4. Connexion au Supabase existant

Le frontend utilise l'URL et la clé publique du projet existant. Il ne contient aucune migration destructive et ne recrée aucune table.

Tables utilisées :

- `profiles` : lecture du profil et mise à jour des champs existants.
- `conversations` : création et lecture des conversations appartenant à l'utilisateur.
- `messages` : insertion et lecture des messages d'une conversation appartenant à l'utilisateur.
- `exercises` : lecture de la bibliothèque.
- `user_progress` : lecture des données de progression.

### Hypothèses de colonnes à confirmer

Le récapitulatif fourni confirme les tables et certaines relations, mais pas la liste complète de toutes les colonnes. Le frontend se base donc sur les éléments explicitement indiqués et sur les conventions suivantes :

- `conversations`: `id`, `user_id`, éventuellement `title`, `language`, `created_at`.
- `messages`: `id`, `conversation_id`, `user_id`, `role`, `content`, éventuellement `created_at`.
- `exercises`: `id`, `slug`, éventuellement `title`, `name`, `description`, `instructions`, `content`, `category`, `level`, `difficulty`, `language`, `created_at`.
- `user_progress`: `id`, `user_id`, `exercise_id`, éventuellement `score`, `completed`, `status`, `duration_minutes`, `duration_seconds`, `completed_at`, `created_at`.
- `profiles`: `id`, `display_name` et, selon les colonnes déjà créées, `native_language`, `preferred_language`, `target_language`, `level`.

Le code du profil ne tente de modifier que les colonnes présentes dans le résultat de `SELECT *`. Pour `messages`, le frontend attend `role` et `content`. Si le schéma réel utilise d'autres noms (par exemple `sender` au lieu de `role`), adapter le mapping dans `src/lib/data.ts` après exécution de `supabase/diagnostics.sql`.

**Important :** `supabase/diagnostics.sql` ne modifie aucune donnée. Il permet de vérifier les noms de colonnes, les politiques RLS et le déclencheur de création de profil avant la mise en production.

## 5. Téléprompteur et analyse de lecture

La rubrique **Téléprompteur** propose des textes originaux en français et en anglais. L’utilisateur règle la taille du texte et la vitesse de défilement, démarre l’enregistrement, peut le mettre en pause puis le terminer pour lancer l’analyse.

L’enregistrement est transmis en mémoire à `api/analyze-reading.ts`, qui vérifie la session Supabase et applique le quota anti-abus déjà installé (`consume_ai_chat_quota`). Gemini reçoit l’audio et le texte cible. Le résultat comprend la transcription, un bilan, les points forts, les améliorations, les habitudes à éviter et un exercice de suivi. Le navigateur calcule séparément une vitesse estimée et une correspondance textuelle approximative : ces valeurs ne constituent pas un diagnostic phonétique.

L’audio n’est pas sauvegardé dans Supabase par cette fonction. Le bilan et le contexte pédagogique sont enregistrés comme deux messages dans une nouvelle conversation, afin que l’utilisateur puisse ensuite discuter de ce bilan dans le Coach IA. Les utilisateurs doivent être informés que leur audio est envoyé à Gemini pour analyse.

Le modèle audio est défini par `GEMINI_AUDIO_MODEL` (à défaut `GEMINI_MODEL`). Gemini doit être configuré avec un modèle prenant en charge l’audio et une clé API valide. La taille audio est plafonnée côté client et côté serveur pour rester compatible avec les limites des fonctions Vercel. Formats acceptés : WebM, MP4, OGG, WAV, MPEG, AAC et M4A.

## 6. Connexion du coach IA (Agnes AI principal, Gemini secondaire)

Le navigateur appelle `/api/chat` pour le coach texte et `/api/analyze-reading` pour le téléprompteur. Les clés des fournisseurs IA restent dans les variables d’environnement serveur Vercel.

Contrat :

```http
POST /api/chat
Authorization: Bearer <Supabase access token>
Content-Type: application/json
```

Corps :

```json
{
  "conversation_id": "uuid-de-la-conversation",
  "message": "Je souhaite pratiquer mon anglais.",
  "language": "en"
}
```

Réponse :

```json
{
  "reply": "Let's practise a short introduction.",
  "provider": "agnes"
}
```

Le champ `language` accepte `fr` ou `en`. Le coach utilise une consigne serveur dédiée à la langue de pratique.

Le message utilisateur doit déjà avoir été enregistré dans `messages` par le frontend. Le backend vérifie cette condition afin de ne pas répondre à une demande détachée de la conversation persistée.

Le fournisseur principal est Agnes AI, avec un repli Gemini. Le modèle Agnes est configurable dans `AGNES_AI_MODEL`. Le fallback Gemini utilise `GEMINI_MODEL` et l'API Interactions (`/v1beta/interactions`) avec la clé transmise dans l'en-tête `x-goog-api-key`. La requête fixe `store: false` : l'historique reste dans Supabase et n'est pas persisté par l'API Interactions.

Le traitement inclut : validation du corps, authentification Supabase, contrôle de propriété, quota persistant, limite de contexte, timeout fournisseur, CORS restrictif, erreurs non détaillées au client et journalisation sans contenu conversationnel.

## 7. Déploiement Vercel

- Importer le dépôt Git dans Vercel.
- Framework preset : Vite.
- Build command : `npm run build`.
- Output directory : `dist`.
- Ajouter `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` et `VITE_API_BASE_URL=/api` dans les variables de build Vercel.
- Ajouter les secrets serveur `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AGNES_AI_API_KEY`, `AGNES_AI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL` et `GEMINI_AUDIO_MODEL`.
- Exécuter `supabase/ai_chat_security.sql` dans Supabase.
- Redéployer après ajout ou modification des variables.

Le fichier `vercel.json` réécrit les routes frontend vers `index.html` pour le routage SPA et fixe le plafond d’exécution de `/api/chat` et `/api/analyze-reading` à 60 secondes (dans la limite autorisée par le plan Vercel).

## 8. OAuth

Les boutons Google et Apple utilisent Supabase Auth. Ils ne fonctionneront que lorsque les fournisseurs correspondants auront été activés et configurés dans Supabase (identifiants OAuth, URL de redirection et domaines autorisés).

## 9. Périmètre non inclus dans cette livraison frontend

Cette livraison comprend le coach texte Agnes AI/Gemini et le téléprompteur avec analyse audio Gemini. Les fonctions suivantes restent à développer ou à configurer :

- Conversation vocale IA en temps réel.
- Synthèse vocale (réponses parlées du tuteur).
- Paiements et abonnements Premium.
- Notifications push.
- Interface d’administration.
- Écriture des données de progression dans `user_progress` (colonnes et règles d’écriture à confirmer).

Les fonctions non raccordées ne sont pas présentées comme opérationnelles.

## 10. Contrôles de sécurité avant production

- Vérifier toutes les politiques RLS avec deux comptes utilisateurs distincts.
- Vérifier que les utilisateurs ne peuvent lire ni modifier les lignes d'un autre compte.
- Confirmer que la table `messages` valide la propriété de la conversation et le propriétaire du message.
- Confirmer que les exercices publiés sont lisibles et que les contenus Premium ne sont pas exposés aux comptes non autorisés si cette distinction est faite en base.
- Restreindre les clés et secrets au backend.
- Configurer les URL autorisées Supabase Auth.
- Ajouter une politique de confidentialité et des conditions d'utilisation validées avant la publication.

## 11. Structure

```text
speakup-frontend/
├── api/chat.ts
├── api/analyze-reading.ts
├── public/speakup-mark.webp
├── src/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── supabase/diagnostics.sql
├── supabase/ai_chat_security.sql
├── docs/backend-chat-contract.md
├── .env.example
├── package.json
├── vite.config.ts
└── vercel.json
```

## 12. Mode PWA (V1.4)

Le projet est préparé comme une Progressive Web App installable. Le symbole de marque est servi en WebP léger et inclus dans le précache Workbox via le motif `webp`. Il reste une application web ; il n'est pas encore publié comme application native sur Google Play ou l'App Store. Le logo argent/or fourni est décliné en icônes PWA.

### Installation des dépendances et démarrage

Le projet utilise Node.js 22 pour la version actuelle du plugin PWA.

```bash
nvm use
npm install
npm run typecheck
npm run build
```

Pour tester ensemble le frontend et les fonctions Vercel :

```bash
npm run dev:full
```

Ouvre ensuite http://localhost:3000. N’utilise pas le port 5173 pour tester les API : ce port correspond au serveur Vite seul.

### Installation sur téléphone

- Android : ouvre l'URL de production HTTPS dans un navigateur compatible, puis utilise le bouton « Installer » affiché par SpeakUp ou la commande d'installation du navigateur.
- iPhone/iPad : ouvre l'URL dans Safari, touche Partager, puis « Sur l'écran d'accueil ». Active « Ouvrir comme app web » si l'option apparaît.

### Hors connexion

Le Service Worker met en cache les ressources statiques de l'application. Les conversations, messages, Supabase, le coach IA, l'enregistrement envoyé au serveur et les analyses nécessitent une connexion Internet. Les API, réponses privées, audios et transcriptions ne sont jamais mis en cache.

### Mise à jour

Lorsqu'une nouvelle version est disponible, SpeakUp affiche une demande de mise à jour. L'utilisateur peut choisir de recharger l'application. Cette stratégie évite un rechargement automatique pendant une activité en cours.

### Périmètre PWA

La configuration PWA comprend le manifest, les icônes, la détection d'installation Android, les instructions d'ajout à l'écran d'accueil iOS, l'état réseau et le prompt de mise à jour. Le module Téléprompteur est désormais présent : sélection d'un texte français ou anglais, défilement automatique réglable, réglage de taille, enregistrement, pause/reprise, analyse audio Gemini et rapport pédagogique. Le bilan est sauvegardé dans une conversation de tuteur à partir des tables existantes `conversations` et `messages`. Les notifications push et les paiements restent à intégrer.

Voir `docs/PWA_ROADMAP.md` pour l'architecture, les limites, la politique de cache et le plan de validation.

# V2.0 — Refonte mobile, coach vocal et parcours gamifiés

## Expérience mobile
- Navigation persistante en bas de l'écran sur téléphone (Accueil, Exercices, Coach, Lecture, Progrès), avec accès au profil depuis l'en-tête.
- Tailles de texte et zones tactiles augmentées, mises en page adaptées aux petits écrans et prise en compte des safe areas iOS.
- Bascule mode nuit / mode jour, choix conservé localement sur l'appareil.
- Téléprompteur agrandi et responsive, avec commandes plus accessibles.

## Coach vocal
- Le coach peut lire ses réponses à voix haute via la synthèse vocale native du navigateur (`speechSynthesis`). L'utilisateur peut activer/désactiver la voix et relire individuellement une réponse.
- La dictée vocale utilise Web Speech Recognition lorsqu'elle est disponible. La disponibilité varie selon le navigateur et l'OS ; le clavier reste toujours utilisable.
- La synthèse vocale du navigateur est une première version sans coût de fournisseur TTS additionnel. La voix et les langues disponibles dépendent de l'appareil.
- Les réponses formatées Markdown (gras, listes, titres, code) sont rendues proprement dans l'interface.

## Bibliothèque et gamification
- 12 parcours pédagogiques originaux en français et anglais, 5 questions chacun (60 questions), de A1 à B2, sur grammaire, vocabulaire, compréhension, expression, éloquence et entretiens.
- Chaque réponse comporte une explication. Chaque tentative donne des XP ; le seuil de validation est fixé à 80 %.
- Le parcours suivant se débloque après validation du précédent. L'apprenant peut recommencer pour améliorer son résultat.
- Les meilleurs scores sont conservés localement en secours et synchronisés avec Supabase si la migration `supabase/migrations/20261112_exercise_attempts.sql` a été exécutée.

### Migration additive à exécuter dans Supabase
Ouvrir SQL Editor, copier le fichier `supabase/migrations/20261112_exercise_attempts.sql`, puis exécuter. Cette migration ajoute uniquement `public.exercise_attempts`, son index et ses politiques RLS. Elle ne supprime ni ne modifie les tables existantes. Chaque utilisateur ne peut lire et ajouter que ses propres tentatives.

## Correction de l'analyse audio Gemini
L'endpoint `api/analyze-reading.ts` utilise maintenant le format REST `models.generateContent` avec `contents[].parts[].inlineData` (au lieu de l'ancien corps Interactions API). Le modèle par défaut est `gemini-3.8-flash`, qui est documenté par Google pour l'analyse audio. Le modèle peut être remplacé par `GEMINI_AUDIO_MODEL` dans Vercel si un autre modèle compatible est activé pour la clé API. Les erreurs fournisseur incluent désormais un message explicatif expurgé plutôt qu'un message générique.

Référence officielle : https://ai.google.dev/gemini-api/docs/audio

## Mise à jour
1. Remplacer le contenu du dossier local par le contenu de cette archive en conservant `.env.local` et `.git`.
2. Exécuter `npm install`.
3. Dans Supabase SQL Editor, exécuter la nouvelle migration `exercise_attempts`.
4. Pousser les changements sur GitHub : `git add . && git commit -m "SpeakUp AI V2 mobile UX and learning paths" && git push origin main`.
5. Attendre le nouveau déploiement Vercel puis tester sur téléphone.

Le build complet et les appels réels aux fournisseurs doivent être validés dans l'environnement de déploiement : l'installation des dépendances a expiré dans l'environnement de préparation hors ligne. Les fichiers TypeScript/TSX ont passé une vérification de transpilation syntaxique.
