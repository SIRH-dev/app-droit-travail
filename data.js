// =============================================
// ÉTAT DE L'APPLICATION & SAUVEGARDES
// =============================================
let state = {
  theme: localStorage.getItem('theme') || 'dark',
  readFiches: JSON.parse(localStorage.getItem('readFiches')) || [],
  flashcards: JSON.parse(localStorage.getItem('flashcards')) || {},
  quizHighscore: localStorage.getItem('quizHighscore') || null
};

// Clé pour le Premium Cloudflare
const PREMIUM_KEY = 'premium_access';
let pendingPremiumAction = null;

// URL de ton Cloudflare Worker IA
const WORKER_URL = 'https://lexstudy-api.kpnonon.workers.dev';

// =============================================
// INITIALISATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', state.theme);
  const hash = window.location.hash.replace('#', '') || 'home';
  showScreen(hash, false);
  updateHomeStats();
});

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '') || 'home';
  showScreen(hash, false);
});

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
}

// =============================================
// NAVIGATION & INTERFACE
// =============================================
function showScreen(name, updateHash = true) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.top-nav-tab, .bottom-nav-item').forEach(t => t.classList.remove('active'));
  
  const screenEl = document.getElementById('screen-' + name) || document.getElementById('screen-home');
  screenEl.classList.add('active');
  
  const map = { home: 0, fiches: 1, flashcards: 2, quiz: 3, recap: 4, blog: 5, chat: 6 };
  if (map[name] !== undefined) {
    document.querySelectorAll('.top-nav-tab')[map[name]]?.classList.add('active');
    document.querySelectorAll('.bottom-nav-item')[map[name]]?.classList.add('active');
  }

  if (updateHash) window.location.hash = name;

  if (name === 'home') updateHomeStats();
  if (name === 'fiches') renderFichesList();
  if (name === 'flashcards') initFlashcards();
  if (name === 'quiz') initQuiz();
  if (name === 'recap') renderRecap();
  if (name === 'blog') loadBlog();
  if (name === 'chat') {
    if (!isPremium()) {
      openPremium(() => showScreen('chat'));
      return;
    }
  }

  window.scrollTo(0, 0);
}

function updateHomeStats() {
  document.getElementById('stat-fiches').textContent = state.readFiches.length;
  const knownCards = Object.values(state.flashcards).filter(lvl => lvl >= 3).length;
  document.getElementById('stat-known').textContent = knownCards;
  document.getElementById('stat-quiz').textContent = state.quizHighscore ? state.quizHighscore + '%' : '—';
  
  const globalProgress = document.getElementById('global-progress');
  if(globalProgress) globalProgress.textContent = `${state.readFiches.length}/${FICHES.length}`;
}

// =============================================
// SYSTÈME PREMIUM (KO-FI & CLOUDFLARE)
// =============================================
function isPremium() {
  const data = JSON.parse(localStorage.getItem(PREMIUM_KEY) || 'null');
  if (!data) return false;
  // Vérification de l'expiration (30 jours)
  if (Date.now() > data.expiry) { 
    localStorage.removeItem(PREMIUM_KEY); 
    return false; 
  }
  return true;
}

function openPremium(action) {
  pendingPremiumAction = action;
  document.getElementById('premium-overlay').classList.add('open');
  document.getElementById('premium-code-input').value = '';
  document.getElementById('premium-error').style.display = 'none';
  document.getElementById('premium-code-input').focus();
}

function closePremium() {
  document.getElementById('premium-overlay').classList.remove('open');
  pendingPremiumAction = null;
}

