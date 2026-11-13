export interface PracticeQuestion { prompt: string; choices: string[]; answer: number; explanation: string }
export interface PracticeExercise { id: string; title: string; category: string; level: string; duration: string; objective: string; questions: PracticeQuestion[] }

export const PRACTICE_BANK: PracticeExercise[] = [
 { id:'en-a1-01',title:'Se présenter avec naturel',category:'Expression orale',level:'A1 · Débutant',duration:'8 min',objective:'Construire une présentation simple et correcte.',questions:[
  {prompt:'Choose the correct introduction.',choices:['I am called Sarah.','My name is Sarah.','I have Sarah.'],answer:1,explanation:'“My name is…” est la formule la plus naturelle pour donner son nom.'},
  {prompt:'Complete: I ___ from Senegal.',choices:['am','is','are'],answer:0,explanation:'Avec “I”, on utilise “am”.'},
  {prompt:'How do you say « J’ai 25 ans »?',choices:['I have 25 years.','I am 25 years.','I am 25 years old.'],answer:2,explanation:'En anglais, l’âge se construit avec “to be”, pas “to have”.'},
  {prompt:'Choose a natural sentence about your job.',choices:['I work as a designer.','I work like designer.','I am work designer.'],answer:0,explanation:'“I work as a…” présente naturellement une profession.'},
  {prompt:'Which phrase politely ends a short introduction?',choices:['That is all. Bye.','It is nice to meet you.','I finish.'],answer:1,explanation:'“It is nice to meet you” est une conclusion polie et naturelle.'}
 ]},
 { id:'en-a1-02',title:'Les verbes essentiels au présent',category:'Grammaire',level:'A1 · Débutant',duration:'10 min',objective:'Maîtriser be, have, do et les verbes fréquents.',questions:[
  {prompt:'She ___ a student.',choices:['are','is','am'],answer:1,explanation:'Avec “she”, le verbe “be” devient “is”.'},
  {prompt:'They ___ two children.',choices:['has','have','having'],answer:1,explanation:'Avec “they”, on emploie “have”.'},
  {prompt:'___ you speak English?',choices:['Are','Does','Do'],answer:2,explanation:'Au présent simple, la question avec “you” utilise “do”.'},
  {prompt:'He ___ to work every day.',choices:['go','goes','going'],answer:1,explanation:'À la troisième personne du singulier, on ajoute généralement -s ou -es.'},
  {prompt:'Choose the correct negative form.',choices:['She don’t like tea.','She doesn’t likes tea.','She doesn’t like tea.'],answer:2,explanation:'Après “doesn’t”, le verbe reste à sa forme de base.'}
 ]},
 { id:'en-a1-03',title:'Vocabulaire du quotidien',category:'Vocabulaire',level:'A1 · Débutant',duration:'8 min',objective:'Comprendre et employer des mots utiles dans la vie courante.',questions:[
  {prompt:'What does “groceries” mean?',choices:['Des vêtements','Des courses alimentaires','Des meubles'],answer:1,explanation:'“Groceries” désigne les produits alimentaires et articles achetés au supermarché.'},
  {prompt:'Choose the opposite of “early”.',choices:['Late','Fast','Soon'],answer:0,explanation:'“Late” est le contraire de “early”.'},
  {prompt:'Where do you borrow a book?',choices:['At a library','At a bakery','At a station'],answer:0,explanation:'On emprunte des livres à la bibliothèque : “library”.'},
  {prompt:'What is a “receipt”?',choices:['Une recette','Un reçu','Une réservation'],answer:1,explanation:'Un reçu de paiement se dit “receipt”.'},
  {prompt:'Complete: I need to ___ an appointment.',choices:['make','do','take'],answer:0,explanation:'L’expression courante est “make an appointment”.'}
 ]},
 { id:'en-a2-01',title:'Parler de ses habitudes',category:'Grammaire',level:'A2 · Élémentaire',duration:'12 min',objective:'Distinguer les habitudes des actions en cours.',questions:[
  {prompt:'I usually ___ coffee in the morning.',choices:['drink','am drinking','drinks'],answer:0,explanation:'“Usually” indique une habitude : présent simple.'},
  {prompt:'Look! It ___ outside.',choices:['rains','is raining','rain'],answer:1,explanation:'“Look!” signale une action en cours : present continuous.'},
  {prompt:'She never ___ late.',choices:['arrive','arrives','is arrive'],answer:1,explanation:'“She” prend la terminaison -s au présent simple.'},
  {prompt:'We ___ TV right now.',choices:['watch','watches','are watching'],answer:2,explanation:'“Right now” appelle le présent continu.'},
  {prompt:'Which adverb means « rarement »?',choices:['Often','Rarely','Always'],answer:1,explanation:'“Rarely” signifie rarement.'}
 ]},
 { id:'en-a2-02',title:'Raconter une expérience passée',category:'Grammaire',level:'A2 · Élémentaire',duration:'12 min',objective:'Utiliser correctement le prétérit et les marqueurs temporels.',questions:[
  {prompt:'Yesterday, we ___ a new restaurant.',choices:['visit','visited','have visit'],answer:1,explanation:'“Yesterday” appelle généralement le prétérit.'},
  {prompt:'What is the past of “buy”?',choices:['Buyed','Bought','Buying'],answer:1,explanation:'“Buy” est irrégulier : son prétérit est “bought”.'},
  {prompt:'___ you see the match last night?',choices:['Did','Do','Were'],answer:0,explanation:'Les questions au prétérit utilisent “did”.'},
  {prompt:'I didn’t ___ the email.',choices:['received','receive','receiving'],answer:1,explanation:'Après “didn’t”, le verbe reste à la base verbale.'},
  {prompt:'Choose the correct sentence.',choices:['They was happy.','They were happy.','They be happy.'],answer:1,explanation:'Le prétérit de “be” avec “they” est “were”.'}
 ]},
 { id:'en-b1-01',title:'Exprimer son opinion et argumenter',category:'Expression',level:'B1 · Intermédiaire',duration:'15 min',objective:'Présenter une opinion, la justifier et nuancer son propos.',questions:[
  {prompt:'Which phrase introduces an opinion?',choices:['In my opinion,','On the contrary of,','I am agree that,'],answer:0,explanation:'“In my opinion” introduit clairement un point de vue.'},
  {prompt:'Choose the best connector for a contrast.',choices:['Therefore','However','Moreover'],answer:1,explanation:'“However” introduit une opposition ou une nuance.'},
  {prompt:'Complete: The proposal is useful; ___, it is expensive.',choices:['although','however','because'],answer:1,explanation:'“However” relie deux idées contrastées.'},
  {prompt:'Which is grammatically correct?',choices:['I agree with you.','I am agree with you.','I agreeing you.'],answer:0,explanation:'“Agree” est un verbe : on dit “I agree”.'},
  {prompt:'A strong argument should include…',choices:['Only a personal attack','A claim and supporting reasons','Several unrelated ideas'],answer:1,explanation:'Un argument convaincant associe une idée à des raisons ou des exemples.'}
 ]},
 { id:'en-b1-02',title:'Comprendre un message professionnel',category:'Compréhension',level:'B1 · Intermédiaire',duration:'15 min',objective:'Identifier l’intention, les informations et le ton d’un message.',questions:[
  {prompt:'“Could you send me the report by Friday?” is…',choices:['A polite request','A complaint','A celebration'],answer:0,explanation:'“Could you…” formule une demande polie.'},
  {prompt:'What does “deadline” mean?',choices:['Une réunion','Une date limite','Un brouillon'],answer:1,explanation:'“Deadline” désigne la date ou l’heure limite.'},
  {prompt:'Which closing is suitable for a formal email?',choices:['See ya!','Kind regards,','Later dude,'],answer:1,explanation:'“Kind regards” est une formule professionnelle courante.'},
  {prompt:'“I am writing to follow up” means…',choices:['Je relance au sujet de','Je refuse de lire','Je termine le contrat'],answer:0,explanation:'“To follow up” signifie revenir vers quelqu’un pour faire le suivi.'},
  {prompt:'What should a clear professional email contain?',choices:['A vague subject','One main purpose and a clear request','Many unrelated topics'],answer:1,explanation:'Un message professionnel doit être ciblé et explicite.'}
 ]},
 { id:'en-b1-03',title:'Prépositions et expressions naturelles',category:'Grammaire',level:'B1 · Intermédiaire',duration:'12 min',objective:'Éviter les erreurs fréquentes avec les prépositions.',questions:[
  {prompt:'I am interested ___ technology.',choices:['on','in','at'],answer:1,explanation:'On dit “interested in”.'},
  {prompt:'She is good ___ explaining ideas.',choices:['at','in','for'],answer:0,explanation:'On dit “good at” suivi d’un nom ou d’un verbe en -ing.'},
  {prompt:'We arrived ___ the airport early.',choices:['to','at','on'],answer:1,explanation:'On dit “arrive at” pour un lieu précis comme un aéroport.'},
  {prompt:'He has worked here ___ 2022.',choices:['for','since','during'],answer:1,explanation:'“Since” introduit le point de départ.'},
  {prompt:'I have lived here ___ three years.',choices:['since','for','from'],answer:1,explanation:'“For” exprime une durée.'}
 ]},
 { id:'en-b2-01',title:'Fluidité et précision à l’oral',category:'Expression orale',level:'B2 · Avancé',duration:'18 min',objective:'Structurer une réponse développée sans répétitions inutiles.',questions:[
  {prompt:'Which expression helps introduce an example?',choices:['For instance,','Despite of,','In spite because,'],answer:0,explanation:'“For instance” introduit un exemple.'},
  {prompt:'What is a useful strategy when you lose your train of thought?',choices:['Stop speaking permanently','Use a transition and reformulate','Repeat the same filler many times'],answer:1,explanation:'Une transition ou une reformulation permet de reprendre le fil.'},
  {prompt:'Choose the most concise sentence.',choices:['Due to the fact that it rained, we stayed in.','Because it rained, we stayed in.','The reason is because it rained.'],answer:1,explanation:'“Because” exprime la cause de façon directe.'},
  {prompt:'Which phrase signals a conclusion?',choices:['To sum up,','By the way,','For example,'],answer:0,explanation:'“To sum up” annonce une synthèse.'},
  {prompt:'What improves oral clarity most directly?',choices:['Speaking as fast as possible','Organising ideas and pausing meaningfully','Using complex words in every sentence'],answer:1,explanation:'La structure et les pauses facilitent la compréhension.'}
 ]},
 { id:'en-b2-02',title:'Simulation : entretien d’embauche',category:'Vie professionnelle',level:'B2 · Avancé',duration:'20 min',objective:'Répondre avec méthode à des questions professionnelles.',questions:[
  {prompt:'What does the STAR method stand for?',choices:['Situation, Task, Action, Result','Speak, Think, Answer, Repeat','Strategy, Talent, Ability, Role'],answer:0,explanation:'STAR structure une réponse autour du contexte, de la mission, des actions et du résultat.'},
  {prompt:'Which answer is strongest?',choices:['I am perfect.','I solve problems well; for example, I reduced delays by 20%.','I do everything.'],answer:1,explanation:'Un exemple concret rend la compétence crédible.'},
  {prompt:'How should you discuss a weakness?',choices:['Deny having any','Name one and explain how you improve it','Blame your former manager'],answer:1,explanation:'Une réponse honnête accompagnée d’un plan de progrès est plus professionnelle.'},
  {prompt:'“Tell me about yourself” should focus on…',choices:['Your entire childhood','Relevant experience, strengths and motivation','Unrelated personal details'],answer:1,explanation:'La présentation doit être concise et adaptée au poste.'},
  {prompt:'What is a good question to ask at the end?',choices:['What does success look like in this role?','How soon can I leave?','Can I skip the interview?'],answer:0,explanation:'Cette question montre votre intérêt pour les attentes du poste.'}
 ]},
 { id:'fr-b1-01',title:'Prendre la parole avec structure',category:'Éloquence',level:'B1 · Intermédiaire',duration:'15 min',objective:'Construire une intervention claire avec introduction, arguments et conclusion.',questions:[
  {prompt:'Quelle est la première étape d’une intervention structurée ?',choices:['Donner immédiatement tous les détails','Présenter le sujet et l’objectif','Conclure'],answer:1,explanation:'L’introduction donne un repère à l’auditoire.'},
  {prompt:'Quel connecteur introduit une conséquence ?',choices:['Cependant','Par conséquent','Par exemple'],answer:1,explanation:'“Par conséquent” introduit une conséquence.'},
  {prompt:'À quoi sert une pause dans un discours ?',choices:['À laisser respirer et comprendre','À accélérer le débit','À remplacer les arguments'],answer:0,explanation:'Une pause bien placée renforce la compréhension et l’impact.'},
  {prompt:'Quelle formulation est la plus précise ?',choices:['C’est un truc très bien','Cette méthode réduit le temps de traitement','Ça fait des choses'],answer:1,explanation:'Une formulation précise nomme l’effet concret.'},
  {prompt:'Une conclusion efficace doit…',choices:['Ajouter trois nouveaux sujets','Rappeler le message essentiel','Répéter toute l’introduction mot à mot'],answer:1,explanation:'La conclusion fixe le message principal.'}
 ]},
 { id:'fr-b2-01',title:'Convaincre sans agressivité',category:'Éloquence',level:'B2 · Avancé',duration:'18 min',objective:'Défendre une idée, écouter les objections et répondre avec nuance.',questions:[
  {prompt:'Quelle phrase reconnaît une objection avec respect ?',choices:['Votre idée est absurde.','Je comprends cette réserve ; voici un autre élément.','Vous n’avez rien compris.'],answer:1,explanation:'Reconnaître le point de vue facilite un échange constructif.'},
  {prompt:'Quel élément renforce le plus un argument ?',choices:['Une donnée vérifiable','Une attaque personnelle','Une répétition insistante'],answer:0,explanation:'Un fait ou un exemple vérifiable soutient l’argument.'},
  {prompt:'Que signifie nuancer son propos ?',choices:['Ne jamais prendre position','Préciser les limites et les conditions de son idée','Changer de sujet'],answer:1,explanation:'La nuance rend le raisonnement plus juste.'},
  {prompt:'Quel connecteur introduit une concession ?',choices:['Même si','Donc','Ensuite'],answer:0,explanation:'“Même si” introduit une concession.'},
  {prompt:'Lors d’un désaccord, il est préférable de…',choices:['Couper la parole','Reformuler le désaccord et répondre au fond','Hausser immédiatement la voix'],answer:1,explanation:'Reformuler permet de traiter l’idée sans attaquer la personne.'}
 ]}
];
