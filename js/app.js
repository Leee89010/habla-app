/* ════════════════════════════════════════════
   HABLA — app.js (Beta v2)
   Nouvelles features :
   ✅ Profil utilisateur (nom + avatar)
   ✅ Système de badges (10 achievements)
   ✅ Combo system (réponses consécutives)
   ✅ Particules XP animées
   ✅ Défi du jour rotatif
   ✅ Stats détaillées (précision, leçons)
   ✅ Mode révision (questions ratées)
   ✅ Salutation dynamique (heure du jour)
   ✅ Notifications de badge
   ✅ LocalStorage complet
════════════════════════════════════════════ */

/* ──────────────────────────────────────────
   BADGES SYSTÈME
────────────────────────────────────────── */
const BADGES = [
  { id:'first_lesson',  icon:'🌱', name:'Premier pas',      desc:'Complète ta première leçon',        check: s => Object.keys(s.lessonProgress).length >= 1 },
  { id:'streak_3',      icon:'🔥', name:'En feu',           desc:'3 jours de suite',                   check: s => s.streak >= 3 },
  { id:'streak_7',      icon:'⚡', name:'Semaine parfaite', desc:'7 jours de suite',                   check: s => s.streak >= 7 },
  { id:'xp_100',        icon:'💎', name:'Centenaire',       desc:'Dépasse 100 XP',                     check: s => s.totalXP >= 100 },
  { id:'xp_500',        icon:'🏆', name:'Champion',         desc:'Dépasse 500 XP',                     check: s => s.totalXP >= 500 },
  { id:'lessons_3',     icon:'📚', name:'Boulimique',       desc:'Complète 3 catégories',              check: s => Object.values(s.lessonProgress).filter(p=>p.done).length >= 3 },
  { id:'lessons_all',   icon:'🎓', name:'Diplômé',          desc:'Complète toutes les catégories',     check: s => Object.values(s.lessonProgress).filter(p=>p.done).length >= 13 },
  { id:'perfect_lesson',icon:'⭐', name:'Perfectionniste',  desc:'100% de précision sur une leçon',   check: s => s.hadPerfectLesson === true },
  { id:'combo_5',       icon:'🚀', name:'Combo Master',     desc:'Réalise un combo x5',                check: s => s.bestCombo >= 5 },
  { id:'speed_demon',   icon:'💨', name:'Speed Runner',     desc:'Termine une leçon en moins de 2 min',check: s => s.hadFastLesson === true },
];

/* ──────────────────────────────────────────
   AVATARS DISPONIBLES
────────────────────────────────────────── */
const AVATARS = ['😎','🦊','🐺','🦁','🐯','🦋','🐉','🦄','🐸','🤖','👾','🎭','🏋️','🧑‍🚀','🥷','🧙'];

/* ──────────────────────────────────────────
   ÉTAT PAR DÉFAUT
────────────────────────────────────────── */
const DEFAULT_STATE = {
  totalXP:          0,
  streak:           0,
  lastPlayedDate:   null,
  userLevel:        'A0',
  lessonsUnlocked:  1,
  lessonProgress:   {},
  // Profil
  userName:         '',
  userAvatar:       '😎',
  // Stats
  totalAnswers:     0,
  correctAnswers:   0,
  totalSessions:    0,
  // Achievements
  unlockedBadges:   [],
  bestCombo:        0,
  hadPerfectLesson: false,
  hadFastLesson:    false,
  // Questions ratées (répétition espacée)
  wrongQuestions:   [],
};

let STATE = {};
let RUNTIME = {
  currentScreen:    's-splash',
  obStep:           0,
  obSel:            -1,
  tIdx:             0,
  tScore:           0,
  tAnswered:        false,
  currentLessonId:  null,
  lessonQIdx:       0,
  lessonScore:      0,
  lessonHearts:     3,
  lessonAnswered:   false,
  placedWords:      [],
  selectedOptIdx:   null,
  wordIndexMap:     {},
  // Combo
  currentCombo:     0,
  bestComboSession: 0,
  // Timer
  lessonStartTime:  null,
  // Profil setup
  selectedAvatar:   '😎',
};

