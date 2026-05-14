/* ═══════════════════════════════════════════════════
   NURSING STUDY HUB — site.js
   Jonathan's Interactive Study Center
   ═══════════════════════════════════════════════════ */

// ── STATE ────────────────────────────────────────────
const STATE = {
  manifest: null,
  quizzes: {},           // id → quiz data
  currentView: 'home',
  currentClass: null,
  quiz: {
    data: null,
    questions: [],
    current: 0,
    correct: 0,
    wrong: 0,
    missed: [],
    answered: false,
    selected: null,
    selectedSATA: new Set(),
    mode: 'quiz'         // 'quiz' | 'missed'
  },
  scores: {},            // quizId → {score, total, date}
  theme: 'dark',
  searchFilter: 'all'
};

// ── UNIT COLORS ──────────────────────────────────────
const UNIT_COLORS = {
  assess:     '#1565C0',
  diets:      '#2E7D32',
  enteral:    '#6A1B9A',
  parenteral: '#B71C1C',
  drugs:      '#E65100',
  energy:     '#00695C',
  doc:        '#4527A0'
};

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  loadScores();
  await loadManifest();
  buildSidebarNav();
  buildHomeView();
  handleMobileInit();
});

// ── MANIFEST LOADING ─────────────────────────────────
async function loadManifest() {
  try {
    const res = await fetch('data/manifest.json');
    STATE.manifest = await res.json();
  } catch (e) {
    console.error('Could not load manifest.json:', e);
    showError('Could not load content. Make sure manifest.json is in the data/ folder.');
  }
}

async function loadQuiz(item) {
  if (STATE.quizzes[item.id]) return STATE.quizzes[item.id];
  try {
    const res = await fetch(`data/${item.file}`);
    const data = await res.json();
    STATE.quizzes[item.id] = data;
    return data;
  } catch (e) {
    console.error('Could not load quiz:', item.file, e);
    return null;
  }
}

// ── SIDEBAR NAVIGATION ───────────────────────────────
function buildSidebarNav() {
  const nav = document.getElementById('class-nav');
  if (!nav || !STATE.manifest) return;
  nav.innerHTML = '';

  STATE.manifest.classes.forEach(cls => {
    const modules = getModulesForClass(cls.id);
    const item = document.createElement('div');
    item.className = 'class-nav-item';
    item.innerHTML = `
      <button class="class-nav-btn" onclick="showClassView('${cls.id}')">
        <span class="class-color-dot" style="background:${cls.color}"></span>
        <span>${cls.icon} ${cls.name}</span>
      </button>
      <div class="module-nav-list" id="mod-nav-${cls.id}" style="display:none">
        ${modules.map(m => `
          <a class="module-nav-link" onclick="showClassView('${cls.id}', ${m})">
            Module ${m}
          </a>`).join('')}
      </div>`;
    nav.appendChild(item);
  });
}

function getModulesForClass(classId) {
  const mods = new Set();
  STATE.manifest.content
    .filter(c => c.class === classId)
    .forEach(c => mods.add(c.module));
  return Array.from(mods).sort((a, b) => a - b);
}

function getClassById(id) {
  return STATE.manifest.classes.find(c => c.id === id);
}

// ── HOME VIEW ────────────────────────────────────────
function buildHomeView() {
  if (!STATE.manifest) return;
  const grid = document.getElementById('home-classes');
  if (!grid) return;

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Your Classes';
  grid.innerHTML = '';
  grid.appendChild(title);

  const cards = document.createElement('div');
  cards.className = 'class-grid';

  STATE.manifest.classes.forEach(cls => {
    const items = STATE.manifest.content.filter(c => c.class === cls.id);
    const totalQ = items.reduce((sum, i) => sum + (i.questionCount || 0), 0);
    const card = document.createElement('div');
    card.className = 'class-card';
    card.onclick = () => showClassView(cls.id);
    card.innerHTML = `
      <div class="class-card-accent" style="background:${cls.color}"></div>
      <div class="class-card-icon">${cls.icon}</div>
      <div class="class-card-code">${cls.code}</div>
      <div class="class-card-name">${cls.name}</div>
      <div class="class-card-term">${cls.term || ''}</div>
      <div class="class-card-stats">
        <div class="class-stat"><strong>${items.length}</strong>Quizzes</div>
        <div class="class-stat"><strong>${totalQ}</strong>Questions</div>
      </div>`;
    cards.appendChild(card);
  });

  grid.appendChild(cards);
  buildRecentScores();
}

