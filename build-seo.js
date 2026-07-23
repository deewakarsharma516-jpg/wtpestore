/* WTPESTORE — SEO page builder
   Sheet se products padh kar Google-friendly HTML banata hai.
   GitHub Action roz chalata hai — Sheet badli to pages khud update.
*/
const fs = require('fs');
const https = require('https');

const SHEET = process.env.SHEET_CSV ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSwvqzlRLqyMtcXio41rcwR4jZK0aHASM0uApcARGUC-qvIn9Zvk6ywVUfSUVbO3OsjGbvzFgrikg-/pub?gid=170402937&single=true&output=csv';
const SITE = 'https://www.wtpestore.co.in';

/* ---------- helpers ---------- */
function get(url, redirects) {
  redirects = redirects || 0;
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects < 5) {
        r.resume(); return res(get(r.headers.location, redirects + 1));
      }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      let d = ''; r.setEncoding('utf8');
      r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}
function csvParse(t) {
  const R = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else {
      if (ch === '"') q = true;
      else if (ch === ',') { r.push(c); c = ''; }
      else if (ch === '\n') { r.push(c); R.push(r); r = []; c = ''; }
      else if (ch !== '\r') c += ch;
    }
  }
  if (c !== '' || r.length) { r.push(c); R.push(r); }
  return R;
}
const clean = x => String(x || '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
const esc = s => String(s || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const slug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const rupee = n => '₹' + Number(n || 0).toLocaleString('en-IN');

/* ---------- read sheet ---------- */
async function load() {
  const rows = csvParse(await get(SHEET)).filter(r => r.length >= 2 && r.join('').trim());
  if (rows.length < 2) throw new Error('Sheet khaali');
  const h = rows[0].map(x => clean(x).toLowerCase());
  const ix = (...names) => { for (const n of names) { const i = h.indexOf(n); if (i > -1) return i; } return -1; };
  const ci = ix('category'), ni = ix('product', 'name'), pi = ix('price'),
    mi = ix('make', 'brand'), mo = ix('model'), sp = ix('specification', 'spec'),
    ii = ix('image', 'photo'), mrp = ix('mrp', 'list price', 'old price'),
    dsc = ix('discount', 'disc', 'off');
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i], n = clean(r[ni]);
    if (n.length < 2) continue;
    const o = {
      c: clean(r[ci]) || 'General', n,
      p: parseInt(String(r[pi] || '').replace(/[^0-9]/g, '')) || 0,
      make: mi > -1 ? clean(r[mi]) : '', model: mo > -1 ? clean(r[mo]) : '',
      spec: sp > -1 ? clean(r[sp]) : '', img: ii > -1 ? clean(r[ii]) : '', mrp: 0
    };
    if (mrp > -1) { const m = parseInt(String(r[mrp] || '').replace(/[^0-9]/g, '')) || 0; if (m > o.p) o.mrp = m; }
    if (!o.mrp && dsc > -1) {
      const d = parseFloat(String(r[dsc] || '').replace(/[^0-9.]/g, '')) || 0;
      if (d > 0 && d < 95 && o.p > 0) { o.mrp = o.p; o.p = Math.round(o.p * (100 - d) / 100); }
    }
    o.slug = slug(o.n);
    out.push(o);
  }
  return out;
}

