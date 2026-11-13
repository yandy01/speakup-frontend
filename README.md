# ELOQIA — PWA d'éloquence en français

ELOQIA est une Progressive Web App mobile-first qui aide l'utilisateur à développer sa diction, sa fluidité, sa structure de discours et sa prise de parole en public. Cette version est consacrée au français ; l'anglais est reporté à une version ultérieure.

## 1. Fonctionnalités de cette version

- **PWA installable** sur Android et iPhone depuis le navigateur, avec un manifeste, des icônes, un écran autonome et une mise à jour du Service Worker.
- **Interface mobile-first** avec navigation inférieure, grandes zones tactiles, mise en page responsive et prise en compte des safe areas.
- **Thème clair par défaut** avec bascule vers le mode sombre ; le choix est conservé sur l'appareil.
- **Police Poppins**, avec Verdana en solution de repli.
- **Coach vocal push-to-talk** : appuyer pour enregistrer, appuyer pour arrêter ; transcription française, réponse d'Agnes AI (Gemini en secours), puis lecture audio générée avec Gemini TTS.
- **Choix de voix** : Achernar (féminine) ou Charon (masculine). Le coach affiche une onde animée pour les états écoute, compréhension et réponse.
- **Coach écrit** avec affichage du Markdown (gras, listes, titres et code) sans afficher les marqueurs `**`.
- **Parcours gamifié** : 20 étapes en français, 5 questions chacune (100 questions), explications après réponse, meilleur score, XP, seuil de maîtrise de 80 % et déblocage automatique de l'étape suivante après validation.
- **Téléprompteur** : 15 textes français originaux, réglage de taille et de vitesse, mode plein écran, défilement automatique pendant l'enregistrement, pause/reprise et analyse en fin de lecture.
- **Bilan vocal de lecture** : transcription, points forts, améliorations, habitudes à éviter/surveiller, scores quand l'audio le permet et exercice suivant. Le bilan peut être repris dans une conversation avec le coach.
- **Défi minute** : sujet tiré au hasard, 10 secondes de préparation, 60 secondes de prise de parole, note sur 100, grille de critères et feedback.
- **Progression** : historique des exercices, lectures et défis, XP, temps de pratique, moyenne et évolution des notes.
- **Inscription et connexion** par Supabase Auth. L'application ouvre la session automatiquement lorsque Supabase renvoie une session ou que la confirmation email n'est pas requise. Si la confirmation email est activée, l'utilisateur doit d'abord vérifier son adresse ; ce contrôle ne peut pas être contourné côté application.

## 2. Architecture technique

- Frontend : React, TypeScript, Vite, CSS personnalisé.
- PWA : `vite-plugin-pwa` / Workbox.
- Backend : fonctions serverless Vercel dans `api/`.
- Authentification et données : Supabase Auth + PostgreSQL + RLS.
- Coach conversationnel : Agnes AI en premier, Gemini en secours.
- Transcription française, analyse audio et synthèse vocale : Google Gemini via les endpoints serveur.
- Hébergement : Vercel.

Agnes AI est utilisé comme moteur conversationnel textuel. La documentation publique du fournisseur ne décrit pas de fonction officielle de synthèse vocale ; la lecture des réponses du professeur est donc confiée à Gemini TTS. Les clés des fournisseurs restent côté serveur.

## 3. Installation locale

Prérequis : Node.js 22 recommandé et npm.

```bash
npm install
cp .env.example .env.local
```

Renseigner les valeurs dans `.env.local` :

```env
# Variables publiques utilisées par Vite dans le navigateur
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE_PUBLIQUE
VITE_API_BASE_URL=/api

# Variables serveur — jamais préfixer par VITE_
SUPABASE_URL=https://VOTRE_PROJET.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE_PUBLIQUE
AGNES_AI_API_KEY=VOTRE_CLE_AGNES
AGNES_AI_MODEL=VOTRE_MODELE_AGNES_ACTIF
GEMINI_API_KEY=VOTRE_CLE_GEMINI
GEMINI_MODEL=gemini-3.8-flash
GEMINI_AUDIO_MODEL=gemini-3.8-flash
GEMINI_AUDIO_FALLBACK_MODEL=gemini-2.5-flash
GEMINI_SPEECH_MODEL=gemini-3.8-flash-tts
GEMINI_SPEECH_FALLBACK_MODEL=gemini-3.8-flash-lite-tts
```

Ne jamais transmettre `.env.local`, des secrets API, un jeton Supabase ou un fichier `.vercel` dans un dépôt public.

### Démarrer le frontend et les API ensemble

```bash
npm run dev:full
```

Ouvrir `http://localhost:3000`.

`npm run dev` lance Vite seul sur le port 5173 : les fonctions serverless `api/*.ts` ne sont pas exécutées dans ce mode et les appels `/api/...` renverront 404. Pour tester le coach, la transcription, le téléprompteur et les défis, utiliser `npm run dev:full`.

La première exécution de `vercel dev` peut demander d'associer le dossier à un projet Vercel. Utiliser le projet ELOQIA existant (par exemple `speakup-frontend`) et éviter de créer plusieurs projets pour le même dépôt.

## 4. Variables d'environnement Vercel