function buildRecentScores() {
  if (Object.keys(STATE.scores).length === 0) return;
  const section = document.getElementById('home-recent');
  const container = document.getElementById('recent-scores');
  if (!section || !container) return;
  section.style.display = 'block';
  container.innerHTML = '';

  const entries = Object.entries(STATE.scores)
    .sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
    .slice(0, 6);

  entries.forEach(([id, score]) => {
    const item = STATE.manifest.content.find(c => c.id === id);
    if (!item) return;
    const cls = getClassById(item.class);
    const pct = Math.round(score.score / score.total * 100);
    const div = document.createElement('div');
    div.className = 'quiz-card';
    div.onclick = () => showClassView(item.class);
    div.innerHTML = `
      <div class="quiz-card-icon">📊</div>
      <div class="quiz-card-info">
        <div class="quiz-card-title">${item.title}</div>
        <div class="quiz-card-desc">${cls?.name || ''} · ${new Date(score.date).toLocaleDateString()}</div>
      </div>
      <div class="quiz-card-right">
        <div class="${scoreClass(pct)} quiz-score-badge">${pct}%</div>
      </div>`;
    container.appendChild(div);
  });
}

function scoreClass(pct) {
  if (pct >= 80) return 'good';
  if (pct >= 70) return 'ok';
  return 'bad';
}