async function submitPremiumCode() {
  const code = document.getElementById('premium-code-input').value.trim().toUpperCase();
  const btn = document.getElementById('premium-submit');
  const err = document.getElementById('premium-error');

  if (!code) { err.textContent = 'Veuillez entrer un code.'; err.style.display = 'block'; return; }

  btn.disabled = true;
  btn.textContent = 'Vérification...';
  err.style.display = 'none';

  try {
    // VRAIE REQUÊTE VERS TON CLOUDFLARE
    const res = await fetch(WORKER_URL + '/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.valid) {
      localStorage.setItem(PREMIUM_KEY, JSON.stringify({ expiry: data.expiry }));
      closePremium();
      showToast('Accès Premium activé !', 'success');
      if (pendingPremiumAction) {
        pendingPremiumAction();
      } else {
        showScreen('chat', true);
      }
    } else {
      err.textContent = data.reason || 'Code invalide. Vérifiez et réessayez.';
      err.style.display = 'block';
    }
  } catch(e) {
    err.textContent = 'Erreur de connexion. Réessayez.';
    err.style.display = 'block';
  }

  btn.disabled = false;
  btn.textContent = 'Activer mon accès';
}

document.getElementById('premium-code-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitPremiumCode();
});

// =============================================
// FICHES DE COURS & VEILLE IA
// =============================================
function renderFichesList() {
  const container = document.getElementById('fiches-list');
  container.innerHTML = '';
  
  const parties = [...new Set(FICHES.map(f => f.partie))];
  
  parties.forEach(partie => {
    const section = document.createElement('div');
    section.className = 'partie-section';
    section.innerHTML = `<div class="partie-label">${partie}</div><div class="fiches-row"></div>`;
    
    const row = section.querySelector('.fiches-row');
    FICHES.filter(f => f.partie === partie).forEach(fiche => {
      const isRead = state.readFiches.includes(fiche.num);
      const card = document.createElement('div');
      card.className = 'fiche-card';
      card.onclick = () => openFiche(fiche.num);
      card.innerHTML = `
        <div class="fiche-number">FICHE ${fiche.num}</div>
        <div class="fiche-title">${fiche.title}</div>
        ${isRead ? '<div class="fiche-done-badge">✓ LUE</div>' : ''}
      `;
      row.appendChild(card);
    });
    
    container.appendChild(section);
  });
}

let currentFicheIdx = 0;
function openFiche(num) {
  currentFicheIdx = FICHES.findIndex(f => f.num === num);
  const fiche = FICHES[currentFicheIdx];
  
  const contentArea = document.getElementById('fiche-content-area');
  contentArea.innerHTML = fiche.content;
  document.getElementById('reader-progress').textContent = `Fiche ${num} sur ${FICHES.length}`;
  
  // Bouton "Vérifier Mise à Jour" (Veille IA)
  const updateBar = document.createElement('div');
  updateBar.className = 'fiche-update-bar';
  updateBar.innerHTML = `
    <button class="fiche-update-btn" id="update-btn-${fiche.num}" onclick="checkFicheUpdate(${currentFicheIdx})">
      Vérifier si cette fiche est à jour (IA)
      <span id="update-arrow-${fiche.num}">→</span>
    </button>
    <div class="fiche-update-result" id="update-result-${fiche.num}"></div>
  `;
  contentArea.appendChild(updateBar);

  if (!state.readFiches.includes(num)) {
    state.readFiches.push(num);
    localStorage.setItem('readFiches', JSON.stringify(state.readFiches));
    updateHomeStats();
  }
  
  const btnNext = document.getElementById('btn-next-fiche');
  if (currentFicheIdx < FICHES.length - 1) {
    btnNext.style.display = 'inline-block';
    btnNext.onclick = () => openFiche(FICHES[currentFicheIdx + 1].num);
  } else {
    btnNext.style.display = 'none';
  }

  showScreen('reader', false);
}

