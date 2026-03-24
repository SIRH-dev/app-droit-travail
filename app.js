async function shareLinkedIn(url, text) {
  if (navigator.share) {
    try { await navigator.share({ title: text, url: url }); } catch(e) {}
  } else {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  }
}

function toggleMobileMenu(){
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  const btn = document.getElementById('hamburger-btn');
  const isOpen = menu.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
  btn.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen);
  menu.setAttribute('aria-hidden', !isOpen);
}
function closeMobileMenu(){
  const menu = document.getElementById('mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  const btn = document.getElementById('hamburger-btn');
  menu.classList.remove('open');
  overlay.classList.remove('open');
  btn.classList.remove('open');
  btn.setAttribute('aria-expanded', false);
  menu.setAttribute('aria-hidden', true);
}

function slugify(str){
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,60);
}

// =============================================
// SYSTEME PREMIUM
// =============================================
const PREMIUM_KEY = 'premium_access';
let pendingPremiumAction = null;

function isPremium() {
  const data = JSON.parse(localStorage.getItem(PREMIUM_KEY) || 'null');
  if (!data) return false;
  if (Date.now() > data.expiry) { localStorage.removeItem(PREMIUM_KEY); return false; }
  return true;
}

function openPremium(action) {
  pendingPremiumAction = action;
  document.getElementById('premium-overlay').classList.add('open');
  document.getElementById('premium-code-input').value = '';
  document.getElementById('premium-error').style.display = 'none';
  document.getElementById('premium-code-input').focus();
  // Dessiner le bouton Ko-fi dans la modal
  const container = document.getElementById('kofi-btn-container');
  if (container && container.innerHTML === '') {
    if (typeof kofiwidget2 !== 'undefined') {
      kofiwidget2.draw();
      const kofiEl = document.querySelector('.kofi-button-container');
      if (kofiEl) container.appendChild(kofiEl);
    }
  }
}