// ── CLASS VIEW ───────────────────────────────────────
async function showClassView(classId, scrollToModule = null) {
  STATE.currentView = 'class';
  STATE.currentClass = classId;
  setActiveView('view-class');
  setNavActive(classId);

  const cls = getClassById(classId);
  if (!cls) return;

  setBreadcrumb([{ label: 'Home', action: () => showView('home') }, { label: cls.name }]);

  // Toggle module nav
  document.querySelectorAll('[id^="mod-nav-"]').forEach(el => el.style.display = 'none');
  const modNav = document.getElementById(`mod-nav-${classId}`);
  if (modNav) modNav.style.display = 'block';

  const header = document.getElementById('class-header');
  header.innerHTML = `
    <div class="class-hero">
      <div class="class-hero-top">
        <span class="class-hero-icon">${cls.icon}</span>
        <div>
          <div class="class-hero-code">${cls.code} · ${cls.term || ''}</div>
          <div class="class-hero-name">${cls.name}</div>
        </div>
      </div>
    </div>`;

  const content = document.getElementById('class-content');
  content.innerHTML = '<div class="loading"><div class="loading-spinner">⟳</div><p>Loading content…</p></div>';

  const items = STATE.manifest.content.filter(c => c.class === classId);
  const moduleGroups = {};
  items.forEach(item => {
    if (!moduleGroups[item.module]) moduleGroups[item.module] = [];
    moduleGroups[item.module].push(item);
  });

  content.innerHTML = '';
  const modules = Object.keys(moduleGroups).map(Number).sort((a, b) => a - b);

  for (const mod of modules) {
    const section = document.createElement('div');
    section.className = 'module-section';
    section.id = `module-section-${mod}`;
    section.innerHTML = `<div class="module-title">Module ${mod}</div>`;

    for (const item of moduleGroups[mod]) {
      const score = STATE.scores[item.id];
      const pct = score ? Math.round(score.score / score.total * 100) : null;
      const card = document.createElement('div');
      card.className = 'quiz-card';
      card.onclick = () => startQuiz(item.id);
      card.innerHTML = `
        <div class="quiz-card-icon">📝</div>
        <div class="quiz-card-info">
          <div class="quiz-card-title">${item.title}</div>
          <div class="quiz-card-desc">${item.description || ''}</div>
          <div class="quiz-card-tags">
            ${(item.tags || []).map(t => `<span class="quiz-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="quiz-card-right">
          <div class="quiz-q-count">${item.questionCount}</div>
          <div class="quiz-q-label">Questions</div>
          ${pct !== null ? `<div class="${scoreClass(pct)} quiz-score-badge">${pct}%</div>` : ''}
        </div>`;
      section.appendChild(card);
    }
    content.appendChild(section);
  }

  if (scrollToModule) {
    setTimeout(() => {
      const el = document.getElementById(`module-section-${scrollToModule}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
}

// ── QUIZ ENGINE ──────────────────────────────────────
async function startQuiz(contentId) {
  const item = STATE.manifest.content.find(c => c.id === contentId);
  if (!item) return;

  setActiveView('view-quiz');
  document.getElementById('quiz-area').innerHTML =
    '<div class="loading"><div class="loading-spinner">⟳</div><p>Loading quiz…</p></div>';

  const data = await loadQuiz(item);
  if (!data) {
    document.getElementById('quiz-area').innerHTML = '<p style="color:var(--red);padding:40px;text-align:center">Could not load quiz data.</p>';
    return;
  }

  // Shuffle and init
  const cls = getClassById(item.class);
  STATE.quiz.data = { ...data, item, cls };
  STATE.quiz.questions = data.questions.map(q => shuffleQuestion(JSON.parse(JSON.stringify(q))));
  STATE.quiz.current = 0;
  STATE.quiz.correct = 0;
  STATE.quiz.wrong = 0;
  STATE.quiz.missed = [];
  STATE.quiz.answered = false;
  STATE.quiz.selected = null;
  STATE.quiz.selectedSATA = new Set();
  STATE.quiz.mode = 'quiz';

  setBreadcrumb([
    { label: 'Home', action: () => showView('home') },
    { label: cls?.name || '', action: () => showClassView(item.class) },
    { label: `Module ${item.module}`, action: () => showClassView(item.class, item.module) },
    { label: item.title }
  ]);

  renderQuizQuestion();
}

function shuffleQuestion(q) {
  if (q.type !== 'mc') return q;
  const idx = q.opts.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return {
    ...q,
    opts: idx.map(i => q.opts[i]),
    correct: q.correct.map(c => idx.indexOf(c))
  };
}

function renderQuizQuestion() {
  const { quiz } = STATE;
  if (quiz.current >= quiz.questions.length) { showResults(); return; }
  const q = quiz.questions[quiz.current];
  const total = quiz.questions.length;
  const pct = Math.round((quiz.current / total) * 100);
  const isSATA = q.type === 'sata';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const color = UNIT_COLORS[q.unit] || '#1565C0';
  const cls = quiz.data.cls;

  quiz.answered = false;
  quiz.selected = null;
  quiz.selectedSATA = new Set();

  document.getElementById('quiz-area').innerHTML = `
    <div class="quiz-topbar">
      <h2>${quiz.data.item?.title || 'Quiz'}</h2>
      <button class="quiz-exit-btn" onclick="exitQuiz()">✕ Exit Quiz</button>
    </div>
    <div class="quiz-progress-wrap">
      <div class="quiz-progress-label">
        <span>Question ${quiz.current + 1} of ${total}</span>
        <span>${quiz.correct} correct · ${quiz.wrong} wrong</span>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="quiz-stats-row">
      <div class="qstat"><div class="qstat-num">${quiz.current + 1}/${total}</div><div class="qstat-label">Progress</div></div>
      <div class="qstat"><div class="qstat-num c">${quiz.correct}</div><div class="qstat-label">Correct</div></div>
      <div class="qstat"><div class="qstat-num w">${quiz.wrong}</div><div class="qstat-label">Wrong</div></div>
      <div class="qstat"><div class="qstat-num" style="color:var(--text2)">${total - quiz.current - 1}</div><div class="qstat-label">Remaining</div></div>
    </div>
    <div class="q-card">
      <div class="q-card-meta">
        <span class="q-num-badge">Q${quiz.current + 1}</span>
        <span class="q-topic-badge" style="background:${color}">${q.topic}</span>
        <span class="q-type-badge ${isSATA ? 'sata-type' : ''}">${isSATA ? 'SATA' : 'MC'}</span>
      </div>
      <div class="q-text">${q.q}</div>
      ${isSATA ? '<div class="sata-hint">Select ALL that apply — choose every correct answer before submitting.</div>' : ''}
      <div class="q-options">
        ${q.opts.map((opt, i) => `
          <button class="q-opt" id="qopt-${i}" onclick="${isSATA ? `togSATA(${i})` : `selMC(${i})`}" type="button">
            <span class="opt-letter">${letters[i]}</span>
            <span style="flex:1;text-align:left">${opt}</span>
            <span class="opt-icon" id="qicon-${i}"></span>
          </button>`).join('')}
      </div>
      <div class="q-actions">
        <button class="btn-submit" id="btn-submit" onclick="submitAnswer()" disabled>Submit Answer</button>
        <button class="btn-next" id="btn-next" onclick="nextQuestion()">${quiz.current < total - 1 ? 'Next Question →' : 'See Results'}</button>
      </div>
      <div class="rationale" id="rationale"></div>
    </div>`;
}

function selMC(i) {
  if (STATE.quiz.answered) return;
  document.querySelectorAll('.q-opt').forEach(o => o.classList.remove('selected'));
  document.getElementById('qopt-' + i)?.classList.add('selected');
  STATE.quiz.selected = i;
  document.getElementById('btn-submit').disabled = false;
}

function togSATA(i) {
  if (STATE.quiz.answered) return;
  const el = document.getElementById('qopt-' + i);
  if (STATE.quiz.selectedSATA.has(i)) {
    STATE.quiz.selectedSATA.delete(i);
    el?.classList.remove('selected');
  } else {
    STATE.quiz.selectedSATA.add(i);
    el?.classList.add('selected');
  }
  document.getElementById('btn-submit').disabled = STATE.quiz.selectedSATA.size === 0;
}

function submitAnswer() {
  const { quiz } = STATE;
  if (quiz.answered) return;
  quiz.answered = true;

  const q = quiz.questions[quiz.current];
  const isSATA = q.type === 'sata';
  const userSel = isSATA ? Array.from(quiz.selectedSATA) : (quiz.selected !== null ? [quiz.selected] : []);
  const cSet = new Set(q.correct);
  const uSet = new Set(userSel);
  const isCorrect = q.correct.length === userSel.length && q.correct.every(c => uSet.has(c));
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  document.querySelectorAll('.q-opt').forEach((el, i) => {
    el.classList.add('locked');
    el.disabled = true;
    if (cSet.has(i)) { el.classList.add('correct'); el.querySelector('.opt-icon').textContent = '✓'; }
    else if (uSet.has(i)) { el.classList.add('wrong'); el.querySelector('.opt-icon').textContent = '✗'; }
  });

  const rat = document.getElementById('rationale');
  rat.style.display = 'block';
  rat.className = 'rationale ' + (isCorrect ? 'correct' : 'wrong');
  rat.innerHTML = `<strong>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</strong>${q.rationale}`;

  if (isCorrect) quiz.correct++;
  else { quiz.wrong++; quiz.missed.push(quiz.current); }

  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-next').style.display = 'inline-block';
}

function nextQuestion() {
  STATE.quiz.current++;
  STATE.quiz.selected = null;
  STATE.quiz.selectedSATA = new Set();
  if (STATE.quiz.current >= STATE.quiz.questions.length) showResults();
  else renderQuizQuestion();
}

function showResults() {
  const { quiz } = STATE;
  const total = quiz.questions.length;
  const pct = Math.round(quiz.correct / total * 100);
  const quizId = quiz.data.item?.id;
  const cssPct = `${pct * 3.6}deg`;

  // Save score
  if (quizId) {
    STATE.scores[quizId] = { score: quiz.correct, total, date: new Date().toISOString() };
    saveScores();
  }

  const msg = pct >= 90 ? '🎉 Outstanding! You have a strong command of this material.' :
              pct >= 80 ? '👍 Great work! Review the topics you missed.' :
              pct >= 70 ? '📚 Good effort. Study the missed questions and retry.' :
                          '💪 Keep reviewing — go back to the study notes and try again.';

  document.getElementById('quiz-area').innerHTML = `
    <div class="results-screen">
      <h2>Quiz Complete!</h2>
      <div class="score-ring" style="--pct:${cssPct}">
        <div class="score-inner">
          <div class="score-pct">${pct}%</div>
          <div class="score-lbl">Score</div>
        </div>
      </div>
      <div class="grade-msg">${msg}</div>
      <div class="results-stats">
        <div class="rs"><div class="n c">${quiz.correct}</div><div class="l">Correct</div></div>
        <div class="rs"><div class="n" style="color:var(--text2)">${total}</div><div class="l">Total</div></div>
        <div class="rs"><div class="n w">${quiz.wrong}</div><div class="l">Missed</div></div>
      </div>
      <div class="results-btns">
        <button class="btn-restart" onclick="restartQuiz()">Retake Quiz</button>
        ${quiz.missed.length > 0 ? '<button class="btn-review-missed" onclick="reviewMissed()">Review Missed Questions</button>' : ''}
        <button class="btn-home" onclick="exitQuiz()">Back to Class</button>
      </div>
    </div>`;
}

function restartQuiz() {
  const item = STATE.quiz.data.item;
  if (item) startQuiz(item.id);
}

function reviewMissed() {
  const { quiz } = STATE;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  let html = '<div class="missed-review"><h3>Missed Questions Review</h3>';
  quiz.missed.forEach(idx => {
    const q = quiz.questions[idx];
    const color = UNIT_COLORS[q.unit] || '#1565C0';
    html += `
      <div class="missed-card">
        <div style="margin-bottom:8px">
          <span class="q-topic-badge" style="background:${color};font-size:0.7rem;padding:2px 10px;border-radius:20px;color:white">${q.topic}</span>
        </div>
        <div class="missed-q">Q${idx + 1}: ${q.q}</div>
        ${q.correct.map(c => `<div class="missed-ans missed-correct">✓ ${letters[c]}. ${q.opts[c]}</div>`).join('')}
        <div class="missed-rat"><strong>Why:</strong> ${q.rationale}</div>
      </div>`;
  });
  html += `
    <div style="text-align:center;margin-top:24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn-restart" onclick="restartQuiz()">Retake Quiz</button>
      <button class="btn-home" onclick="exitQuiz()">Back to Class</button>
    </div></div>`;
  document.getElementById('quiz-area').innerHTML = html;
}

function exitQuiz() {
  const classId = STATE.quiz.data?.item?.class;
  if (classId) showClassView(classId);
  else showView('home');
}

// ── SEARCH ───────────────────────────────────────────
async function ensureAllQuizzesLoaded() {
  for (const item of STATE.manifest.content) {
    if (!STATE.quizzes[item.id]) {
      await loadQuiz(item);
    }
  }
}

function getAllQuestions() {
  const results = [];
  STATE.manifest.content.forEach(item => {
    const quiz = STATE.quizzes[item.id];
    if (!quiz || !quiz.questions) return;
    const cls = getClassById(item.class);
    quiz.questions.forEach(q => {
      results.push({ q, item, cls });
    });
  });
  return results;
}

function searchQuestions(query, classFilter = 'all') {
  if (!query || query.trim().length < 2) return [];
  const lower = query.toLowerCase();
  const allQ = getAllQuestions();
  return allQ
    .filter(({ q, item }) => {
      if (classFilter !== 'all' && item.class !== classFilter) return false;
      const haystack = [
        q.q, q.rationale, q.topic,
        ...(q.opts || []),
        ...(item.topics || [])
      ].join(' ').toLowerCase();
      return lower.split(' ').every(word => haystack.includes(word));
    })
    .slice(0, 40);
}

function highlight(text, query) {
  if (!query) return text;
  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  let result = text;
  words.forEach(word => {
    const re = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  });
  return result;
}

async function heroSearch(val) {
  const resultsEl = document.getElementById('hero-search-results');
  if (!val || val.length < 2) { resultsEl.classList.remove('open'); return; }
  await ensureAllQuizzesLoaded();
  const results = searchQuestions(val);
  if (results.length === 0) {
    resultsEl.innerHTML = '<div class="mini-result-empty">No results found</div>';
  } else {
    resultsEl.innerHTML = results.slice(0, 8).map(({ q, item, cls }) => `
      <div class="mini-result-item" onclick="startQuiz('${item.id}')">
        <div class="mini-result-q">${highlight(q.q.substring(0, 100) + (q.q.length > 100 ? '…' : ''), val)}</div>
        <div class="mini-result-meta">${cls?.name || ''} · ${item.title}</div>
      </div>`).join('');
  }
  resultsEl.classList.add('open');
}

async function miniSearch(val) {
  const resultsEl = document.getElementById('search-mini-results');
  if (!val || val.length < 2) { resultsEl.classList.remove('open'); return; }
  await ensureAllQuizzesLoaded();
  const results = searchQuestions(val);
  if (results.length === 0) {
    resultsEl.innerHTML = '<div class="mini-result-empty">No results</div>';
  } else {
    resultsEl.innerHTML = results.slice(0, 6).map(({ q, item, cls }) => `
      <div class="mini-result-item" onclick="startQuiz('${item.id}')">
        <div class="mini-result-q">${highlight(q.q.substring(0, 90) + (q.q.length > 90 ? '…' : ''), val)}</div>
        <div class="mini-result-meta">${cls?.name || ''} · ${item.title}</div>
      </div>`).join('');
  }
  resultsEl.classList.add('open');
}

async function fullSearch(val) {
  const resultsEl = document.getElementById('search-results');
  if (!val || val.length < 2) {
    resultsEl.innerHTML = '<div class="search-empty"><div class="se-icon">🔍</div><p>Start typing to search across all your quizzes</p></div>';
    return;
  }
  await ensureAllQuizzesLoaded();
  const filter = STATE.searchFilter || 'all';
  const results = searchQuestions(val, filter);
  if (results.length === 0) {
    resultsEl.innerHTML = `<div class="search-empty"><div class="se-icon">🔍</div><p>No results for "<strong>${val}</strong>"</p></div>`;
    return;
  }

  resultsEl.innerHTML = `<p style="color:var(--text3);font-size:0.82rem;margin-bottom:16px">${results.length} result${results.length !== 1 ? 's' : ''} for "<strong style="color:var(--text)">${val}</strong>"</p>` +
    results.map(({ q, item, cls }) => {
      const color = UNIT_COLORS[q.unit] || '#1565C0';
      return `
        <div class="search-result-card" onclick="startQuiz('${item.id}')">
          <div class="src-meta">
            <span class="src-class" style="background:${cls?.color || '#1A3A5C'}">${cls?.code || ''}</span>
            <span class="src-topic" style="color:${color}">${q.topic}</span>
          </div>
          <div class="src-q">${highlight(q.q, val)}</div>
          <div class="src-preview">${highlight(q.rationale.substring(0, 120) + '…', val)}</div>
        </div>`;
    }).join('');
}

function buildSearchFilters() {
  const filtersEl = document.getElementById('search-filters');
  if (!filtersEl || !STATE.manifest) return;
  const chips = [{ id: 'all', label: 'All Classes' }, ...STATE.manifest.classes.map(c => ({ id: c.id, label: c.name }))];
  filtersEl.innerHTML = chips.map(c => `
    <button class="filter-chip ${c.id === STATE.searchFilter ? 'active' : ''}"
      onclick="setSearchFilter('${c.id}')">${c.label}</button>`).join('');
}

function setSearchFilter(id) {
  STATE.searchFilter = id;
  buildSearchFilters();
  const val = document.getElementById('full-search')?.value;
  if (val) fullSearch(val);
}

// ── VIEW MANAGEMENT ──────────────────────────────────
function showView(view) {
  STATE.currentView = view;
  setActiveView(`view-${view}`);
  if (view === 'home') {
    setBreadcrumb([{ label: 'Home' }]);
    setNavActive(null);
    buildHomeView();
  } else if (view === 'search') {
    setBreadcrumb([{ label: 'Search All Content' }]);
    setNavActive('search');
    buildSearchFilters();
    document.getElementById('full-search')?.focus();
  }
  // Close mini search
  document.getElementById('search-mini-results')?.classList.remove('open');
  document.getElementById('hero-search-results')?.classList.remove('open');
  closeSidebarMobile();
}

function setActiveView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');
}

function setNavActive(id) {
  document.querySelectorAll('.nav-link, .class-nav-btn').forEach(el => el.classList.remove('active'));
  if (!id) {
    document.querySelector('.nav-link[onclick*="home"]')?.classList.add('active');
  } else if (id === 'search') {
    document.querySelector('.nav-link[onclick*="search"]')?.classList.add('active');
  } else {
    document.querySelectorAll('.class-nav-btn').forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(`'${id}'`)) btn.classList.add('active');
    });
  }
}

