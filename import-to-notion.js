/**
 * import-to-notion.js
 * Importe les fiches depuis data.js vers la base Notion
 * Usage : node import-to-notion.js
 */

require('dotenv').config({ path: './.env' });
const fs    = require('fs');
const https = require('https');
const vm    = require('vm');

const TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_DATABASE_ID;

if (!TOKEN || !DB_ID) {
  console.error('❌ NOTION_TOKEN ou NOTION_DATABASE_ID manquant dans .env');
  process.exit(1);
}

// ─── Charger les fiches depuis data.js ───────────────────────────────────────
const dataContent = fs.readFileSync('./data.js', 'utf8')
  .replace(/^const /gm, 'var ')
  .replace(/^let /gm, 'var ');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(dataContent, ctx);
const FICHES = ctx.FICHES;

// ─── Requête HTTPS Notion ────────────────────────────────────────────────────
function notionRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.notion.com',
      path: `/v1/${endpoint}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Convertir HTML simplifié en blocs Notion ────────────────────────────────
function htmlToBlocks(html) {
  const blocks = [];

  // Nettoyer le HTML
  html = html
    .replace(/<div class="table-wrapper">[\s\S]*?<\/div>/g, '') // on ignore les tables pour l'import
    .replace(/<table[\s\S]*?<\/table>/g, '')
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '\n@@H2@@$1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '\n@@H3@@$1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/g, '\n@@H4@@$1\n')
    .replace(/<div class="key-point"[^>]*>(.*?)<\/div>/g, '\n@@CALLOUT@@$1\n')
    .replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner) => {
      return inner.replace(/<li>(.*?)<\/li>/g, '\n@@UL@@$1\n');
    })
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner) => {
      return inner.replace(/<li>(.*?)<\/li>/g, '\n@@OL@@$1\n');
    })
    .replace(/<p[^>]*>(.*?)<\/p>/g, '\n@@P@@$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

  const lines = html.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('@@H2@@')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.replace('@@H2@@', '') } }] } });
    } else if (line.startsWith('@@H3@@')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: line.replace('@@H3@@', '') } }] } });
    } else if (line.startsWith('@@H4@@')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: line.replace('@@H4@@', '') } }] } });
    } else if (line.startsWith('@@CALLOUT@@')) {
      blocks.push({ object: 'block', type: 'callout', callout: { rich_text: [{ type: 'text', text: { content: line.replace('@@CALLOUT@@', '') } }], icon: { type: 'emoji', emoji: '⚠️' } } });
    } else if (line.startsWith('@@UL@@')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.replace('@@UL@@', '') } }] } });
    } else if (line.startsWith('@@OL@@')) {
      blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ type: 'text', text: { content: line.replace('@@OL@@', '') } }] } });
    } else if (line.startsWith('@@P@@')) {
      const text = line.replace('@@P@@', '');
      if (text) blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: text } }] } });
    }
  }

  return blocks;
}

// ─── Pause pour éviter le rate limit Notion ──────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Programme principal ─────────────────────────────────────────────────────
async function main() {
  console.log(`📤 Import de ${FICHES.length} fiches vers Notion...\n`);

  for (const f of FICHES) {
    const blocks = htmlToBlocks(f.content);

    const payload = {
      parent: { database_id: DB_ID },
      properties: {
        Name: { title: [{ type: 'text', text: { content: f.title } }] },
        Num:  { number: f.num },
        Partie: { rich_text: [{ type: 'text', text: { content: f.partie } }] }
      },
      children: blocks.slice(0, 100) // Notion limite à 100 blocs par requête
    };

    const res = await notionRequest('POST', 'pages', payload);

    if (res.object === 'error') {
      console.error(`❌ Fiche ${f.num} — Erreur: ${res.message}`);
    } else {
      console.log(`✅ Fiche ${f.num} — ${f.title}`);
    }

    await sleep(350); // Respecter le rate limit Notion
  }

  console.log('\n🎉 Import terminé ! Toutes les fiches sont dans Notion.');
  console.log('Tu peux maintenant les modifier dans Notion et relancer : node sync-notion.js');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
