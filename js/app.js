/* ════════════════════════════════════════════
   HABLA — app.js  (version corrigée)
   Fixes inclus :
   ✅ Bug 1 — apostrophes dans onclick (tokens audio)
   ✅ Bug 2 — validation audio stricte (tous les mots corrects requis)
   ✅ Bug 3 — streak une fois par jour max (localStorage date)
   ✅ Bug 4 — localStorage : progression sauvegardée
   ✅ Bug 5 — déblocage dynamique selon XP / leçons complétées
   ✅ Bug 6 — questions adaptées au niveau détecté (A0/A2/B1)
════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   ÉTAT PAR DÉFAUT
────────────────────────────────────────── */
const DEFAULT_STATE = {
  totalXP:         0,
  streak:          0,
  lastPlayedDate:  null,        // date ISO "2024-01-15" — pour streak journalier
  userLevel:       'A0',        // niveau détecté : 'A0' | 'A2' | 'B1'
  lessonsUnlocked: 1,           // nombre de catégories débloquées (1 au départ)
  lessonProgress:  {},          // { salutations: { done: true, pct: 100 }, ... }
};

/* ──────────────────────────────────────────
   ÉTAT RUNTIME (non persisté)
────────────────────────────────────────── */
let STATE = {};
let RUNTIME = {
  currentScreen:   's-splash',
  obStep:          0,
  obSel:           -1,
  tIdx:            0,
  tScore:          0,
  tAnswered:       false,
  currentLessonId: null,
  lessonQIdx:      0,
  lessonScore:     0,
  lessonHearts:    3,
  lessonAnswered:  false,
  placedWords:     [],
  selectedOptIdx:  null,
  wordIndexMap:    {},          // map index → mot pour éviter le bug apostrophe
};

/* ──────────────────────────────────────────
   ORDRE D'AFFICHAGE DES CATÉGORIES
   Modifie ici pour changer l'ordre ou ajouter des catégories
────────────────────────────────────────── */
const LESSON_ORDER = [
  'salutations', 'nourriture', 'maison', 'verbes',
  'chiffres', 'famille', 'voyage', 'corps_sante',
  'metiers', 'ville', 'adjectifs', 'adverbes', 'expressions',
];

/* ──────────────────────────────────────────
   RÈGLES DE DÉBLOCAGE
   lessonsUnlocked = nombre de catégories accessibles
   Les catégories sont dans LESSON_ORDER
────────────────────────────────────────── */
const UNLOCK_RULES = [
  { xp: 0,   lessons: 1  },   // départ : salutations
  { xp: 50,  lessons: 2  },   // +nourriture
  { xp: 120, lessons: 3  },   // +maison
  { xp: 200, lessons: 4  },   // +verbes
  { xp: 300, lessons: 5  },   // +chiffres
  { xp: 420, lessons: 6  },   // +famille
  { xp: 560, lessons: 7  },   // +voyage
  { xp: 720, lessons: 8  },   // +corps_sante
  { xp: 900, lessons: 9  },   // +metiers
  { xp: 1100,lessons: 10 },   // +ville
  { xp: 1350,lessons: 11 },   // +adjectifs
  { xp: 1650,lessons: 12 },   // +adverbes
  { xp: 2000,lessons: 13 },   // +expressions
];

/* ──────────────────────────────────────────
   LOCALSTORAGE
────────────────────────────────────────── */
function saveState() {
  try {
    localStorage.setItem('habla_state', JSON.stringify(STATE));
  } catch(e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('habla_state');
    if (saved) {
      STATE = Object.assign({}, DEFAULT_STATE, JSON.parse(saved));
    } else {
      STATE = Object.assign({}, DEFAULT_STATE);
    }
  } catch(e) {
    STATE = Object.assign({}, DEFAULT_STATE);
  }
  // S'assurer que lessonProgress est un objet
  if (!STATE.lessonProgress) STATE.lessonProgress = {};
}

function resetProgress() {
  STATE = Object.assign({}, DEFAULT_STATE);
  saveState();
}

