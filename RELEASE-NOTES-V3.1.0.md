# Eloquia PWA — version 3.1.0

Cette version corrige les incohérences visuelles et les problèmes signalés lors des essais mobiles de la V3.0.0. Elle conserve l’architecture React/TypeScript, Supabase, les API Vercel et les migrations existantes.

## Identité graphique

- Palette unifiée : teal profond comme couleur principale, vert-bleuté pour les états et ambre doux réservé aux défis/récompenses.
- Suppression des accents bleus et roses résiduels dans les composants courants des exercices, du coach et des bilans.
- Thème clair par défaut et thème sombre harmonisé.
- Contrastes renforcés pour les boutons, liens, sélecteurs et zones tactiles.

## Exercices et défi

- Parcours mobile allégé : descriptions limitées à deux lignes sur téléphone.
- Étape courante plus visible et boutons d’ouverture plus grands.
- Défi du jour mis en évidence avec une couleur ambre cohérente avec la charte teal, une animation d’arrivée et un CTA renforcé.

## Téléprompteur

- Remplacement de la longue liste de textes par un sélecteur compact : le téléprompteur est visible beaucoup plus tôt dans la page.
- Défilement `requestAnimationFrame` renforcé pour attendre la stabilisation du layout mobile avant de démarrer.
- Ajout d’un bouton de test du défilement sans lancer un enregistrement.
- Contrôles adaptés aux petits écrans et zone de lecture plus lisible.

## Coach vocal et IA

- Correction de l’endpoint de synthèse vocale : utilisation du schéma Gemini TTS `generateContent` documenté, avec réponse WAV et fallback Flash-Lite.
- La réponse vocale peut utiliser une voix française native du navigateur si la synthèse distante ou la lecture audio échoue. Le fallback est signalé à l’utilisateur.
- Arrêt du coach interrompt également la synthèse vocale du navigateur.
- Modèle par défaut de transcription audio réglé sur Gemini 2.5 Flash, avec possibilité de surcharge par variable serveur.
- Compatibilité avec les anciens noms de variables Agnes (`AGNES_API_KEY`, `AGNES_MODEL`, `AGNES_API_URL`) en plus des noms `AGNES_AI_*`.
- Voix Achernar (féminine) et Charon (masculine) conservées.

## Données et sécurité

- Aucune table historique, politique RLS, relation ou déclencheur Supabase n’a été supprimé ou réinitialisé.
- Aucune clé privée n’est ajoutée au frontend.
- Les migrations restent additives et doivent être vérifiées avant application.

## Installation

1. Sauvegarder le dossier de projet actuel.
2. Conserver `.env.local`, `.git` et `.vercel`.
3. Remplacer les fichiers du projet avec ceux de l’archive, sans écraser ces éléments locaux.
4. Lancer `npm install`, `npm run build`, puis `npm run dev:full`.
5. Vérifier les variables serveur Supabase/Gemini et l’existence de `consume_ai_chat_quota` dans Supabase.

## Limites et validations restantes

- La caméra du téléprompteur n’est pas incluse ; l’analyse repose sur l’audio.
- Le build Vite complet n’a pas pu être exécuté ici : l’installation npm a expiré et les dépendances n’étaient pas disponibles.
- Les endpoints vocaux ont passé des tests simulés (authentification, schéma de requête Gemini, extraction d’une transcription et réponse WAV), pas des appels réels avec les clés du propriétaire.
- Les essais sur appareils Android/iOS, les permissions micro, la lecture audio et les appels réels Supabase/Gemini doivent encore être effectués dans l’environnement du projet.
