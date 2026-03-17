const WORKER_URL = 'https://lexstudy-api.kpnonon.workers.dev';
const PREMIUM_KEY = 'premium_access';

let state = {
  readFiches: JSON.parse(localStorage.getItem('readFiches')) || [],
  flashcards: JSON.parse(localStorage.getItem('flashcards')) || {},
  quizHighscore: localStorage.getItem('quizHighscore') || null
};

// 1. INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
  // Vérifie si l'utilisateur a déjà déverrouillé l'accès
  if (localStorage.getItem('site_access') !== 'true') {
    document.getElementById('modal-overlay').classList.add('open');
  }

  const hash = window.location.hash.replace('#', '') || 'home';
  showScreen(hash, false);
  updateHomeStats();
});

// 2. NAVIGATION
function showScreen(name, updateHash = true) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screenEl = document.getElementById('screen-' + name) || document.getElementById('screen-home');
  screenEl.classList.add('active');
  if (updateHash) window.location.hash = name;
  
  if (name === 'fiches') renderFichesList();
  if (name === 'chat') { if (!isPremium()) { openPremium(() => showScreen('chat')); } }
}

// 3. AFFICHAGE DES FICHES
function renderFichesList() {
  const container = document.getElementById('fiches-list');
  container.innerHTML = '<div class="fiches-row"></div>';
  const row = container.querySelector('.fiches-row');

  FICHES.forEach(f => {
    const isRead = state.readFiches.includes(f.num);
    const card = document.createElement('div');
    card.className = 'fiche-card';
    card.onclick = () => openFiche(f.num);
    card.innerHTML = `
      <span class="fiche-number">FICHE ${f.num}</span>
      <div class="fiche-title">${f.title}</div>
      ${isRead ? '<div class="fiche-done-badge">✓ LUE</div>' : ''}
    `;
    row.appendChild(card);
  });
}

function openFiche(num) {
  const fiche = FICHES.find(f => f.num === num);
  document.getElementById('fiche-content-area').innerHTML = fiche.content;
  if (!state.readFiches.includes(num)) {
    state.readFiches.push(num);
    localStorage.setItem('readFiches', JSON.stringify(state.readFiches));
  }
  showScreen('reader', false);
}

// 4. JURISTE IA (Ton vrai Worker)
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  const msgsContainer = document.getElementById('chat-messages');
  msgsContainer.innerHTML += `<div class="chat-msg user"><div class="chat-bubble">${msg}</div></div>`;
  input.value = '';

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: msg }] })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || "Désolé, je rencontre une erreur.";
    msgsContainer.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">${marked.parse(reply)}</div></div>`;
  } catch(e) {
    msgsContainer.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">❌ Erreur de connexion au Juriste IA.</div></div>`;
  }
  msgsContainer.scrollTop = msgsContainer.scrollHeight;
}

// 5. CONNEXION / ABONNEMENT (Ton vrai Brevo)
async function submitSubscribe(e) {
  e.preventDefault();
  const email = document.getElementById('subscribe-email').value;
  const btn = document.getElementById('subscribe-submit');
  
  btn.textContent = '⏳ Vérification...';
  
  try {
    const formData = new FormData();
    formData.append('EMAIL', email);
    // Ta vraie URL Brevo
    await fetch('https://2baff920.sibforms.com/serve/MUIFAD2Gyh81Kn1j-gAmFsCb9abwzHZmtBrXd7UglIum_S2ipSfL6WIcYfjJOEppWUB7nsd8lH5vNJPh_1pevmpRfWQ4kCSq8c5kJv4WU28NQfx4oeOEWY5qEfeNbDHLVCYoo4nJaos8emIUQlhQkScivj_f2_ARpUW_Pp_3t2qWT1x0t0ikn9xE2qeWj1gy9oqV-qaHFcBhTjNQLA==', {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });

    localStorage.setItem('site_access', 'true');
    document.getElementById('subscribe-success').style.display = 'block';
    document.getElementById('subscribe-form').style.display = 'none';
    setTimeout(() => { document.getElementById('modal-overlay').classList.remove('open'); }, 2000);
  } catch(e) {
    alert("Erreur. Veuillez réessayer.");
    btn.textContent = 'Accéder au site →';
  }
}

// PREMIUM LOGIC (Ton vrai Worker)
async function submitPremiumCode() {
  const code = document.getElementById('premium-code-input').value.trim().toUpperCase();
  try {
    const res = await fetch(WORKER_URL + '/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (data.valid) {
      localStorage.setItem(PREMIUM_KEY, JSON.stringify({ expiry: data.expiry }));
      location.reload();
    } else { alert("Code invalide."); }
  } catch(e) { alert("Erreur serveur."); }
}

function isPremium() {
  const d = JSON.parse(localStorage.getItem(PREMIUM_KEY));
  return d && Date.now() < d.expiry;
}
function openPremium() { document.getElementById('premium-overlay').classList.add('open'); }
function closePremium() { document.getElementById('premium-overlay').classList.remove('open'); }
function updateHomeStats() { document.getElementById('global-progress').textContent = `${state.readFiches.length}/28`; }