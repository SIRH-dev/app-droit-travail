/**
 * sync-notion.js
 * Synchronise les fiches depuis Notion vers data.js + pages HTML
 * Usage : node sync-notion.js
 */

require('dotenv').config({ path: './.env' });
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const https = require('https');

const TOKEN        = process.env.NOTION_TOKEN;
const DB_ID        = process.env.NOTION_DATABASE_ID;
const FLASH_DB_ID  = process.env.NOTION_FLASHCARDS_DB;
const QUIZ_DB_ID   = process.env.NOTION_QUIZ_DB;
const RECAP_DB_ID  = process.env.NOTION_RECAP_DB;

if (!TOKEN || !DB_ID) {
  console.error('❌ NOTION_TOKEN ou NOTION_DATABASE_ID manquant dans .env');
  process.exit(1);
}

// ─── Requête HTTPS vers l'API Notion ────────────────────────────────────────
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

// ─── Récupérer toutes les pages de la base ──────────────────────────────────
async function fetchAllPages() {
  const pages = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionRequest('POST', `databases/${DB_ID}/query`, body);
    if (res.object === 'error') {
      console.error('❌ Erreur Notion:', res.message);
      process.exit(1);
    }
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// ─── Récupérer les blocs d'une page ─────────────────────────────────────────
async function fetchBlocks(pageId) {
  const blocks = [];
  let cursor = undefined;
  do {
    let url = `blocks/${pageId}/children?page_size=100`;
    if (cursor) url += `&start_cursor=${cursor}`;
    const res = await notionRequest('GET', url);
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

// ─── Convertir le rich text Notion en HTML ──────────────────────────────────
function richTextToHtml(richTexts) {
  return (richTexts || []).map(rt => {
    let text = rt.plain_text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (rt.annotations.bold)          text = `<strong>${text}</strong>`;
    if (rt.annotations.italic)        text = `<em>${text}</em>`;
    if (rt.annotations.code)          text = `<code>${text}</code>`;
    if (rt.annotations.strikethrough) text = `<s>${text}</s>`;
    return text;
  }).join('');
}

// ─── Convertir les blocs Notion en HTML ─────────────────────────────────────
function blocksToHtml(blocks) {
  let html = '';
  let inUl = false, inOl = false, inTable = false;

  const closeList = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };
  const closeTable = () => {
    if (inTable) { html += '</table></div>'; inTable = false; }
  };

  for (const block of blocks) {
    const t = block.type;
    const content = block[t];

    if (t !== 'bulleted_list_item' && t !== 'numbered_list_item') closeList();
    if (t !== 'table' && t !== 'table_row') closeTable();

    switch (t) {
      case 'heading_1':
        html += `<h2>${richTextToHtml(content.rich_text)}</h2>`;
        break;
      case 'heading_2':
        html += `<h3>${richTextToHtml(content.rich_text)}</h3>`;
        break;
      case 'heading_3':
        html += `<h4>${richTextToHtml(content.rich_text)}</h4>`;
        break;
      case 'paragraph':
        const txt = richTextToHtml(content.rich_text);
        if (txt.trim()) html += `<p>${txt}</p>`;
        break;
      case 'bulleted_list_item':
        if (!inUl) { html += '<ul>'; inUl = true; }
        html += `<li>${richTextToHtml(content.rich_text)}</li>`;
        break;
      case 'numbered_list_item':
        if (!inOl) { html += '<ol>'; inOl = true; }
        html += `<li>${richTextToHtml(content.rich_text)}</li>`;
        break;
      case 'callout':
        html += `<div class="key-point">${richTextToHtml(content.rich_text)}</div>`;
        break;
      case 'quote':
        html += `<div class="key-point">${richTextToHtml(content.rich_text)}</div>`;
        break;
      case 'table':
        html += '<div class="table-wrapper"><table class="data-table">';
        inTable = true;
        break;
      case 'table_row':
        html += '<tr>';
        const isHeader = content.cells && blocks.indexOf(block) === blocks.findIndex(b => b.type === 'table_row');
        content.cells.forEach(cell => {
          const tag = isHeader ? 'th' : 'td';
          html += `<${tag}>${richTextToHtml(cell)}</${tag}>`;
        });
        html += '</tr>';
        break;
      case 'embed': {
        const embedUrl = content.url;
        if (embedUrl) html += `<div style="position:relative;width:100%;padding-bottom:56.25%;margin:1rem 0"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:8px" allowfullscreen loading="lazy"></iframe></div>`;
        break;
      }
      case 'image': {
        const imgUrl = content.type === 'external' ? content.external?.url : content.file?.url;
        const caption = content.caption ? richTextToHtml(content.caption) : '';
        if (imgUrl) html += `<figure><img src="${imgUrl}" alt="${caption}" style="max-width:100%;border-radius:8px;margin:1rem 0" />${caption ? `<figcaption style="font-size:.82rem;color:#6b7280;text-align:center">${caption}</figcaption>` : ''}</figure>`;
        break;
      }
      case 'divider':
        html += '<hr>';
        break;
      default:
        break;
    }
  }
  closeList();
  closeTable();
  return html;
}

// ─── Slugify ─────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

// ─── Template HTML fiche ─────────────────────────────────────────────────────
function ficheHtml(f, allFiches) {
  const slug      = `${f.num}-${slugify(f.title)}`;
  const canonical = `https://droittravailfacile.fr/fiches/${slug}.html`;
  const desc      = f.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155) + '…';
  const prev      = allFiches.find(x => x.num === f.num - 1);
  const next      = allFiches.find(x => x.num === f.num + 1);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fiche ${f.num} — ${f.title} | Le Droit du Travail Facile</title>
  <meta name="description" content="${desc.replace(/"/g, '&quot;')}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="Fiche ${f.num} — ${f.title}" />
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="Le Droit du Travail Facile" />
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f7f8fa;color:#1a2233;line-height:1.7}
    .wrapper{max-width:760px;margin:0 auto;padding:2rem 1.25rem 4rem}
    .breadcrumb{font-size:.82rem;color:#7a8599;margin-bottom:1.5rem}
    .breadcrumb a{color:#2563eb;text-decoration:none}
    .partie-badge{display:inline-block;background:#e8f0fe;color:#2563eb;font-size:.75rem;font-weight:700;padding:.25rem .7rem;border-radius:20px;margin-bottom:1rem;letter-spacing:.04em;text-transform:uppercase}
    h1{font-size:1.7rem;font-weight:900;color:#1a2233;margin-bottom:1.5rem;line-height:1.3}
    .fiche-body{background:#fff;border-radius:14px;padding:2rem;box-shadow:0 2px 16px rgba(0,0,0,.07)}
    .fiche-body h2{font-size:1.2rem;font-weight:800;color:#1a2233;margin:1.5rem 0 .75rem}
    .fiche-body h3{font-size:1rem;font-weight:700;color:#2563eb;margin:1.25rem 0 .5rem}
    .fiche-body h4{font-size:.9rem;font-weight:700;color:#4b5563;margin:1rem 0 .4rem}
    .fiche-body p{margin-bottom:.75rem}
    .fiche-body ul,.fiche-body ol{padding-left:1.4rem;margin-bottom:.75rem}
    .fiche-body li{margin-bottom:.3rem}
    .fiche-body table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:.9rem}
    .fiche-body th{background:#2563eb;color:#fff;padding:.5rem .75rem;text-align:left}
    .fiche-body td{padding:.45rem .75rem;border-bottom:1px solid #e5e7eb}
    .fiche-body tr:nth-child(even) td{background:#f3f6fb}
    .fiche-body .key-point{background:#fffbeb;border-left:4px solid #f59e0b;padding:.75rem 1rem;border-radius:0 8px 8px 0;margin:1rem 0;font-size:.9rem}
    .table-wrapper{overflow-x:auto}
    .share-bar{display:flex;align-items:center;gap:.75rem;margin-top:2rem;flex-wrap:wrap}
    .share-label{font-size:.82rem;font-weight:700;color:#7a8599}
    .share-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem 1rem;border-radius:8px;text-decoration:none;font-size:.82rem;font-weight:700;color:#fff;transition:opacity .2s}
    .share-btn:hover{opacity:.85}
    .share-linkedin{background:#0077b5}
    .share-x{background:#000}
    .share-facebook{background:#1877f2}
    .cta{margin-top:2rem;text-align:center}
    .cta a{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:.75rem 1.75rem;border-radius:10px;font-weight:700;font-size:.95rem}
    .nav-fiches{display:flex;justify-content:space-between;margin-top:2rem;gap:1rem}
    .nav-fiches a{color:#2563eb;text-decoration:none;font-size:.88rem;font-weight:600}
  </style>
</head>
<body>
  <div class="wrapper">
    <nav class="breadcrumb">
      <a href="https://droittravailfacile.fr">Accueil</a> ›
      <a href="https://droittravailfacile.fr/#fiches">Fiches</a> ›
      Fiche ${f.num}
    </nav>
    <div class="partie-badge">${f.partie}</div>
    <h1>Fiche ${f.num} — ${f.title}</h1>
    <div class="fiche-body">${f.content}</div>
    <div class="share-bar">
      <span class="share-label">Partager :</span>
      <a class="share-btn share-linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">LinkedIn</a>
      <a class="share-btn share-x" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent('Fiche ' + f.num + ' — ' + f.title)}" target="_blank" rel="noopener">X</a>
      <a class="share-btn share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">Facebook</a>
    </div>
    <div class="cta">
      <a href="https://droittravailfacile.fr">Accéder à toutes les fiches + Quiz + IA →</a>
    </div>
    <nav class="nav-fiches">
      ${prev ? `<a href="./${prev.num}-${slugify(prev.title)}.html">← Fiche ${prev.num}</a>` : '<span></span>'}
      ${next ? `<a href="./${next.num}-${slugify(next.title)}.html">Fiche ${next.num} →</a>` : '<span></span>'}
    </nav>
  </div>
</body>
</html>`;
}

// ─── Récupérer toutes les pages d'une base quelconque ────────────────────────
async function fetchAllPagesFromDb(dbId) {
  const pages = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionRequest('POST', `databases/${dbId}/query`, body);
    if (res.object === 'error') { console.warn(`⚠️ Erreur DB ${dbId}: ${res.message}`); break; }
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// ─── Programme principal ─────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Connexion à Notion...');
  const pages = await fetchAllPages();
  console.log(`📄 ${pages.length} fiches trouvées dans Notion`);

  if (!pages.length) {
    console.log('⚠️  Aucune fiche dans la base. Ajoute des fiches dans Notion et relance.');
    process.exit(0);
  }

  const fiches = [];

  for (const page of pages) {
    const props = page.properties;
    const num   = props.Num?.number || 0;
    const title = props.Name?.title?.[0]?.plain_text || props.Titre?.title?.[0]?.plain_text || 'Sans titre';
    const partie = props.Partie?.rich_text?.[0]?.plain_text || '';

    console.log(`  ⏳ Fiche ${num} — ${title}`);
    const blocks  = await fetchBlocks(page.id);
    const content = blocksToHtml(blocks);

    fiches.push({ num, title, partie, content });
  }

  // Trier par numéro
  fiches.sort((a, b) => a.num - b.num);

  const dataJsParts = [`// =============================================\n// DATA — FICHES (généré depuis Notion)\n// =============================================\nconst FICHES = [\n${
    fiches.map(f =>
      `  {num:${f.num},title:${JSON.stringify(f.title)},partie:${JSON.stringify(f.partie)},content:${JSON.stringify(f.content)}}`
    ).join(',\n')
  }\n];`];

  // Générer les pages HTML
  const outDir = path.join(__dirname, 'fiches');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  fiches.forEach(f => {
    const slug = `${f.num}-${slugify(f.title)}`;
    fs.writeFileSync(path.join(outDir, `${slug}.html`), ficheHtml(f, fiches), 'utf8');
    console.log(`✅ fiches/${slug}.html`);
  });

  // Générer sitemap.xml
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    `  <url><loc>https://droittravailfacile.fr/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    ...fiches.map(f => {
      const slug = `${f.num}-${slugify(f.title)}`;
      return `  <url><loc>https://droittravailfacile.fr/fiches/${slug}.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
    })
  ].join('\n');

  fs.writeFileSync('./sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, 'utf8');
  console.log('✅ sitemap.xml mis à jour');

  // ── Sync Flashcards ────────────────────────────────────────────────────
  if (FLASH_DB_ID) {
    console.log('\n🔄 Sync Flashcards...');
    const flashPages = await fetchAllPagesFromDb(FLASH_DB_ID);
    const flashcards = flashPages.map(p => ({
      tag: p.properties.Tag?.rich_text?.[0]?.plain_text || '',
      q:   p.properties.Name?.title?.[0]?.plain_text || '',
      a:   p.properties.Réponse?.rich_text?.[0]?.plain_text || ''
    })).filter(f => f.q);
    dataJsParts.push(`// =============================================\n// DATA — FLASHCARDS (généré depuis Notion)\n// =============================================\nconst FLASHCARDS = [\n${
      flashcards.map(f => `  {tag:${JSON.stringify(f.tag)},q:${JSON.stringify(f.q)},a:${JSON.stringify(f.a)}}`).join(',\n')
    }\n];`);
    console.log(`✅ ${flashcards.length} flashcards synchronisées`);
  }

  // ── Sync Quiz ──────────────────────────────────────────────────────────
  if (QUIZ_DB_ID) {
    console.log('\n🔄 Sync Quiz...');
    const quizPages = await fetchAllPagesFromDb(QUIZ_DB_ID);
    const quiz = quizPages.map(p => {
      const opts = (p.properties.Options?.rich_text?.[0]?.plain_text || '').split(' | ');
      return {
        q:    p.properties.Name?.title?.[0]?.plain_text || '',
        opts,
        correct: p.properties.Correct?.number ?? 0,
        expl: p.properties.Explication?.rich_text?.[0]?.plain_text || '',
        fiche: p.properties.Fiche?.number ?? 1,
        cat:  p.properties.Catégorie?.rich_text?.[0]?.plain_text || ''
      };
    }).filter(q => q.q);
    dataJsParts.push(`// =============================================\n// DATA — QUIZ (généré depuis Notion)\n// =============================================\nconst QUIZ = [\n${
      quiz.map(q => `  {q:${JSON.stringify(q.q)},opts:${JSON.stringify(q.opts)},correct:${q.correct},expl:${JSON.stringify(q.expl)},fiche:${q.fiche},cat:${JSON.stringify(q.cat)}}`).join(',\n')
    }\n];`);
    console.log(`✅ ${quiz.length} questions synchronisées`);
  }

  // ── Sync Récap ─────────────────────────────────────────────────────────
  if (RECAP_DB_ID) {
    console.log('\n🔄 Sync Récap...');
    const recapPages = await fetchAllPagesFromDb(RECAP_DB_ID);
    const recap = recapPages.map(p => {
      const title   = p.properties.Name?.title?.[0]?.plain_text || '';
      const contenu = p.properties.Contenu?.rich_text?.[0]?.plain_text || '';
      const items   = contenu.split('\n').filter(Boolean).map(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return { k: line, v: '' };
        return { k: line.slice(0, idx).trim(), v: line.slice(idx + 1).trim() };
      });
      return { title, items };
    }).filter(r => r.title);
    dataJsParts.push(`// =============================================\n// DATA — RECAP (généré depuis Notion)\n// =============================================\nconst RECAP = [\n${
      recap.map(r => `  {title:${JSON.stringify(r.title)},items:${JSON.stringify(r.items)}}`).join(',\n')
    }\n];`);
    console.log(`✅ ${recap.length} récaps synchronisés`);
  }

  // Écrire data.js complet
  fs.writeFileSync('./data.js', dataJsParts.join('\n\n') + '\n', 'utf8');
  console.log('\n✅ data.js mis à jour (fiches + flashcards + quiz + récap)');

  console.log(`\n🎉 Sync terminé !`);
  console.log('\nProchaine étape :');
  console.log('  git add . && git commit -m "Sync Notion" && git push origin main');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