function closePremium() {
  document.getElementById('premium-overlay').classList.remove('open');
  pendingPremiumAction = null;
  
  // FIX BUG : Si l'utilisateur ferme la modale sans code valide
  // et qu'il se trouve sur la page 'chat', on le renvoie à l'accueil
  if (!isPremium() && document.getElementById('screen-chat')?.classList.contains('active')) {
    showScreen('home');
  }
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
    const res = await fetch('https://lexstudy-api.kpnonon.workers.dev/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.valid) {
      localStorage.setItem(PREMIUM_KEY, JSON.stringify({ expiry: data.expiry }));
      closePremium();
      toast('Accès Premium activé !', 'success');
      if (pendingPremiumAction) pendingPremiumAction();
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

function requirePremium(action) {
  if (isPremium()) { action(); return; }
  openPremium(action);
}

document.getElementById('premium-code-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitPremiumCode();
});


// =============================================
// STATE
// =============================================
// Sécurité : on vérifie que FLASHCARDS existe bien depuis data.js
const safeCards = (typeof FLASHCARDS !== 'undefined') ? [...FLASHCARDS.map((_,i)=>i)] : [];

const S = {
  completedFiches: JSON.parse(localStorage.getItem('ls_fiches')||'[]'),
  srData: JSON.parse(localStorage.getItem('ls_sr')||'{}'),
  bestScore: JSON.parse(localStorage.getItem('ls_score')||'null'),
  currentFiche: 0,
  currentCard: 0,
  cardFlipped: false,
  currentQ: 0,
  quizScore: 0,
  quizAnswered: false,
  quizDone: false,
  quizFilter: 'all',
  fcFilter: 'all',
  activeCards: safeCards
};

function save(){
  localStorage.setItem('ls_fiches',JSON.stringify(S.completedFiches));
  localStorage.setItem('ls_sr',JSON.stringify(S.srData));
  if(S.bestScore!==null) localStorage.setItem('ls_score',JSON.stringify(S.bestScore));
}

// SR helpers
function getSRStatus(i){return S.srData[i]||'new'}
function getSRCounts(){
  let n=0,l=0,k=0;
  if(typeof FLASHCARDS !== 'undefined') {
    FLASHCARDS.forEach((_,i)=>{const s=getSRStatus(i);if(s==='new')n++;else if(s==='learning')l++;else k++;});
  }
  return{n,l,k};
}

// =============================================
// NAVIGATION & VERROUILLAGE (PÉAGE)
// =============================================
// Écrans accessibles sans inscription email (3 premières fiches libres via openFiche)
const PUBLIC_SCREENS = ['home', 'fiches', 'reader', 'blog'];
let _suppressHistory = false;

function showScreen(name){
  const isRegistered = localStorage.getItem('ls_registered') === 'true';

  // Gating : fiches et accueil sont publics, le reste nécessite une inscription
  if (!isRegistered && !PUBLIC_SCREENS.includes(name)) {
    toast('🔒 Entrez votre e-mail sur l\'accueil pour débloquer le contenu.', 'warn');
    if (!document.getElementById('screen-home').classList.contains('active')) {
      _suppressHistory = true;
      showScreen('home');
      _suppressHistory = false;
    }
    document.getElementById('lead-magnet')?.scrollIntoView({behavior: 'smooth'});
    return;
  }

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.top-nav-tab,.bottom-nav-item').forEach(t=>t.classList.remove('active'));
  document.getElementById('screen-'+name)?.classList.add('active');
  const map={home:0,fiches:1,quiz:2,blog:3,chat:4};
  if(map[name]!==undefined){
    document.querySelectorAll('.top-nav-tab')[map[name]]?.classList.add('active');
    document.querySelectorAll('.bottom-nav-item')[map[name]]?.classList.add('active');
  }
  if(name==='fiches') renderFichesList();
  if(name==='flashcards') initFlashcards();
  if(name==='quiz') initQuiz();
  if(name==='recap') renderRecap();
  if(name==='home') updateHome();
  if(name==='blog') loadBlog();
  if(name==='chat'){
    if(!isPremium()){
      openPremium(()=>showScreen('chat'));
      return;
    }
    initVeille();
  }

  // History API — active le bouton retour natif du navigateur
  if (!_suppressHistory && location.hash !== '#' + name) {
    history.pushState({ screen: name }, '', '#' + name);
  }

  // Gestion du focus pour accessibilité clavier / lecteurs d'écran
  const activeScreen = document.getElementById('screen-' + name);
  const firstH = activeScreen?.querySelector('h1, h2');
  if (firstH) {
    firstH.setAttribute('tabindex', '-1');
    firstH.focus({ preventScroll: true });
  }

  window.scrollTo(0,0);
}

// Gestion du bouton Retour/Avant du navigateur
window.addEventListener('popstate', () => {
  const screen = location.hash.replace('#', '') || 'home';
  _suppressHistory = true;
  showScreen(screen);
  _suppressHistory = false;
});

// =============================================
// HOME
// =============================================
function updateHome(){
  const fichesCount = typeof FICHES !== 'undefined' ? FICHES.length : 28;
  const statFiches = document.getElementById('stat-fiches');
  if (statFiches) statFiches.textContent = S.completedFiches.length;
  
  const statKnown = document.getElementById('stat-known');
  const {k} = getSRCounts();
  if (statKnown) statKnown.textContent = k;
  
  const statQuiz = document.getElementById('stat-quiz');
  if (statQuiz) statQuiz.textContent = S.bestScore !== null ? S.bestScore + '%' : '—';
  
  const globalProgress = document.getElementById('global-progress');
  if (globalProgress) globalProgress.textContent = `${S.completedFiches.length}/${fichesCount}`;
}

// =============================================
// FICHES
// =============================================
const PARTIES=[
  {label:"Partie 1 — Sources et contrôle",range:[1,3]},
  {label:"Partie 2 — Embauche et contrats",range:[4,6]},
  {label:"Partie 3 — Exécution du contrat",range:[7,12]},
  {label:"Partie 4 — Modification et suspension",range:[13,14]},
  {label:"Partie 5 — Rupture du contrat",range:[15,17]},
  {label:"Partie 6 — Aspects collectifs",range:[18,22]},
  {label:"Partie 7 — Sécurité sociale",range:[23,24]},
  {label:"Partie 8 — Assurance chômage",range:[25,25]},
  {label:"Partie 9 — Aide sociale et complémentaires",range:[26,27]},
  {label:"Partie 10 — Contentieux",range:[28,28]}
];

function renderFichesList(){
  if(typeof FICHES === 'undefined') return;
  const isRegistered = localStorage.getItem('ls_registered') === 'true';
  const FREE_FICHE_COUNT = 3;
  let html='';
  PARTIES.forEach(p=>{
    const fiches=FICHES.filter(f=>f.num>=p.range[0]&&f.num<=p.range[1]);
    html+=`<div class="partie-section"><div class="partie-label">${p.label}</div><div class="fiches-row">`;
    fiches.forEach(f=>{
      const done=S.completedFiches.includes(f.num);
      const locked=!isRegistered && (f.num-1) >= FREE_FICHE_COUNT;
      html+=`<div class="fiche-card${locked?' fiche-locked':''}" onclick="openFiche(${f.num-1})" aria-label="Fiche ${f.num} : ${f.title}${locked?' (verrouillée)':''}">
        <div class="fiche-number">Fiche ${f.num}${locked?' <span class="fiche-lock-icon" aria-hidden="true">🔒</span>':''}</div>
        <div class="fiche-title">${f.title}</div>
        ${done?'<div class="fiche-done-badge">✓ Lu</div>':''}
      </div>`;
    });
    html+=`</div></div>`;
  });
  const listEl = document.getElementById('fiches-list');
  if (listEl) listEl.innerHTML = html;
  updateHome();
}

function openFiche(idx){
  const isRegistered = localStorage.getItem('ls_registered') === 'true';
  const FREE_FICHE_COUNT = 3; // Les 3 premières fiches sont accessibles sans inscription
  if (!isRegistered && idx >= FREE_FICHE_COUNT) {
    toast('🔒 Inscrivez-vous gratuitement pour accéder à toutes les fiches.', 'warn');
    showScreen('home');
    setTimeout(() => document.getElementById('lead-magnet')?.scrollIntoView({behavior:'smooth'}), 300);
    return;
  }
  S.currentFiche=idx;
  renderFiche();
  showScreen('reader');
  document.querySelectorAll('.top-nav-tab,.bottom-nav-item').forEach(t=>t.classList.remove('active'));
}

function renderFiche(){
  if(typeof FICHES === 'undefined') return;
  const f=FICHES[S.currentFiche];
  const contentArea = document.getElementById('fiche-content-area');
  if(contentArea) contentArea.innerHTML=f.content;
  
  const progress = document.getElementById('reader-progress');
  if(progress) progress.textContent=`${S.currentFiche+1} / ${FICHES.length}`;
  
  const nextBtn = document.getElementById('btn-next-fiche');
  if(nextBtn) {
    nextBtn.onclick=()=>{
      if(!S.completedFiches.includes(f.num)){S.completedFiches.push(f.num);save();}
      if(S.currentFiche<FICHES.length-1){openFiche(S.currentFiche+1);window.scrollTo(0,0);}
      else{toast('🎉 Toutes les fiches lues !','success');showScreen('fiches');}
    };
  }

  // Share bar
  const ficheUrl = `https://sirh-dev.github.io/app-droit-travail/fiches/${f.num}-${slugify(f.title)}.html`;
  const shareText = encodeURIComponent(`Fiche ${f.num} — ${f.title} | Le Droit du Travail Facile`);
  const shareUrl = encodeURIComponent(ficheUrl);
  const shareBar = document.createElement('div');
  shareBar.className = 'reader-share-bar';
  shareBar.innerHTML = `
    <span class="reader-share-label">Partager :</span>
    <a class="reader-share-btn share-whatsapp" href="https://wa.me/?text=${shareText}%20${shareUrl}" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.508 5.82L0 24l6.335-1.652A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.366l-.359-.213-3.72.975.993-3.63-.234-.373A9.818 9.818 0 1 1 12 21.818z"/></svg>
      WhatsApp
    </a>
    <button class="reader-share-btn share-linkedin" onclick="shareLinkedIn('${ficheUrl}', 'Fiche ${f.num} — ${f.title} | Le Droit du Travail Facile')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      LinkedIn
    </button>
    <a class="reader-share-btn share-x" href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      X
    </a>
    <a class="reader-share-btn share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      Facebook
    </a>`;
  if(contentArea) contentArea.appendChild(shareBar);

  // Bandeau mise à jour
  const updateBar = document.createElement('div');
  updateBar.className = 'fiche-update-bar';
  updateBar.innerHTML = `
    <button class="fiche-update-btn" id="update-btn-${f.num}" onclick="checkFicheUpdate(${f.num-1})">
      Vérifier la mise à jour des informations
      <span id="update-arrow-${f.num}">→</span>
    </button>
    <div class="fiche-update-result" id="update-result-${f.num}"></div>
  `;
  if(contentArea) contentArea.appendChild(updateBar);
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

  const content = f.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `[Date du jour : ${new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}]\n\nTu es un expert en droit du travail français spécialisé dans les lois en vigueur en 2025-2026. Vérifie si le contenu de cette fiche est toujours à jour, en tenant compte des modifications législatives récentes.\n\nFiche : "${f.title}"\n\nContenu actuel :\n${content}\n\nRéponds en français avec :\n1. Un statut clair : ✅ À jour ou ⚠️ Modifications détectées\n2. Si des modifications existent, liste-les précisément (nouveaux montants, nouvelles durées, nouveaux textes)\n3. Vérifie notamment : SMIC 2025-2026, PASS 2026, délais légaux, jurisprudences récentes de la Cour de cassation\n4. Cite tes sources (articles du Code du travail, décrets, arrêts)`
        }]
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Impossible de vérifier.';
    const isWarn = reply.includes('⚠️') || reply.toLowerCase().includes('modification');
    result.className = `fiche-update-result show ${isWarn ? 'warn' : 'ok'}`;
    result.innerHTML = marked.parse(reply);
    arrow.textContent = isWarn ? '⚠️' : '✅';
  } catch(e) {
    result.className = 'fiche-update-result show warn';
    result.innerHTML = '❌ Erreur de connexion.';
    arrow.textContent = '❌';
  }
  btn.classList.remove('loading');
  btn.disabled = false;
}

