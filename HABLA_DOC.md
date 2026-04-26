# 🇪🇸 HABLA — Documentation complète
> Application web d'apprentissage de l'espagnol · GitHub Pages · Vanilla JS

---

## 📁 Structure du projet

```
habla-app/
├── index.html          ← Structure HTML des 7 écrans
├── css/
│   └── style.css       ← Tout le design (variables, composants, écrans)
└── js/
    ├── questions.js    ← TOUTES les données (questions, leçons, onboarding)
    └── app.js          ← Toute la logique (navigation, moteur de leçon, localStorage)
```

**Règle d'or** : pour modifier du contenu (questions, textes), toucher uniquement `questions.js`.
Pour modifier la logique ou l'UI, toucher `app.js` ou `style.css`.

---

## 🖥️ Les 7 écrans (`index.html`)

| ID HTML | Écran | Description |
|---|---|---|
| `s-splash` | Splash | Logo animé + bouton démarrer |
| `s-onboard` | Onboarding | 3 étapes de personnalisation |
| `s-test` | Test de niveau | 5 questions MCQ pour évaluer |
| `s-result` | Résultat test | Badge niveau + XP gagnés |
| `s-dash` | Dashboard | XP, streak, grille des leçons |
| `s-lesson` | Leçon | Exercices interactifs |
| `s-lesson-done` | Fin de leçon | Score, XP, streak |

**Navigation** : fonction `go('s-nom-ecran')` dans `app.js`. Transitions CSS avec classes `.active` / `.exit`.

---

## 📊 `questions.js` — Structure des données

### Onboarding (`OB_STEPS`)
3 étapes de personnalisation au premier lancement :
1. **Objectif** : Voyager / Travailler / Films / Maîtriser
2. **Temps** : 5 / 10 / 20 / 30 min par jour
3. **Niveau estimé** : Zéro / Quelques mots / Bases / Intermédiaire

Les réponses ne sont pas encore exploitées côté logique (roadmap : adapter le rythme).

### Test de niveau (`TEST_QUESTIONS`)
5 questions MCQ fixes. Le score détermine le niveau :
- 0–40% → **A0** (débutant)
- 41–70% → **A2** (intermédiaire)
- 71–100% → **B1** (avancé)

### Leçons (`LESSONS`)
**13 catégories** · **3 niveaux chacune** (A0 / A2 / B1) · **10 questions par niveau** = **390 questions**

| Catégorie | Icône | ID |
|---|---|---|
| Salutations | 💬 | `salutations` |
| Nourriture | 🍎 | `nourriture` |
| La maison | 🏠 | `maison` |
| Les verbes | 📚 | `verbes` |
| Les chiffres | 🔢 | `chiffres` |
| La famille | 👨‍👩‍👧 | `famille` |
| Le voyage | ✈️ | `voyage` |
| Corps & Santé | 🏥 | `corps_sante` |
| Les métiers | 💼 | `metiers` |
| La ville | 🏙️ | `ville` |
| Les adjectifs | 🎨 | `adjectifs` |
| Les adverbes | ⚡ | `adverbes` |
| Expressions | 💡 | `expressions` |

### Types de questions

**MCQ** (choix multiple) :
```js
{
  type: "mcq",
  cat: "SALUTATIONS",
  q: "Comment dire 'bonjour' ?",        // question en français
  opts: ["hola", "adiós", "gracias", "perdón"],  // 4 options
  hint: "= Bonjour",                    // traduction affichée sous la question
  ans: 0                                // index de la bonne réponse (0-3)
}
```

**AUDIO** (écoute + reconstitution) :
```js
{
  type: "audio",
  cat: "SALUTATIONS",
  q: "Écoute et traduis la phrase",
  audio: "hola amigo",                  // phrase lue en espagnol (Web Speech API)
  audioFr: "bonjour ami",              // traduction affichée si erreur
  words: ["bonjour","ami","au revoir","merci","bien"],  // banque de mots EN FRANÇAIS
  correct: ["bonjour","ami"]           // mots corrects EN FRANÇAIS
}
```

