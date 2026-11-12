# État de la livraison V1.2 — backend conversationnel

## Inclus

- Frontend React + TypeScript + Vite existant, conservé.
- Correction du doublon `Sparkles` dans `CoachPage.tsx` conservée.
- Coach frontend qui transmet la langue de pratique (`fr` ou `en`).
- Fonction serverless Vercel `api/chat.ts`.
- Vérification du JWT Supabase via Auth.
- Contrôle de propriété de la conversation avec le JWT de l'utilisateur et les politiques RLS.
- Appel Agnes AI côté serveur, Gemini en solution de repli.
- Timeout des fournisseurs, limite de taille du message, fenêtre de contexte, contrôle d'origine et réponses d'erreur génériques.
- Migration additive `supabase/ai_chat_security.sql` pour appliquer 8 requêtes par utilisateur sur 60 secondes.
- Documentation de configuration et de déploiement.

## Non inclus / configuration encore requise

- La migration `supabase/ai_chat_security.sql` doit être exécutée dans le SQL Editor Supabase.
- Les variables serveur Vercel doivent être renseignées.
- La disponibilité des modèles et clés Agnes/Gemini doit être vérifiée avec les comptes du propriétaire.
- Le schéma réel des tables existantes doit être confirmé avec `supabase/diagnostics.sql`.
- Le quota actuel est un rate limit technique, pas encore les plafonds Free/Premium commerciaux.
- Le rate limit IP distribué, l'audio, la synthèse vocale, les analyses vocales, la facturation et l'administration restent à développer.

## Sécurité

- Aucun `service_role` n'est nécessaire dans le backend chat : les requêtes REST utilisent le JWT de l'utilisateur et la clé publishable Supabase.
- Les clés Agnes AI et Gemini sont des variables serveur uniquement.
- La fonction SQL de quota utilise `auth.uid()`, un verrou transactionnel par utilisateur, et ne donne aucun accès direct à la table des événements.
- La table et la fonction ajoutées sont additives et ne modifient pas les cinq tables existantes.

## Vérifications effectuées dans cette livraison

- Contrôle de syntaxe TypeScript/TSX du frontend et de l'endpoint serverless.
- Contrôle de cohérence des chemins d'API et du contrat JSON.
- Archive ZIP créée et inspectée.
- Aucun test de bout en bout réel n'a été possible sans accès aux secrets Agnes/Gemini et à l'exécution SQL du projet Supabase.
- Le build Vite complet doit être relancé sur la machine de développement après `npm install`.