// =============================================
// FLASHCARDS + SPACED REPETITION
// =============================================
function initFlashcards(){
  if(typeof FLASHCARDS === 'undefined') return;
  const FC_TAGS=['Toutes',...[...new Set(FLASHCARDS.map(f=>f.tag))]];
  const fc=document.getElementById('fc-filter');
  if(fc) fc.innerHTML=FC_TAGS.map((t,i)=>`<button class="fc-filter-btn${i===0?' active':''}" onclick="setFcFilter('${t}')">${t}</button>`).join('');
  filterCards();
  renderFlashcard();
  updateSRBadges();
}

function setFcFilter(tag){
  S.fcFilter=tag;
  document.querySelectorAll('.fc-filter-btn').forEach(b=>{
    b.classList.toggle('active',b.textContent===tag);
  });
  filterCards();
  S.currentCard=0;
  renderFlashcard();
}

function filterCards(){
  if(typeof FLASHCARDS === 'undefined') return;
  if(S.fcFilter==='Toutes'){S.activeCards=FLASHCARDS.map((_,i)=>i);}
  else{S.activeCards=FLASHCARDS.map((_,i)=>i).filter(i=>FLASHCARDS[i].tag===S.fcFilter);}
}

function renderFlashcard(){
  if(!S.activeCards.length){
    const area = document.getElementById('fiche-content-area');
    if(area) area.textContent='';
    return;
  }
  const idx=S.activeCards[S.currentCard%S.activeCards.length];
  const card=FLASHCARDS[idx];
  S.cardFlipped=false;
  document.getElementById('card-scene')?.classList.remove('flipped');
  
  const fcTag = document.getElementById('fc-tag');
  if(fcTag) fcTag.textContent=card.tag;
  const fcQ = document.getElementById('fc-question');
  if(fcQ) fcQ.textContent=card.q;
  const fcA = document.getElementById('fc-answer');
  if(fcA) fcA.textContent=card.a;
  
  const fcCounter = document.getElementById('fc-counter');
  if(fcCounter) fcCounter.textContent=`${(S.currentCard%S.activeCards.length)+1} / ${S.activeCards.length}`;
  
  document.getElementById('sr-feedback')?.classList.remove('show');
}