function setBreadcrumb(items) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  bc.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast) return `<span style="color:var(--text2)">${item.label}</span>`;
    return `<a onclick="${item.action ? item.action.toString().replace(/"/g, "'") : ''}" style="cursor:pointer;color:var(--text3)">${item.label}</a><span class="bc-sep">/</span>`;
  }).join('');
  // Re-bind onclick for breadcrumb items
  const links = bc.querySelectorAll('a');
  items.filter(i => i.action).forEach((item, i) => {
    if (links[i]) links[i].onclick = item.action;
  });
}

// ── SIDEBAR & MOBILE ─────────────────────────────────
function toggleSidebar() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    document.body.classList.toggle('sidebar-open');
  } else {
    document.body.classList.toggle('sidebar-closed');
  }
}

function closeSidebarMobile() {
  if (window.innerWidth <= 768) {
    document.body.classList.remove('sidebar-open');
  }
}

function handleMobileInit() {
  if (window.innerWidth <= 768) {
    document.body.classList.remove('sidebar-open');
  }
  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-mini-wrap')) {
      document.getElementById('search-mini-results')?.classList.remove('open');
      document.getElementById('search-mini').value = '';
    }
    if (!e.target.closest('.hero-search')) {
      document.getElementById('hero-search-results')?.classList.remove('open');
    }
  });
}

