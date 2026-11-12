# SPEAKUP AI — Architecture et feuille de route PWA

## Décision produit

La première version commercialisable sera une Progressive Web App (PWA). Elle reste une application web accessible par URL, mais peut être installée depuis le navigateur sur l'écran d'accueil d'un téléphone et s'ouvrir dans une fenêtre autonome. Elle n'est pas, à ce stade, une application native ni une fiche publiée sur Google Play ou l'App Store.

## Architecture conservée

- Frontend : React + TypeScript + Vite.
- PWA : `vite-plugin-pwa` / Workbox, Web App Manifest et Service Worker.
- Hébergement et fonctions serveur : Vercel.
- Backend conversationnel existant : `/api/chat`.
- Authentification et données : projet Supabase existant, sans réinitialisation des cinq tables.
- IA conversationnelle : Agnes AI en principal, Gemini en secours, avec les secrets uniquement dans l'environnement serveur.

## Ce que fait la couche PWA

- Définit le nom, les couleurs, l'URL de lancement et les icônes de SpeakUp AI.
- Enregistre un Service Worker pour mettre en cache les ressources statiques nécessaires à l'ouverture de l'interface.
- Propose l'installation Android lorsque le navigateur déclenche `beforeinstallprompt`.
- Affiche les instructions d'ajout à l'écran d'accueil sur iPhone/iPad.
- Propose à l'utilisateur de recharger l'application lorsqu'une nouvelle version est prête.
- Affiche l'état hors connexion.

## Politique de cache et confidentialité

Le cache PWA doit rester limité aux ressources statiques compilées : HTML, JavaScript, CSS, polices et icônes.

Ne jamais mettre en cache :
- `/api/*` ;
- les réponses Supabase ;
- les sessions et jetons d'authentification ;
- les conversations et messages privés ;
- les fichiers audio et transcriptions ;
- les réponses IA ;
- les paiements ou webhooks.

Les appels vers `/api/*` et le domaine Supabase utilisent une stratégie réseau uniquement. L'interface peut s'ouvrir hors connexion si ses ressources ont déjà été mises en cache, mais les conversations, la connexion, la transcription, les analyses IA et la synchronisation nécessitent Internet.

## Contraintes microphone

- Accès microphone uniquement après une action explicite de l'utilisateur.
- Utiliser `getUserMedia()` et `MediaRecorder` lorsque le navigateur les prend en charge.
- Vérifier `MediaRecorder.isTypeSupported()` et sélectionner un format réellement pris en charge par le navigateur.
- Exiger HTTPS en production ; `localhost` est accepté pour le développement.
- Traiter proprement les refus de permission, l'absence de microphone, les interruptions, les changements de format et les pertes réseau.
- Tester sur de vrais appareils Android Chrome et iPhone Safari. Le support d'une API par un navigateur ne garantit pas que tous les formats audio soient identiques.
- Ne pas sauvegarder l'audio privé dans le cache Service Worker.

## Installation utilisateur

### Android

Ouvrir l'URL HTTPS dans un navigateur compatible. Utiliser le bouton d'installation intégré lorsqu'il est proposé, ou l'option du navigateur « Installer l'application » / « Ajouter à l'écran d'accueil » selon le navigateur.

### iPhone et iPad

Ouvrir l'URL dans Safari, utiliser Partager, puis « Sur l'écran d'accueil ». Lorsque l'option est présentée, activer « Ouvrir comme app web » avant d'ajouter.

Les notifications Web Push sur iOS/iPadOS sont à envisager après le MVP ; elles nécessitent une web app ajoutée à l'écran d'accueil et un système serveur Push correctement configuré. Elles sont documentées par Apple pour iOS/iPadOS 16.4 et ultérieur.

## Paiements

Pour la PWA, prévoir un paiement Web hébergé par un prestataire vérifié pour le pays de domiciliation et les versements au Sénégal. L'état d'abonnement doit être mis à jour par webhook serveur vérifié, puis appliqué côté backend.

RevenueCat / StoreKit / Google Play Billing ne sont pas nécessaires au lancement PWA. Ils seront envisagés lors de l'emballage natif avec Capacitor et de la distribution dans les stores, selon les règles applicables.