function flipCard(){
  S.cardFlipped=!S.cardFlipped;
  document.getElementById('card-scene')?.classList.toggle('flipped',S.cardFlipped);
  if(S.cardFlipped) document.getElementById('sr-feedback')?.classList.add('show');
}

function srRate(rating){
  const idx=S.activeCards[S.currentCard%S.activeCards.length];
  if(rating==='no') S.srData[idx]='new';
  else if(rating==='hard') S.srData[idx]='learning';
  else S.srData[idx]='known';
  save();
  updateSRBadges();
  nextCard();
  toast(rating==='ok'?'✅ Carte maîtrisée !':rating==='hard'?'🤔 À revoir bientôt':'😕 Remise dans la pile');
}

function updateSRBadges(){
  const {n,l,k}=getSRCounts();
  const srNew = document.getElementById('sr-new-count');
  if(srNew) srNew.textContent=`🆕 ${n} nouvelles`;
  const srLearn = document.getElementById('sr-learning-count');
  if(srLearn) srLearn.textContent=`📖 ${l} en cours`;
  const srKnown = document.getElementById('sr-known-count');
  if(srKnown) srKnown.textContent=`✅ ${k} maîtrisées`;
}

function nextCard(){
  S.currentCard=(S.currentCard+1)%S.activeCards.length;
  renderFlashcard();
}
function prevCard(){
  S.currentCard=(S.currentCard-1+S.activeCards.length)%S.activeCards.length;
  renderFlashcard();
}

// =============================================
// QUIZ
// =============================================
let filteredQuiz=[];
let quizShuffled=[];

