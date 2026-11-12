# État de livraison — SpeakUp AI PWA V1.4.1

## Conservé depuis les versions précédentes

- Frontend React + TypeScript + Vite.
- Authentification Supabase.
- Cinq tables Supabase existantes : `profiles`, `conversations`, `messages`, `exercises`, `user_progress`.
- Migration additive `supabase/ai_chat_security.sql` déjà exécutée par le propriétaire du projet (résultat communiqué : « Success. No rows returned »).
- Endpoint Vercel `api/chat.ts`.
- Agnes AI principal et Gemini en solution de repli pour le coach conversationnel.
- Vérification du JWT, propriété de conversation, quota anti-abus et secrets uniquement côté serveur.
- Identité visuelle SpeakUp AI sombre, argent et or.

## PWA V1.3

- `vite-plugin-pwa` / Workbox, manifest, icônes 192x192, 512x512, maskable et Apple touch icon.
- Installation Android lorsque le navigateur expose `beforeinstallprompt`.
- Instructions d'ajout à l'écran d'accueil pour iOS/iPadOS.
- Indicateur de connectivité et demande explicite de mise à jour du Service Worker.
- Cache limité aux ressources statiques ; `/api/*` et Supabase sont configurés en réseau uniquement.

## Ajouts V1.4 — correction du démarrage local et téléprompteur

- La commande `npm run dev:full` démarre l'environnement Vercel local sur le port 3000, avec le frontend et les fonctions `api/`.
- `npm run dev` / `npm run dev:vite-only` restent des commandes Vite seules sur le port 5173 ; les appels `/api/*` y retournent 404 tant qu'aucun proxy/backend n'est lancé.
- Nouvelle page `/reading`, accessible depuis la navigation et la bibliothèque d'exercices.
- Téléprompteur français/anglais avec textes d'exemple, taille de texte réglable et défilement automatique configurable.
- Enregistrement via `getUserMedia` / `MediaRecorder`, pause, reprise, arrêt et annulation.
- Endpoint protégé `POST /api/analyze-reading` : vérification du JWT Supabase, contrôle de taille/type/durée, quota anti-abus et appel Gemini avec audio.
- Rapport pédagogique : transcription, résumé, points forts, améliorations, habitudes à éviter/surveiller et prochain exercice.
- Sauvegarde du bilan dans une nouvelle conversation à l'aide des tables existantes `conversations` et `messages` ; le bouton « Continuer avec mon tuteur » ouvre le Coach IA sur cette conversation.
- Les fichiers audio ne sont pas sauvegardés dans Supabase par cet endpoint ; ils sont transmis au service IA pour traitement et ne sont pas inclus dans le cache PWA.
- Aucune nouvelle migration SQL n'est nécessaire pour le téléprompteur ; la migration anti-abus déjà exécutée est réutilisée.

## Ce qui n'est pas encore inclus ou certifié

- Pas d'application native publiée sur Google Play ou l'App Store : il s'agit d'une PWA.
- Conversation vocale IA en temps réel et synthèse vocale du tuteur non incluses.
- Paiements et abonnements Web non intégrés ; les boutons Premium doivent rester clairement en attente de configuration.
- Notifications Push non intégrées.
- Dashboard administrateur complet non inclus.
- Le build Vite complet, les appels réels à Agnes/Gemini et les tests micro sur appareils physiques doivent être effectués dans l'environnement du propriétaire du projet avec ses dépendances et secrets.
- Correctif V1.4.1 : logo principal optimisé en WebP et pris en charge par le précache Workbox ; chunks de dépendances séparés.

## Contrôles locaux à effectuer

```bash
nvm use
npm install
npm run typecheck
npm run build
npm run dev:full
```

Ouvrir `http://localhost:3000` pour utiliser le coach et le téléprompteur avec les API. Ne pas utiliser `http://localhost:5173` pour vérifier les fonctions serveur.

Ensuite, tester :

1. Inscription et connexion avec Supabase.
2. Création d'une conversation et envoi d'un message au coach.
3. Réponse Agnes AI et bascule Gemini si Agnes échoue.
4. Navigation vers `/reading` depuis la bibliothèque.
5. Autorisation du microphone et enregistrement d'une lecture de 20 à 60 secondes.
6. Analyse audio Gemini et affichage du rapport.
7. Bouton « Continuer avec mon tuteur » et chargement du bilan dans Coach IA.
8. Tests avec un deuxième compte pour vérifier l'isolation RLS.
9. Build PWA, installation Android Chrome et ajout à l'écran d'accueil iOS Safari.
10. Vérification que les appels API, conversations, fichiers audio et transcriptions ne sont pas mis en cache.

La syntaxe des fichiers TypeScript/TSX et la validité JSON des fichiers de configuration ont été contrôlées dans l'environnement de préparation. Ce contrôle ne remplace pas `npm run typecheck`, `npm run build` ni les tests réels avec les clés du propriétaire.


## Correctif V1.4.1 — build PWA Vercel

- Le fichier `public/speakup-mark.png` de 2,15 Mo dépassait la limite Workbox par défaut de 2 MiB et faisait échouer la génération du Service Worker.
- Remplacement par `public/speakup-mark.webp` (512 × 512), optimisé pour l'affichage de la marque.
- Mise à jour de `src/components/Brand.tsx` pour utiliser le WebP.
- Ajout de `webp` aux extensions statiques précachées par Workbox.
- Séparation des dépendances lourdes en chunks React, Supabase, graphiques et icônes pour réduire le bundle principal.
- Aucun changement de schéma Supabase, de clé ou d'endpoint backend.
- Contrôle de build Vite à effectuer après installation des dépendances dans l'environnement du projet.