/* ---------- page shell ---------- */
function shell(title, desc, canon, body, extraLd) {
  return `<!DOCTYPE html><html lang="en"><head>
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3XGD177T0C"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3XGD177T0C');</script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE}/og-banner.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#0B2A4A">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
${extraLd || ''}
<style>
:root{--navy:#0B2A4A;--orange:#ff9900;--green:#067d62;--border:#d5d9d9}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,system-ui,Arial,sans-serif;background:#eaeded;color:#0f1111;line-height:1.6}
header{background:var(--navy);position:sticky;top:0;z-index:50;padding:10px 0}
.wrap{max-width:1180px;margin:0 auto;padding:0 14px}
header .wrap{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:40px;width:auto;display:block}
header a.call{margin-left:auto;color:#fff;font-weight:700;font-size:14px;text-decoration:none;background:rgba(255,255,255,.12);padding:8px 14px;border-radius:8px}
.bc{font-size:13px;color:#565959;padding:12px 0}
.bc a{color:var(--navy)}
h1{font-size:26px;color:var(--navy);margin:8px 0}
.lede{color:#444;font-size:14.5px;margin-bottom:14px;max-width:900px}
h2{font-size:19px;color:var(--navy);margin:26px 0 10px;padding-bottom:6px;border-bottom:2px solid #e3e9ee}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.pc{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px}
.pc h3{font-size:14.5px;color:var(--navy);margin-bottom:6px;font-weight:700;line-height:1.35}
.pc .md{display:inline-block;font-size:11px;font-weight:800;color:#8a5a00;background:#fff6e6;border:1px solid #ffe0a3;border-radius:6px;padding:2px 8px;margin-bottom:6px}
.pc .sp{font-size:12.5px;color:#555;margin:6px 0;line-height:1.55}
.pc .pr{font-size:18px;font-weight:800;color:var(--green);margin-top:8px}
.pc .pr small{font-size:11.5px;color:#565959;font-weight:500}
.pc .old{color:#8a94a6;text-decoration:line-through;font-size:13px;font-weight:600;margin-right:4px}
.pc .off{background:#e7f7ee;color:#0e7a3d;border:1px solid #bfe6cf;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:800;margin-left:4px}
.pc .acts{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}
.pc a.b{flex:1;text-align:center;text-decoration:none;font-size:12.5px;font-weight:700;padding:8px 10px;border-radius:8px;min-width:96px}
.pc a.wa{background:#25d366;color:#fff}
.pc a.vw{background:var(--navy);color:#fff}
.toc{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px;margin:14px 0}
.toc a{display:inline-block;margin:4px 8px 4px 0;font-size:13px;color:var(--navy);text-decoration:none;background:#f2f6f9;border:1px solid #e2e9ef;border-radius:20px;padding:5px 12px}
footer{background:var(--navy);color:#cfe0ee;margin-top:34px;padding:22px 0;font-size:13px}
footer a{color:#7ff0ff}
@media(max-width:600px){h1{font-size:21px}}
</style></head><body>
<header><div class="wrap">
<a href="/"><img src="/icons/logo-white.png" alt="WTPeSTORE™ — powered by Aqua Filtration System"></a>
<a class="call" href="tel:+919910646957">📞 9910646957</a>
</div></header>
<div class="wrap">
${body}
</div>
<footer><div class="wrap">
<b>WTPESTORE — powered by Aqua Filtration System</b><br>
Mathura Road, Faridabad, Haryana 121003 · GSTIN 06DMUPS2289L1ZZ<br>
📞 9910646950 · 9910646957 · 0129-4340856 · <a href="mailto:info@aquafiltrationsystem.in">info@aquafiltrationsystem.in</a><br>
<a href="/">Home</a> · <a href="/products.html">All Products</a> · <a href="/catalogues.html">Catalogues</a> · <a href="/plant-calculators.html">Calculators</a><br>
<span style="font-size:11.5px;color:#8fb8d6">*Prices exclusive of GST and subject to change — confirm on WhatsApp before order.</span>
</div></footer>
<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}</script>
</body></html>`;
}

function card(p) {
  const off = p.mrp && p.mrp > p.p ? Math.round((p.mrp - p.p) * 100 / p.mrp) : 0;
  const price = p.p > 0
    ? `<div class="pr">${off ? `<span class="old">${rupee(p.mrp)}</span>` : ''}${rupee(p.p)}<small> +GST</small>${off ? `<span class="off">${off}% OFF</span>` : ''}</div>`
    : `<div class="pr" style="color:#565959;font-size:15px">Price on request</div>`;
  const wa = `https://wa.me/919899193589?text=${encodeURIComponent('Hi WTPESTORE, I want a quotation for: ' + p.n + (p.model ? ' (Model ' + p.model + ')' : '') + '. Please share best price.')}`;
  return `<article class="pc" id="${p.slug}">
${p.model ? `<span class="md">Model: ${esc(p.model)}</span>` : ''}
<h3>${esc(p.n)}</h3>
${p.make ? `<div style="font-size:12px;color:#666">Brand: <b>${esc(p.make)}</b></div>` : ''}
${p.spec ? `<div class="sp">${esc(p.spec.slice(0, 300))}</div>` : ''}
${price}
<div class="acts"><a class="b wa" href="${wa}" rel="nofollow">💬 Get Quote</a><a class="b vw" href="/?p=${p.slug}">View →</a></div>
</article>`;
}