/* ──────────────────────────────────────────
   CALCUL DU NIVEAU DE DÉBLOCAGE
────────────────────────────────────────── */
function computeUnlocked() {
  let unlocked = 1;
  for (const rule of UNLOCK_RULES) {
    if (STATE.totalXP >= rule.xp) unlocked = rule.lessons;
  }
  STATE.lessonsUnlocked = unlocked;
}

/* ──────────────────────────────────────────
   STREAK JOURNALIER
────────────────────────────────────────── */
function updateStreak() {
  const today = new Date().toISOString().slice(0, 10); // "2024-01-15"
  if (STATE.lastPlayedDate === today) return; // déjà joué aujourd'hui
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (STATE.lastPlayedDate === yesterday) {
    STATE.streak += 1; // jour consécutif
  } else if (STATE.lastPlayedDate !== today) {
    STATE.streak = 1;  // série cassée ou première fois
  }
  STATE.lastPlayedDate = today;
  saveState();
}

/* ──────────────────────────────────────────
   SÉLECTION DES QUESTIONS SELON LE NIVEAU
────────────────────────────────────────── */
function getQuestionsForLesson(lessonId) {
  const lesson = LESSONS[lessonId];
  if (!lesson) return [];
  const level = STATE.userLevel || 'A0';
  // Prend les questions du niveau détecté, fallback A0
  return lesson[level] || lesson['A0'] || [];
}

/* ──────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────── */
function go(id) {
  const prev = document.getElementById(RUNTIME.currentScreen);
  prev.classList.remove('active');
  prev.classList.add('exit');
  setTimeout(() => prev.classList.remove('exit'), 450);

  document.getElementById(id).classList.add('active');
  RUNTIME.currentScreen = id;

  if (id === 's-onboard') initOnboard();
  if (id === 's-test')    initTest();
  if (id === 's-dash')    renderDash();
}

/* ──────────────────────────────────────────
   ONBOARDING
────────────────────────────────────────── */
function initOnboard() {
  RUNTIME.obStep = 0;
  RUNTIME.obSel  = -1;
  renderObStep();
}

function renderObStep() {
  const step = OB_STEPS[RUNTIME.obStep];
  ['d0','d1','d2'].forEach((id, i) => {
    document.getElementById(id).className = 'dot' + (i === RUNTIME.obStep ? ' active' : '');
  });
  document.getElementById('ob-content').innerHTML = `
    <div class="big-emoji">${step.emoji}</div>
    <div class="ob-title">${step.title}</div>
    <div class="ob-sub">${step.sub}</div>
    <div class="ob-choices">
      ${step.choices.map((c, i) => `
        <div class="ob-choice" onclick="selOb(${i})">
          <span class="ob-choice-icon">${c.icon}</span>${c.text}
        </div>`).join('')}
    </div>`;
  RUNTIME.obSel = -1;
  document.getElementById('ob-next').disabled = true;
}

function selOb(i) {
  document.querySelectorAll('.ob-choice').forEach((el, j) => {
    el.className = 'ob-choice' + (j === i ? ' sel' : '');
  });
  RUNTIME.obSel = i;
  document.getElementById('ob-next').disabled = false;
}

function obNext() {
  if (RUNTIME.obSel < 0) return;
  RUNTIME.obStep++;
  if (RUNTIME.obStep >= OB_STEPS.length) go('s-test');
  else renderObStep();
}

/* ──────────────────────────────────────────
   TEST DE NIVEAU
────────────────────────────────────────── */
function initTest() {
  RUNTIME.tIdx      = 0;
  RUNTIME.tScore    = 0;
  RUNTIME.tAnswered = false;
  renderTestQ();
}