async function checkFicheUpdate(idx) {
  if (!isPremium()) { openPremium(() => checkFicheUpdate(idx)); return; }
  
  const f = FICHES[idx];
  const btn = document.getElementById(`update-btn-${f.num}`);
  const result = document.getElementById(`update-result-${f.num}`);
  const arrow = document.getElementById(`update-arrow-${f.num}`);

  btn.classList.add('loading');
  btn.disabled = true;
  arrow.textContent = '⏳';
  result.style.display = 'none';

  const content = f.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);

  try {
    // VRAIE REQUÊTE VERS TON IA CLOUDFLARE POUR LA VEILLE
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'veille',
        messages: [{ role: 'user', content: `Analyse cette fiche de droit du travail :\n\nTitre : ${f.title}\n\nContenu : ${content}` }]
      })
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';
    
    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) { parsed = { obsolete: false, confiance: 'faible', raison: raw, suggestion: '' }; }

    const isWarn = parsed.obsolete;
    result.className = `fiche-update-result show ${isWarn ? 'warn' : 'ok'}`;
    result.innerHTML = `
      <div class="veille-result-title" style="font-weight:bold;margin-bottom:5px;">
        ${isWarn ? '⚠️ Potentiellement obsolète' : '✅ À jour'} 
        <span style="font-size:.72rem;font-weight:400;opacity:.7">(confiance : ${parsed.confiance || 'moyenne'})</span>
      </div>
      <div>
        <strong>Analyse :</strong> ${parsed.raison || '—'}<br>
        ${parsed.suggestion ? `<strong>Suggestion :</strong> ${parsed.suggestion}` : ''}
      </div>`;
    arrow.textContent = isWarn ? '⚠️' : '✅';
  } catch(e) {
    result.className = 'fiche-update-result show warn';
    result.innerHTML = '❌ Impossible de contacter le serveur IA.';
    arrow.textContent = '❌';
  }
  btn.classList.remove('loading');
  btn.disabled = false;
}

// =============================================
// CHATBOT IA
// =============================================
let chatHistory = [];

async function sendChat() {
  if (!isPremium()) { openPremium(() => sendChat()); return; }
  
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send');
  const msg = input.value.trim();
  if (!msg) return;

  const suggs = document.getElementById('chat-suggestions');
  if(suggs) suggs.style.display = 'none';

  input.value = '';
  btn.disabled = true;
  
  const msgsContainer = document.getElementById('chat-messages');
  msgsContainer.innerHTML += `<div class="chat-msg user"><div class="chat-bubble">${msg}</div></div>`;
  chatHistory.push({ role: 'user', content: msg });

  const typingId = 'typing-' + Date.now();
  msgsContainer.innerHTML += `<div class="chat-msg ai" id="${typingId}"><div class="chat-bubble typing">⏳ Le juriste analyse...</div></div>`;
  msgsContainer.scrollTop = msgsContainer.scrollHeight;

  try {
    // VRAIE REQUÊTE IA VERS TON CLOUDFLARE
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });
    const data = await res.json();
    
    document.getElementById(typingId).remove();
    
    if (!res.ok || data.error) {
      const errMsg = JSON.stringify(data.error || data);
      msgsContainer.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">❌ Erreur : ${errMsg}</div></div>`;
      btn.disabled = false; input.focus(); return;
    }
    
    const reply = data.content?.[0]?.text || "Désolé, je n'ai pas pu formuler de réponse.";
    msgsContainer.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">${marked.parse(reply)}</div></div>`;
    chatHistory.push({ role: 'assistant', content: reply });
    
  } catch(e) {
    document.getElementById(typingId).remove();
    msgsContainer.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">❌ Erreur de connexion au serveur IA.</div></div>`;
  }
  
  msgsContainer.scrollTop = msgsContainer.scrollHeight;
  btn.disabled = false;
  input.focus();
}

function sendSugg(btn) {
  document.getElementById('chat-input').value = btn.textContent;
  sendChat();
}

function clearChat() {
  chatHistory = [];
  const c = document.getElementById('chat-messages');
  c.innerHTML = `<div class="chat-msg ai"><div class="chat-bubble">⚖️ Bonjour ! Je suis votre assistant juriste spécialisé en droit du travail français.<br><br>Posez-moi vos questions.</div></div>`;
  const suggs = document.getElementById('chat-suggestions');
  if(suggs) suggs.style.display = 'flex';
}