⚠️ **Règle importante** : `words` et `correct` sont toujours en **français**.
`audio` est toujours en **espagnol** (c'est ce qui est lu à voix haute).

---

## ⚙️ `app.js` — Logique principale

### État global (`STATE`)
Persisté en localStorage sous la clé `habla_state` :
```js
{
  totalXP: 0,              // XP total accumulé
  streak: 0,               // jours consécutifs joués
  lastPlayedDate: null,    // date ISO du dernier jeu (pour le streak)
  userLevel: 'A0',         // niveau détecté : 'A0' | 'A2' | 'B1'
  lessonsUnlocked: 1,      // nombre de catégories débloquées
  lessonProgress: {}       // { salutations: { done: true, pct: 100 }, ... }
}
```

Pour **reset complet** depuis la console navigateur (F12) :
```js
localStorage.clear(); location.reload();
```

### Système de déblocage des catégories
Les catégories se débloquent par paliers XP (définis dans `UNLOCK_RULES`) :

| XP requis | Catégories débloquées |
|---|---|
| 0 | Salutations |
| 50 | + Nourriture |
| 120 | + Maison |
| 200 | + Verbes |
| 300 | + Chiffres |
| 420 | + Famille |
| 560 | + Voyage |
| 720 | + Corps & Santé |
| 900 | + Métiers |
| 1100 | + Ville |
| 1350 | + Adjectifs |
| 1650 | + Adverbes |
| 2000 | + Expressions |

### Adaptation au niveau (`getQuestionsForLesson`)
La fonction récupère les questions du niveau détecté :
```js
function getQuestionsForLesson(lessonId) {
  return LESSONS[lessonId][STATE.userLevel] || LESSONS[lessonId]['A0'];
}
```
Un débutant (A0) voit les questions A0. Un intermédiaire (A2) voit les A2. Etc.

### Streak journalier (`updateStreak`)
- Appelé à chaque fin de leçon
- Compare `lastPlayedDate` avec la date du jour
- Si joué hier → +1 streak
- Si pas joué hier → streak remis à 1
- Si déjà joué aujourd'hui → pas de changement

### Moteur de leçon
1. `startLesson(id)` — initialise l'état, ouvre l'écran leçon
2. `renderLessonQ()` — affiche la question courante (MCQ ou Audio)
3. `checkAnswer()` — vérifie la réponse, donne le feedback
4. `nextLessonQ()` → `finishLesson()` si dernière question

**Validation audio** : tous les mots de `correct[]` doivent être présents (`.every()`), pas seulement un.

**Bug apostrophe résolu** : les tokens audio utilisent des index numériques dans `onclick` au lieu des mots en string (évite le bug avec `m'appelle`, `t'appelles`, etc.).

### Auto-redirect au chargement
Si le localStorage contient un niveau détecté → l'app saute directement au **dashboard**.
Sinon → parcours complet : splash → onboarding → test → résultat → dashboard.

---

## 🎨 `style.css` — Design system

### Variables CSS
```css
--c1: #FF6B35   /* orange primaire */
--c2: #FFD166   /* jaune accent */
--c3: #06D6A0   /* vert succès */
--c4: #118AB2   /* bleu audio */
--bg: #0A0E1A   /* fond principal */
--card: #131929  /* carte niveau 1 */
--card2: #1C2540 /* carte niveau 2 */
--text: #F0F4FF  /* texte principal */
--muted: #8A95B0 /* texte secondaire */
```

### Polices
- **Unbounded** (Google Fonts) → titres, labels, XP
- **DM Sans** (Google Fonts) → corps, boutons, texte courant

---

## 🚀 Déploiement

**URL live** : `https://leee89010.github.io/habla-app`

**Workflow de mise à jour** :
1. Modifier le fichier en local ou directement sur GitHub (icône ✏️)
2. Commit → GitHub Pages se met à jour en ~30 secondes
3. Forcer le rechargement sans cache : `Ctrl+Shift+R`

**Vérifier qu'un fichier est bien à jour** :
```
https://raw.githubusercontent.com/leee89010/habla-app/main/js/questions.js
```

---

## ➕ Comment ajouter du contenu

### Ajouter une question à une leçon existante
Dans `questions.js`, trouver la catégorie et le niveau voulu, ajouter un objet :
```js
// Exemple : nouvelle question MCQ en A2 pour "nourriture"
{"type":"mcq","cat":"NOURRITURE","q":"Comment dire 'je mange du poisson' ?",
 "opts":["como pescado","bebo pescado","tengo pescado","voy pescado"],
 "hint":"= Je mange du poisson","ans":0},
```

### Ajouter une nouvelle catégorie
1. Ajouter l'entrée dans `LESSONS` dans `questions.js` avec A0/A2/B1
2. Ajouter l'ID dans `LESSON_ORDER` dans `app.js`
3. Ajouter un palier XP dans `UNLOCK_RULES` dans `app.js`

### Modifier les paliers de déblocage
Dans `app.js`, modifier `UNLOCK_RULES` :
```js
const UNLOCK_RULES = [
  { xp: 0,   lessons: 1 },
  { xp: 50,  lessons: 2 },
  // ...
];
```

---

## 🐛 Bugs connus corrigés

| Bug | Fix appliqué |
|---|---|
| Apostrophes cassaient les tokens audio (`m'appelle`) | Index numériques dans `onclick` |
| "Je Léo" accepté comme bonne réponse | `.every()` au lieu de `.some()` |
| Streak +1 à chaque leçon | Comparaison date ISO journalière |
| Progression perdue au rechargement | localStorage complet |
| Catégories jamais débloquées | Système de paliers XP dynamique |
| Mêmes questions pour tous les niveaux | `getQuestionsForLesson` selon `userLevel` |
| Banque de mots en espagnol sur les audio | `words[]` et `correct[]` maintenant en français |
| Test repassé à chaque rechargement | Auto-redirect dashboard si `userLevel` en mémoire |

---

## 🗺️ Roadmap / idées futures

- **Répétition espacée** : reposer automatiquement les questions ratées (algorithme SM-2)
- **Mode révision** : réviser uniquement les leçons complétées
- **Prononciation** : enregistrement micro + score de similarité phonétique
- **Mode immersion** : interface partiellement en espagnol à partir du niveau B1
- **Challenges sociaux** : classements entre amis
- **PWA complète** : manifeste + service worker pour installation sur téléphone
- **Exploiter les réponses onboarding** : adapter le rythme selon le temps disponible
- **Catégories Barcelone** : vocabulaire spécifique catalan/barcelonais 🎯
