/* ════════════════════════════════════════════
   HABLA — app.js
   Logique complète de l'application :
   navigation, onboarding, test de niveau,
   moteur de leçons, dashboard.
   Les données (questions, leçons) sont dans questions.js.
════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   ÉTAT GLOBAL
────────────────────────────────────────── */
const STATE = {
  totalXP:          620,
  streak:           3,
  currentScreen:    's-splash',
  // Onboarding
  obStep:           0,
  obSel:            -1,
  // Test de niveau
  tIdx:             0,
  tScore:           0,
  tAnswered:        false,
  // Leçon en cours
  currentLessonId:  null,
  lessonQIdx:       0,
  lessonScore:      0,
  lessonHearts:     3,
  lessonAnswered:   false,
  placedWords:      [],
  selectedOptIdx:   null,
  // Progression des leçons
  lessonProgress:   { salutations: 0, nourriture: 0, maison: 100, defi: 0, verbes: 0 },
  lessonDone:       { maison: true },
};

/* ──────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────── */
function go(id) {
  // Exit current
  const prev = document.getElementById(STATE.currentScreen);
  prev.classList.remove('active');
  prev.classList.add('exit');
  setTimeout(() => prev.classList.remove('exit'), 450);

  // Enter next
  document.getElementById(id).classList.add('active');
  STATE.currentScreen = id;

  // Init hooks
  if (id === 's-onboard')     initOnboard();
  if (id === 's-test')        initTest();
  if (id === 's-dash')        renderDash();
}

/* ──────────────────────────────────────────
   ONBOARDING
────────────────────────────────────────── */
function initOnboard() {
  STATE.obStep = 0;
  STATE.obSel  = -1;
  renderObStep();
}

function renderObStep() {
  const step = OB_STEPS[STATE.obStep];

  // Dots
  ['d0', 'd1', 'd2'].forEach((id, i) => {
    document.getElementById(id).className = 'dot' + (i === STATE.obStep ? ' active' : '');
  });

  // Content
  document.getElementById('ob-content').innerHTML = `
    <div class="big-emoji">${step.emoji}</div>
    <div class="ob-title">${step.title}</div>
    <div class="ob-sub">${step.sub}</div>
    <div class="ob-choices">
      ${step.choices.map((c, i) => `
        <div class="ob-choice" onclick="selOb(${i})">
          <span class="ob-choice-icon">${c.icon}</span>
          ${c.text}
        </div>
      `).join('')}
    </div>
  `;

  STATE.obSel = -1;
  document.getElementById('ob-next').disabled = true;
}

function selOb(i) {
  document.querySelectorAll('.ob-choice').forEach((el, j) => {
    el.className = 'ob-choice' + (j === i ? ' sel' : '');
  });
  STATE.obSel = i;
  document.getElementById('ob-next').disabled = false;
}

function obNext() {
  if (STATE.obSel < 0) return;
  STATE.obStep++;
  if (STATE.obStep >= OB_STEPS.length) {
    go('s-test');
  } else {
    renderObStep();
  }
}

/* ──────────────────────────────────────────
   TEST DE NIVEAU
────────────────────────────────────────── */
function initTest() {
  STATE.tIdx      = 0;
  STATE.tScore    = 0;
  STATE.tAnswered = false;
  renderTestQ();
}

function renderTestQ() {
  const q = TEST_QUESTIONS[STATE.tIdx];
  document.getElementById('q-counter').textContent = `${STATE.tIdx + 1} / ${TEST_QUESTIONS.length}`;
  document.getElementById('q-bar').style.width     = `${((STATE.tIdx + 1) / TEST_QUESTIONS.length) * 100}%`;
  document.getElementById('q-score').textContent   = `${STATE.tScore} pts`;
  document.getElementById('q-cat').textContent     = q.cat;
  document.getElementById('q-text').textContent    = q.q;
  document.getElementById('q-feedback').className  = 'feedback-strip';
  document.getElementById('q-opts').innerHTML      = q.opts.map((o, i) =>
    `<div class="test-opt" onclick="answerTest(${i})">${o}</div>`
  ).join('');
  STATE.tAnswered = false;
}

function answerTest(i) {
  if (STATE.tAnswered) return;
  STATE.tAnswered = true;

  const q    = TEST_QUESTIONS[STATE.tIdx];
  const opts = document.querySelectorAll('.test-opt');
  const fb   = document.getElementById('q-feedback');

  if (i === q.ans) {
    opts[i].classList.add('correct');
    fb.textContent = '✓ Parfait !';
    fb.className   = 'feedback-strip show ok';
    STATE.tScore++;
    showXP(10);
  } else {
    opts[i].classList.add('wrong');
    opts[q.ans].classList.add('correct');
    fb.textContent = `✗ Bonne réponse : "${q.opts[q.ans]}"`;
    fb.className   = 'feedback-strip show ko';
  }

  setTimeout(() => {
    STATE.tIdx++;
    if (STATE.tIdx >= TEST_QUESTIONS.length) showTestResult();
    else renderTestQ();
  }, 1400);
}

