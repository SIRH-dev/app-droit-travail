/**
 * generate-fiches.js
 * Génère une page HTML SEO par fiche + sitemap.xml
 * Usage : node generate-fiches.js
 */

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// --- Charger les fiches depuis data.js ---
const dataContent = fs.readFileSync('./data.js', 'utf8')
  .replace(/^const /gm, 'var ')   // const → var pour vm.runInContext
  .replace(/^let /gm,   'var ');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(dataContent, ctx);
const FICHES = ctx.FICHES;

if (!FICHES || !FICHES.length) {
  console.error('❌ Impossible de lire FICHES depuis data.js');
  process.exit(1);
}

// --- Utilitaires ---
function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function extractText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function metaDescription(content) {
  return extractText(content).slice(0, 155) + '…';
}

// --- Template HTML ---
function ficheHtml(f) {
  const slug      = `${f.num}-${slugify(f.title)}`;
  const canonical = `https://droittravailfacile.fr/fiches/${slug}.html`;
  const desc      = metaDescription(f.content);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fiche ${f.num} — ${f.title} | Le Droit du Travail Facile</title>
  <meta name="description" content="${desc.replace(/"/g, '&quot;')}" />
  <link rel="canonical" href="${canonical}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="article" />
  <meta property="og:title"       content="Fiche ${f.num} — ${f.title}" />
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta property="og:url"         content="${canonical}" />
  <meta property="og:site_name"   content="Le Droit du Travail Facile" />

  <!-- Données structurées (Schema.org) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Fiche ${f.num} — ${f.title}",
    "description": "${desc.replace(/"/g, '\\"')}",
    "url": "${canonical}",
    "publisher": {
      "@type": "Organization",
      "name": "Le Droit du Travail Facile",
      "url": "https://droittravailfacile.fr"
    }
  }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f7f8fa; color: #1a2233; line-height: 1.7; }
    .wrapper { max-width: 760px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    .breadcrumb { font-size: .82rem; color: #7a8599; margin-bottom: 1.5rem; }
    .breadcrumb a { color: #2563eb; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .partie-badge { display: inline-block; background: #e8f0fe; color: #2563eb; font-size: .75rem; font-weight: 700; padding: .25rem .7rem; border-radius: 20px; margin-bottom: 1rem; letter-spacing: .04em; text-transform: uppercase; }
    h1 { font-size: 1.7rem; font-weight: 900; color: #1a2233; margin-bottom: 1.5rem; line-height: 1.3; }
    .fiche-body { background: #fff; border-radius: 14px; padding: 2rem; box-shadow: 0 2px 16px rgba(0,0,0,.07); }
    .fiche-body h2 { font-size: 1.2rem; font-weight: 800; color: #1a2233; margin: 1.5rem 0 .75rem; }
    .fiche-body h3 { font-size: 1rem; font-weight: 700; color: #2563eb; margin: 1.25rem 0 .5rem; }
    .fiche-body h4 { font-size: .9rem; font-weight: 700; color: #4b5563; margin: 1rem 0 .4rem; }
    .fiche-body p  { margin-bottom: .75rem; }
    .fiche-body ul, .fiche-body ol { padding-left: 1.4rem; margin-bottom: .75rem; }
    .fiche-body li { margin-bottom: .3rem; }
    .fiche-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
    .fiche-body th  { background: #2563eb; color: #fff; padding: .5rem .75rem; text-align: left; }
    .fiche-body td  { padding: .45rem .75rem; border-bottom: 1px solid #e5e7eb; }
    .fiche-body tr:nth-child(even) td { background: #f3f6fb; }
    .fiche-body .key-point { background: #fffbeb; border-left: 4px solid #f59e0b; padding: .75rem 1rem; border-radius: 0 8px 8px 0; margin: 1rem 0; font-size: .9rem; }
    .table-wrapper { overflow-x: auto; }
    .cta { margin-top: 2rem; text-align: center; }
    .cta a { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: .75rem 1.75rem; border-radius: 10px; font-weight: 700; font-size: .95rem; }
    .cta a:hover { background: #1d4ed8; }
    .nav-fiches { display: flex; justify-content: space-between; margin-top: 2rem; gap: 1rem; }
    .nav-fiches a { color: #2563eb; text-decoration: none; font-size: .88rem; font-weight: 600; }
    .nav-fiches a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <nav class="breadcrumb" aria-label="Fil d'Ariane">
      <a href="https://droittravailfacile.fr">Accueil</a> ›
      <a href="https://droittravailfacile.fr/#fiches">Fiches</a> ›
      Fiche ${f.num}
    </nav>

    <div class="partie-badge">${f.partie}</div>
    <h1>Fiche ${f.num} — ${f.title}</h1>

    <div class="fiche-body">
      ${f.content}
    </div>

    <div class="cta">
      <a href="https://droittravailfacile.fr">Accéder à toutes les fiches + Quiz + IA →</a>
    </div>

    <nav class="nav-fiches">
      ${f.num > 1 ? `<a href="./${f.num - 1}-${slugify(FICHES[f.num - 2].title)}.html">← Fiche ${f.num - 1}</a>` : '<span></span>'}
      ${f.num < FICHES.length ? `<a href="./${f.num + 1}-${slugify(FICHES[f.num].title)}.html">Fiche ${f.num + 1} →</a>` : '<span></span>'}
    </nav>
  </div>
</body>
</html>`;
}

// --- Génération des pages ---
const outDir = path.join(__dirname, 'fiches');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

FICHES.forEach(f => {
  const slug     = `${f.num}-${slugify(f.title)}`;
  const filePath = path.join(outDir, `${slug}.html`);
  fs.writeFileSync(filePath, ficheHtml(f), 'utf8');
  console.log(`✅ fiches/${slug}.html`);
});

// --- Génération du sitemap.xml ---
const today = new Date().toISOString().split('T')[0];
const urls = [
  `  <url><loc>https://droittravailfacile.fr/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
  ...FICHES.map(f => {
    const slug = `${f.num}-${slugify(f.title)}`;
    return `  <url><loc>https://droittravailfacile.fr/fiches/${slug}.html</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
  })
].join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), sitemap, 'utf8');
console.log('\n✅ sitemap.xml généré');
console.log(`\n🎉 ${FICHES.length} fiches générées dans /fiches/`);