function shuffleArray(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function initQuiz(){
  if(typeof QUIZ === 'undefined') return;
  const QUIZ_CATS=['Toutes',...[...new Set(QUIZ.map(q=>q.cat))]];
  const QUIZ_FICHES=['Toutes',...[...new Set(QUIZ.map(q=>q.fiche))].sort((a,b)=>a-b).map(n=>`Fiche ${n}`)];
  filteredQuiz=[...QUIZ];

  if(!S.quizFicheFilter) S.quizFicheFilter='Toutes';
  const qf=document.getElementById('quiz-filter');
  if(!qf) return;
  
  const catBtns=QUIZ_CATS.map((c,i)=>`<button class="q-filter-btn${i===0?' active':''}" onclick="setQuizFilter('cat','${c}')">${c}</button>`).join('');
  const ficheBtns=QUIZ_FICHES.map((f,i)=>`<button class="q-filter-btn q-filter-fiche${i===0?' active':''}" onclick="setQuizFilter('fiche','${f}')">${f}</button>`).join('');
  
  qf.innerHTML=`<div style="display:flex;flex-direction:column;gap:.4rem;width:100%">
    <div style="font-size:.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.08em">Par catégorie</div>
    <div style="display:flex;flex-wrap:wrap;gap:.35rem">${catBtns}</div>
    <div style="font-size:.7rem;color:var(--text-muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.08em;margin-top:.25rem">Par fiche</div>
    <div style="display:flex;flex-wrap:wrap;gap:.35rem">${ficheBtns}</div>
  </div>`;
  applyFilters();
}

function setQuizFilter(type,val){
  if(type==='cat'){
    S.quizFilter=val;S.quizFicheFilter='Toutes';
    document.querySelectorAll('.q-filter-btn:not(.q-filter-fiche)').forEach(b=>b.classList.toggle('active',b.textContent===val));
    document.querySelectorAll('.q-filter-fiche').forEach((b,i)=>b.classList.toggle('active',i===0));
  } else {
    S.quizFicheFilter=val;S.quizFilter='Toutes';
    document.querySelectorAll('.q-filter-fiche').forEach(b=>b.classList.toggle('active',b.textContent===val));
    document.querySelectorAll('.q-filter-btn:not(.q-filter-fiche)').forEach((b,i)=>b.classList.toggle('active',i===0));
  }
  applyFilters();
}

function applyFilters(){
  if(typeof QUIZ === 'undefined') return;
  let q=[...QUIZ];
  if(S.quizFilter&&S.quizFilter!=='Toutes') q=q.filter(x=>x.cat===S.quizFilter);
  if(S.quizFicheFilter&&S.quizFicheFilter!=='Toutes') q=q.filter(x=>`Fiche ${x.fiche}`===S.quizFicheFilter);
  filteredQuiz=q;
  restartQuiz();
}

function restartQuiz(){
  if(typeof QUIZ === 'undefined') return;
  S.currentQ=0;S.quizScore=0;S.quizAnswered=false;S.quizDone=false;
  quizShuffled=shuffleArray(filteredQuiz.length?filteredQuiz:[...QUIZ]);
  const area=document.getElementById('quiz-area');
  const actions=document.getElementById('quiz-actions');
  if(area) area.innerHTML='';
  if(actions) actions.innerHTML='';
  renderQuizQuestion();
}

function renderQuizQuestion(){
  if(S.quizDone||S.currentQ>=quizShuffled.length){renderResults();return;}
  S.quizAnswered=false;
  const q=quizShuffled[S.currentQ];
  const indices=Array.from({length:q.opts.length},(_,i)=>i);
  const shuffledIdx=shuffleArray(indices);
  const newCorrect=shuffledIdx.indexOf(q.correct);
  const shuffledOpts=shuffledIdx.map(i=>q.opts[i]);
  const pct=(S.currentQ/quizShuffled.length)*100;
  
  const bar = document.getElementById('quiz-bar');
  if(bar) bar.style.width=pct+'%';
  
  const subtitle = document.getElementById('quiz-subtitle');
  if(subtitle) subtitle.textContent=`Question ${S.currentQ+1}/${quizShuffled.length} — Score : ${S.quizScore}`;
  
  const area = document.getElementById('quiz-area');
  if(area) area.innerHTML=`
    <div class="question-card">
      <div class="q-meta">Fiche ${q.fiche} · ${q.cat}</div>
      <div class="q-text">${q.q}</div>
      <div class="options-list">${shuffledOpts.map((o,i)=>`<button class="opt-btn" onclick="selectAnswer(${i},${newCorrect})">${o}</button>`).join('')}</div>
      <div class="explanation" id="expl"><strong>Explication :</strong> ${q.expl}</div>
    </div>`;
    
  const actions = document.getElementById('quiz-actions');
  if(actions) actions.innerHTML=`
    <button class="btn-secondary" onclick="prevQuestion()" ${S.currentQ===0?'style="visibility:hidden"':''}>← Précédente</button>
    <button class="btn-secondary" onclick="nextQuestion()">Passer →</button>`;
}

function selectAnswer(idx,correctIdx){
  if(S.quizAnswered) return;
  S.quizAnswered=true;
  document.querySelectorAll('.opt-btn').forEach((b,i)=>{
    b.disabled=true;
    if(i===correctIdx) b.classList.add('correct');
    else if(i===idx&&i!==correctIdx) b.classList.add('wrong');
  });
  if(idx===correctIdx){S.quizScore++;toast('✓ Bonne réponse !','success');}
  else toast('✗ Mauvaise réponse','error');
  document.getElementById('expl')?.classList.add('show');
  document.getElementById('quiz-subtitle').textContent=`Question ${S.currentQ+1}/${quizShuffled.length} — Score : ${S.quizScore}`;
  document.getElementById('quiz-actions').innerHTML=`
    <button class="btn-secondary" onclick="prevQuestion()" ${S.currentQ===0?'style="visibility:hidden"':''}>← Précédente</button>
    <button class="btn-primary" onclick="nextQuestion()">Suivante →</button>`;
}

function nextQuestion(){
  if(S.currentQ < quizShuffled.length - 1){ S.currentQ++; renderQuizQuestion(); }
  else { renderResults(); }
}

function prevQuestion(){
  if(S.currentQ > 0){ S.currentQ--; renderQuizQuestion(); }
}

function renderResults(){
  S.quizDone=true;
  const total=quizShuffled.length||1;
  const pct=Math.round((S.quizScore/total)*100);
  if(S.bestScore===null||pct>S.bestScore){S.bestScore=pct;save();}
  const emoji=pct>=80?'🏆':pct>=60?'💪':'📚';
  const msg=pct>=80?'Excellent !':pct>=60?'Bon travail !':'Continuez à réviser !';
  
  const bar = document.getElementById('quiz-bar');
  if(bar) bar.style.width='100%';
  
  const subtitle = document.getElementById('quiz-subtitle');
  if(subtitle) subtitle.textContent='Quiz terminé';
  
  const area = document.getElementById('quiz-area');
  if(area) area.innerHTML=`
    <div class="results-wrap"><div class="results-card">
      <div class="results-score">${pct}%</div>
      <div class="results-label">${emoji} ${msg}</div>
      <div class="results-stats">
        <div class="rs-pill rs-correct"><div class="rs-num">${S.quizScore}</div><div class="rs-lbl">Bonnes réponses</div></div>
        <div class="rs-pill rs-wrong"><div class="rs-num">${total-S.quizScore}</div><div class="rs-lbl">Erreurs</div></div>
      </div>
      <button class="btn-primary" onclick="restartQuiz()" style="margin-top:.5rem">🔀 Recommencer</button>
    </div></div>`;
    
  const actions = document.getElementById('quiz-actions');
  if(actions) actions.innerHTML='';
  updateHome();
}

// =============================================
// RECAP
// =============================================
function renderRecap(){
  if(typeof RECAP === 'undefined') return;
  const list = document.getElementById('recap-list');
  if(!list) return;
  list.innerHTML=RECAP.map((s,i)=>`
    <div class="recap-section">
      <div class="recap-head" onclick="toggleRecap(${i})">
        <div class="recap-head-title">${s.title}</div>
        <div class="recap-head-right">
          <span class="recap-count">${s.items.length}</span>
          <span class="recap-chevron" id="chev-${i}">▼</span>
        </div>
      </div>
      <div class="recap-body${i<2?' open':''}" id="rb-${i}">
        <div class="recap-body-inner">
          ${s.items.map(it=>`<div class="recap-row"><div class="recap-key">${it.k}</div><div class="recap-val">${it.v}</div></div>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

function toggleRecap(i){
  const b=document.getElementById('rb-'+i);
  const c=document.getElementById('chev-'+i);
  if(b) b.classList.toggle('open');
  if(c) c.textContent=b.classList.contains('open')?'▲':'▼';
}

// =============================================
// TOAST
// =============================================
function toast(msg,type=''){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg;t.className='toast show '+(type||'');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.className='toast',2500);
}

// =============================================
// BLOG — Substack RSS
// =============================================
const SUBSTACK_URL = 'https://topsirh.substack.com';
let blogPosts = [];
let blogFilter = 'Tous';

async function loadBlog() {
  try {
    const rssUrl = SUBSTACK_URL + '/feed';
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}&t=${Date.now()}`);
    const data = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    if (!items.length) { showBlogError(); return; }
    blogPosts = items.map(item => ({
      title: item.querySelector('title')?.textContent || '',
      excerpt: stripHtml(item.querySelector('description')?.textContent || '').slice(0, 160) + '...',
      date: new Date(item.querySelector('pubDate')?.textContent).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'}),
      link: item.querySelector('link')?.textContent || '#',
      tag: detectTag((item.querySelector('title')?.textContent || '') + ' ' + (item.querySelector('description')?.textContent || '')),
      thumbnail: null
    }));
    renderBlogFilters();
    renderBlog();
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
  if (t.includes('sirh') || t.includes('rh') || t.includes('ressources humaines') || t.includes('logiciel') || t.includes('digital')) return 'RH / SIRH';
  if (t.includes('contrat') || t.includes('licenciem') || t.includes('droit') || t.includes('salaire') || t.includes('cdd') || t.includes('cdi')) return 'Droit du travail';
  return 'Actualités';
}

function renderBlogFilters() {
  const tags = ['Tous', ...new Set(blogPosts.map(p => p.tag))];
  const filterEl = document.getElementById('blog-filter');
  if(filterEl) {
    filterEl.innerHTML = tags.map(t =>
      `<button class="blog-filter-btn${t==='Tous'?' active':''}" onclick="setBlogFilter('${t}')">${t}</button>`
    ).join('');
  }
}

function setBlogFilter(tag) {
  blogFilter = tag;
  document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.toggle('active', b.textContent === tag));
  renderBlog();
}

function renderBlog() {
  const grid = document.getElementById('blog-grid');
  if(!grid) return;
  const filtered = blogFilter === 'Tous' ? blogPosts : blogPosts.filter(p => p.tag === blogFilter);
  if (!filtered.length) {
    grid.innerHTML = `<div class="blog-error"><p>Aucun article dans cette catégorie.</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(p => `
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
  const grid = document.getElementById('blog-grid');
  if(grid) {
    grid.innerHTML = `
      <div class="blog-error">
        <p style="font-size:2rem;margin-bottom:.5rem">📡</p>
        <p style="font-weight:600;margin-bottom:.5rem">Impossible de charger les articles</p>
        <p style="font-size:.83rem">Consulte directement le blog sur <a href="${SUBSTACK_URL}" target="_blank">Substack</a></p>
      </div>`;
  }
}

// =============================================
// SUBSCRIBE — Formulaire d'inscription (DÉBLOCAGE)
// =============================================
async function submitSubscribe(e) {
  e.preventDefault();
  const email = document.getElementById('subscribe-email').value.trim();
  const btn = document.getElementById('subscribe-submit');
  const errEl = document.getElementById('subscribe-error');
  const okEl = document.getElementById('subscribe-success');
  if (!email) return;

  btn.textContent = '⏳ Activation en cours...';
  btn.disabled = true;
  errEl.style.display = 'none';
  okEl.style.display = 'none';

  try {
    const formData = new FormData();
    formData.append('EMAIL', email);
    formData.append('email_address_check', '');
    formData.append('locale', 'fr');

    await fetch('https://2baff920.sibforms.com/serve/MUIFAD2Gyh81Kn1j-gAmFsCb9abwzHZmtBrXd7UglIum_S2ipSfL6WIcYfjJOEppWUB7nsd8lH5vNJPh_1pevmpRfWQ4kCSq8c5kJv4WU28NQfx4oeOEWY5qEfeNbDHLVCYoo4nJaos8emIUQlhQkScivj_f2_ARpUW_Pp_3t2qWT1x0t0ikn9xE2qeWj1gy9oqV-qaHFcBhTjNQLA==', {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });

    // Déblocage du site
    localStorage.setItem('ls_registered', 'true');
    okEl.style.display = 'block';
    document.getElementById('subscribe-form').style.display = 'none';
    const lmTextP = document.querySelector('.lm-text p');
    if (lmTextP) lmTextP.textContent = "Merci ! Vous avez maintenant accès à tout le contenu.";

    const headerSubBtn = document.getElementById('header-sub-btn');
    if (headerSubBtn) {
      headerSubBtn.textContent = '✓ Connecté';
      headerSubBtn.style.background = 'var(--correct)';
      headerSubBtn.style.pointerEvents = 'none';
    }

    toast('🎉 Contenu débloqué avec succès !', 'success');
  } catch(err) {
    errEl.style.display = 'block';
    btn.textContent = 'Accéder gratuitement';
    btn.disabled = false;
  }
}

// =============================================
// RACCOURCIS CLAVIER — Flashcards
// =============================================
document.addEventListener('keydown', (e) => {
  if (!document.getElementById('screen-flashcards')?.classList.contains('active')) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  switch(e.key) {
    case 'ArrowLeft':  prevCard(); break;
    case 'ArrowRight': nextCard(); break;
    case ' ':
    case 'Enter':
      e.preventDefault();
      flipCard();
      break;
    case '1': if (S.cardFlipped) { e.preventDefault(); srRate('no'); } break;
    case '2': if (S.cardFlipped) { e.preventDefault(); srRate('hard'); } break;
    case '3': if (S.cardFlipped) { e.preventDefault(); srRate('ok'); } break;
  }
});

// =============================================
// RECHERCHE FICHES
// =============================================
function searchFiches(query) {
  if (typeof FICHES === 'undefined') return;
  const q = query.trim().toLowerCase();
  const listEl = document.getElementById('fiches-list');
  if (!listEl) return;
  if (!q) { renderFichesList(); return; }

  const isRegistered = localStorage.getItem('ls_registered') === 'true';
  const FREE_FICHE_COUNT = 3;
  const results = FICHES.filter(f =>
    f.title.toLowerCase().includes(q) || String(f.num).includes(q)
  );

  if (!results.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-muted);">Aucune fiche trouvée pour "<strong>${query}</strong>"</div>`;
    return;
  }

  let html = `<div class="partie-section"><div class="partie-label">Résultats (${results.length})</div><div class="fiches-row">`;
  results.forEach(f => {
    const done = S.completedFiches.includes(f.num);
    const locked = !isRegistered && (f.num - 1) >= FREE_FICHE_COUNT;
    html += `<div class="fiche-card${locked ? ' fiche-locked' : ''}" onclick="openFiche(${f.num - 1})" aria-label="Fiche ${f.num} : ${f.title}">
      <div class="fiche-number">Fiche ${f.num}${locked ? ' <span class="fiche-lock-icon" aria-hidden="true">🔒</span>' : ''}</div>
      <div class="fiche-title">${f.title}</div>
      ${done ? '<div class="fiche-done-badge">✓ Lu</div>' : ''}
    </div>`;
  });
  html += '</div></div>';
  listEl.innerHTML = html;
}

// =============================================
// MODE SOMBRE
// =============================================
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('ls_dark', isDark ? 'true' : 'false');
  const btn = document.getElementById('dark-toggle');
  if (btn) {
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', isDark ? 'Passer en mode clair' : 'Passer en mode sombre');
  }
}

// =============================================
// INIT
// =============================================
window.addEventListener('DOMContentLoaded', () => {
  // Vérifier si l'utilisateur est déjà inscrit
  const isRegistered = localStorage.getItem('ls_registered') === 'true';
  const headerSubBtn = document.getElementById('header-sub-btn');

  if (isRegistered) {
    // Cacher le bloc rouge d'inscription
    const lmBlock = document.getElementById('lead-magnet');
    if (lmBlock) lmBlock.style.display = 'none';
    
    // Changer le bouton du menu haut
    if (headerSubBtn) {
      headerSubBtn.textContent = '✓ Connecté';
      headerSubBtn.style.background = 'var(--correct)';
      headerSubBtn.style.pointerEvents = 'none';
    }
  } else {
    // Si non inscrit, le bouton S'abonner du haut fait scroller vers le formulaire
    if (headerSubBtn) {
      headerSubBtn.onclick = function(e) {
        e.preventDefault();
        if (!document.getElementById('screen-home').classList.contains('active')) {
          showScreen('home');
        }
        document.getElementById('lead-magnet')?.scrollIntoView({behavior: 'smooth'});
      };
    }
  }

  updateHome();
  renderRecap();

  // Dark mode : respecte la préférence sauvegardée ou le réglage système
  const darkPref = localStorage.getItem('ls_dark');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (darkPref === 'true' || (darkPref === null && prefersDark)) {
    document.body.classList.add('dark');
    const btn = document.getElementById('dark-toggle');
    if (btn) { btn.textContent = '☀️'; btn.setAttribute('aria-label', 'Passer en mode clair'); }
  }

  // Restaure l'écran depuis l'URL au chargement initial (ex: #fiches)
  const hashScreen = location.hash.replace('#', '');
  if (hashScreen && hashScreen !== 'home' && document.getElementById('screen-' + hashScreen)) {
    showScreen(hashScreen);
  }
});

// =============================================
// CHATBOT IA
// =============================================
const WORKER_URL = 'https://lexstudy-api.kpnonon.workers.dev';
let chatHistory = [];

function addMessage(role, text, typing=false) {
  const container = document.getElementById('chat-messages');
  if(!container) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="chat-bubble${typing?' typing':''}">${text}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

async function sendChat() {
  if (!isPremium()) { openPremium(() => sendChat()); return; }
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send');
  if(!input || !btn) return;
  
  const msg = input.value.trim();
  if (!msg) return;

  const sugg = document.getElementById('chat-suggestions');
  if(sugg) sugg.style.display = 'none';

  input.value = '';
  btn.disabled = true;
  addMessage('user', msg);
  chatHistory.push({ role: 'user', content: msg });

  const typingDiv = addMessage('ai', '⏳ En train de répondre…', true);

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        systemContext: `Date du jour : ${new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}. Tu es un expert en droit du travail FRANÇAIS uniquement. Tu maîtrises les lois et barèmes en vigueur en 2025-2026 (SMIC, PASS, réformes récentes). Si une valeur peut avoir évolué récemment, précise-le. Réponds toujours en français avec des références légales précises (articles du Code du travail, décrets, jurisprudences).`
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      const errMsg = JSON.stringify(data.error || data);
      typingDiv.querySelector('.chat-bubble').textContent = '❌ Erreur : ' + errMsg;
      typingDiv.querySelector('.chat-bubble').classList.remove('typing');
      btn.disabled = false;
      input.focus();
      return;
    }
    const reply = data.content?.[0]?.text || "Désolé, je n'ai pas pu répondre.";
    typingDiv.querySelector('.chat-bubble').innerHTML = marked.parse(reply);
    typingDiv.querySelector('.chat-bubble').classList.remove('typing');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch(e) {
    typingDiv.querySelector('.chat-bubble').textContent = '❌ Erreur de connexion : ' + e.message;
  }
  btn.disabled = false;
  input.focus();
}

function sendSugg(btn) {
  const input = document.getElementById('chat-input');
  if(input) {
    input.value = btn.textContent;
    sendChat();
  }
}

function clearChat() {
  chatHistory = [];
  const c = document.getElementById('chat-messages');
  if(c) {
    c.innerHTML = `<div class="chat-msg ai"><div class="chat-bubble">⚖️ Bonjour ! Je suis votre assistant juriste spécialisé en droit du travail français.<br><br>Posez-moi vos questions sur les contrats, licenciements, congés, salaires, représentation du personnel…</div></div>`;
  }
  const sugg = document.getElementById('chat-suggestions');
  if(sugg) sugg.style.display = 'flex';
}

// =============================================
// VEILLE LÉGISLATIVE (Sécurisée)
// =============================================
function initVeille() {
  const sel = document.getElementById('veille-fiche-select');
  if (!sel || typeof FICHES === 'undefined') return; 
  
  if (sel.options.length > 1) return;
  FICHES.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.num - 1;
    opt.textContent = `Fiche ${f.num} — ${f.title}`;
    sel.appendChild(opt);
  });
}

