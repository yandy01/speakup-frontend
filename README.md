# ELOQIA

Application web progressive (PWA) de coaching en éloquence et en prise de parole en français.

## Technologies

- React, TypeScript, Vite et TanStack Start
- Supabase Auth et PostgreSQL
- Agnes AI pour le coach conversationnel
- Google Gemini pour la transcription, l’analyse de la voix et la synthèse vocale
- Nitro pour le déploiement full-stack sur Vercel

## Prérequis

- Node.js 22 ou version LTS récente
- npm
- Un projet Supabase
- Une clé API Agnes AI
- Une clé API Google Gemini

## Installation locale

```bash
npm install
cp .env.example .env
# Renseignez ensuite les variables dans .env
npm run dev
```

L’application est servie par Vite et TanStack Start. Les fonctions serveur et les routes applicatives sont exécutées par Nitro.

## Variables d’environnement

Variables publiques nécessaires au client Supabase :

```env
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLISHABLE_SUPABASE
```

Variables serveur nécessaires à l’authentification et aux fournisseurs IA :

```env
SUPABASE_URL=https://VOTRE-PROJET.supabase.co
SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLISHABLE_SUPABASE
AGNES_AI_API_KEY=VOTRE_CLE_AGNES
AGNES_AI_MODEL=agnes-2.5-flash
GEMINI_API_KEY=VOTRE_CLE_GEMINI
GEMINI_AUDIO_MODEL=gemini-3.8-flash
GEMINI_SPEECH_MODEL=gemini-3.8-flash-tts
GEMINI_SPEECH_FALLBACK_MODEL=gemini-3.8-flash-lite-tts
```

`DATABASE_URL` est facultative pour l’application en fonctionnement normal. Elle est nécessaire uniquement si vous exécutez les migrations Drizzle depuis ce dépôt.

**Sécurité :** ne préfixez jamais les clés `AGNES_AI_API_KEY` ou `GEMINI_API_KEY` par `VITE_`. Elles seraient alors exposées dans le navigateur. Ne commitez jamais le fichier `.env`.

## Services IA

- Le coach charge l’historique de conversation depuis Supabase puis envoie les messages à `https://apihub.agnes-ai.com/v1/chat/completions`.
- Le micro du coach enregistre localement, puis le serveur transmet l’audio à Gemini pour transcription en français. La transcription est ensuite envoyée au coach Agnes AI.
- Le téléprompteur transmet son enregistrement à Gemini pour obtenir la transcription, l’évaluation et le bilan structuré.
- La réponse vocale du coach est générée par Gemini TTS. Si la synthèse distante échoue, l’interface conserve son mécanisme de voix de secours du navigateur.
- Les clés ne quittent jamais le serveur. Les fonctions IA exigent une session Supabase valide.

## Authentification Supabase

Dans Supabase → Authentication → URL Configuration, ajoutez l’URL locale et l’URL de production aux Redirect URLs, par exemple `http://localhost:5173/**` et `https://VOTRE-DOMAINE/**`.

Pour activer les boutons Google ou Apple, configurez les fournisseurs correspondants dans Supabase → Authentication → Sign In / Providers, puis ajoutez les URI de callback Supabase dans les consoles OAuth respectives. Les inscriptions par email et mot de passe utilisent directement Supabase Auth.

## Vérifications

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Déploiement Vercel + GitHub

1. Poussez le dépôt sur GitHub.
2. Dans Vercel, importez le dépôt GitHub.
3. Ajoutez les variables publiques Supabase et les variables privées listées ci-dessus dans Settings → Environment Variables.
4. Sélectionnez les environnements Production, Preview et Development selon vos besoins.
5. Déployez. Chaque nouveau push sur la branche de production déclenchera un nouveau déploiement.

Le fichier `vercel.json` et le plugin Nitro configurent le déploiement TanStack Start. Après toute modification des variables d’environnement, relancez un déploiement.
