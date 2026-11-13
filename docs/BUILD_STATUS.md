# Eloquia PWA V3.1.0 — état de livraison

## Corrections de cette version

- Palette unifiée teal profond + ambre doux, sans accents roses/bleus dans les composants principaux.
- Boutons, liens et commandes tactiles plus visibles et plus grands.
- Défi du jour mis en valeur ; parcours d’exercices allégé sur mobile.
- Sélecteur de texte compact du téléprompteur à la place de la liste longue.
- Défilement automatique avec attente de stabilisation du layout mobile et commande de test sans enregistrement.
- Endpoint Gemini TTS corrigé vers `generateContent`, qui retourne un WAV lisible ; fallback navigateur français si la voix distante/lecture audio échoue.
- Transcription par défaut réglée sur Gemini 2.5 Flash.

## Architecture conservée

React, TypeScript, Vite, PWA, Supabase Auth/PostgreSQL/RLS, API Vercel, Agnes AI et Gemini. Les tables historiques et leurs politiques RLS ne sont pas réinitialisées.

## Contrôles effectués ici

- 33 fichiers TS/TSX source passés dans le transpileur TypeScript : aucune erreur de syntaxe.
- Endpoints serveur `api/speech.ts`, `api/transcribe-voice.ts`, `api/analyze-reading.ts`, `api/analyze-speech.ts` et `api/chat.ts` : `tsc --noEmit --strict` réussi.
- Test simulé de l’endpoint TTS : authentification, payload Gemini `generateContent` et extraction du WAV réussis.
- Test simulé de l’endpoint transcription : authentification, quota, envoi audio et extraction de transcription réussis.
- Accolades CSS équilibrées ; JSON `package.json` valide.

## Ce qui reste à tester dans l’environnement réel

- `npm install` et `npm run build` : l’installation a expiré ici, donc le build Vite complet n’est pas confirmé.
- Test navigateur réel et captures mobile : non exécutés dans cet environnement, faute de dépendances installées.
- Appels réels à Gemini/Agnes et Supabase : non exécutés, car les secrets de production ne sont pas disponibles ici.
- Vérifier dans Supabase que `consume_ai_chat_quota` existe ; l’API échoue volontairement en mode fermé si la protection de quota manque.
- Vérifier sur Android/iOS le codec MediaRecorder, l’autorisation du microphone, la transcription et la lecture du WAV.
- Le fallback vocal du navigateur dépend des voix françaises installées sur l’appareil.

## Sécurité / migration

- Ne pas réinitialiser Supabase.
- Ne pas supprimer les tables, politiques RLS, relations ou triggers existants.
- Vérifier l’état des migrations additives avant de les appliquer.
- Garder `AGNES_AI_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` côté serveur.
- Ne jamais placer de clé privée dans une variable `VITE_`.

**Statut :** corrections visuelles et logiques intégrées ; contrôles statiques et tests simulés réussis. Le build complet et les tests réels mobile/IA/Supabase restent à confirmer avant production.