// ── THEME ────────────────────────────────────────────
function toggleTheme() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  localStorage.setItem('nursing-hub-theme', STATE.theme);
}

function applyTheme() {
  document.body.classList.toggle('light', STATE.theme === 'light');
  document.getElementById('theme-icon').textContent = STATE.theme === 'dark' ? '☾' : '☀';
  document.getElementById('theme-label').textContent = STATE.theme === 'dark' ? 'Dark Mode' : 'Light Mode';
}

function loadTheme() {
  STATE.theme = localStorage.getItem('nursing-hub-theme') || 'dark';
  applyTheme();
}

// ── SCORE PERSISTENCE ────────────────────────────────
function saveScores() {
  try { localStorage.setItem('nursing-hub-scores', JSON.stringify(STATE.scores)); } catch(e) {}
}

function loadScores() {
  try {
    const saved = localStorage.getItem('nursing-hub-scores');
    if (saved) STATE.scores = JSON.parse(saved);
  } catch(e) { STATE.scores = {}; }
}

// ── ERROR ────────────────────────────────────────────
function showError(msg) {
  document.getElementById('main-content').innerHTML = `
    <div style="text-align:center;padding:60px;color:var(--red)">
      <div style="font-size:2rem;margin-bottom:12px">⚠</div>
      <p>${msg}</p>
    </div>`;
}