function renderTestQ() {
  const q = TEST_QUESTIONS[RUNTIME.tIdx];
  document.getElementById('q-counter').textContent = `${RUNTIME.tIdx + 1} / ${TEST_QUESTIONS.length}`;
  document.getElementById('q-bar').style.width     = `${((RUNTIME.tIdx + 1) / TEST_QUESTIONS.length) * 100}%`;
  document.getElementById('q-score').textContent   = `${RUNTIME.tScore} pts`;
  document.getElementById('q-cat').textContent     = q.cat;
  document.getElementById('q-text').textContent    = q.q;
  document.getElementById('q-feedback').className  = 'feedback-strip';
  document.getElementById('q-opts').innerHTML      = q.opts.map((o, i) =>
    `<div class="test-opt" onclick="answerTest(${i})">${o}</div>`
  ).join('');
  RUNTIME.tAnswered = false;
}

function answerTest(i) {
  if (RUNTIME.tAnswered) return;
  RUNTIME.tAnswered = true;

  const q    = TEST_QUESTIONS[RUNTIME.tIdx];
  const opts = document.querySelectorAll('.test-opt');
  const fb   = document.getElementById('q-feedback');

  if (i === q.ans) {
    opts[i].classList.add('correct');
    fb.textContent = '✓ Parfait !';
    fb.className   = 'feedback-strip show ok';
    RUNTIME.tScore++;
    showXP(10);
  } else {
    opts[i].classList.add('wrong');
    opts[q.ans].classList.add('correct');
    fb.textContent = `✗ Bonne réponse : "${q.opts[q.ans]}"`;
    fb.className   = 'feedback-strip show ko';
  }

  setTimeout(() => {
    RUNTIME.tIdx++;
    if (RUNTIME.tIdx >= TEST_QUESTIONS.length) showTestResult();
    else renderTestQ();
  }, 1400);
}

function showTestResult() {
  const pct = Math.round((RUNTIME.tScore / TEST_QUESTIONS.length) * 100);
  let data, level;

  if (pct <= 40) {
    level = 'A0';
    data  = { e:'🌱', tag:'DÉBUTANT · A0',       title:'Tu débutes !',       desc:'Ton parcours commence par les bases essentielles.' };
  } else if (pct <= 70) {
    level = 'A2';
    data  = { e:'🌿', tag:'INTERMÉDIAIRE · A2',   title:'Bonne base !',       desc:'Tu attaques directement les phrases et la grammaire.' };
  } else {
    level = 'B1';
    data  = { e:'🏔️', tag:'AVANCÉ · B1+',        title:'Impressionnant !',   desc:'Ton parcours sera exigeant — phrases complexes et nuances.' };
  }

  // ✅ FIX 6 — stocker le niveau pour personnaliser les questions
  STATE.userLevel = level;
  STATE.totalXP  += RUNTIME.tScore * 10;
  computeUnlocked();
  saveState();

  document.getElementById('res-emoji').textContent   = data.e;
  document.getElementById('res-tag').textContent     = data.tag;
  document.getElementById('res-title').textContent   = data.title;
  document.getElementById('res-desc').textContent    = data.desc;
  document.getElementById('res-score').textContent   = pct + '%';
  document.getElementById('res-correct').textContent = RUNTIME.tScore + '/' + TEST_QUESTIONS.length;
  document.getElementById('res-xp').textContent      = (RUNTIME.tScore * 10) + ' XP';

  go('s-result');
}