// =============================================
// BLOG — Vrai flux Substack (RSS2JSON)
// =============================================
const SUBSTACK_URL = 'https://topsirh.substack.com';
const RSS_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(SUBSTACK_URL+'/feed')}&api_key=public&count=20`;
let blogPosts = [];
let blogFilter = 'Tous';
let blogLoaded = false;

async function loadBlog() {
  if (blogLoaded) { renderBlog(); return; }
  try {
    const res = await fetch(RSS_URL);
    const data = await res.json();
    if (data.status === 'ok' && data.items) {
      blogPosts = data.items.map(item => ({
        title: item.title,
        excerpt: stripHtml(item.description || item.content || '').slice(0, 160) + '...',
        date: new Date(item.pubDate).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'}),
        link: item.link,
        tag: detectTag(item.title + ' ' + (item.description || ''))
      }));
      blogLoaded = true;
      renderBlogFilters();
      renderBlog();
    } else {
      showBlogError();
    }
  } catch(e) {
    showBlogError();
  }
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function detectTag(text) {
  const t = text.toLowerCase();
  if (t.includes('sirh') || t.includes('rh')) return 'RH / SIRH';
  if (t.includes('contrat') || t.includes('licenciem') || t.includes('droit')) return 'Droit du travail';
  return 'Actualités';
}

function renderBlogFilters() {
  const tags = ['Tous', ...new Set(blogPosts.map(p => p.tag))];
  document.getElementById('blog-filter').innerHTML = tags.map(t =>
    `<button class="blog-filter-btn${t==='Tous'?' active':''}" onclick="setBlogFilter('${t}')">${t}</button>`
  ).join('');
}

function setBlogFilter(tag) {
  blogFilter = tag;
  document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.toggle('active', b.textContent === tag));
  renderBlog();
}

function renderBlog() {
  const filtered = blogFilter === 'Tous' ? blogPosts : blogPosts.filter(p => p.tag === blogFilter);
  if (!filtered.length) {
    document.getElementById('blog-grid').innerHTML = `<div class="blog-error"><p>Aucun article.</p></div>`;
    return;
  }
  document.getElementById('blog-grid').innerHTML = filtered.map(p => `
    <a class="blog-card" href="${p.link}" target="_blank" rel="noopener">
      <div class="blog-card-tag">${p.tag}</div>
      <div class="blog-card-title">${p.title}</div>
      <div class="blog-card-excerpt">${p.excerpt}</div>
      <div class="blog-card-footer">
        <span class="blog-card-date">${p.date}</span>
        <span class="blog-card-read">Lire →</span>
      </div>
    </a>`).join('');
}

function showBlogError() {
  document.getElementById('blog-grid').innerHTML = `
    <div class="blog-error">
      <p style="font-size:2rem;margin-bottom:.5rem">📡</p>
      <p>Impossible de charger les articles.<br><a href="${SUBSTACK_URL}" target="_blank">Voir sur Substack</a></p>
    </div>`;
}

// =============================================
// MODALES & ABONNEMENT (Vrai Brevo)
// =============================================
function openModal() { document.getElementById('modal-overlay').classList.add('open'); }
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

async function submitSubscribe(e) {
  e.preventDefault();
  const email = document.getElementById('subscribe-email').value.trim();
  const btn = document.getElementById('subscribe-submit');
  const errEl = document.getElementById('subscribe-error');
  const okEl = document.getElementById('subscribe-success');
  
  if (!email) return;
  
  btn.textContent = '⏳ Inscription en cours...';
  btn.disabled = true;
  errEl.style.display = 'none';
  okEl.style.display = 'none';
  
  try {
    const formData = new FormData();
    formData.append('EMAIL', email);
    formData.append('email_address_check', '');
    formData.append('locale', 'fr');
    
    // VRAIE REQUÊTE VERS TON BREVO
    await fetch('https://2baff920.sibforms.com/serve/MUIFAD2Gyh81Kn1j-gAmFsCb9abwzHZmtBrXd7UglIum_S2ipSfL6WIcYfjJOEppWUB7nsd8lH5vNJPh_1pevmpRfWQ4kCSq8c5kJv4WU28NQfx4oeOEWY5qEfeNbDHLVCYoo4nJaos8emIUQlhQkScivj_f2_ARpUW_Pp_3t2qWT1x0t0ikn9xE2qeWj1gy9oqV-qaHFcBhTjNQLA==', {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });
    
    okEl.style.display = 'block';
    document.getElementById('subscribe-form').style.display = 'none';
    showToast('🎉 Inscription confirmée !', 'success');
    setTimeout(() => closeModal(), 3000);
  } catch(err) {
    errEl.style.display = 'block';
    btn.textContent = '📧 Je m\'abonne gratuitement';
    btn.disabled = false;
  }
}

// =============================================
// RECAP (MÉMO ACCORDÉON)
// =============================================
function renderRecap() {
  const container = document.getElementById('recap-list');
  if(container.innerHTML !== '') return; 

  RECAP.forEach((section, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'recap-section';
    
    let rowsHtml = '';
    section.items.forEach(item => {
      rowsHtml += `<div class="recap-row"><div class="recap-key">${item.k}</div><div class="recap-val">${item.v}</div></div>`;
    });

    wrap.innerHTML = `
      <div class="recap-head" onclick="toggleRecap(${idx})">
        <div class="recap-head-title">${section.title}</div>
        <div class="recap-head-right">
          <div class="recap-count">${section.items.length}</div>
          <div class="recap-chevron" id="chevron-${idx}">▼</div>
        </div>
      </div>
      <div class="recap-body" id="recap-body-${idx}">
        <div class="recap-body-inner">${rowsHtml}</div>
      </div>
    `;
    container.appendChild(wrap);
  });
}

function toggleRecap(idx) {
  const body = document.getElementById(`recap-body-${idx}`);
  const chevron = document.getElementById(`chevron-${idx}`);
  if (body.classList.contains('open')) {
    body.classList.remove('open');
    chevron.style.transform = 'rotate(0deg)';
  } else {
    body.classList.add('open');
    chevron.style.transform = 'rotate(180deg)';
  }
}

// =============================================
// FLASHCARDS (Répétition Espacée)
// =============================================
let fcCurrentList = [];
let fcCurrentIdx = 0;

function initFlashcards() {
  fcCurrentList = [...FLASHCARDS].sort(() => Math.random() - 0.5);
  fcCurrentIdx = 0;
  updateFcStats();
  renderFlashcard();
}

function updateFcStats() {
  let newC = 0, learningC = 0, knownC = 0;
  FLASHCARDS.forEach((_, i) => {
    const lvl = state.flashcards[i] || 0;
    if (lvl === 0) newC++;
    else if (lvl < 3) learningC++;
    else knownC++;
  });
  document.getElementById('sr-new-count').textContent = `🆕 ${newC} nouvelles`;
  document.getElementById('sr-learning-count').textContent = `📖 ${learningC} en cours`;
  document.getElementById('sr-known-count').textContent = `✅ ${knownC} maîtrisées`;
}

function renderFlashcard() {
  if (fcCurrentIdx >= fcCurrentList.length) fcCurrentIdx = 0;
  const card = fcCurrentList[fcCurrentIdx];
  document.getElementById('fc-counter').textContent = `${fcCurrentIdx + 1} / ${fcCurrentList.length}`;
  document.getElementById('fc-tag').textContent = card.tag;
  document.getElementById('fc-question').textContent = card.q;
  document.getElementById('fc-answer').textContent = card.a;
  
  document.getElementById('card-scene').classList.remove('flipped');
  document.getElementById('sr-feedback').classList.remove('show');
}

function flipCard() {
  document.getElementById('card-scene').classList.add('flipped');
  document.getElementById('sr-feedback').classList.add('show');
}

function nextCard() { fcCurrentIdx++; renderFlashcard(); }
function prevCard() { fcCurrentIdx = fcCurrentIdx > 0 ? fcCurrentIdx - 1 : fcCurrentList.length - 1; renderFlashcard(); }

function srRate(rating) {
  const card = fcCurrentList[fcCurrentIdx];
  const originalIdx = FLASHCARDS.indexOf(card);
  let lvl = state.flashcards[originalIdx] || 0;
  
  if (rating === 'no') lvl = 1;
  else if (rating === 'hard') lvl = Math.max(1, lvl);
  else if (rating === 'ok') lvl = Math.min(3, lvl + 1);
  
  state.flashcards[originalIdx] = lvl;
  localStorage.setItem('flashcards', JSON.stringify(state.flashcards));
  
  updateFcStats();
  nextCard();
}

// =============================================
// QUIZ
// =============================================
let currentQuiz = [];
let quizScore = 0;
let quizIndex = 0;

function initQuiz() {
  currentQuiz = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 10); 
  quizScore = 0;
  quizIndex = 0;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const container = document.getElementById('quiz-area');
  const actions = document.getElementById('quiz-actions');
  const bar = document.getElementById('quiz-bar');
  
  if (quizIndex >= currentQuiz.length) { showQuizResults(); return; }

  const q = currentQuiz[quizIndex];
  bar.style.width = ((quizIndex / currentQuiz.length) * 100) + '%';
  
  let html = `<div class="question-card"><div class="q-meta">Question ${quizIndex + 1} / ${currentQuiz.length} • ${q.cat}</div><div class="q-text">${q.q}</div><div class="options-list">`;
  q.opts.forEach((opt, idx) => { html += `<button class="opt-btn" onclick="answerQuiz(${idx})">${opt}</button>`; });
  html += `</div><div class="explanation" id="quiz-expl">${q.expl}</div></div>`;
  
  container.innerHTML = html;
  actions.innerHTML = '';
}

function answerQuiz(idx) {
  const q = currentQuiz[quizIndex];
  const btns = document.querySelectorAll('.opt-btn');
  const expl = document.getElementById('quiz-expl');
  const actions = document.getElementById('quiz-actions');
  
  btns.forEach(b => b.disabled = true);
  if (idx === q.correct) { btns[idx].classList.add('correct'); quizScore++; } 
  else { btns[idx].classList.add('wrong'); btns[q.correct].classList.add('correct'); }
  
  expl.classList.add('show');
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-primary';
  nextBtn.textContent = quizIndex === currentQuiz.length - 1 ? 'Voir les résultats' : 'Question suivante →';
  nextBtn.onclick = () => { quizIndex++; renderQuizQuestion(); };
  actions.appendChild(nextBtn);
}

function showQuizResults() {
  const percentage = Math.round((quizScore / currentQuiz.length) * 100);
  if (!state.quizHighscore || percentage > state.quizHighscore) {
    state.quizHighscore = percentage;
    localStorage.setItem('quizHighscore', percentage);
    updateHomeStats();
  }
  document.getElementById('quiz-bar').style.width = '100%';
  document.getElementById('quiz-area').innerHTML = `
    <div class="results-wrap"><div class="results-card">
      <div class="results-score">${percentage}%</div><div class="results-label">Score final</div>
      <div class="results-stats">
        <div class="rs-pill rs-correct"><div class="rs-num">${quizScore}</div><div class="rs-lbl">Correctes</div></div>
        <div class="rs-pill rs-wrong"><div class="rs-num">${currentQuiz.length - quizScore}</div><div class="rs-lbl">Erreurs</div></div>
      </div>
    </div></div>`;
  document.getElementById('quiz-actions').innerHTML = `<button class="btn-primary" onclick="initQuiz()">Refaire un quiz</button>`;
}

function restartQuiz() { if(confirm("Recommencer le quiz à zéro ?")) initQuiz(); }