async function checkVeille() {
  const sel = document.getElementById('veille-fiche-select');
  const btn = document.getElementById('veille-btn');
  const result = document.getElementById('veille-result');
  
  if (!sel || !btn || !result || typeof FICHES === 'undefined') return;
  
  const idx = sel.value;
  if (idx === '') { alert('Choisissez une fiche !'); return; }

  const fiche = FICHES[parseInt(idx)];
  const content = fiche.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);

  btn.disabled = true;
  btn.textContent = '⏳ Analyse…';
  result.style.display = 'none';

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'veille',
        messages: [{ role: 'user', content: `[Date du jour : ${new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}]\n\nAnalyse cette fiche de droit du travail français et détermine si son contenu est toujours en vigueur en 2025-2026 :\n\nTitre : ${fiche.title}\n\nContenu : ${content}` }]
      })
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) { parsed = { obsolete: false, confiance: 'faible', raison: raw, suggestion: '' }; }

    const isWarn = parsed.obsolete;
    result.className = `veille-result ${isWarn ? 'veille-warn' : 'veille-ok'}`;
    result.innerHTML = `
      <div class="veille-result-title">${isWarn ? '⚠️ Potentiellement obsolète' : '✅ À jour'} <span style="font-size:.72rem;font-weight:400;opacity:.7">(confiance : ${parsed.confiance || 'moyenne'})</span></div>
      <div class="veille-result-body">
        <strong>Analyse :</strong> ${parsed.raison || '—'}<br>
        ${parsed.suggestion ? `<strong>Suggestion :</strong> ${parsed.suggestion}` : ''}
      </div>`;
    result.style.display = 'block';
  } catch(e) {
    result.className = 'veille-result veille-warn';
    result.innerHTML = '<div class="veille-result-title">❌ Erreur</div><div class="veille-result-body">Impossible de contacter le serveur IA.</div>';
    result.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = '🔍 Analyser';
}

