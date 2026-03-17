const WORKER_URL = 'https://lexstudy-api.kpnonon.workers.dev';

// ETAT GLOBAL
let state = {
  readFiches: JSON.parse(localStorage.getItem('readFiches')) || [],
};

// INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('site_access') !== 'true') {
    document.getElementById('modal-overlay').classList.add('open');
  }
  updateStats();
});

// NAVIGATION ENTRE LES ÉCRANS
function showScreen(name) {
  // On cache tout
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // On affiche l'écran demandé
  const target = document.getElementById('screen-' + name);
  if (target) {
    target.classList.add('active');
    window.location.hash = name;
  }
  
  if (name === 'fiches') renderFichesList();
}

// AFFICHAGE DES FICHES (Utilise data.js)
function renderFichesList() {
  const container = document.getElementById('fiches-list');
  if (!container) return;
  
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
  if (!fiche) return;
  
  document.getElementById('fiche-content-area').innerHTML = fiche.content;
  if (!state.readFiches.includes(num)) {
    state.readFiches.push(num);
    localStorage.setItem('readFiches', JSON.stringify(state.readFiches));
  }
  showScreen('reader');
  updateStats();
}

// LOGIQUE IA JURISTE
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  const container = document.getElementById('chat-messages');
  container.innerHTML += `<div class="chat-msg user"><div class="chat-bubble">${msg}</div></div>`;
  input.value = '';

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: msg }] })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || "Désolé, une erreur est survenue.";
    container.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">${marked.parse(reply)}</div></div>`;
  } catch(e) {
    container.innerHTML += `<div class="chat-msg ai"><div class="chat-bubble">❌ Erreur de connexion au Juriste IA.</div></div>`;
  }
  container.scrollTop = container.scrollHeight;
}

// CONNEXION BREVO
async function submitSubscribe(e) {
  e.preventDefault();
  const email = document.getElementById('subscribe-email').value;
  const btn = document.getElementById('subscribe-submit');
  
  btn.textContent = '⏳ Vérification...';
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('EMAIL', email);
    await fetch('https://2baff920.sibforms.com/serve/MUIFAD2Gyh81Kn1j-gAmFsCb9abwzHZmtBrXd7UglIum_S2ipSfL6WIcYfjJOEppWUB7nsd8lH5vNJPh_1pevmpRfWQ4kCSq8c5kJv4WU28NQfx4oeOEWY5qEfeNbDHLVCYoo4nJaos8emIUQlhQkScivj_f2_ARpUW_Pp_3t2qWT1x0t0ikn9xE2qeWj1gy9oqV-qaHFcBhTjNQLA==', {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    });

    localStorage.setItem('site_access', 'true');
    document.getElementById('subscribe-success').style.display = 'block';
    document.getElementById('subscribe-form').style.display = 'none';
    setTimeout(() => { document.getElementById('modal-overlay').classList.remove('open'); }, 1500);
  } catch(e) {
    btn.textContent = 'Accéder au site →';
    btn.disabled = false;
    alert("Erreur réseau. Réessayez.");
  }
}

function updateStats() {
  const chip = document.getElementById('global-progress');
  if (chip) chip.textContent = `${state.readFiches.length}/28`;
}