/* ---------- build ---------- */
(async () => {
  const P = await load();
  console.log('Products loaded:', P.length);

  const cats = {};
  P.forEach(p => { (cats[p.c] = cats[p.c] || []).push(p); });
  const catNames = Object.keys(cats).sort((a, b) => cats[b].length - cats[a].length);
  console.log('Categories:', catNames.length);

  /* ---- products.html (sab kuch ek jagah, Google ke liye) ---- */
  const toc = `<div class="toc"><b style="font-size:13px;color:#565959">Jump to category:</b><br>` +
    catNames.map(c => `<a href="#${slug(c)}">${esc(c)} (${cats[c].length})</a>`).join('') + `</div>`;

  const body = `<nav class="bc"><a href="/">Home</a> › All Products</nav>
<h1>All Water Treatment Products &amp; Spares — Price List</h1>
<p class="lede">Complete list of <b>${P.length}+ water treatment products</b> across <b>${catNames.length} categories</b> — RO plants, water softeners, RO membranes, dosing pumps, FRP vessels, flow meters, instruments, cartridge filters and spares. Genuine branded products with GST invoice, supplied by <b>Aqua Filtration System, Faridabad</b> across Delhi NCR and India. Prices are exclusive of GST and updated regularly.</p>
${toc}
${catNames.map(c => `<section><h2 id="${slug(c)}">${esc(c)} <span style="font-size:13px;color:#777;font-weight:500">(${cats[c].length} products)</span></h2>
<div class="pgrid">${cats[c].map(card).join('\n')}</div></section>`).join('\n')}`;

  const ld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "ItemList",
    "name": "WTPESTORE Water Treatment Products",
    "numberOfItems": P.length,
    "itemListElement": P.slice(0, 200).map((p, i) => ({
      "@type": "ListItem", "position": i + 1,
      "item": {
        "@type": "Product", "name": p.n,
        ...(p.make ? { "brand": { "@type": "Brand", "name": p.make } } : {}),
        ...(p.model ? { "model": p.model } : {}),
        ...(p.spec ? { "description": p.spec.slice(0, 200) } : {}),
        "url": SITE + "/?p=" + p.slug,
        ...(p.p > 0 ? {
          "offers": {
            "@type": "Offer", "price": p.p, "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "seller": { "@type": "Organization", "name": "Aqua Filtration System" }
          }
        } : {})
      }
    }))
  })}</script>`;

  fs.writeFileSync('products.html', shell(
    `All Products & Price List (${P.length}+ items) | WTPESTORE`,
    `Complete price list of ${P.length}+ water treatment products — RO plants, softeners, membranes, dosing pumps, FRP vessels, flow meters & spares. Genuine brands, GST invoice, Faridabad. Call 9910646957.`,
    SITE + '/products.html', body, ld));
  console.log('products.html ✓');

  /* ---- sitemap.xml ---- */
  let sm = '';
  try { sm = fs.readFileSync('sitemap.xml', 'utf8'); } catch (e) { }
  const staticUrls = (sm.match(/<loc>[^<]*<\/loc>/g) || []).map(x => x.replace(/<\/?loc>/g, ''))
    .filter(u => !/\?p=/.test(u));
  const all = new Set(staticUrls);
  all.add(SITE + '/products.html');
  const today = new Date().toISOString().slice(0, 10);
  const urls = [...all].map(u => `<url><loc>${u}</loc><lastmod>${today}</lastmod><priority>${u.endsWith('.co.in/') ? '1.0' : '0.8'}</priority></url>`)
    .concat(P.map(p => `<url><loc>${SITE}/?p=${p.slug}</loc><lastmod>${today}</lastmod><priority>0.6</priority></url>`));
  fs.writeFileSync('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  console.log('sitemap.xml ✓ (' + urls.length + ' URLs)');

  /* ---- summary for the action log ---- */
  fs.writeFileSync('seo-build-log.txt',
    `Last build: ${new Date().toISOString()}\nProducts: ${P.length}\nCategories: ${catNames.length}\nSitemap URLs: ${urls.length}\n`);
})().catch(e => { console.error('BUILD FAIL:', e.message); process.exit(1); });