// =============================================
// MODALS LÉGALES (Mentions légales / RGPD)
// =============================================
function showModal(id) {
  const el = document.getElementById('modal-' + id);
  if (!el) return;
  el.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // Focus sur le bouton fermer pour l'accessibilité clavier
  requestAnimationFrame(() => {
    const closeBtn = el.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  });
}

function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (!el) return;
  el.style.display = 'none';
  document.body.style.overflow = '';
}

// Fermer les modals avec la touche Échap
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['mentions-legales', 'confidentialite', 'contact'].forEach(id => closeModal(id));
  }
});

// =============================================
// FORMULAIRE DE CONTACT (Web3Forms)
// =============================================

const WEB3FORMS_KEY = '7e39f248-a1a8-4f28-bacc-3fed8e577a8b';

async function submitContactForm(event) {
  event.preventDefault();

  const form        = document.getElementById('contact-form');
  const submitBtn   = document.getElementById('cf-submit');
  const submitLabel = document.getElementById('cf-submit-label');
  const errorBox    = document.getElementById('cf-error');
  const successBox  = document.getElementById('cf-success');

  // Validation côté client
  const name    = document.getElementById('cf-name').value.trim();
  const email   = document.getElementById('cf-email').value.trim();
  const message = document.getElementById('cf-message').value.trim();
  const subject = document.getElementById('cf-subject').value;

  if (!name || !email || !message) {
    errorBox.textContent = '⚠️ Veuillez remplir tous les champs obligatoires.';
    errorBox.style.display = 'block';
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorBox.textContent = '⚠️ Adresse e-mail invalide.';
    errorBox.style.display = 'block';
    return;
  }

  errorBox.style.display = 'none';
  submitBtn.disabled = true;
  submitLabel.textContent = '⏳ Envoi en cours…';

  try {
    const formData = new FormData(form);
    formData.append('access_key', WEB3FORMS_KEY);
    formData.append('subject', `💼 [${subject}] — Le Droit du Travail Facile`);

    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      form.style.display = 'none';
      successBox.style.display = 'block';
      form.reset();
    } else {
      errorBox.textContent = '❌ ' + (data.message || 'Une erreur est survenue. Réessayez plus tard.');
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitLabel.textContent = 'Envoyer le message';
    }
  } catch (err) {
    errorBox.textContent = '❌ Impossible d\'envoyer le message. Vérifiez votre connexion.';
    errorBox.style.display = 'block';
    submitBtn.disabled = false;
    submitLabel.textContent = 'Envoyer le message';
  }
}

// Réinitialiser le formulaire à chaque ouverture de la modal contact
const _origShowModal = showModal;
showModal = function(id) {
  if (id === 'contact') {
    const form = document.getElementById('contact-form');
    const success = document.getElementById('cf-success');
    const error = document.getElementById('cf-error');
    if (form) { form.reset(); form.style.display = 'flex'; }
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';
    const submitBtn = document.getElementById('cf-submit');
    const submitLabel = document.getElementById('cf-submit-label');
    if (submitBtn) submitBtn.disabled = false;
    if (submitLabel) submitLabel.textContent = 'Envoyer le message';
  }
  _origShowModal(id);
};

// Mettre à jour l'année du copyright dans le footer dynamiquement
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});