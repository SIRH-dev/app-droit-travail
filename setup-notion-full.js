/**
 * setup-notion-full.js
 * 1. Crée les bases Notion : Flashcards, Quiz, Récap
 * 2. Importe toutes les données depuis data.js
 * Usage : node setup-notion-full.js
 */

require('dotenv').config({ path: './.env' });
const fs    = require('fs');
const https = require('https');
const vm    = require('vm');

const TOKEN    = process.env.NOTION_TOKEN;
const FICHES_DB = process.env.NOTION_DATABASE_ID;

if (!TOKEN || !FICHES_DB) {
  console.error('❌ NOTION_TOKEN ou NOTION_DATABASE_ID manquant dans .env');
  process.exit(1);
}

// ─── Charger data.js ─────────────────────────────────────────────────────────
const dataContent = fs.readFileSync('./data.js', 'utf8')
  .replace(/^const /gm, 'var ').replace(/^let /gm, 'var ');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(dataContent, ctx);
const { FLASHCARDS, QUIZ, RECAP } = ctx;

// ─── Requête Notion ───────────────────────────────────────────────────────────
function notionRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.notion.com',
      path: `/v1/${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Récupérer la page parente de la base Fiches ─────────────────────────────
async function getParentPageId() {
  const db = await notionRequest('GET', `databases/${FICHES_DB}`);
  if (db.object === 'error') throw new Error(db.message);
  const parent = db.parent;
  if (parent.type === 'page_id') return parent.page_id;
  if (parent.type === 'workspace') return null;
  return null;
}

// ─── Créer une base de données Notion ────────────────────────────────────────
async function createDatabase(parentPageId, title, properties) {
  const parent = parentPageId
    ? { type: 'page_id', page_id: parentPageId }
    : { type: 'workspace', workspace: true };

  const res = await notionRequest('POST', 'databases', {
    parent,
    title: [{ type: 'text', text: { content: title } }],
    properties
  });
  if (res.object === 'error') throw new Error(`Erreur création "${title}": ${res.message}`);
  return res.id;
}

// ─── Créer une page dans une base ────────────────────────────────────────────
async function createPage(dbId, properties, children = []) {
  const res = await notionRequest('POST', 'pages', {
    parent: { database_id: dbId },
    properties,
    ...(children.length ? { children: children.slice(0, 100) } : {})
  });
  if (res.object === 'error') throw new Error(res.message);
  return res;
}

// ─── Programme principal ──────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Récupération de la page parente...');
  const parentId = await getParentPageId();
  if (!parentId) {
    console.error('❌ Impossible de trouver la page parente. Assure-toi que la base Fiches est dans une page (pas à la racine du workspace).');
    process.exit(1);
  }
  console.log('✅ Page parente trouvée\n');

  // ── 1. Créer la base Flashcards ──────────────────────────────────────────
  console.log('📦 Création de la base Flashcards...');
  const flashDbId = await createDatabase(parentId, 'Flashcards — Droit du Travail', {
    Name:    { title: {} },
    Tag:     { rich_text: {} },
    Réponse: { rich_text: {} }
  });
  console.log(`✅ Base Flashcards créée (${flashDbId})\n`);

  // ── 2. Créer la base Quiz ────────────────────────────────────────────────
  console.log('📦 Création de la base Quiz...');
  const quizDbId = await createDatabase(parentId, 'Quiz — Droit du Travail', {
    Name:        { title: {} },
    Options:     { rich_text: {} },
    Correct:     { number: {} },
    Explication: { rich_text: {} },
    Fiche:       { number: {} },
    Catégorie:   { rich_text: {} }
  });
  console.log(`✅ Base Quiz créée (${quizDbId})\n`);

  // ── 3. Créer la base Récap ───────────────────────────────────────────────
  console.log('📦 Création de la base Récap...');
  const recapDbId = await createDatabase(parentId, 'Récap — Droit du Travail', {
    Name:    { title: {} },
    Contenu: { rich_text: {} }
  });
  console.log(`✅ Base Récap créée (${recapDbId})\n`);

  // ── Sauvegarder les IDs dans .env ────────────────────────────────────────
  let env = fs.readFileSync('./.env', 'utf8');
  env = env.replace(/NOTION_FLASHCARDS_DB=.*/g, '');
  env = env.replace(/NOTION_QUIZ_DB=.*/g, '');
  env = env.replace(/NOTION_RECAP_DB=.*/g, '');
  env = env.trimEnd() + `\nNOTION_FLASHCARDS_DB=${flashDbId}\nNOTION_QUIZ_DB=${quizDbId}\nNOTION_RECAP_DB=${recapDbId}\n`;
  fs.writeFileSync('./.env', env);
  console.log('✅ IDs sauvegardés dans .env\n');

  // ── 4. Importer les Flashcards ───────────────────────────────────────────
  console.log(`📤 Import de ${FLASHCARDS.length} flashcards...`);
  for (const f of FLASHCARDS) {
    await createPage(flashDbId, {
      Name:    { title: [{ type: 'text', text: { content: f.q } }] },
      Tag:     { rich_text: [{ type: 'text', text: { content: f.tag } }] },
      Réponse: { rich_text: [{ type: 'text', text: { content: f.a } }] }
    });
    await sleep(300);
  }
  console.log(`✅ ${FLASHCARDS.length} flashcards importées\n`);

  // ── 5. Importer le Quiz ──────────────────────────────────────────────────
  console.log(`📤 Import de ${QUIZ.length} questions de quiz...`);
  for (const q of QUIZ) {
    await createPage(quizDbId, {
      Name:        { title: [{ type: 'text', text: { content: q.q } }] },
      Options:     { rich_text: [{ type: 'text', text: { content: q.opts.join(' | ') } }] },
      Correct:     { number: q.correct },
      Explication: { rich_text: [{ type: 'text', text: { content: q.expl } }] },
      Fiche:       { number: q.fiche },
      Catégorie:   { rich_text: [{ type: 'text', text: { content: q.cat } }] }
    });
    await sleep(300);
  }
  console.log(`✅ ${QUIZ.length} questions importées\n`);

  // ── 6. Importer le Récap ─────────────────────────────────────────────────
  console.log(`📤 Import de ${RECAP.length} tableaux récap...`);
  for (const r of RECAP) {
    const contenu = r.items.map(i => `${i.k}: ${i.v}`).join('\n');
    await createPage(recapDbId, {
      Name:    { title: [{ type: 'text', text: { content: r.title } }] },
      Contenu: { rich_text: [{ type: 'text', text: { content: contenu } }] }
    });
    await sleep(300);
  }
  console.log(`✅ ${RECAP.length} récaps importés\n`);

  console.log('🎉 Setup terminé ! Toutes les bases sont créées et remplies dans Notion.');
  console.log('\nPour synchroniser vers le site : node sync-notion.js');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