Dans Vercel : Project → Settings → Environment Variables. Ajouter les mêmes variables serveur que ci-dessus pour les environnements nécessaires (Development, Preview et Production). Les variables `VITE_*` sont intégrées au bundle frontend ; seules des valeurs publiques peuvent y figurer.

Après modification des variables, enregistrer puis redéployer : les déploiements déjà existants ne récupèrent pas les nouvelles valeurs.

Les identifiants des modèles doivent correspondre aux modèles activés pour la clé du fournisseur. Les noms de modèles sont configurables par variables et peuvent évoluer avec l'offre des fournisseurs.

## 5. Supabase existant — aucune réinitialisation

Le projet conserve les tables historiques déjà créées :

- `profiles`
- `conversations`
- `messages`
- `exercises`
- `user_progress`

Le déclencheur `on_auth_user_created` et la fonction `handle_new_user` ne sont pas réinitialisés par cette livraison. Les politiques RLS existantes doivent rester actives. Le frontend n'utilise que la clé publishable/anon ; aucune clé `service_role` n'est placée dans le navigateur.

### Migrations additives

Les migrations ci-dessous créent uniquement des tables d'historique supplémentaires. Ne les exécuter que si elles n'ont pas déjà été appliquées sur le projet :

1. `supabase/migrations/20261112_exercise_attempts.sql` — scores des étapes pédagogiques.
2. `supabase/migrations/20261113_eloqia_challenges.sql` — historique des défis d'une minute.
3. `supabase/migrations/20261113_eloqia_reading_attempts.sql` — historique et notes des lectures.

La migration `supabase/ai_chat_security.sql` a déjà été exécutée dans le projet décrit par le récapitulatif. Ne pas recréer les tables historiques ni désactiver RLS.

`supabase/diagnostics.sql` est une requête de diagnostic en lecture seule pour examiner le schéma et les politiques existantes.

## 6. Endpoints serveur

Tous les endpoints ci-dessous exigent une session Supabase valide et ne stockent pas l'audio brut dans les tables applicatives.

- `POST /api/chat` — coach textuel Agnes AI, Gemini en secours.
- `POST /api/transcribe-voice` — transcription d'une intervention en français.
- `POST /api/speech` — synthèse de la réponse du professeur, voix Achernar ou Charon.
- `POST /api/analyze-reading` — analyse d'une lecture guidée par comparaison avec le texte cible.
- `POST /api/analyze-speech` — analyse du défi oral minute.

Les réponses de l'IA sont validées côté serveur. Les limites de taille, la session, les quotas et les erreurs des fournisseurs sont contrôlés. Les fichiers audio sont transmis au fournisseur pour analyse ou synthèse puis ne sont pas persistés dans Supabase par ces fonctions. Les transcriptions, rapports et scores sont enregistrés selon la fonction et les migrations disponibles.

## 7. Microphone et compatibilité

Le microphone nécessite un contexte sécurisé : HTTPS en production, ou `localhost` en développement. L'utilisateur doit déclencher l'enregistrement depuis une action explicite, autoriser le microphone et utiliser un navigateur à jour qui prend en charge `getUserMedia` et `MediaRecorder`.

La prise en charge des formats audio varie selon le navigateur et l'appareil. ELOQIA choisit un type MIME pris en charge lorsque possible. Si le navigateur ne permet pas l'enregistrement, l'application doit afficher une explication au lieu de simuler une analyse.

## 8. Construction et déploiement

```bash
npm run build
```

Paramètres Vercel usuels :

- Framework Preset : Vite.
- Build Command : `npm run build`.
- Output Directory : `dist`.
- Root Directory : `./`.

Les fonctions serverless du dossier `api/` sont déployées par Vercel en même temps que le frontend. Le Service Worker précache les ressources statiques uniquement. Les appels `/api/`, Supabase, les conversations, les audios et les données privées sont en NetworkOnly et ne sont pas mis en cache hors ligne.

## 9. Installation sur téléphone

- **Android** : ouvrir l'URL HTTPS de production dans Chrome ou un navigateur compatible, puis choisir « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **iPhone/iPad** : ouvrir l'URL dans Safari, toucher Partager, puis « Sur l'écran d'accueil ». Lancer ELOQIA depuis son icône.

La PWA est installable, mais ce n'est pas encore un binaire natif App Store / Play Store. Une intégration Capacitor pourra être ajoutée après validation du produit.

## 10. Vérifications avant commercialisation

- Tester l'inscription et la confirmation email selon les réglages Supabase.
- Tester séparément les voix Achernar et Charon en français.
- Tester microphone, arrêt et libération du microphone sur iOS Safari et Android Chrome.
- Évaluer les transcriptions sur plusieurs accents francophones et dans différents environnements sonores.
- Tester les réponses 429/503 des fournisseurs et leur mécanisme de secours.
- Exécuter les migrations additives non encore installées.
- Vérifier les politiques RLS, les webhooks et la suppression des données.
- Confirmer le build Vite et les appels réels aux fournisseurs dans l'environnement de déploiement.

**Limite de cette archive :** les fichiers TypeScript/TSX ont passé une vérification de transpilation syntaxique. L'installation npm et le build complet n'ont pas pu être exécutés dans l'environnement de préparation, faute d'accès fiable au registre npm. Le build doit donc être confirmé avec `npm install` puis `npm run build` sur le poste de développement ou dans Vercel.