## Feuille de route

### Phase PWA-1 — Socle installable
- Installer et configurer `vite-plugin-pwa`.
- Créer le manifest et les icônes adaptées.
- Ajouter le prompt d'installation Android et les instructions iOS.
- Ajouter les états hors ligne et de mise à jour.
- Vérifier que le cache ne stocke aucune donnée privée.
- Déployer sous HTTPS sur Vercel.

### Phase PWA-2 — Vérification backend existant
- Tester inscription, connexion, réinitialisation du mot de passe et création automatique du profil.
- Tester les conversations et messages avec deux comptes différents.
- Vérifier l'accès aux cinq tables via RLS.
- Tester `/api/chat` avec Agnes AI, puis confirmer le fallback Gemini.
- Ne pas modifier le schéma existant sans diagnostic et migration additive.

### Phase PWA-3 — Module vocal V1 (lecture guidée livrée, tests réels à faire)
- Téléprompteur français/anglais avec défilement réglable et contrôle de la taille de texte.
- Enregistrement via `getUserMedia` et `MediaRecorder`, pause/reprise et annulation.
- Endpoint serveur `POST /api/analyze-reading` avec validation du type audio, de la taille, de la durée et de la session Supabase.
- Envoi temporaire de l'audio à Gemini pour transcription et retour pédagogique ; ce endpoint ne sauvegarde pas l'audio dans Supabase.
- Rapport : résumé, points forts, améliorations, habitudes à surveiller, exercice suivant et note de confiance.
- Sauvegarde du bilan pédagogique dans une conversation existante au moyen des tables `conversations` et `messages`.
- À valider sur appareils réels : Android Chrome et iPhone Safari, formats audio, qualité selon les accents, limite de taille et gestion des interruptions.
- Une future évolution pourra déplacer les audios vers un bucket privé si un besoin de reprise, conservation ou traitement différé le justifie, avec suppression automatique documentée.

### Phase PWA-4 — Parcours pédagogiques
- Bibliothèque initiale de textes de lecture guidée français/anglais.
- Exercices complémentaires de diction et expression spontanée.
- Parcours français et anglais.
- Simulations d'entretien et de présentation.
- Programme de 30 jours.
- Progression fondée sur les sessions réellement terminées.

### Phase PWA-5 — Abonnements Web
- Définir Free et Premium.
- Choisir un prestataire après vérification de l'éligibilité au Sénégal, des devises, commissions et versements.
- Créer les webhooks serveur avec validation de signature et idempotence.
- Centraliser les droits et quotas côté backend.
- Ajouter l'écran de gestion et d'annulation de l'abonnement.

### Phase PWA-6 — Bêta et lancement
- Tester sur plusieurs appareils et navigateurs.
- Vérifier accessibilité, sécurité, performance, installation et mises à jour.
- Ajouter politique de confidentialité, conditions et support.
- Déployer et mesurer activation, rétention, conversion et coût IA par abonné.

### Phase ultérieure — Stores
- Emballer le frontend PWA avec Capacitor si la validation commerciale le justifie.
- Ajouter les plugins natifs nécessaires.
- Adapter les achats numériques aux règles Apple/Google et effectuer les tests de publication.
- Réutiliser Supabase et les fonctions serveur existantes.

## Critères d'acceptation PWA

- Manifest valide avec icônes 192 et 512 px et affichage `standalone`.
- Application installable et lancée depuis l'écran d'accueil sur les appareils testés.
- Interface responsive utilisable sur petits écrans.
- HTTPS obligatoire pour le microphone en production.
- Aucun appel API, message, audio, transcription ou réponse IA stocké dans le cache Service Worker.
- Les routes API ne sont pas remplacées par le fallback SPA.
- Une mise à jour ne coupe pas un enregistrement en cours sans avertissement.
- Mode hors connexion clairement expliqué : l'interface statique peut s'ouvrir, les fonctions nécessitant le serveur restent indisponibles.
- Les politiques RLS et secrets backend restent inchangés et vérifiés.
