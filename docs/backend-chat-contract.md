# Contrat backend — Coach conversationnel SpeakUp AI

Le projet contient la fonction Vercel `api/chat.ts`. Le navigateur appelle uniquement cette fonction ; il n'appelle jamais Agnes AI ou Gemini directement.

## Endpoint

`POST /api/chat`

### Authentification

`Authorization: Bearer <Supabase access token>`

Le backend vérifie le jeton auprès de Supabase Auth. Il ne fait jamais confiance à un `user_id` envoyé par le client.

### Requête

```json
{
  "conversation_id": "UUID",
  "message": "Texte de l'utilisateur",
  "language": "fr"
}
```

`language` accepte `fr` ou `en`.

### Réponse 200

```json
{
  "reply": "Réponse du coach pédagogique",
  "provider": "agnes"
}
```

`provider` indique `agnes` ou `gemini`.

### Codes d'erreur

- `400` : corps invalide.
- `401` : jeton absent ou invalide.
- `403` : origine non autorisée ou conversation n'appartenant pas à l'utilisateur.
- `409` : le message n'a pas été enregistré dans la conversation avant l'appel.
- `413` : requête trop volumineuse.
- `429` : quota anti-abus atteint.
- `502` : Supabase ou les fournisseurs IA n'ont pas pu traiter la requête.
- `503` : variables serveur ou migration de quota manquantes.
- `500` : erreur interne avec journal technique limité, sans fuite de secret.

## Séquence

1. Valider l'origine et la méthode HTTP.
2. Vérifier le JWT Supabase via `/auth/v1/user`.
3. Vérifier la conversation avec `id` et `user_id`, en utilisant la clé publishable et le JWT de l'utilisateur.
4. Charger les 20 messages les plus récents par `conversation_id` et `user_id`, puis les remettre dans l’ordre chronologique.
5. Vérifier que le message utilisateur courant a bien été enregistré.
6. Consommer le quota atomiquement avec `public.consume_ai_chat_quota`.
7. Envoyer le contexte à Agnes AI côté serveur.
8. En cas d'échec Agnes, essayer Gemini.
9. Retourner le texte du coach et le fournisseur utilisé.

Le frontend enregistre le message utilisateur avant l'appel, puis enregistre la réponse assistant après le retour. Le backend ne crée donc pas de doublons.

## Variables serveur Vercel

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY` pour une ancienne configuration)
- `AGNES_AI_API_KEY`
- `AGNES_AI_MODEL` (défaut du code : `agnes-3.0-flash`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `ALLOWED_ORIGINS` (facultatif, origines séparées par des virgules si API et frontend sont sur des domaines différents)

Aucun secret fournisseur ni clé `service_role` n'est requis dans le navigateur.

## Exécution Vercel

`vercel.json` configure `maxDuration: 60` pour `api/chat.ts`, dans la limite du plan Vercel. Chaque appel Supabase possède un timeout de 8 secondes et chaque fournisseur IA un timeout de 25 secondes.

## Rate limit

Exécuter une fois `supabase/ai_chat_security.sql`. Cette migration crée une table interne sans accès direct pour `anon` et `authenticated`, ainsi qu'une fonction SQL `SECURITY DEFINER` qui utilise `auth.uid()` et un verrou transactionnel par utilisateur. Valeur par défaut dans le code : 8 requêtes par 60 secondes.

## Limites et points avant production

- Le quota actuel est par utilisateur, pas par adresse IP. Ajouter une protection WAF/edge ou un rate limiter distribué IP avant une ouverture publique importante.
- Les limites d'abonnement Free/Premium ne sont pas encore appliquées : elles nécessitent la future intégration de la facturation et d'une source de vérité d'entitlement.
- Le modèle Agnes et le modèle Gemini restent configurables ; vérifier leur disponibilité et les quotas des comptes avant production.
- Les logs ne doivent pas contenir les messages, transcriptions, jetons ou clés.