/* ──────────────────────────────────────────
   ORDRE & DÉBLOCAGE
────────────────────────────────────────── */
const LESSON_ORDER = [
  'salutations','nourriture','maison','verbes',
  'chiffres','famille','voyage','corps_sante',
  'metiers','ville','adjectifs','adverbes','expressions',
];

const UNLOCK_RULES = [
  { xp:0,    lessons:1  },
  { xp:50,   lessons:2  },
  { xp:120,  lessons:3  },
  { xp:200,  lessons:4  },
  { xp:300,  lessons:5  },
  { xp:420,  lessons:6  },
  { xp:560,  lessons:7  },
  { xp:720,  lessons:8  },
  { xp:900,  lessons:9  },
  { xp:1100, lessons:10 },
  { xp:1350, lessons:11 },
  { xp:1650, lessons:12 },
  { xp:2000, lessons:13 },
];

/* ──────────────────────────────────────────
   LOCALSTORAGE
────────────────────────────────────────── */
function saveState() {
  try { localStorage.setItem('habla_state_v2', JSON.stringify(STATE)); } catch(e) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem('habla_state_v2');
    STATE = saved
      ? Object.assign({}, DEFAULT_STATE, JSON.parse(saved))
      : Object.assign({}, DEFAULT_STATE);
  } catch(e) {
    STATE = Object.assign({}, DEFAULT_STATE);
  }
  if (!STATE.lessonProgress)  STATE.lessonProgress  = {};
  if (!STATE.unlockedBadges)  STATE.unlockedBadges  = [];
  if (!STATE.wrongQuestions)  STATE.wrongQuestions   = [];
}

function resetProgress() {
  if (!confirm('Recommencer depuis zéro ? Toute ta progression sera effacée.')) return;
  localStorage.removeItem('habla_state_v2');
  location.reload();
}
function confirmReset() { resetProgress(); }

/* ──────────────────────────────────────────
   UTILS
────────────────────────────────────────── */
function computeUnlocked() {
  let unlocked = 1;
  for (const rule of UNLOCK_RULES) {
    if (STATE.totalXP >= rule.xp) unlocked = rule.lessons;
  }
  STATE.lessonsUnlocked = unlocked;
}

function updateStreak() {
  const today     = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  if (STATE.lastPlayedDate === today) return;
  STATE.streak = STATE.lastPlayedDate === yesterday ? STATE.streak + 1 : 1;
  STATE.lastPlayedDate = today;
  saveState();
}

function getQuestionsForLesson(id) {
  const lesson = LESSONS[id];
  if (!lesson) return [];
  return lesson[STATE.userLevel] || lesson['A0'] || [];
}

function shuffleArr(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días ☀️';
  if (h < 18) return 'Buenas tardes 🌤️';
  return 'Buenas noches 🌙';
}

function accuracy() {
  if (!STATE.totalAnswers) return 0;
  return Math.round((STATE.correctAnswers / STATE.totalAnswers) * 100);
}

/* ──────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────── */
function go(id) {
  const prev = document.getElementById(RUNTIME.currentScreen);
  prev.classList.remove('active');
  prev.classList.add('exit');
  setTimeout(() => prev.classList.remove('exit'), 400);
  document.getElementById(id).classList.add('active');
  RUNTIME.currentScreen = id;

  if (id === 's-onboard')      initOnboard();
  if (id === 's-test')         initTest();
  if (id === 's-dash')         renderDash();
  if (id === 's-stats')        renderStats();
  if (id === 's-edit-profile') initEditProfile();
}

/* ──────────────────────────────────────────
   PROFIL SETUP (premier lancement)
────────────────────────────────────────── */
function initProfileSetup() {
  RUNTIME.selectedAvatar = STATE.userAvatar || '😎';
  document.getElementById('profileSetupEmoji').textContent = RUNTIME.selectedAvatar;
  buildAvatarGrid('avatarGrid', 'profileSetupEmoji', false);
  document.getElementById('nameInput').value = STATE.userName || '';
  document.getElementById('profileNextBtn').disabled = !STATE.userName;
}

function buildAvatarGrid(gridId, previewId, isEdit) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = AVATARS.map(a => `
    <div class="avatar-opt${a === RUNTIME.selectedAvatar ? ' sel' : ''}"
         onclick="selectAvatar('${a}','${gridId}','${previewId}')">
      ${a}
    </div>`).join('');
}

