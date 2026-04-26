/* ════════════════════════════════════════════
   HABLA — questions.js
   Contient TOUTES les données de contenu :
   - Étapes d'onboarding
   - Questions du test de niveau
   - Leçons et leurs exercices
   Pour ajouter du contenu, modifie CE FICHIER.
════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   ONBOARDING — 3 étapes de personnalisation
────────────────────────────────────────── */
const OB_STEPS = [
  {
    emoji: '🎯',
    title: 'Quel est ton objectif ?',
    sub: 'Choisis ton but principal',
    choices: [
      { icon: '✈️', text: 'Voyager en Espagne' },
      { icon: '💼', text: 'Travailler en espagnol' },
      { icon: '🎬', text: 'Comprendre les films' },
      { icon: '🏆', text: 'Maîtriser la langue' },
    ],
  },
  {
    emoji: '⏰',
    title: 'Combien de temps par jour ?',
    sub: 'Adapte à ton emploi du temps',
    choices: [
      { icon: '⚡', text: '5 min / jour (casual)' },
      { icon: '🔥', text: '10 min / jour (régulier)' },
      { icon: '💪', text: '20 min / jour (intensif)' },
      { icon: '🚀', text: '30 min+ / jour (expert)' },
    ],
  },
  {
    emoji: '🧠',
    title: 'Ton niveau actuel ?',
    sub: 'Sois honnête pour personnaliser ton parcours',
    choices: [
      { icon: '🌱', text: 'Zéro connaissance' },
      { icon: '🌿', text: 'Quelques mots' },
      { icon: '🌳', text: 'Bases acquises' },
      { icon: '🏔️', text: 'Intermédiaire+' },
    ],
  },
];

/* ──────────────────────────────────────────
   TEST DE NIVEAU — 5 questions MCQ
   ans : index de la bonne réponse (0-based)
────────────────────────────────────────── */
const TEST_QUESTIONS = [
  {
    cat: 'VOCABULAIRE',
    q: 'Que signifie "Hola" ?',
    opts: ['Bonjour', 'Au revoir', 'Merci', "S'il vous plaît"],
    ans: 0,
  },
  {
    cat: 'VOCABULAIRE',
    q: 'Quel mot signifie "maison" ?',
    opts: ['perro', 'casa', 'agua', 'libro'],
    ans: 1,
  },
  {
    cat: 'GRAMMAIRE',
    q: 'Complète : "Yo ___ español"',
    opts: ['habla', 'hablo', 'hablas', 'hablan'],
    ans: 1,
  },
  {
    cat: 'TRADUCTION',
    q: 'Traduis : "El gato es negro"',
    opts: ['Le chien est blanc', 'Le chat est noir', 'Le chien est noir', 'Le chat est blanc'],
    ans: 1,
  },
  {
    cat: 'VOCABULAIRE',
    q: 'Quel mot désigne "eau" ?',
    opts: ['leche', 'vino', 'agua', 'zumo'],
    ans: 2,
  },
];