/* ──────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────── */
function renderDash() {
  computeUnlocked();

  document.getElementById('streakCount').textContent = STATE.streak;
  document.getElementById('xp-label').textContent   = `${STATE.totalXP} XP`;

  const levelLabel = STATE.userLevel === 'B1' ? 'AVANCÉ · B1'
                   : STATE.userLevel === 'A2' ? 'INTERMÉDIAIRE · A2'
                   : 'DÉBUTANT · A0';
  document.getElementById('xpLevelLabel').textContent = levelLabel;

  setTimeout(() => {
    // barre XP relative au palier suivant de déblocage
    const currentRule = [...UNLOCK_RULES].reverse().find(r => STATE.totalXP >= r.xp) || UNLOCK_RULES[0];
    const nextRule    = UNLOCK_RULES[UNLOCK_RULES.indexOf(currentRule) + 1];
    const pct = nextRule
      ? Math.round(((STATE.totalXP - currentRule.xp) / (nextRule.xp - currentRule.xp)) * 100)
      : 100;
    document.getElementById('xpFill').style.width  = Math.min(pct, 100) + '%';
    document.getElementById('xp-label').textContent = nextRule
      ? `${STATE.totalXP} / ${nextRule.xp} XP`
      : `${STATE.totalXP} XP — MAX`;
  }, 300);

  // Affiche les 4 premières catégories débloquées + les suivantes verrouillées (max 8 visibles)
  const visibleCount = Math.min(LESSON_ORDER.length, STATE.lessonsUnlocked + 3);
  const visible = LESSON_ORDER.slice(0, visibleCount);

  document.getElementById('lessonsGrid').innerHTML = visible.map((id, idx) => {
    const lesson  = LESSONS[id];
    const prog    = STATE.lessonProgress[id] || {};
    const done    = prog.done   || false;
    const pct     = prog.pct    || 0;
    const locked  = idx >= STATE.lessonsUnlocked;
    const qs      = getQuestionsForLesson(id);
    const total   = qs.length;
    const doneN   = Math.round(pct / 100 * total);

    if (locked) {
      // Calcul du XP requis pour débloquer
      const rule   = UNLOCK_RULES[idx] || UNLOCK_RULES[UNLOCK_RULES.length - 1];
      const needed = rule.xp - STATE.totalXP;
      return `
        <div class="lesson-card locked">
          <span class="lesson-icon">🔒</span>
          <div class="lesson-title">${lesson.title}</div>
          <div class="lesson-prog">+${needed} XP pour débloquer</div>
          <div class="lesson-bar"><div class="lesson-fill" style="width:0%"></div></div>
        </div>`;
    }

    return `
      <div class="lesson-card${done ? ' done' : ''}" onclick="startLesson('${id}')">
        ${done ? '<div class="done-badge">✓</div>' : ''}
        <span class="lesson-icon">${lesson.icon}</span>
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-prog">${done ? 'Complété !' : pct === 0 ? 'Nouveau !' : doneN + '/' + total + ' exercices'}</div>
        <div class="lesson-bar"><div class="lesson-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   MOTEUR DE LEÇON
────────────────────────────────────────── */
function startLesson(id) {
  RUNTIME.currentLessonId = id;
  RUNTIME.lessonQIdx      = 0;
  RUNTIME.lessonScore     = 0;
  RUNTIME.lessonHearts    = 3;
  RUNTIME.lessonAnswered  = false;
  RUNTIME.placedWords     = [];
  RUNTIME.selectedOptIdx  = null;
  go('s-lesson');
  renderLessonQ();
}

function replayLesson() {
  startLesson(RUNTIME.currentLessonId);
}

function renderLessonQ() {
  const qs = getQuestionsForLesson(RUNTIME.currentLessonId);
  const q  = qs[RUNTIME.lessonQIdx];

  RUNTIME.lessonAnswered = false;
  RUNTIME.placedWords    = [];
  RUNTIME.selectedOptIdx = null;
  RUNTIME.wordIndexMap   = {};

  document.getElementById('lesson-bar').style.width    = `${(RUNTIME.lessonQIdx / qs.length) * 100}%`;
  document.getElementById('lesson-feedback').className = 'feedback-strip';
  renderHearts();

  const btn = document.getElementById('checkBtn');
  btn.textContent = 'Vérifier ✓';
  btn.disabled    = true;
  btn.onclick     = checkAnswer;

  const card = document.getElementById('q-card');

  if (q.type === 'mcq') {
    const hintHtml = q.hint
      ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;font-style:italic">${q.hint}</div>`
      : '';
    card.innerHTML = `
      <div class="q-type-badge">${q.cat}</div>
      <div class="q-text">${q.q}</div>
      ${hintHtml}
      <div class="lesson-opts">
        ${q.opts.map((o, i) => `
          <div class="lesson-opt" onclick="selectOpt(this,${i})">${o}</div>`).join('')}
      </div>`;

  } else if (q.type === 'audio') {
    // ✅ FIX 1 — on utilise des index numériques dans onclick pour éviter le bug apostrophe
    const shuffled = shuffleArr(q.words);
    shuffled.forEach((w, i) => { RUNTIME.wordIndexMap[i] = w; });

    card.innerHTML = `
      <div class="q-type-badge">🔊 ${q.cat}</div>
      <div class="q-text">${q.q}</div>
      <div class="q-audio-btn" onclick="playAudio(${RUNTIME.lessonQIdx})">
        <div class="audio-circle">🔊</div>
        <div>
          <div class="audio-word">${q.audio}</div>
          <div class="audio-hint">Appuie pour écouter</div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--muted)">Compose la traduction :</div>
      <div class="answer-area" id="answerArea">
        <span class="placeholder-txt">Sélectionne les mots...</span>
      </div>
      <div class="word-bank" id="wordBank">
        ${shuffled.map((w, i) =>
          `<div class="token" id="tok-${i}" onclick="toggleWord(${i})">${w}</div>`
        ).join('')}
      </div>`;
  }
}

/* ── Sélection option MCQ ── */
function selectOpt(el, i) {
  if (RUNTIME.lessonAnswered) return;
  document.querySelectorAll('.lesson-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  RUNTIME.selectedOptIdx = i;
  document.getElementById('checkBtn').disabled = false;
}

/* ── Word bank ── ✅ FIX 1 : index numérique, pas de chaîne dans onclick */
function toggleWord(idx) {
  if (RUNTIME.lessonAnswered) return;
  const w    = RUNTIME.wordIndexMap[idx];
  const el   = document.getElementById('tok-' + idx);
  const area = document.getElementById('answerArea');

  if (el.classList.contains('in-answer')) {
    el.classList.remove('in-answer');
    RUNTIME.placedWords = RUNTIME.placedWords.filter(x => x !== w);
    // Supprimer le token correspondant dans la zone réponse
    const placed = area.querySelectorAll('.token');
    for (const t of placed) {
      if (t.dataset.idx === String(idx)) { t.remove(); break; }
    }
    if (RUNTIME.placedWords.length === 0) {
      area.innerHTML = '<span class="placeholder-txt">Sélectionne les mots...</span>';
    }
  } else {
    el.classList.add('in-answer');
    RUNTIME.placedWords.push(w);
    const ph = area.querySelector('.placeholder-txt');
    if (ph) ph.remove();
    const t = document.createElement('div');
    t.className      = 'token in-answer';
    t.textContent    = w;
    t.dataset.idx    = idx;
    t.onclick        = () => toggleWord(idx);
    area.appendChild(t);
  }

  document.getElementById('checkBtn').disabled = RUNTIME.placedWords.length === 0;
}

/* ── Vérification ── */
function checkAnswer() {
  if (RUNTIME.lessonAnswered) return;
  RUNTIME.lessonAnswered = true;

  const qs     = getQuestionsForLesson(RUNTIME.currentLessonId);
  const q      = qs[RUNTIME.lessonQIdx];
  const fb     = document.getElementById('lesson-feedback');
  const btn    = document.getElementById('checkBtn');
  let correct  = false;

  if (q.type === 'mcq') {
    correct = RUNTIME.selectedOptIdx === q.ans;
    document.querySelectorAll('.lesson-opt').forEach((o, i) => {
      o.classList.remove('sel');
      if (i === q.ans) o.classList.add('correct');
      else if (i === RUNTIME.selectedOptIdx && !correct) o.classList.add('wrong');
    });

  } else if (q.type === 'audio') {
    // ✅ FIX 2 — validation stricte : TOUS les mots corrects doivent être présents
    correct = q.correct.every(w => RUNTIME.placedWords.includes(w));
  }

  if (correct) {
    fb.textContent = '✓ Excellent !  +10 XP';
    fb.className   = 'feedback-strip show ok';
    RUNTIME.lessonScore++;
    STATE.totalXP += 10;
    showXP(10);
  } else {
    const hint = q.type === 'mcq'
      ? `✗ Bonne réponse : "${q.opts[q.ans]}"`
      : `✗ Traduction : "${q.audioFr}"`;
    fb.textContent = hint;
    fb.className   = 'feedback-strip show ko';
    RUNTIME.lessonHearts = Math.max(0, RUNTIME.lessonHearts - 1);
    renderHearts();
  }

  btn.textContent = 'Continuer →';
  btn.disabled    = false;
  btn.onclick     = nextLessonQ;
}

/* ── Question suivante / fin ── */
function nextLessonQ() {
  const qs = getQuestionsForLesson(RUNTIME.currentLessonId);
  RUNTIME.lessonQIdx++;

  if (RUNTIME.lessonQIdx >= qs.length) {
    finishLesson();
  } else {
    renderLessonQ();
  }
}

function finishLesson() {
  const qs       = getQuestionsForLesson(RUNTIME.currentLessonId);
  const total    = qs.length;
  const acc      = Math.round((RUNTIME.lessonScore / total) * 100);
  const xpEarned = RUNTIME.lessonScore * 10;
  const id       = RUNTIME.currentLessonId;

  // ✅ FIX 3 — streak journalier (une seule fois par jour)
  updateStreak();

  // Progression sauvegardée
  STATE.lessonProgress[id] = {
    done: acc >= 60,
    pct:  100,
  };
  computeUnlocked();

  // ✅ FIX 4 — sauvegarde localStorage
  saveState();

  document.getElementById('done-desc').textContent   = `${LESSONS[id].title} · ${RUNTIME.lessonScore}/${total} bonnes réponses`;
  document.getElementById('done-xp').textContent     = xpEarned;
  document.getElementById('done-acc').textContent    = acc + '%';
  document.getElementById('done-streak').textContent = STATE.streak;

  const btn = document.getElementById('checkBtn');
  btn.textContent = 'Vérifier ✓';
  btn.onclick     = checkAnswer;

  go('s-lesson-done');
}

/* ──────────────────────────────────────────
   UTILITAIRES
────────────────────────────────────────── */
function renderHearts() {
  document.getElementById('heartsDisplay').innerHTML =
    [0,1,2].map(i =>
      `<span class="heart">${i < RUNTIME.lessonHearts ? '❤️' : '🖤'}</span>`
    ).join('');
}

// ✅ FIX 1 — playAudio reçoit l'index de la question, récupère le texte proprement
function playAudio(qIdx) {
  const qs = getQuestionsForLesson(RUNTIME.currentLessonId);
  const q  = qs[qIdx];
  if (!q) return;

  const btn = document.querySelector('.q-audio-btn');
  if (btn) {
    btn.style.borderColor = 'var(--c3)';
    setTimeout(() => { btn.style.borderColor = 'rgba(17,138,178,.3)'; }, 1500);
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.audio);
    u.lang  = 'es-ES';
    u.rate  = 0.85;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
}

function showXP(amount) {
  const toast = document.getElementById('xpToast');
  toast.textContent = `+${amount} XP ⚡`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function shuffleArr(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* ──────────────────────────────────────────
   INIT AU CHARGEMENT
────────────────────────────────────────── */
loadState();

/* ──────────────────────────────────────────
   AUTO-REDIRECT : si déjà joué → dashboard
────────────────────────────────────────── */
(function initApp() {
  const saved = localStorage.getItem('habla_state');
  if (!saved) return; // première visite → splash normal

  try {
    const parsed = JSON.parse(saved);
    // A déjà passé le test si userLevel est défini
    if (parsed.userLevel) {
      document.getElementById('s-splash').classList.remove('active');
      document.getElementById('s-dash').classList.add('active');
      RUNTIME.currentScreen = 's-dash';
      renderDash();
    }
  } catch(e) {}
})();