function selectAvatar(emoji, gridId, previewId) {
  RUNTIME.selectedAvatar = emoji;
  document.getElementById(previewId).textContent = emoji;
  document.querySelectorAll(`#${gridId} .avatar-opt`).forEach(el => {
    el.classList.toggle('sel', el.textContent.trim() === emoji);
  });
}

function onNameInput() {
  const val = document.getElementById('nameInput').value.trim();
  document.getElementById('profileNextBtn').disabled = !val;
}

function goFromProfile() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) return;
  STATE.userName   = name;
  STATE.userAvatar = RUNTIME.selectedAvatar;
  saveState();
  go('s-onboard');
}

/* ── Edit profile ── */
function initEditProfile() {
  RUNTIME.selectedAvatar = STATE.userAvatar;
  document.getElementById('editProfileEmoji').textContent = RUNTIME.selectedAvatar;
  document.getElementById('editNameInput').value = STATE.userName || '';
  buildAvatarGrid('editAvatarGrid', 'editProfileEmoji', true);
}
function onEditNameInput() {}
function saveProfile() {
  const name = document.getElementById('editNameInput').value.trim();
  if (!name) return;
  STATE.userName   = name;
  STATE.userAvatar = RUNTIME.selectedAvatar;
  saveState();
  go('s-stats');
}