/* ──────────────────────────────────────────
   LEÇONS
   Chaque leçon contient un tableau questions[].
   Types disponibles :
     "mcq"   → QCM classique
     "audio" → Écoute + reconstitution de phrase

   Structure MCQ :
     { type, cat, q, opts[], ans }

   Structure Audio :
     { type, cat, q, audio, audioFr, words[], correct[] }
     audio    : texte lu par la synthèse vocale (espagnol)
     audioFr  : traduction affichée si erreur
     words    : tous les tokens disponibles dans la banque
     correct  : tableau des mots qui valident la réponse
────────────────────────────────────────── */
const LESSONS = {

  /* ── Salutations ── */
  salutations: {
    title: 'Salutations',
    icon: '💬',
    questions: [
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Que signifie "Hola" ?',
        opts: ['Bonjour', 'Au revoir', 'Merci', "S'il vous plaît"],
        ans: 0,
      },
      {
        type: 'audio',
        cat: 'ÉCOUTE',
        q: 'Écoute et traduis la phrase',
        audio: 'Buenos días',
        audioFr: 'Bonjour / Bonne journée',
        words: ['Bonjour', 'Bonsoir', 'Bonne', 'nuit', 'journée'],
        correct: ['Bonjour'],
      },
      {
        type: 'mcq',
        cat: 'GRAMMAIRE',
        q: 'Comment dit-on "Bonsoir" en espagnol ?',
        opts: ['Buenos días', 'Buenas noches', 'Buenas tardes', 'Hasta luego'],
        ans: 2,
      },
      {
        type: 'audio',
        cat: 'ÉCOUTE',
        q: 'Écoute et traduis la phrase',
        audio: '¿Cómo estás?',
        audioFr: 'Comment vas-tu ?',
        words: ['Comment', 'vas-tu', 'Qui', 'es-tu', 'Où', 'vas', 'tu'],
        correct: ['Comment', 'vas-tu'],
      },
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Que signifie "Hasta luego" ?',
        opts: ['Bonjour', 'À bientôt / Au revoir', 'Merci', 'De rien'],
        ans: 1,
      },
    ],
  },

  /* ── La nourriture ── */
  nourriture: {
    title: 'La nourriture',
    icon: '🍎',
    questions: [
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Comment dit-on "pomme" en espagnol ?',
        opts: ['naranja', 'manzana', 'plátano', 'uva'],
        ans: 1,
      },
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Que signifie "agua" ?',
        opts: ['jus', 'lait', 'eau', 'vin'],
        ans: 2,
      },
      {
        type: 'audio',
        cat: 'ÉCOUTE',
        q: 'Écoute et traduis la phrase',
        audio: 'Tengo hambre',
        audioFr: "J'ai faim",
        words: ["J'ai", 'faim', 'soif', "J'aime", 'manger'],
        correct: ["J'ai", 'faim'],
      },
      {
        type: 'mcq',
        cat: 'TRADUCTION',
        q: 'Traduis : "El pan es delicioso"',
        opts: ['Le vin est délicieux', 'La viande est bonne', 'Le pain est délicieux', 'Le gâteau est sucré'],
        ans: 2,
      },
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Comment dit-on "poulet" en espagnol ?',
        opts: ['cerdo', 'ternera', 'pollo', 'pescado'],
        ans: 2,
      },
    ],
  },

  /* ── La maison ── */
  maison: {
    title: 'La maison',
    icon: '🏠',
    questions: [
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Comment dit-on "chambre" en espagnol ?',
        opts: ['cocina', 'baño', 'dormitorio', 'salón'],
        ans: 2,
      },
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Que signifie "ventana" ?',
        opts: ['porte', 'fenêtre', 'toit', 'mur'],
        ans: 1,
      },
      {
        type: 'audio',
        cat: 'ÉCOUTE',
        q: 'Écoute et traduis la phrase',
        audio: 'La casa es grande',
        audioFr: 'La maison est grande',
        words: ['La', 'maison', 'est', 'grande', 'belle', 'petite'],
        correct: ['La', 'maison', 'est', 'grande'],
      },
      {
        type: 'mcq',
        cat: 'TRADUCTION',
        q: 'Traduis : "Mi cocina es pequeña"',
        opts: ['Ma salle de bain est grande', 'Ma cuisine est petite', 'Mon salon est petit', 'Ma chambre est grande'],
        ans: 1,
      },
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Comment dit-on "escalier" ?',
        opts: ['puerta', 'escalera', 'techo', 'suelo'],
        ans: 1,
      },
    ],
  },

  /* ── Défi du jour ── */
  defi: {
    title: 'Défi du jour',
    icon: '⚡',
    questions: [
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Que signifie "perro" ?',
        opts: ['chat', 'chien', 'oiseau', 'lapin'],
        ans: 1,
      },
      {
        type: 'mcq',
        cat: 'GRAMMAIRE',
        q: 'Complète : "Ella ___ estudiante"',
        opts: ['soy', 'eres', 'es', 'somos'],
        ans: 2,
      },
      {
        type: 'audio',
        cat: 'ÉCOUTE',
        q: 'Écoute et traduis la phrase',
        audio: 'Me llamo Léo',
        audioFr: "Je m'appelle Léo",
        words: ['Je', "m'appelle", 'Tu', "t'appelles", 'Léo', 'Marie'],
        correct: ['Je', "m'appelle", 'Léo'],
      },
      {
        type: 'mcq',
        cat: 'VOCABULAIRE',
        q: 'Comment dit-on "livre" ?',
        opts: ['mesa', 'silla', 'libro', 'lápiz'],
        ans: 2,
      },
      {
        type: 'mcq',
        cat: 'TRADUCTION',
        q: 'Traduis : "Hace mucho calor"',
        opts: ['Il fait très froid', 'Il fait très chaud', 'Il pleut beaucoup', 'Le soleil brille'],
        ans: 1,
      },
    ],
  },

  /* ── Les verbes (verrouillée — niveau 3) ── */
  verbes: {
    title: 'Les verbes',
    icon: '📚',
    locked: true,
    questions: [
      {
        type: 'mcq',
        cat: 'GRAMMAIRE',
        q: 'Conjugue "hablar" à la 1ère personne : "Yo ___"',
        opts: ['hablas', 'hablo', 'habla', 'hablamos'],
        ans: 1,
      },
      {
        type: 'mcq',
        cat: 'GRAMMAIRE',
        q: 'Quel verbe signifie "avoir" ?',
        opts: ['ser', 'estar', 'tener', 'ir'],
        ans: 2,
      },
      {
        type: 'audio',
        cat: 'ÉCOUTE',
        q: 'Écoute et traduis la phrase',
        audio: 'Quiero comer pizza',
        audioFr: 'Je veux manger une pizza',
        words: ['Je', 'veux', 'mange', 'manger', 'une', 'pizza', 'des', 'pâtes'],
        correct: ['Je', 'veux', 'manger', 'une', 'pizza'],
      },
      {
        type: 'mcq',
        cat: 'GRAMMAIRE',
        q: '"Nosotros ___" — complète avec "ir"',
        opts: ['voy', 'vas', 'va', 'vamos'],
        ans: 3,
      },
      {
        type: 'mcq',
        cat: 'TRADUCTION',
        q: 'Traduis : "Ella puede hablar francés"',
        opts: ['Elle veut parler français', 'Elle peut parler français', 'Elle sait écrire le français', 'Elle aime le français'],
        ans: 1,
      },
    ],
  },

};
