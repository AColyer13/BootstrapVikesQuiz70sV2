// Prevent pinch-to-zoom on iOS and some browsers
['gesturestart', 'gesturechange', 'gestureend'].forEach(function(ev) {
  document.addEventListener(ev, function(e) {
    e.preventDefault();
  }, { passive: false });
});
// Aggressive zoom reset: forcibly reset zoom if changed
document.addEventListener('touchmove', function(e) {
  if (window.visualViewport && window.visualViewport.scale !== 1) {
    window.scrollTo(0, 0);
    document.body.style.zoom = '1';
    if (window.visualViewport.scale !== 1) {
      window.visualViewport.scale = 1;
    }
    e.preventDefault();
  }
}, { passive: false });
// Quiz Data: Array of questions with options and correct answers
const quizQuestions = [
  { q: "Which Vikings defensive lineman recorded a safety in the 1970 season, showcasing the dominance of the Purple People Eaters?", o: ["Alan Page","Jim Marshall","Carl Eller","Gary Larsen"], a: 0 },
  { q: "Who led the Vikings in rushing yards during the 1970 season?", o: ["Dave Osborn","Chuck Foreman","Oscar Reed","Clint Jones"], a: 0 },
  { q: "Which Vikings player had the longest interception return in the 1970 season?", o: ["Paul Krause","Ed Sharockman","Charlie West","Karl Kassulke"], a: 1 },
  { q: "In 1970, which Vikings linebacker was known for his coverage skills and recorded multiple interceptions?", o: ["Roy Winston","Jeff Siemon","Wally Hilgenberg","Lonnie Warwick"], a: 3 },
  { q: "Which team handed the Vikings their first loss of the 1970 season, ending a 5-game win streak?", o: ["St. Louis Cardinals","San Francisco 49ers","Detroit Lions","Dallas Cowboys"], a: 0 },
  { q: "What was the Vikings' point differential at the end of the 1970 regular season?", o: ["+140","+124","+98","+112"], a: 1 },
  { q: "Which Vikings offensive lineman was selected to the Pro Bowl in 1970 for his run-blocking dominance?", o: ["Grady Alderman","Mick Tingelhoff","Ed White","Steve Riley"], a: 0 },
  { q: "Which Vikings wide receiver caught a 65-yard touchdown pass in the 1970 playoff loss to the 49ers?", o: ["Gene Washington","Bob Grim","John Beasley","John Henderson"], a: 1 },
  { q: "Who was the Vikings' punter in 1970, known for his hang time and directional kicking?", o: ["Mike Eischeid","Greg Coleman","Bob Lee","Tommy Kramer"], a: 0 },
  { q: "Which Vikings assistant coach in 1970 later became an NFL head coach and GM?", o: ["Jerry Burns","Pete Carroll","Tony Dungy","Mike Lynn"], a: 0 }
];

// Global Variables: Quiz state and DOM elements
const TOTAL = quizQuestions.length;
let items = [], idx = 0, score = 0, reviewIdx = 0;

const els = {
  startBtn: document.getElementById('start-button'),
  start: document.getElementById('start-container'),
  quiz: document.getElementById('quiz-container'),
  question: document.getElementById('question-container'),
  opts: document.getElementById('options-container'),
  next: document.getElementById('next-button'),
  scoreWrap: document.getElementById('score-container'),
  score: document.getElementById('score-display'),
  restart: document.getElementById('restart-button'),
  summary: document.getElementById('summary-container'),
  prog: document.getElementById('quiz-progress')
};

// Utility Functions: Helper methods for shuffling, toggling visibility, and progress updates
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function toggle(el, hide) {
  el.classList[hide ? 'add' : 'remove']('d-none');
}

function updateProgress(done) {
  if (!els.prog) return;
  const percent = Math.round((done / (items.length || TOTAL)) * 100);
  els.prog.value = percent;
}

// Theme and Layout Adjustments: Handle day/night mode and scroll locking
function setTimeTheme() {
  const h = new Date().getHours();
  const isDay = h >= 6 && h < 18;
  document.body.classList.toggle('day-mode', isDay);
  document.body.classList.toggle('night-mode', !isDay);
}
setTimeTheme();
setInterval(setTimeTheme, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) setTimeTheme();
});