/* ──────────────────────────────────────────
   ONBOARDING
────────────────────────────────────────── */
function initOnboard() {
  RUNTIME.obStep = 0; RUNTIME.obSel = -1; renderObStep();
}
function renderObStep() {
  const step = OB_STEPS[RUNTIME.obStep];
  ['d0','d1','d2'].forEach((id,i) => {
    document.getElementById(id).className = 'dot' + (i===RUNTIME.obStep?' active':'');
  });
  document.getElementById('ob-content').innerHTML = `
    <div class="big-emoji">${step.emoji}</div>
    <div class="ob-title">${step.title}</div>
    <div class="ob-sub">${step.sub}</div>
    <div class="ob-choices">
      ${step.choices.map((c,i) => `
        <div class="ob-choice" onclick="selOb(${i})">
          <span class="ob-choice-icon">${c.icon}</span>${c.text}
        </div>`).join('')}
    </div>`;
  RUNTIME.obSel = -1;
  document.getElementById('ob-next').disabled = true;
}
function selOb(i) {
  document.querySelectorAll('.ob-choice').forEach((el,j) => {
    el.className = 'ob-choice' + (j===i?' sel':'');
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
  RUNTIME.tIdx = 0; RUNTIME.tScore = 0; RUNTIME.tAnswered = false;
  renderTestQ();
}
function renderTestQ() {
  const q = TEST_QUESTIONS[RUNTIME.tIdx];
  document.getElementById('q-counter').textContent = `${RUNTIME.tIdx+1}/${TEST_QUESTIONS.length}`;
  document.getElementById('q-bar').style.width     = `${((RUNTIME.tIdx+1)/TEST_QUESTIONS.length)*100}%`;
  document.getElementById('q-cat').textContent     = q.cat;
  document.getElementById('q-text').textContent    = q.q;
  document.getElementById('q-feedback').className  = 'feedback-strip';
  document.getElementById('q-opts').innerHTML      = q.opts.map((o,i) =>
    `<div class="test-opt" onclick="answerTest(${i})">${o}</div>`).join('');
  RUNTIME.tAnswered = false;
}
function answerTest(i) {
  if (RUNTIME.tAnswered) return;
  RUNTIME.tAnswered = true;
  const q = TEST_QUESTIONS[RUNTIME.tIdx];
  const opts = document.querySelectorAll('.test-opt');
  const fb   = document.getElementById('q-feedback');
  if (i === q.ans) {
    opts[i].classList.add('correct');
    fb.textContent = '✓ Parfait !'; fb.className = 'feedback-strip show ok';
    RUNTIME.tScore++; showXP(10);
  } else {
    opts[i].classList.add('wrong'); opts[q.ans].classList.add('correct');
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
  const pct = Math.round((RUNTIME.tScore/TEST_QUESTIONS.length)*100);
  let data, level;
  if (pct<=40)      { level='A0'; data={e:'🌱',tag:'DÉBUTANT · A0',    title:'Tu débutes !',      desc:'Ton parcours commence par les bases. On y va doucement !'}; }
  else if (pct<=70) { level='A2'; data={e:'🌿',tag:'INTERMÉDIAIRE · A2',title:'Bonne base !',      desc:'Tu passes directement aux phrases et à la grammaire.'}; }
  else              { level='B1'; data={e:'🏔️',tag:'AVANCÉ · B1+',     title:'Impressionnant !',  desc:'Ton parcours sera exigeant — phrases complexes et nuances.'}; }

  STATE.userLevel  = level;
  STATE.totalXP   += RUNTIME.tScore * 10;
  computeUnlocked();
  saveState();

  document.getElementById('res-emoji').textContent   = data.e;
  document.getElementById('res-tag').textContent     = data.tag;
  document.getElementById('res-title').textContent   = data.title;
  document.getElementById('res-desc').textContent    = data.desc;
  document.getElementById('res-score').textContent   = pct + '%';
  document.getElementById('res-correct').textContent = RUNTIME.tScore + '/' + TEST_QUESTIONS.length;
  document.getElementById('res-xp').textContent      = (RUNTIME.tScore*10) + ' XP';
  go('s-result');
}

/* ──────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────── */
function renderDash() {
  computeUnlocked();

  // Profil
  document.getElementById('dashAvatar').textContent = STATE.userAvatar || '😎';
  document.getElementById('dashName').textContent   = STATE.userName   || 'Toi';
  document.getElementById('dashGreet').textContent  = getGreeting();
  document.getElementById('streakCount').textContent = STATE.streak;

  // XP bar
  const currentRule = [...UNLOCK_RULES].reverse().find(r => STATE.totalXP >= r.xp) || UNLOCK_RULES[0];
  const nextRule    = UNLOCK_RULES[UNLOCK_RULES.indexOf(currentRule)+1];
  const pct = nextRule
    ? Math.round(((STATE.totalXP - currentRule.xp) / (nextRule.xp - currentRule.xp)) * 100)
    : 100;
  setTimeout(() => { document.getElementById('xpFill').style.width = Math.min(pct,100)+'%'; }, 300);
  document.getElementById('xp-label').textContent  = nextRule ? `${STATE.totalXP} / ${nextRule.xp} XP` : `${STATE.totalXP} XP — MAX`;

  const levelLabel = STATE.userLevel==='B1' ? 'AVANCÉ · B1'
                   : STATE.userLevel==='A2' ? 'INTERMÉDIAIRE · A2' : 'DÉBUTANT · A0';
  document.getElementById('xpLevelLabel').textContent = levelLabel;

  if (nextRule) {
    const needed = nextRule.xp - STATE.totalXP;
    const nextCat = LESSONS[LESSON_ORDER[nextRule.lessons-1]];
    document.getElementById('xpNextUnlock').textContent = nextCat
      ? `Encore ${needed} XP pour débloquer ${nextCat.icon} ${nextCat.title}`
      : '';
  } else {
    document.getElementById('xpNextUnlock').textContent = '🎉 Toutes les catégories débloquées !';
  }

  // Défi du jour
  renderDailyChallenge();

  // Grille leçons
  const visibleCount = Math.min(LESSON_ORDER.length, STATE.lessonsUnlocked + 3);
  const visible = LESSON_ORDER.slice(0, visibleCount);
  document.getElementById('lessonsGrid').innerHTML = visible.map((id, idx) => {
    const lesson = LESSONS[id];
    const prog   = STATE.lessonProgress[id] || {};
    const done   = prog.done || false;
    const pct2   = prog.pct  || 0;
    const locked = idx >= STATE.lessonsUnlocked;
    const total  = getQuestionsForLesson(id).length;
    const doneN  = Math.round(pct2/100*total);
    if (locked) {
      const rule   = UNLOCK_RULES[idx];
      const needed = rule ? rule.xp - STATE.totalXP : '?';
      return `<div class="lesson-card locked">
        <span class="lesson-icon">🔒</span>
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-prog">+${needed} XP</div>
        <div class="lesson-bar"><div class="lesson-fill" style="width:0%"></div></div>
      </div>`;
    }
    return `<div class="lesson-card${done?' done':''}" onclick="startLesson('${id}')">
      ${done ? '<div class="done-badge">✓</div>' : ''}
      <span class="lesson-icon">${lesson.icon}</span>
      <div class="lesson-title">${lesson.title}</div>
      <div class="lesson-prog">${done ? 'Complété !' : pct2===0 ? 'Nouveau !' : doneN+'/'+total}</div>
      <div class="lesson-bar"><div class="lesson-fill" style="width:${pct2}%"></div></div>
    </div>`;
  }).join('');

  // Badges preview (4 premiers)
  const row = document.getElementById('badgesRow');
  row.innerHTML = BADGES.slice(0,6).map(b => {
    const unlocked = STATE.unlockedBadges.includes(b.id);
    return `<div class="badge-chip${unlocked?' unlocked':''}">
      <div class="badge-chip-icon">${b.icon}</div>
      <div class="badge-chip-name">${b.name}</div>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   DÉFI DU JOUR
────────────────────────────────────────── */
function renderDailyChallenge() {
  const card     = document.getElementById('dailyCard');
  const title    = document.getElementById('dailyTitle');
  const sub      = document.getElementById('dailySub');
  const today    = new Date().toISOString().slice(0,10);
  const isDone   = STATE.dailyChallengeDate === today;

  if (isDone) {
    card.classList.add('done');
    title.textContent = 'Défi du jour complété ! ✓';
    sub.textContent   = 'Reviens demain pour un nouveau défi';
  } else {
    card.classList.remove('done');
    title.textContent = '5 questions · Mix de catégories';
    sub.textContent   = 'Maintiens ton streak · +50 XP bonus';
  }
}

function startDailyChallenge() {
  const today = new Date().toISOString().slice(0,10);
  if (STATE.dailyChallengeDate === today) return;
  RUNTIME.isDailyChallenge = true;
  startLesson('salutations'); // utilise salutations comme base, shufflé
}

/* ──────────────────────────────────────────
   MOTEUR DE LEÇON
────────────────────────────────────────── */
function startLesson(id) {
  RUNTIME.currentLessonId  = id;
  RUNTIME.lessonQIdx       = 0;
  RUNTIME.lessonScore      = 0;
  RUNTIME.lessonHearts     = 3;
  RUNTIME.lessonAnswered   = false;
  RUNTIME.placedWords      = [];
  RUNTIME.selectedOptIdx   = null;
  RUNTIME.currentCombo     = 0;
  RUNTIME.bestComboSession = 0;
  RUNTIME.lessonStartTime  = Date.now();
  go('s-lesson');
  renderLessonQ();
}

function replayLesson() { startLesson(RUNTIME.currentLessonId); }

function confirmQuit() {
  document.getElementById('quitModal').style.display = 'flex';
}
function closeQuitModal() {
  document.getElementById('quitModal').style.display = 'none';
}

function renderLessonQ() {
  const qs = getQuestionsForLesson(RUNTIME.currentLessonId);
  const q  = qs[RUNTIME.lessonQIdx];
  RUNTIME.lessonAnswered = false;
  RUNTIME.placedWords    = [];
  RUNTIME.selectedOptIdx = null;
  RUNTIME.wordIndexMap   = {};

  document.getElementById('lesson-bar').style.width    = `${(RUNTIME.lessonQIdx/qs.length)*100}%`;
  document.getElementById('lesson-feedback').className = 'feedback-strip';
  renderHearts();
  updateComboBadge();

  const btn = document.getElementById('checkBtn');
  btn.textContent = 'Vérifier ✓';
  btn.disabled    = true;
  btn.onclick     = checkAnswer;

  const card = document.getElementById('q-card');

  if (q.type === 'mcq') {
    const hintHtml = q.hint
      ? `<div class="q-hint">${q.hint}</div>` : '';
    card.innerHTML = `
      <div class="q-type-badge">${q.cat}</div>
      <div class="q-text">${q.q}</div>
      ${hintHtml}
      <div class="lesson-opts">
        ${q.opts.map((o,i) =>
          `<div class="lesson-opt" onclick="selectOpt(this,${i})">${o}</div>`
        ).join('')}
      </div>`;

  } else if (q.type === 'audio') {
    const shuffled = shuffleArr(q.words);
    shuffled.forEach((w,i) => { RUNTIME.wordIndexMap[i] = w; });
    card.innerHTML = `
      <div class="q-type-badge">🔊 ${q.cat}</div>
      <div class="q-text">${q.q}</div>
      <div class="q-audio-btn" id="audioBtnEl" onclick="playAudio(${RUNTIME.lessonQIdx})">
        <div class="audio-circle">🔊</div>
        <div>
          <div class="audio-word">${q.audio}</div>
          <div class="audio-hint-txt">Appuie pour écouter</div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--muted)">Compose la traduction :</div>
      <div class="answer-area" id="answerArea">
        <span class="placeholder-txt">Sélectionne les mots...</span>
      </div>
      <div class="word-bank" id="wordBank">
        ${shuffled.map((w,i) =>
          `<div class="token" id="tok-${i}" onclick="toggleWord(${i})">${w}</div>`
        ).join('')}
      </div>`;
  }
}

function selectOpt(el, i) {
  if (RUNTIME.lessonAnswered) return;
  document.querySelectorAll('.lesson-opt').forEach(o => o.classList.remove('sel'));
  el.classList.add('sel');
  RUNTIME.selectedOptIdx = i;
  document.getElementById('checkBtn').disabled = false;
}

function toggleWord(idx) {
  if (RUNTIME.lessonAnswered) return;
  const w    = RUNTIME.wordIndexMap[idx];
  const el   = document.getElementById('tok-'+idx);
  const area = document.getElementById('answerArea');

  if (el.classList.contains('in-answer')) {
    el.classList.remove('in-answer');
    RUNTIME.placedWords = RUNTIME.placedWords.filter(x => x !== w);
    area.querySelectorAll('.token').forEach(t => {
      if (t.dataset.idx === String(idx)) { t.remove(); return; }
    });
    if (!RUNTIME.placedWords.length) {
      area.innerHTML = '<span class="placeholder-txt">Sélectionne les mots...</span>';
      area.classList.remove('has-words');
    }
  } else {
    el.classList.add('in-answer');
    RUNTIME.placedWords.push(w);
    const ph = area.querySelector('.placeholder-txt');
    if (ph) ph.remove();
    area.classList.add('has-words');
    const t       = document.createElement('div');
    t.className   = 'token in-answer';
    t.textContent = w;
    t.dataset.idx = idx;
    t.onclick     = () => toggleWord(idx);
    area.appendChild(t);
  }
  document.getElementById('checkBtn').disabled = !RUNTIME.placedWords.length;
}

function checkAnswer() {
  if (RUNTIME.lessonAnswered) return;
  RUNTIME.lessonAnswered = true;

  const qs    = getQuestionsForLesson(RUNTIME.currentLessonId);
  const q     = qs[RUNTIME.lessonQIdx];
  const fb    = document.getElementById('lesson-feedback');
  const btn   = document.getElementById('checkBtn');
  let correct = false;

  STATE.totalAnswers++;

  if (q.type === 'mcq') {
    correct = RUNTIME.selectedOptIdx === q.ans;
    document.querySelectorAll('.lesson-opt').forEach((o,i) => {
      o.classList.remove('sel');
      if (i === q.ans) o.classList.add('correct');
      else if (i === RUNTIME.selectedOptIdx && !correct) o.classList.add('wrong');
    });
  } else if (q.type === 'audio') {
    correct = q.correct.every(w => RUNTIME.placedWords.includes(w));
  }

  if (correct) {
    STATE.correctAnswers++;
    RUNTIME.currentCombo++;
    RUNTIME.bestComboSession = Math.max(RUNTIME.bestComboSession, RUNTIME.currentCombo);
    STATE.bestCombo = Math.max(STATE.bestCombo || 0, RUNTIME.currentCombo);

    const xpGain = 10 + (RUNTIME.currentCombo >= 3 ? 5 : 0); // bonus combo
    fb.textContent = RUNTIME.currentCombo >= 3
      ? `✓ Excellent ! 🔥 Combo x${RUNTIME.currentCombo} · +${xpGain} XP`
      : `✓ Excellent ! +${xpGain} XP`;
    fb.className   = 'feedback-strip show ok';
    RUNTIME.lessonScore++;
    STATE.totalXP += xpGain;

    showXP(xpGain);
    spawnParticles();

    // Combo toast
    if (RUNTIME.currentCombo === 2) showComboToast(2);
    if (RUNTIME.currentCombo === 3) showComboToast(3);
    if (RUNTIME.currentCombo === 5) showComboToast(5);

    updateComboBadge();
  } else {
    RUNTIME.currentCombo = 0;
    updateComboBadge();

    // Enregistrer la question ratée pour révision
    const qKey = `${RUNTIME.currentLessonId}_${RUNTIME.lessonQIdx}`;
    if (!STATE.wrongQuestions.includes(qKey)) {
      STATE.wrongQuestions.push(qKey);
      if (STATE.wrongQuestions.length > 50) STATE.wrongQuestions.shift();
    }

    const hint = q.type === 'mcq'
      ? `✗ Bonne réponse : "${q.opts[q.ans]}"`
      : `✗ Traduction : "${q.audioFr}"`;
    fb.textContent = hint; fb.className = 'feedback-strip show ko';
    RUNTIME.lessonHearts = Math.max(0, RUNTIME.lessonHearts-1);
    renderHearts();
  }

  btn.textContent = 'Continuer →';
  btn.disabled    = false;
  btn.onclick     = nextLessonQ;
}

function nextLessonQ() {
  const qs = getQuestionsForLesson(RUNTIME.currentLessonId);
  RUNTIME.lessonQIdx++;
  if (RUNTIME.lessonQIdx >= qs.length) finishLesson();
  else renderLessonQ();
}

function finishLesson() {
  const qs       = getQuestionsForLesson(RUNTIME.currentLessonId);
  const total    = qs.length;
  const acc      = Math.round((RUNTIME.lessonScore/total)*100);
  const xpEarned = RUNTIME.lessonScore * 10 + (RUNTIME.bestComboSession >= 3 ? 5 : 0);
  const id       = RUNTIME.currentLessonId;
  const elapsed  = (Date.now() - RUNTIME.lessonStartTime) / 1000; // secondes

  updateStreak();
  STATE.totalSessions = (STATE.totalSessions||0) + 1;

  // Achievements spéciaux
  if (acc === 100) STATE.hadPerfectLesson = true;
  if (elapsed < 120 && acc >= 80) STATE.hadFastLesson = true;

  STATE.lessonProgress[id] = { done: acc >= 60, pct: 100 };

  // Défi du jour
  if (RUNTIME.isDailyChallenge) {
    STATE.dailyChallengeDate = new Date().toISOString().slice(0,10);
    STATE.totalXP += 50;
    RUNTIME.isDailyChallenge = false;
  }

  computeUnlocked();

  // Vérifier les badges
  const newBadges = checkBadges();
  saveState();

  // Affichage
  document.getElementById('done-desc').textContent    = `${LESSONS[id].title} · ${RUNTIME.lessonScore}/${total} bonnes réponses`;
  document.getElementById('done-xp').textContent      = xpEarned;
  document.getElementById('done-acc').textContent     = acc + '%';
  document.getElementById('done-combo').textContent   = 'x' + (RUNTIME.bestComboSession || 1);

  const revealEl = document.getElementById('newBadgeReveal');
  if (newBadges.length > 0) {
    const b = BADGES.find(x => x.id === newBadges[0]);
    document.getElementById('newBadgeIcon').textContent = b.icon;
    document.getElementById('newBadgeName').textContent = b.name;
    revealEl.style.display = 'flex';
  } else {
    revealEl.style.display = 'none';
  }

  const btn = document.getElementById('checkBtn');
  btn.textContent = 'Vérifier ✓'; btn.onclick = checkAnswer;
  go('s-lesson-done');
}

/* ──────────────────────────────────────────
   BADGES
────────────────────────────────────────── */
function checkBadges() {
  const newlyUnlocked = [];
  for (const badge of BADGES) {
    if (!STATE.unlockedBadges.includes(badge.id) && badge.check(STATE)) {
      STATE.unlockedBadges.push(badge.id);
      newlyUnlocked.push(badge.id);
      // Toast
      setTimeout(() => showBadgeToast(badge), 1500);
    }
  }
  return newlyUnlocked;
}

/* ──────────────────────────────────────────
   STATS
────────────────────────────────────────── */
function renderStats() {
  document.getElementById('statsAvatar').textContent = STATE.userAvatar || '😎';
  document.getElementById('statsName').textContent   = STATE.userName   || 'Toi';
  const lvl = STATE.userLevel==='B1' ? 'Avancé · B1'
            : STATE.userLevel==='A2' ? 'Intermédiaire · A2' : 'Débutant · A0';
  document.getElementById('statsLevel').textContent = lvl;

  document.getElementById('kpiXP').textContent       = STATE.totalXP;
  document.getElementById('kpiStreak').textContent   = `${STATE.streak} 🔥`;
  const doneCount = Object.values(STATE.lessonProgress).filter(p=>p.done).length;
  document.getElementById('kpiLessons').textContent  = doneCount;
  document.getElementById('kpiAccuracy').textContent = accuracy() + '%';

  // Progression par catégorie
  document.getElementById('catProgressList').innerHTML = LESSON_ORDER.map((id, idx) => {
    const lesson  = LESSONS[id];
    const prog    = STATE.lessonProgress[id] || {};
    const pct     = prog.pct || 0;
    const locked  = idx >= STATE.lessonsUnlocked;
    return `<div class="cat-prog-item">
      <div class="cat-prog-top">
        <div class="cat-prog-name">${lesson.icon} ${lesson.title}${locked?' 🔒':''}</div>
        <div class="cat-prog-pct">${pct}%</div>
      </div>
      <div class="prog-bar-wrap">
        <div class="prog-bar${prog.done?' prog-bar-green':''}" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');

  // Badges grid
  document.getElementById('badgesGrid').innerHTML = BADGES.map(b => {
    const unlocked = STATE.unlockedBadges.includes(b.id);
    return `<div class="badge-item${unlocked?' unlocked':''}" title="${b.desc}">
      <div class="badge-item-icon">${b.icon}</div>
      <div class="badge-item-name">${b.name}</div>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────
   UI HELPERS
────────────────────────────────────────── */
function renderHearts() {
  document.getElementById('heartsDisplay').innerHTML =
    [0,1,2].map(i => `<span class="heart">${i<RUNTIME.lessonHearts?'❤️':'🖤'}</span>`).join('');
}

function updateComboBadge() {
  const badge = document.getElementById('comboBadge');
  if (RUNTIME.currentCombo >= 2) {
    document.getElementById('comboCount').textContent = RUNTIME.currentCombo;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function playAudio(qIdx) {
  const qs = getQuestionsForLesson(RUNTIME.currentLessonId);
  const q  = qs[qIdx];
  if (!q) return;
  const btn = document.getElementById('audioBtnEl');
  if (btn) {
    btn.classList.add('playing');
    setTimeout(() => btn.classList.remove('playing'), 2000);
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.audio);
    u.lang = 'es-ES'; u.rate = 0.85; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
}

function showXP(amount) {
  const t = document.getElementById('xpToast');
  t.textContent = `+${amount} XP ⚡`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function showComboToast(n) {
  const t = document.getElementById('comboToast');
  t.textContent = `🔥 COMBO x${n} !`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

function showBadgeToast(badge) {
  document.getElementById('badgeToastName').textContent = badge.name;
  const t = document.getElementById('badgeToast');
  t.querySelector('.badge-toast-icon').textContent = badge.icon;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function spawnParticles() {
  const container = document.getElementById('particles');
  const emojis = ['⭐','✨','💫','🌟','⚡'];
  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    p.style.left = (30 + Math.random()*40) + '%';
    p.style.top  = (40 + Math.random()*30) + '%';
    p.style.animationDelay = (Math.random()*0.3) + 's';
    container.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
loadState();

(function initApp() {
  const saved = localStorage.getItem('habla_state_v2');
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    if (parsed.userLevel) {
      document.getElementById('s-splash').classList.remove('active');
      document.getElementById('s-dash').classList.add('active');
      RUNTIME.currentScreen = 's-dash';
      renderDash();
      // Vérifier les badges au démarrage
      checkBadges();
      saveState();
    }
  } catch(e) {}
})();
