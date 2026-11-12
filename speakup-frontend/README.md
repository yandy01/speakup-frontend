# SpeakUp AI — Frontend web

Frontend React + TypeScript + Vite du projet SpeakUp AI. Cette livraison reprend le socle déjà créé dans Supabase et ne réinitialise aucune table.

## Contenu livré

- Authentification Supabase : inscription, connexion, réinitialisation du mot de passe, OAuth Google/Apple (si activé dans Supabase).
- Tableau de bord alimenté par les données Supabase disponibles.
- Conversations enregistrées dans `conversations` et `messages`.
- Interface du coach IA reliée à la fonction serverless Vercel `/api/chat`.
- Bibliothèque depuis `exercises`.
- Progression depuis `user_progress`.
- Profil utilisateur depuis `profiles`.
- Identité visuelle sombre et or, avec l'emblème fourni.
- Documentation et requête SQL de diagnostic non destructive.

## 1. Prérequis

- Node.js 20 LTS recommandé.
- npm.
- Le projet Supabase existant.
- Un compte Vercel pour héberger le frontend et la fonction backend `/api/chat`.
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
```

Utiliser exclusivement la clé Supabase publishable/anon dans le navigateur. Ne jamais placer `service_role`, clé secrète Supabase, clé Agnes AI ou clé Gemini dans une variable `VITE_`.

## 3. Lancer le projet complet en local

Le frontend seul peut être lancé avec `npm run dev`, mais le endpoint backend Vercel n'est pas exécuté par Vite seul.

Pour tester ensemble l'application et la fonction serverless :

```bash
npx vercel dev --listen 3000
```

Le CLI peut demander de se connecter à Vercel et de lier le dossier au projet Vercel. L'application sera alors servie avec `/api/chat` sur le même domaine local.

Pour le frontend seul :

```bash
npm run dev
```

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

## 5. Connexion du coach IA (Agnes AI principal, Gemini secondaire)

Le navigateur appelle uniquement `/api/chat`. Les clés des fournisseurs IA restent dans les variables d'environnement serveur Vercel.

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

## 6. Déploiement Vercel

- Importer le dépôt Git dans Vercel.
- Framework preset : Vite.
- Build command : `npm run build`.
- Output directory : `dist`.
- Ajouter `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` et `VITE_API_BASE_URL=/api` dans les variables de build Vercel.
- Ajouter les secrets serveur `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AGNES_AI_API_KEY`, `AGNES_AI_MODEL`, `GEMINI_API_KEY` et `GEMINI_MODEL`.
- Exécuter `supabase/ai_chat_security.sql` dans Supabase.
- Redéployer après ajout ou modification des variables.

Le fichier `vercel.json` réécrit les routes frontend vers `index.html` pour le routage SPA et fixe le plafond d’exécution de `/api/chat` à 60 secondes (dans la limite autorisée par le plan Vercel).

## 7. OAuth

Les boutons Google et Apple utilisent Supabase Auth. Ils ne fonctionneront que lorsque les fournisseurs correspondants auront été activés et configurés dans Supabase (identifiants OAuth, URL de redirection et domaines autorisés).

## 8. Périmètre non inclus dans cette livraison frontend

Cette livraison comprend le endpoint de chat Agnes AI / Gemini. Les fonctions suivantes restent à développer ou à configurer :

- Enregistrement et traitement audio.
- Synthèse vocale et reconnaissance vocale.
- Paiements et abonnements Premium.
- Notifications push.
- Interface d'administration.
- Gestion complète de la progression (les colonnes et règles d'écriture de `user_progress` restent à confirmer).

Ces éléments sont documentés pour être développés dans les étapes suivantes. Les actions non raccordées ne sont pas présentées comme opérationnelles.

## 9. Contrôles de sécurité avant production

- Vérifier toutes les politiques RLS avec deux comptes utilisateurs distincts.
- Vérifier que les utilisateurs ne peuvent lire ni modifier les lignes d'un autre compte.
- Confirmer que la table `messages` valide la propriété de la conversation et le propriétaire du message.
- Confirmer que les exercices publiés sont lisibles et que les contenus Premium ne sont pas exposés aux comptes non autorisés si cette distinction est faite en base.
- Restreindre les clés et secrets au backend.
- Configurer les URL autorisées Supabase Auth.
- Ajouter une politique de confidentialité et des conditions d'utilisation validées avant la publication.

## 10. Structure

```text
speakup-frontend/
├── api/chat.ts
├── public/speakup-mark.png
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