function updateScrollLock() {
  const body = document.body;
  const isResults = body.classList.contains('results-active');
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const isPortrait = matchMedia('(orientation: portrait)').matches;
  const isLandscape = matchMedia('(orientation: landscape)').matches;
  const narrow = window.innerWidth <= 820;
  const shouldLockPortrait = !isResults && isCoarse && isPortrait && narrow && items.length;
  const landscapeCanLock = !isResults && isCoarse && isLandscape && narrow && items.length;
  const landscapeShort = window.innerHeight <= 520;
  const shouldLockLandscape = landscapeCanLock && !landscapeShort;
  body.classList.toggle('lock-scroll', shouldLockPortrait);
  body.classList.toggle('lock-scroll-land', shouldLockLandscape);
}
updateScrollLock();

['resize', 'orientationchange'].forEach(ev =>
  window.addEventListener(ev, () => requestAnimationFrame(updateScrollLock))
);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateScrollLock();
});

function updateCentering() {
  if (!document.body.classList.contains('results-active')) return;
  document.body.classList.remove('center-score');
  const sc = els.scoreWrap;
  if (!sc) return;
  const vh = window.innerHeight;
  const h = sc.offsetHeight;
  if (h <= vh * 0.9) document.body.classList.add('center-score');
}

// Quiz Logic: Start, render, choose answer, next, and finish
function startQuiz() {
  idx = 0; score = 0;
  items = quizQuestions.map(({ q, o, a }) => {
    const opts = o.map((t, i) => ({ t, c: i === a }));
    shuffle(opts);
    return { q, opts: opts.map(x => x.t), a: opts.findIndex(x => x.c), pick: null };
  });
  shuffle(items);
  els.summary.innerHTML = '';
  toggle(els.start, true);
  toggle(els.scoreWrap, true);
  toggle(els.quiz, false);
  render();
  updateProgress(0);
  document.body.classList.remove('results-active');
  updateScrollLock();
}

function render() {
  const it = items[idx];
  els.question.innerHTML = `
    <div class="q-block text-center">
      <span class="badge bg-warning text-dark mb-2 d-inline-block">Question ${idx+1} of ${items.length}</span>
      <div class="question-box-fixed">
        <h3 class="question-flex">${it.q}</h3>
      </div>
    </div>`;
  const qb = els.question.querySelector('.question-box-fixed');
  if (qb) requestAnimationFrame(() => qb.classList.toggle('overflow', qb.scrollHeight > qb.clientHeight));
  els.opts.innerHTML = it.opts.map((t, i) =>
    `<button class="btn btn-warning w-100 fw-bold option-btn tappable" data-i="${i}">${t}</button>`
  ).join('');
  els.next.classList.add('invisible');
  [...els.opts.children].forEach(b => b.onclick = () => choose(+b.dataset.i));
  updateProgress(idx);
  updateScrollLock();
}