function showTestResult() {
  const pct = Math.round((STATE.tScore / TEST_QUESTIONS.length) * 100);
  let data;

  if (pct <= 40) {
    data = { e: '🌱', tag: 'DÉBUTANT · A0', title: 'Tu débutes !',        desc: 'Ton parcours est personnalisé pour aller à ton rythme.' };
  } else if (pct <= 70) {
    data = { e: '🌿', tag: 'INTERMÉDIAIRE · A2', title: 'Bonne base !',   desc: 'On va consolider et avancer rapidement.' };
  } else {
    data = { e: '🏔️', tag: 'AVANCÉ · B1+', title: 'Impressionnant !',    desc: 'Ton parcours sera exigeant et stimulant.' };
  }

  document.getElementById('res-emoji').textContent   = data.e;
  document.getElementById('res-tag').textContent     = data.tag;
  document.getElementById('res-title').textContent   = data.title;
  document.getElementById('res-desc').textContent    = data.desc;
  document.getElementById('res-score').textContent   = pct + '%';
  document.getElementById('res-correct').textContent = STATE.tScore + '/' + TEST_QUESTIONS.length;
  document.getElementById('res-xp').textContent      = (STATE.tScore * 10) + ' XP';

  STATE.totalXP += STATE.tScore * 10;
  go('s-result');
}

