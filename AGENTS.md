# ELOQIA — règles du projet

- Conserver l’interface, la mise en page, les couleurs, les composants et les animations existants. Ne modifier le design que sur demande explicite.
- Toute clé API privée doit rester côté serveur, dans les variables d’environnement sans préfixe `VITE_`.
- Le coach conversationnel utilise Agnes AI. La transcription, l’analyse audio et la synthèse vocale utilisent Google Gemini.
- Les fonctions serveur qui lisent des données utilisateur doivent utiliser `requireSupabaseAuth` et respecter les politiques RLS Supabase.
- Ne jamais inclure `.env`, de jeton, de clé privée ou de secret dans Git ou dans une archive distribuée.
- Avant une livraison, lancer le build, le typage et les tests lorsque l’environnement permet l’installation des dépendances.