function choose(sel) {
  const it = items[idx];
  if (it.pick != null) return;
  it.pick = sel;
  if (sel === it.a) score++;

  [...els.opts.children].forEach((btn, i) => {
    const correct = i === it.a;
    const chosen = i === sel;
    btn.classList.remove('btn-success', 'btn-danger');
    if (correct) {
      btn.classList.replace('btn-warning', 'btn-success');
    } else if (chosen) {
      btn.classList.replace('btn-warning', 'btn-danger');
    } else {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
  });

  if (navigator.vibrate) { try { navigator.vibrate(12); } catch(_) {} }
  const sr = document.getElementById('sr-status');
  if (sr) sr.textContent = `Question ${idx+1} answered ${sel === it.a ? 'correctly' : 'incorrectly'}.`;
  els.next.classList.remove('invisible');
  updateProgress(idx + 1);
}

function next() {
  if (++idx < items.length) render();
  else finish();
}

function finish() {
  toggle(els.quiz, true);
  toggle(els.scoreWrap, false);
  els.score.innerHTML = `<span class="score-num">${score}</span>`;
  els.summary.innerHTML = '';
  reviewIdx = 0;
  document.getElementById('review-nav')?.classList.remove('d-none');
  renderReview();
  document.body.classList.add('results-active');
  window.scrollTo({ top: 0, behavior: 'auto' });
  requestAnimationFrame(updateCentering);
  updateProgress(items.length);
  updateScrollLock();
}

// Review Logic: Render review cards and navigation
function renderReview() {
  const it = items[reviewIdx];
  if (!it) return;
  const correctText = it.opts[it.a];
  const userPicked = it.pick != null ? it.opts[it.pick] : null;
  const correct = it.pick === it.a;

  const yourAnswerLine = `
    <div class="answer-line mb-1">
      <span class="badge ${correct ? 'bg-success text-dark' : 'bg-danger'} me-2">Your Answer</span>
      <strong class="${correct ? 'text-success' : (userPicked ? 'text-danger' : 'text-danger')}">
        ${userPicked ? userPicked : '<em class="text-danger">None</em>'}
      </strong>
    </div>`;

  const correctLine = `
    <div class="answer-line">
      <span class="badge bg-success text-dark me-2">Correct</span>
      <strong class="text-success">${correctText}</strong>
    </div>`;

  els.summary.innerHTML = `
    <div class="review-card">
      <span class="badge bg-warning text-dark d-inline-block mb-2">Review ${reviewIdx+1} of ${items.length}</span>
      <div class="question-box-fixed mb-3"><h3 class="question-flex">${it.q}</h3></div>
      <div class="answers mb-2">
        ${yourAnswerLine}
        ${correctLine}
      </div>
    </div>`;
  updateReviewNav();
  requestAnimationFrame(updateCentering);
}

function updateReviewNav() {
  const prevBtn = document.getElementById('review-prev');
  const nextBtn = document.getElementById('review-next');
  const progLbl = document.getElementById('review-progress-label');
  if (!prevBtn || !nextBtn || !progLbl) return;
  prevBtn.disabled = reviewIdx === 0;
  nextBtn.disabled = reviewIdx === items.length - 1;
  progLbl.textContent = `Question ${reviewIdx+1} / ${items.length}`;
}

// Event Listeners: Button clicks, keyboard navigation, and resize handling
if (els.startBtn) {
  els.startBtn.onclick = startQuiz;
  ['keydown', 'keyup'].forEach(ev => {
    els.startBtn.addEventListener(ev, e => {
      if ((e.key === 'Enter' || e.key === ' ') && !items.length) {
        if (ev === 'keyup') startQuiz();
      }
    });
  });
  els.startBtn.addEventListener('touchstart', e => {
    if (!items.length) startQuiz();
  }, { passive: true });
} else {
  console.error('Start button not found in DOM at script load.');
}

els.next.onclick = next;
els.restart.onclick = () => {
  toggle(els.scoreWrap, true);
  toggle(els.start, false);
  items = [];
  updateProgress(0);
  document.body.classList.remove('results-active');
  updateScrollLock();
};
els.next.classList.add('btn-warning');

const prevBtn = document.getElementById('review-prev');
const nextBtn = document.getElementById('review-next');
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (reviewIdx > 0) { reviewIdx--; renderReview(); }
  });
}
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    if (reviewIdx < items.length - 1) { reviewIdx++; renderReview(); }
  });
}

document.addEventListener('keydown', e => {
  if (els.scoreWrap.classList.contains('d-none')) return;
  if (!items.length) return;
  if (e.key === 'ArrowLeft' && reviewIdx > 0) { reviewIdx--; renderReview(); e.preventDefault(); }
  if (e.key === 'ArrowRight' && reviewIdx < items.length - 1) { reviewIdx++; renderReview(); e.preventDefault(); }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (!items.length && !els.start.classList.contains('d-none')) {
    startQuiz();
    e.preventDefault();
    return;
  }
  const nextVisible = !els.quiz.classList.contains('d-none') && !els.next.classList.contains('invisible');
  if (nextVisible) {
    next();
    e.preventDefault();
    return;
  }
  if (!els.scoreWrap.classList.contains('d-none') && document.activeElement === els.restart) {
    els.restart.click();
    e.preventDefault();
  }
});

window.addEventListener('resize', () => {
  requestAnimationFrame(updateCentering);
});

// Debug Helper: Expose quiz state for console inspection
window.__quizDebug = () => ({
  startBtn: !!els.startBtn,
  itemsLength: items.length,
  lockedBody: document.body.matches(':not(.results-active)') && getComputedStyle(document.body).position === 'fixed',
  touchAction: getComputedStyle(document.documentElement).touchAction + ' | body: ' + getComputedStyle(document.body).touchAction
});