/* ──────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────── */
function renderDash() {
  document.getElementById('streakCount').textContent = STATE.streak;
  document.getElementById('xp-label').textContent   = `${STATE.totalXP} / 1000 XP`;

  setTimeout(() => {
    document.getElementById('xpFill').style.width = Math.min((STATE.totalXP / 1000) * 100, 100) + '%';
  }, 300);

  // Liste des leçons (les clés de LESSONS dans l'ordre voulu)
  const ORDER = ['salutations', 'nourriture', 'maison', 'verbes'];

  document.getElementById('lessonsGrid').innerHTML = ORDER.map(id => {
    const lesson  = LESSONS[id];
    const prog    = STATE.lessonProgress[id] || 0;
    const done    = STATE.lessonDone[id]     || false;
    const locked  = lesson.locked            || false;
    const total   = lesson.questions.length;
    const doneN   = Math.round(prog / 100 * total);

    if (locked) {
      return `
        <div class="lesson-card locked">
          <span class="lesson-icon">🔒</span>
          <div class="lesson-title">${lesson.title}</div>
          <div class="lesson-prog">Niveau 3 requis</div>
          <div class="lesson-bar"><div class="lesson-fill" style="width:0%"></div></div>
        </div>`;
    }

    return `
      <div class="lesson-card${done ? ' done' : ''}" onclick="startLesson('${id}')">
        ${done ? '<div class="done-badge">✓</div>' : ''}
        <span class="lesson-icon">${lesson.icon}</span>
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-prog">${done ? 'Complété !' : prog === 0 ? 'Nouveau !' : doneN + '/' + total + ' exercices'}</div>
        <div class="lesson-bar"><div class="lesson-fill" style="width:${prog}%"></div></div>
      </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   MOTEUR DE LEÇON
────────────────────────────────────────── */
function startLesson(id) {
  STATE.currentLessonId = id;
  STATE.lessonQIdx      = 0;
  STATE.lessonScore     = 0;
  STATE.lessonHearts    = 3;
  STATE.lessonAnswered  = false;
  STATE.placedWords     = [];
  STATE.selectedOptIdx  = null;
  go('s-lesson');
  renderLessonQ();
}

function replayLesson() {
  startLesson(STATE.currentLessonId);
}

function renderLessonQ() {
  const lesson = LESSONS[STATE.currentLessonId];
  const qs     = lesson.questions;
  const q      = qs[STATE.lessonQIdx];

  // Reset
  STATE.lessonAnswered = false;
  STATE.placedWords    = [];
  STATE.selectedOptIdx = null;

  // Progress bar
  document.getElementById('lesson-bar').style.width = `${(STATE.lessonQIdx / qs.length) * 100}%`;

  // Hearts
  renderHearts();

  // Feedback reset
  document.getElementById('lesson-feedback').className = 'feedback-strip';

  // Check button reset
  const btn = document.getElementById('checkBtn');
  btn.textContent = 'Vérifier ✓';
  btn.disabled    = true;
  btn.onclick     = checkAnswer;

  // Render question card
  const card = document.getElementById('q-card');

  if (q.type === 'mcq') {
    card.innerHTML = `
      <div class="q-type-badge">${q.cat}</div>
      <div class="q-text">${q.q}</div>
      <div class="lesson-opts">
        ${q.opts.map((o, i) => `
          <div class="lesson-opt" onclick="selectOpt(this, ${i})">${o}</div>
        `).join('')}
      </div>
    `;

  } else if (q.type === 'audio') {
    const shuffled = shuffleArr(q.words);
    card.innerHTML = `
      <div class="q-type-badge">🔊 ${q.cat}</div>
      <div class="q-text">${q.q}</div>
      <div class="q-audio-btn" onclick="playAudio('${q.audio}')">
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
        ${shuffled.map(w => `<div class="token" onclick="toggleWord(this, '${w}')">${w}</div>`).join('')}
      </div>
    `;
  }
}

/* ── Sélection option MCQ ── */
function selectOpt(el, i) {
  if (STATE.lessonAnswered) return;
  document.querySelectorAll('.lesson-opt').forEach(o => {
    o.classList.remove('sel');
    o.style.borderColor = '';
  });
  el.classList.add('sel');
  STATE.selectedOptIdx = i;
  document.getElementById('checkBtn').disabled = false;
}

/* ── Word bank (audio) ── */
function toggleWord(el, w) {
  if (STATE.lessonAnswered) return;
  const area = document.getElementById('answerArea');

  if (el.classList.contains('in-answer')) {
    // Retirer
    el.classList.remove('in-answer');
    STATE.placedWords = STATE.placedWords.filter(x => x !== w);
    area.querySelectorAll('.token').forEach(t => {
      if (t.textContent === w) t.remove();
    });
    if (STATE.placedWords.length === 0) {
      area.innerHTML = '<span class="placeholder-txt">Sélectionne les mots...</span>';
    }
  } else {
    // Ajouter
    el.classList.add('in-answer');
    STATE.placedWords.push(w);
    const ph = area.querySelector('.placeholder-txt');
    if (ph) ph.remove();

    const t = document.createElement('div');
    t.className   = 'token in-answer';
    t.textContent = w;
    t.onclick = () => toggleWord(el, w);
    area.appendChild(t);
  }

  document.getElementById('checkBtn').disabled = STATE.placedWords.length === 0;
}

/* ── Vérification de la réponse ── */
function checkAnswer() {
  if (STATE.lessonAnswered) return;
  STATE.lessonAnswered = true;

  const lesson  = LESSONS[STATE.currentLessonId];
  const q       = lesson.questions[STATE.lessonQIdx];
  const fb      = document.getElementById('lesson-feedback');
  const btn     = document.getElementById('checkBtn');
  let correct   = false;

  if (q.type === 'mcq') {
    correct = STATE.selectedOptIdx === q.ans;
    document.querySelectorAll('.lesson-opt').forEach((o, i) => {
      o.classList.remove('sel');
      if (i === q.ans) o.classList.add('correct');
      else if (i === STATE.selectedOptIdx && !correct) o.classList.add('wrong');
    });

  } else if (q.type === 'audio') {
    // Valide si au moins un mot correct est présent
    correct = q.correct.some(w => STATE.placedWords.includes(w));
  }

  if (correct) {
    fb.textContent = '✓ Excellent !  +10 XP';
    fb.className   = 'feedback-strip show ok';
    STATE.lessonScore++;
    STATE.totalXP += 10;
    showXP(10);
  } else {
    const hint = q.type === 'mcq'
      ? `✗ Bonne réponse : "${q.opts[q.ans]}"`
      : `✗ La traduction était : "${q.audioFr}"`;
    fb.textContent = hint;
    fb.className   = 'feedback-strip show ko';
    STATE.lessonHearts = Math.max(0, STATE.lessonHearts - 1);
    renderHearts();
  }

  btn.textContent = 'Continuer →';
  btn.disabled    = false;
  btn.onclick     = nextLessonQ;
}

/* ── Question suivante / fin de leçon ── */
function nextLessonQ() {
  const lesson = LESSONS[STATE.currentLessonId];
  STATE.lessonQIdx++;

  if (STATE.lessonQIdx >= lesson.questions.length) {
    finishLesson(lesson);
  } else {
    renderLessonQ();
  }
}

function finishLesson(lesson) {
  const total   = lesson.questions.length;
  const acc     = Math.round((STATE.lessonScore / total) * 100);
  const xpEarned = STATE.lessonScore * 10;

  // Mise à jour de la progression
  STATE.lessonProgress[STATE.currentLessonId] = 100;
  if (acc >= 60) STATE.lessonDone[STATE.currentLessonId] = true;
  STATE.streak = Math.min(STATE.streak + 1, 30);

  // Affichage écran de fin
  document.getElementById('done-desc').textContent    = `${lesson.title} · ${STATE.lessonScore}/${total} bonnes réponses`;
  document.getElementById('done-xp').textContent      = xpEarned;
  document.getElementById('done-acc').textContent     = acc + '%';
  document.getElementById('done-streak').textContent  = STATE.streak;

  // Reset bouton check pour la prochaine leçon
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
    [0, 1, 2].map(i => `<span class="heart">${i < STATE.lessonHearts ? '❤️' : '🖤'}</span>`).join('');
}

function playAudio(text) {
  const btn = document.querySelector('.q-audio-btn');
  if (btn) {
    btn.style.borderColor = 'var(--c3)';
    setTimeout(() => { btn.style.borderColor = 'rgba(17,138,178,.3)'; }, 1500);
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u  = new SpeechSynthesisUtterance(text);
    u.lang   = 'es-ES';
    u.rate   = 0.85;
    u.pitch  = 1;
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
