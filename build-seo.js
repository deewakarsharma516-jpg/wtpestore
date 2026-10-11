/* WTPESTORE — SEO page builder
   Sheet se products padh kar Google-friendly HTML banata hai.
   GitHub Action roz chalata hai — Sheet badli to pages khud update.

   NAYA (SEO — individual product pages):
   - Har achhi-quality product ka apna static page /products/<slug>.html banta hai
   - Har page: unique title/meta/H1, breadcrumb, Product schema, spec table,
     category ka "about" blurb, related products, WhatsApp CTA
   - Photo seedha Sheet ke Image column (ImgBB URL) se — kuch alag se upload nahi hota
   - Adhoore/junk rows (na spec, na model, na price, na make) ke liye page NAHI banta,
     taaki Google ise "thin content" na maane
   - sitemap.xml me sirf in static pages ka URL jata hai (?p= wale URL se duplicate na ho)
   - products.html ke "View" links bhi in static pages par point karte hain
*/
const fs = require('fs');
const path = require('path');
const https = require('https');

const SHEET = process.env.SHEET_CSV ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSwvqzlRLqyMtcXio41rcwR4jZK0aHASM0uApcARGUC-qvIn9Zvk6ywVUfSUVbO3OsjGbvzFgrikg-/pub?gid=170402937&single=true&output=csv';
const SITE = 'https://www.wtpestore.co.in';
const PRODUCTS_DIR = 'products';

/* Chemical pages — sitemap me hamesha rahenge */
const CHEM_PAGES = [
   '/ro-chemicals.html',
  '/boiler-chemicals.html',
  '/cooling-tower-chemicals.html',
  '/zeroscale-chemicals.html',
  '/ro-antiscalant.html',
  '/ro-membrane-cleaner-acidic.html',
  '/ro-membrane-cleaner-alkaline.html',
  '/ro-biocide.html',
  '/smbs-dechlorination-chemical.html',
  '/ro-ph-booster.html',
  '/boiler-oxygen-scavenger.html',
  '/boiler-antiscalant.html',
  '/boiler-alkalinity-ph-builder.html',
  '/condensate-corrosion-inhibitor.html',
  '/cooling-tower-scale-corrosion-inhibitor.html',
  '/cooling-tower-oxidizing-biocide.html',
  '/cooling-tower-non-oxidizing-biocide.html',
  '/cooling-tower-algaecide.html'
];
/* Blog posts — sitemap me hamesha rahenge.
   NAYA BLOG BANAO to bas yahan ek line jod dena. */
const BLOG_PAGES = [
  '/blog.html',
  '/blog/absolute-vs-nominal-micron.html',
  '/blog/antiscalant-dosing-calculation.html',
  '/blog/astero-11nxt-vs-13nxt-vs-33nxt.html',
  '/blog/bag-filter-kab-behtar-hai.html',
  '/blog/boiler-oxygen-scavenger-kyun.html',
  '/blog/boiler-scale-kaise-rokein.html',
  '/blog/brine-director-brine-switch.html',
  '/blog/cartridge-filter-kitne-micron-lagayein.html',
  '/blog/cartridge-housing-size-guide.html',
  '/blog/cartridge-kitne-din-mein-badlein.html',
  '/blog/chlorine-meter-kab-lagayein.html',
  '/blog/cip-acidic-vs-alkaline.html',
  '/blog/condensate-line-corrosion.html',
  '/blog/conductivity-controller-se-ro-reject-control.html',
  '/blog/cooling-tower-algae-control.html',
  '/blog/cooling-tower-biocide-oxidising-non-oxidising.html',
  '/blog/disc-vs-screen-filter-kaunsa-lein.html',
  '/blog/distribution-system-hub-lateral.html',
  '/blog/dm-plant-vs-ro-plant.html',
  '/blog/do-meter-etp-mein-kaise-use-karein.html',
  '/blog/dosing-accessories-nozzle-foot-valve.html',
  '/blog/dosing-pump-kaise-select-karein.html',
  '/blog/dosing-pump-prime-nahi-ho-raha.html',
  '/blog/dosing-tank-size-kaise-nikalein.html',
  '/blog/dry-run-protection-kya-hai.html',
  '/blog/edose-neo-vs-pro-vs-max.html',
  '/blog/electromagnetic-flow-meter-kab-lein.html',
  '/blog/etp-discharge-norms-monitoring.html',
  '/blog/etp-ke-liye-special-sensor-kyun.html',
  '/blog/etp-plant-stages-explained.html',
  '/blog/etp-stp-automation-panel-kaise-chunein.html',
  '/blog/evolve-mpv-series.html',
  '/blog/flow-meter-4-20ma-rs485-output-guide.html',
  '/blog/flow-meter-nb-size-kaise-chunein.html',
  '/blog/flow-meter-reading-galat-kyun.html',
  '/blog/frp-vessel-size-chart.html',
  '/blog/frp-vs-ms-vessel.html',
  '/blog/ft-650-insertion-vs-full-bore.html',
  '/blog/hard-water-nuksan.html',
  '/blog/housing-se-leakage-o-ring.html',
  '/blog/level-switch-dosing-pump-mein-kyun-zaroori.html',
  '/blog/manual-vs-automatic-mpv.html',
  '/blog/membrane-cip-cleaning.html',
  '/blog/membrane-life-kaise-badhayein.html',
  '/blog/motorised-vs-solenoid-dosing-pump.html',
  '/blog/mpv-backwash-troubleshooting.html',
  '/blog/mpv-code-samajhna.html',
  '/blog/mpv-kaise-chunein.html',
  '/blog/orp-kya-hai-cooling-tower-mein.html',
  '/blog/ph-controller-po-650-installation.html',
  '/blog/ph-correction-dosing-system.html',
  '/blog/ph-sensor-life-kab-badlein.html',
  '/blog/pp-spun-vs-string-wound-vs-pleated.html',
  '/blog/pressure-gauge-kahan-lagayein.html',
  '/blog/pump-baar-baar-trip-ho-raha-hai.html',
  '/blog/pvdf-vs-pp-dosing-pump.html',
  '/blog/remote-monitoring-panel-fayda-cost.html',
  '/blog/ro-antiscalant-kya-karta-hai.html',
  '/blog/ro-membrane-4040-vs-8040.html',
  '/blog/ro-membrane-housing-pressure-rating.html',
  '/blog/ro-membrane-kab-badlein.html',
  '/blog/ro-plant-capacity-kaise-nikalein.html',
  '/blog/ro-plant-control-panel-kaise-chunein.html',
  '/blog/ro-plant-mein-flow-meter-kahan-lagayein.html',
  '/blog/ro-plant-output-kam-ho-gaya.html',
  '/blog/ro-plant-pretreatment-design.html',
  '/blog/ro-recovery-reject-water.html',
  '/blog/rotameter-float-atak-jaye-to-kya-karein.html',
  '/blog/rotameter-kaise-chunein-flow-range-guide.html',
  '/blog/rotameter-vs-digital-flow-meter.html',
  '/blog/sensor-calibration-kaise-karein.html',
  '/blog/smbs-dechlorination-dose.html',
  '/blog/softener-not-working-troubleshooting.html',
  '/blog/softener-regeneration-process.html',
  '/blog/softener-salt-consumption.html',
  '/blog/softener-sizing-hardness-resin.html',
  '/blog/softener-water-slippery-feel.html',
  '/blog/ss304-housing-kab-zaroori.html',
  '/blog/star-delta-panel-kab-chahiye.html',
  '/blog/stp-plant-mbbr-sbr-difference.html',
  '/blog/tds-meter-vs-conductivity-meter.html',
  '/blog/top-mount-vs-side-mount-vessel.html',
  '/blog/turbidity-meter-ntu-kitna-hona-chahiye.html',
  '/blog/uf-plant-backwash-cycle.html',
  '/blog/uf-plant-controller-vs-ro-controller.html',
  '/blog/uf-vs-ro-membrane.html',
  '/blog/vessel-leakage-bulging.html',
  '/blog/vessel-media-freeboard-rule.html',
  '/blog/water-plant-amc-checklist.html',
  '/blog/water-plant-kharidne-se-pehle.html',
  '/blog/water-testing-kya-karayein.html',
  '/blog/water-treatment-common-mistakes.html'
];

/* ---------- helpers ---------- */
function get(url, redirects) {
  /* local test: SHEET_CSV=file:/path/to.csv */
  if (/^file:/.test(url)) return Promise.resolve(fs.readFileSync(url.slice(5), 'utf8'));
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
const slug = n => String(n || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
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
    dsc = ix('discount', 'disc', 'off'), pdfi = ix('catalogue', 'catalog', 'pdf');
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i], n = clean(r[ni]);
    if (n.length < 2) continue;
    const o = {
      c: clean(r[ci]) || 'General', n,
      p: parseInt(String(r[pi] || '').replace(/[^0-9]/g, '')) || 0,
      make: mi > -1 ? clean(r[mi]) : '', model: mo > -1 ? clean(r[mo]) : '',
      spec: sp > -1 ? clean(r[sp]) : '', img: ii > -1 ? clean(r[ii]) : '', mrp: 0,
      pdf: pdfi > -1 ? clean(r[pdfi]) : ''
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

/* ---------- display helpers (SEO polish) ----------
   - Category strings aate hain Sheet se aksar ALL CAPS mein ("ASTERO CONTROLLERS").
     Display ke liye Title Case karte hain, lekin known short-forms (RO, UV, FRP, DM...)
     capital hi rehne dete hain, taaki "R.O." "R.o." na ban jaye.
   - <title> tag Google SERP mein ~60 characters ke baad kat jaata hai — isliye sirf
     <title> ko chhota karte hain; H1, meta description aur breadcrumb poora naam rakhte hain.
*/
const CAT_KEEP_CAPS = new Set(['RO', 'R.O.', 'UV', 'U.V.', 'FRP', 'DM', 'ETP', 'STP', 'UF', 'MPV', 'SDI', 'PVDF', 'PTFE', 'ATM', 'PP', 'GST', 'NB', 'SS', 'SS304', 'LPH', 'KLD']);
function titleCaseCat(raw) {
  return String(raw || '').trim().split(/\s+/).map(tok => {
    if (CAT_KEEP_CAPS.has(tok.toUpperCase())) return tok.toUpperCase();
    if (/\d/.test(tok)) return tok;              // model/size codes: chhedte nahi
    if (tok === '&' || tok === '/') return tok;
    return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
  }).join(' ');
}
function shortTitle(name, maxLen) {
  const n = String(name || '').trim();
  if (n.length <= maxLen) return n;
  const cut = n.slice(0, maxLen);
  const sp = cut.lastIndexOf(' ');
  return (sp > 20 ? cut.slice(0, sp) : cut).trim();
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

/* Slugs jinke apne static /products/<slug>.html page ban chuke hain (card() isse View link decide karta hai) */
const STATIC_SLUGS = new Set();

/* ---------------------------------------------------------------
   LASTMOD - a page's date changes only when its content changes.
   Stamping every URL with today's date on every build teaches
   Google to ignore our lastmod, which slows crawling of pages that
   really did change. State lives in products/ (the workflow commits
   that folder).
--------------------------------------------------------------- */
const LASTMOD_FILE = path.join(PRODUCTS_DIR, 'lastmod-state.json');
function readLastmodState() {
  try { return JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')); } catch (e) { return {}; }
}
/* hash only what a reader would see change - dates (build stamps,
   priceValidUntil, "last updated") are removed first */
function contentHash(file) {
  let t;
  try { t = fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
  t = t.replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?/g, '')
       .replace(/<!--WTPE_SP_START-->[\s\S]*?<!--WTPE_SP_END-->/, '');
  return require('crypto').createHash('sha1').update(t).digest('hex').slice(0, 16);
}
/* site URL -> local file in the checkout (null if it is not a file) */
function urlToFile(u) {
  let p = String(u).replace(SITE, '');
  if (p.indexOf('?') > -1 || p.indexOf('#') > -1) return null;
  if (p === '' || p === '/') return 'index.html';
  p = decodeURIComponent(p.replace(/^\//, ''));
  if (!/\.html$/.test(p)) return null;               /* folders like /blog/icons */
  try { return fs.statSync(p).isFile() ? p : null; } catch (e) { return null; }
}

/* ---------------------------------------------------------------
   index.html needs to know which products have a real page, so that
   an old /?p=<slug> link goes straight to /products/<slug>.html
   instead of opening a popup on a copy of the homepage.
   Written between markers; harmless if the markers are missing.
--------------------------------------------------------------- */
function writeStaticMapIntoIndex(P) {
  const groups = {};
  P.forEach(p => { (groups[p.slugOrig] = groups[p.slugOrig] || []).push(p); });
  const same = [], moved = {};
  Object.keys(groups).forEach(orig => {
    const g = groups[orig];
    if (g.length !== 1) {                          /* old shared slug: send to its chooser page, if one was written */
      if (fs.existsSync(path.join(PRODUCTS_DIR, orig + '.html'))) same.push(orig);
      return;
    }
    const p = g[0];
    if (!STATIC_SLUGS.has(p.slug)) return;
    if (p.slug === orig) same.push(orig); else moved[orig] = p.slug;
  });
  /* very old links were made before "&" became "and" in URLs
     (…-tank-application-fitting). Point those at the same page. */
  const legacySlug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const known = new Set(Object.keys(groups));
  let legacy = 0;
  P.forEach(p => {
    if (!STATIC_SLUGS.has(p.slug)) return;
    const old = legacySlug(p.nOrig || p.n);
    if (old && !known.has(old) && !moved[old]) { moved[old] = p.slug; legacy++; }
  });
  if (legacy) console.log('index.html: ' + legacy + ' legacy ?p= links mapped');
  let html;
  try { html = fs.readFileSync('index.html', 'utf8'); } catch (e) { return; }
  if (html.indexOf('<!--WTPE_SP_START-->') < 0) { console.log('index.html: static map markers missing - skipped'); return; }
  const data = JSON.stringify({ s: same.join('|'), m: moved }).replace(/</g, '\\u003c');
  const block = '<!--WTPE_SP_START--><script>window.WTPE_SP=' + data + ';</script><!--WTPE_SP_END-->';
  const out = html.replace(/<!--WTPE_SP_START-->[\s\S]*?<!--WTPE_SP_END-->/, block);
  if (out !== html) fs.writeFileSync('index.html', out);
  console.log('index.html static map ✓ (' + same.length + ' direct, ' + Object.keys(moved).length + ' renamed)');
}

/* ---------------------------------------------------------------
   Several products once shared ONE url (e.g. /products/water-softener.html).
   Now each has its own page. Google still knows the old url, so it
   becomes a small noindex page listing the real products - Google
   follows the links, old visitors pick the right one, nothing 404s.
--------------------------------------------------------------- */
function writeOldSharedSlugPages(P) {
  const groups = {};
  P.forEach(p => { (groups[p.slugOrig] = groups[p.slugOrig] || []).push(p); });
  let made = 0;
  Object.keys(groups).forEach(orig => {
    const live = groups[orig].filter(p => STATIC_SLUGS.has(p.slug) && p.slug !== orig);
    if (!live.length || STATIC_SLUGS.has(orig)) return;
    if (live.length === 1) {                        /* renamed (e.g. typo fix) - plain redirect */
      const target = SITE + '/products/' + live[0].slug + '.html';
      fs.writeFileSync(path.join(PRODUCTS_DIR, orig + '.html'),
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="robots" content="noindex,follow"><link rel="canonical" href="' + target + '">' +
        '<meta http-equiv="refresh" content="0; url=' + target + '"><title>Moved</title></head><body>' +
        '<p>This page has moved to <a href="' + target + '">' + esc(live[0].n) + '</a>.</p>' +
        '<script>location.replace(' + JSON.stringify(target) + ');<\/script></body></html>');
      made++; return;
    }
    const items = live.map(p =>
      `<li><a href="/products/${p.slug}.html">${esc(p.n)}</a>${p.p > 0 ? ' &mdash; ' + rupee(p.p) + ' + GST' : ''}</li>`).join('');
    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex,follow"><title>Choose a model | WTPESTORE</title>' +
      '<style>body{font-family:system-ui,Arial,sans-serif;max-width:720px;margin:30px auto;padding:0 16px;color:#0f1111}' +
      'h1{font-size:21px;color:#0B2A4A}li{margin:10px 0;font-size:15px}a{color:#0B2A4A;font-weight:600}</style></head><body>' +
      '<h1>This product now has a separate page for each model</h1><p>Please choose the one you need:</p>' +
      '<ul>' + items + '</ul><p><a href="/products.html">See all products</a> &middot; <a href="/">Home</a></p></body></html>';
    fs.writeFileSync(path.join(PRODUCTS_DIR, orig + '.html'), html);
    made++;
  });
  if (made) console.log('old shared-url chooser pages ✓ (' + made + ')');
}

function card(p) {
  const off = p.mrp && p.mrp > p.p ? Math.round((p.mrp - p.p) * 100 / p.mrp) : 0;
  const price = p.p > 0
    ? `<div class="pr">${off ? `<span class="old">${rupee(p.mrp)}</span>` : ''}${rupee(p.p)}<small> +GST</small>${off ? `<span class="off">${off}% OFF</span>` : ''}</div>`
    : `<div class="pr" style="color:#565959;font-size:15px">Price on request</div>`;
  const wa = `https://wa.me/919899193589?text=${encodeURIComponent('Hi WTPESTORE, I want a quotation for: ' + p.n + (p.model ? ' (Model ' + p.model + ')' : '') + '. Please share best price.')}`;
  /* Static page hai to wahan; warna category page ke us section par
     (?p= par nahi bhejte — duplicate naam wale slug galat product khol dete hain) */
  const viewHref = STATIC_SLUGS.has(p.slug)
    ? `/products/${p.slug}.html`
    : `/products.html#${slug(p.c)}`;
  return `<article class="pc" id="${p.slug}">
${p.model ? `<span class="md">Model: ${esc(p.model)}</span>` : ''}
<h3>${esc(p.n)}</h3>
${p.make ? `<div style="font-size:12px;color:#666">Brand: <b>${esc(p.make)}</b></div>` : ''}
${p.spec ? `<div class="sp">${esc(p.spec.slice(0, 300))}</div>` : ''}
${price}
<div class="acts"><a class="b wa" href="${wa}" rel="nofollow">💬 Get Quote</a><a class="b vw" href="${viewHref}">View →</a></div>
</article>`;
}

/* ---------- category "about" blurbs (thin/duplicate-content se bachne ke liye) ----------
   Har match ke liye ek chhota, keh-diya-jaa-chuka library jaisa paragraph — jaise Amazon/Flipkart
   product-listing pages par category-level intro hota hai. Har product page par ye SAME text
   aa sakta hai (normal ecommerce practice), lekin har page ka title/spec/price/model alag hota
   hai — isliye Google ise duplicate-content nahi maanta.
*/
function normCat(c) {
  return String(c || '').toUpperCase()
    .replace(/^(ASTER|ASTERO|EDOSE|EMBARK|PENTAIR|QFLO|CHINESE|EVERFLOW|INITIATIVE ENGINEERING)\s+/, '')
    .replace(/\s*[&,].*/, '').trim();
}
const CAT_BLURB_RULES = [
  [/rotameter|flow ?meter/, 'Flow Meters', 'Flow meters and rotameters measure the exact litres-per-hour passing through your RO, softener or dosing line, so you can verify system performance and catch fouling or leaks early.'],
  [/electromagnetic/, 'Electromagnetic Flow Meters', 'Electromagnetic flow meters give accurate, maintenance-free flow readings on larger industrial lines where a mechanical rotameter would wear out or restrict flow.'],
  [/dosing|edose|metering pump/, 'Dosing / Metering Pumps', 'Dosing pumps inject precise, adjustable amounts of antiscalant, chlorine or pH-correction chemical into the water stream, protecting membranes and downstream equipment from scale and fouling.'],
  [/frp|vessel/, 'FRP Vessels', 'FRP (fibre-reinforced plastic) vessels house the sand, carbon or resin media in a filtration or softening system, built to safely hold working pressure for years of continuous use.'],
  [/u\.?v\.?|purif/, 'UV Purification Systems', 'UV purification systems use ultraviolet light to disable bacteria and viruses without adding any chemical to the water, commonly used as a final polishing stage after RO or UF.'],
  [/membrane/, 'Membranes', 'Membranes are the core filtration element of an RO or UF plant, rejecting dissolved salts, bacteria and suspended solids to deliver clean permeate water.'],
  [/cartridge/, 'Cartridge Filters', 'Cartridge filters remove sediment, rust and suspended particles ahead of your RO membrane or softener, protecting it from premature fouling and extending its working life.'],
  [/housing|coupling/, 'Housings & Couplings', 'Housings and couplings hold cartridges or membranes securely in place and connect plant piping without leaks, rated for the working pressure of your system.'],
  [/multiport|mpv/, 'Multiport Valves', 'Multiport valves automate the backwash, rinse and service cycles of a sand filter or softener vessel through a single easy-to-operate handle or timer.'],
  [/solenoid/, 'Solenoid Valves', 'Solenoid valves open and close automatically on electrical signal, used for backwash sequencing, dispenser control and automatic shut-off across water treatment skids.'],
  [/valve/, 'Valves', 'Valves control and direct water flow across your plant piping, and are selected by size, pressure rating and application.'],
  [/gauge/, 'Pressure Gauges', 'Pressure gauges let you monitor feed and reject pressure at a glance, helping you spot a choked cartridge or fouled membrane before it causes bigger damage.'],
  [/switch/, 'Pressure & Level Switches', 'Pressure and level switches protect your pump from dry-running and automate tank filling, switching the system on or off at set thresholds.'],
  [/controller|astero/, 'Controllers & Panels', 'Controllers and panels automate pump operation, protection and sequencing for RO, softener, UF and effluent-treatment plants.'],
  [/instrument/, 'Water Quality Instruments', 'Water quality instruments measure parameters like pH, conductivity, TDS or turbidity so you can verify treated water meets the required standard.'],
  [/antiscalant|chemical|resin/, 'Water Treatment Chemicals & Resin', 'Water treatment chemicals and resins keep RO membranes, boilers and softeners free of scale, fouling and microbial growth.'],
  [/carbon/, 'Activated Carbon Media', 'Activated carbon media removes chlorine, colour and organic odour from feed water, protecting RO membranes and improving taste.'],
  [/disc|screen/, 'Disc & Screen Filters', 'Disc and screen filters remove coarse sediment and organic matter from raw or irrigation water ahead of finer filtration stages.'],
  [/distribution/, 'Distribution Systems', 'Distribution systems (top/lateral assemblies) spread water evenly through the media bed inside a softener or sand-filter vessel for efficient filtration and regeneration.'],
  [/atm|dispenser/, 'Water ATM & Dispensers', 'Water ATM and dispenser components let you sell or dispense treated water automatically via card, coin or QR payment.'],
  [/pool|light/, 'Swimming Pool Lights', 'Swimming pool lights are built for continuous underwater use, giving safe, energy-efficient illumination for residential and commercial pools.'],
  [/test|sdi|hardness/, 'Water Test Kits', 'Water test kits let you check hardness, SDI or other key parameters on site, without waiting for a lab report.'],
  [/soft[ei]n/, 'Water Softeners', 'Water softeners remove calcium and magnesium hardness from your supply, preventing scale build-up in pipes, geysers and appliances.']
];
function toTitleCase(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function catBlurb(category) {
  const c = String(category || '').toLowerCase();
  for (const [re, label, text] of CAT_BLURB_RULES) { if (re.test(c)) return { label, text }; }
  const label = toTitleCase(normCat(category)) || 'Water Treatment Product';
  return { label, text: `${label} from WTPESTORE — powered by Aqua Filtration System — are supplied as genuine, tested products for RO, DM, softening and industrial water-treatment plants across India, backed by a GST invoice and our technical support team.` };
}

/* ---------- thin/junk-row filter ----------
   Kai baar Sheet me koi row adhoora hota hai (jaise sirf ek fragment jaisa naam,
   na spec na model na price). Aise rows ke liye alag static page NAHI banate —
   warna Google poore site ko "thin content" wali site maan sakta hai.
*/
function isQualityProduct(p) {
  const n = (p.n || '').trim();
  if (n.length < 6) return false;
  if (/^\[.*\]$/.test(n)) return false;              // sirf "[Volume (Litres)]" jaisa fragment
  if (p.dupName) return false;                       // naam duplicate hai — upar wali wajah dekhein
  if (!(p.spec || p.model || p.p > 0 || p.make)) return false; // kam se kam ek meaningful detail chahiye
  return true;
}

/* ---------- content enrichment helpers ----------
   Sheet me aksar Model/Specification khaali hote hain. Page phir bhi patla na lage,
   isliye jo jaankari naam me chhupi hai use nikaal lete hain (jaise index.html karta hai),
   aur category ke hisaab se features/FAQ jodte hain — yehi Google ko "useful page" lagta hai.
*/
const MODEL_STOPWORDS = new Set(['TO', 'AT', 'FOR', 'WITH', 'AND', 'THE', 'FLOW', 'RANGE', 'MAX', 'MIN', 'SIZE', 'TYPE', 'UPTO', 'FROM']);
function extractModel(name) {
  if (!name) return '';
  /* bracket ke andar spec hoti hai, model nahi — isliye pehla bracket se pehle wala hissa dekho */
  const head = String(name).split('(')[0].toUpperCase();
  /* \b zaroori hai — warna "ASTERO 33NXT" me se "STERO 33NXT" nikal aata hai */
  const pats = [/\b([A-Z]{1,6}\s?\d{2,5}[A-Z]{0,4}\d{0,3})\b/, /\b(\d{1,4}[A-Z]{2,4})\b/];
  for (const re of pats) {
    const m = head.match(re);
    if (m) {
      const v = m[1].replace(/\s+/g, ' ').trim();
      if (!MODEL_STOPWORDS.has(v.split(' ')[0])) return v;
    }
  }
  return '';
}
/* naam ke bracket wale hisse aksar asli spec hote hain:
   "ROTAMETER F500 (FLOW RANGE 50 TO 500 LPH, I/O 15NB M)" */
function specFromName(name) {
  const out = [];
  const br = String(name || '').match(/\(([^)]{4,120})\)/g) || [];
  br.forEach(b => {
    b.replace(/^\(|\)$/g, '').split(',').forEach(part => {
      const t = part.trim();
      if (!t) return;
      const kv = t.match(/^(.{2,40}?)\s*[:=]\s*(.+)$/);
      if (kv) { out.push([kv[1].trim(), kv[2].trim()]); return; }
      const rng = t.match(/^(FLOW RANGE|CAPACITY|RANGE|FLOW|SIZE|I\/O|PACKING|NET WEIGHT|CUT OUT SIZE)\s+(.+)$/i);
      if (rng) { out.push([titleCaseCat(rng[1]), rng[2].trim()]); return; }
      if (t.length <= 60) out.push(['Detail', t]);
    });
  });
  return out.slice(0, 8);
}
/* Specification column ko rows me todo (line / | / ; / "Key: Value") */
function specRowsFromSpec(spec) {
  const s = String(spec || '').replace(/\r/g, '').trim();
  if (!s) return [];
  const out = [];
  const lines = s.split(/\n|\||;/).map(x => x.trim()).filter(Boolean);
  lines.forEach(L => {
    const m = L.match(/^([^:=]{2,60})[:=]\s*(.+)$/);
    if (m) out.push([m[1].trim(), m[2].trim()]);
  });
  if (out.length >= 2) return out.slice(0, 12);
  if (/:/.test(s)) {
    const cs = s.split(/,(?=[^,:]{2,60}\s*:)/), t2 = [];
    cs.forEach(L => { const m = L.trim().match(/^([^:]{2,60}):\s*(.+)$/); if (m) t2.push([m[1].trim(), m[2].trim()]); });
    if (t2.length >= 2) return t2.slice(0, 12);
  }
  return [];
}
/* Category ke hisaab se 3-4 selling points */
/* Google recommends priceValidUntil on Offer - rolls forward 1 year each build */
const PRICE_VALID_UNTIL = (function () {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
})();

/* ---------------------------------------------------------------
   REDIRECTS - old slug : new slug
   Use when a product NAME is corrected in the Sheet and its URL
   changes. build-seo.js then writes a small redirect page at the
   old path, so Google and old links reach the new page.
   Uncomment / add a line, save, run the workflow.
--------------------------------------------------------------- */
const REDIRECTS = {
  // 'ro-plannt-3000-lph': 'ro-plant-3000-lph',
};

/* ---------------------------------------------------------------
   CATEGORY_GUIDE - real, category-specific content for the
   Applications / Compatibility / Selection sections plus links to
   the matching guides. Nothing generic: if a category is not
   listed, those sections are simply not rendered.
--------------------------------------------------------------- */
/* ---------------------------------------------------------------
   productIntro - a unique opening paragraph built from the
   product's OWN data: the figures in its name, its model, its
   category context and its price. Sentence order is varied by a
   hash of the slug so neighbouring pages do not read alike.
   Nothing is invented: every clause comes from real data.
--------------------------------------------------------------- */
const CAT_NOUN = [
  [/rotameter/, 'rotameter'],
  [/digital flow meter|flow ?meter|electromagnetic/, 'flow meter'],
  [/dosing vessel|lldpe/, 'LLDPE dosing vessel'],
  [/dosing|edose|metering pump/, 'metering pump'],
  [/test kit/, 'test kit'],
  [/pressure gauge/, 'pressure gauge'],
  [/level switch|pressure switch|pressure & level/, 'switch'],
  [/instrument|indicator|transmitter|datalogger/, 'instrument'],
  [/controller|astero|panel/, 'control panel'],
  [/solenoid valve/, 'solenoid valve'],
  [/mpv accessor|multiport valve accessor/, 'multiport valve accessory'],
  [/multiport|mpv/, 'multiport valve'],
  [/distribution system/, 'distribution system'],
  [/diffuser/, 'diffuser'],
  [/frp vessel|pentair|qflo/, 'FRP vessel'],
  [/multigrade|sand filter/, 'multigrade filter'],
  [/membrane housing|pipe joint|coupling/, 'membrane housing'],
  [/u\.?f\.? membrane|everflow/, 'UF membrane'],
  [/membrane/, 'RO membrane'],
  [/cartridge housing/, 'cartridge housing'],
  [/disc & screen|disc filter|screen filter/, 'disc / screen filter'],
  [/bag filter|filters bag|filter bag/, 'bag filter'],
  [/cartridge|gopani|clarywound|ro protect/, 'cartridge filter'],
  [/soft[ei]n/, 'water softener'],
  [/chemical|antiscalant|resin|carbon/, 'treatment chemical'],
  [/industrial ro plant|ro plant\b/, 'RO plant'],
  [/dm plant/, 'DM plant'],
  [/uf plant/, 'UF plant'],
  [/etp plant/, 'ETP'],
  [/stp plant/, 'STP'],
  [/u\.?v\.?|purif/, 'UV system'],
  [/blower/, 'air blower'],
  [/water atm|dispenser/, 'water dispenser'],
  [/pool light|swimming pool/, 'underwater light'],
];
function catNoun(c) {
  const s = String(c || '').toLowerCase();
  for (const [re, n] of CAT_NOUN) if (re.test(s)) return n;
  return 'product';
}

/* pull the real technical figures out of the product name */
function nameFacts(n) {
  const t = String(n || '');
  const out = [];
  let m;
  if ((m = t.match(/(\d[\d,]*)\s*(?:to|-|–)\s*(\d[\d,]*)\s*LPH/i))) out.push('a flow range of ' + m[1] + ' to ' + m[2] + ' LPH');
  else if ((m = t.match(/(\d[\d,]*)\s*LPH/i))) out.push(m[1] + ' LPH');
  if ((m = t.match(/(\d[\d,]*)\s*KLD/i))) out.push(m[1] + ' KLD');
  if ((m = t.match(/(\d+)\s*NB/i))) out.push(m[1] + 'NB connections');
  if ((m = t.match(/([\d.]+)\s*(?:\/[\d.]+)*\s*micron/i))) out.push(m[0].replace(/\s+/g, ' ').trim());
  if ((m = t.match(/(\d+)\s*(?:"|''|inch)/i))) out.push(m[1] + ' inch');
  if ((m = t.match(/([\d.]+)\s*kg\/cm2/i))) out.push('up to ' + m[1] + ' kg/cm²');
  if ((m = t.match(/([\d.]+)\s*HP/i))) out.push(m[1] + ' HP');
  if ((m = t.match(/(\d+)\s*(?:litre|liter)/i))) out.push(m[1] + ' litre capacity');
  if (/PVDF/i.test(t)) out.push('a PVDF wetted head for aggressive chemicals');
  else if (/PTFE/i.test(t)) out.push('PTFE wetted parts');
  if (/SS\s*304/i.test(t)) out.push('SS304 construction');
  if (/top mount/i.test(t)) out.push('top mounting');
  else if (/side mount/i.test(t)) out.push('side mounting');
  if (/softener/i.test(t) && /mpv|multiport/i.test(t)) out.push('a brine port for regeneration');
  return out;
}

function aOrAn(w) { return /^[aeiou]/i.test(String(w || '').trim()) ? 'an' : 'a'; }

/* lowercase the first word only if it is not an acronym like RO, ETP, UV */
function softLower(t) {
  const s = String(t || '');
  const first = s.split(/\s+/)[0] || '';
  if (/^[A-Z0-9.&/-]{2,}$/.test(first)) return s;      /* RO, ETP, SDI, 4-20mA */
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function productIntro(p, G) {
  const noun = catNoun(p.c);
  const art = aOrAn(noun);
  const facts = nameFacts(p.n);
  const apps = (G && G.apps) ? G.apps : [];
  const name = String(p.n).trim();

  /* stable per-product variation */
  let h = 0;
  const key = String(p.slug || name);
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000;

  const openings = [
    `${name} is ${art} ${noun} supplied by WTPESTORE, powered by Aqua Filtration System, Faridabad.`,
    `The ${name} is ${art} ${noun} we stock and supply across India from our Faridabad base.`,
    `WTPESTORE supplies the ${name} — ${art} ${noun} for water and wastewater treatment duty.`,
  ];
  let s = [openings[h % openings.length]];

  if (p.model) s.push(`It carries model reference ${String(p.model).trim()}.`);

  if (facts.length) {
    const f = facts.slice(0, 3);
    const joined = f.length > 1 ? f.slice(0, -1).join(', ') + ' and ' + f[f.length - 1] : f[0];
    s.push(`Key figures for this model are ${joined}.`);
  }

  if (apps.length) {
    const a = [apps[h % apps.length], apps[(h + 1) % apps.length]]
      .filter((x, i, arr) => x && arr.indexOf(x) === i)
      .map(softLower);
    if (a.length) s.push(`It is commonly used for ${a.join(' and ')}.`);
  }

  if (p.make) s.push(`Supplied as a genuine ${String(p.make).trim()} item.`);

  const closers = [
    `Price shown is ex-Faridabad and a GST invoice is issued with every order. Send us your requirement for a quotation on this exact model.`,
    `A GST invoice is issued on every dispatch, and we usually reply to enquiries within two working hours.`,
    `Available from stock with GST billing and pan-India dispatch. Tell us your flow, pressure or water analysis and we will confirm the right model.`,
  ];
  s.push(closers[(h >> 3) % closers.length]);

  return s.join(' ');
}

const CATEGORY_GUIDE = [
  [/rotameter/, {
    apps: ['RO plant permeate and reject lines', 'Softener and filter backwash setting', 'Dosing and chemical feed lines', 'Cooling tower make-up and blowdown'],
    compat: 'Matches 15NB to 65NB lines. Choose the model whose range puts your normal flow near the middle of the scale, not at either end.',
    select: 'Pick on flow range first, then on the NB of your line. A rotameter reading near the top or bottom of its scale gives poor accuracy, so size it so your working flow sits mid-scale.',
    guides: [['rotameter-kaise-chunein-flow-range-guide', 'How to select a rotameter'], ['flow-meter-nb-size-kaise-chunein', 'Choosing the NB size'], ['rotameter-float-atak-jaye-to-kya-karein', 'If the float sticks']]
  }],
  [/digital flow meter|electromagnetic/, {
    apps: ['ETP and STP discharge flow records', 'Bulk water and process metering', 'Effluent lines with solids', 'Pollution board telemetry reporting'],
    compat: 'Available 25NB to 150NB. 4-20mA and RS485 outputs connect to panels, dataloggers and telemetry modems.',
    select: 'Use an electromagnetic meter where the liquid carries solids or is corrosive, since there is no obstruction in the flow path. For clean water a rotameter or FT-650 costs far less.',
    guides: [['electromagnetic-flow-meter-kab-lein', 'When to use an electromagnetic meter'], ['flow-meter-4-20ma-rs485-output-guide', '4-20mA and RS485 outputs'], ['etp-discharge-norms-monitoring', 'ETP discharge monitoring']]
  }],
  [/dosing|edose|metering pump/, {
    apps: ['Antiscalant dosing ahead of RO membranes', 'SMBS dosing for dechlorination', 'pH correction in ETP and process water', 'Chlorine dosing for disinfection'],
    compat: 'PP heads suit antiscalant, SMBS and hypochlorite. PVDF or PTFE is needed for strong acid. Pair with a level switch, foot valve and injection nozzle.',
    select: 'Size on the LPH you need at your line pressure, then set the stroke to about 50 to 70 percent so there is adjustment either way. Choose the head material from the chemical, not the price.',
    guides: [['dosing-pump-kaise-select-karein', 'How to select a dosing pump'], ['pvdf-vs-pp-dosing-pump', 'PVDF vs PP heads'], ['antiscalant-dosing-calculation', 'Antiscalant dosing calculation'], ['level-switch-dosing-pump-mein-kyun-zaroori', 'Why a level switch matters']]
  }],
  [/controller|astero|panel/, {
    apps: ['RO plant automation and pump control', 'UF plant backwash sequencing', 'ETP and STP pump and blower control', 'Unmanned plants needing protection and alarms'],
    compat: 'Select by pump phase and HP for both raw water and high pressure pumps. Works with conductivity sensors, level switches and pressure switches.',
    select: 'Match the RWP and HPP ratings to your actual motors with margin. Above about 10 HP a star delta panel is needed. Add RS485 only if you will actually read the data.',
    guides: [['ro-plant-control-panel-kaise-chunein', 'Choosing an RO control panel'], ['astero-11nxt-vs-13nxt-vs-33nxt', 'NXT model comparison'], ['dry-run-protection-kya-hai', 'Dry run protection'], ['star-delta-panel-kab-chahiye', 'When you need star delta']]
  }],
  [/instrument|indicator|transmitter|datalogger/, {
    apps: ['RO permeate and feed quality monitoring', 'Boiler and cooling water control', 'ETP pH and discharge monitoring', 'Drinking water and packaged water plants'],
    compat: 'Sensors are field replaceable. Relay versions can drive a dosing pump or diverter valve. 4-20mA and RS485 options feed panels and dataloggers.',
    select: 'Decide first whether you need only a reading or also automatic control. An indicator shows the value; a controller has a relay and can act on it. Match the sensor to the temperature and the water condition.',
    guides: [['tds-meter-vs-conductivity-meter', 'TDS vs conductivity'], ['sensor-calibration-kaise-karein', 'How to calibrate sensors'], ['ph-sensor-life-kab-badlein', 'pH sensor life'], ['etp-ke-liye-special-sensor-kyun', 'Why ETP needs special sensors']]
  }],
  [/pressure & level switch|level switch|pressure switch/, {
    apps: ['Dry run protection on RO high pressure pumps', 'Tank level control', 'High pressure cut-off on membrane housings', 'Pump start and stop automation'],
    compat: 'Two-wire connection to any RO or filtration control panel. Low pressure 0.5 to 5 kg, high pressure 2 to 25 kg.',
    select: 'Fit a low pressure switch on the pump suction and a high pressure switch on the discharge. NXT metal-body versions allow the set point to be adjusted in the field.',
    guides: [['dry-run-protection-kya-hai', 'Dry run protection'], ['pump-baar-baar-trip-ho-raha-hai', 'Why the pump keeps tripping']]
  }],
  [/pressure gauge/, {
    apps: ['Before and after cartridge filters', 'Across membrane housings', 'Pump discharge pressure', 'Media filter backwash monitoring'],
    compat: 'Bottom or back entry, 1/4 and 3/8 connections. Glycerine filled versions suit lines with pump vibration.',
    select: 'Choose a range where your normal pressure sits near mid-scale. Pre-treatment lines usually need 0 to 7 kg; RO membrane feed needs 0 to 25 kg.',
    guides: [['pressure-gauge-kahan-lagayein', 'Where to fit pressure gauges'], ['cartridge-kitne-din-mein-badlein', 'When to change a cartridge']]
  }],
  [/test kit/, {
    apps: ['Daily feed hardness check on softeners', 'Boiler feed water testing', 'SDI measurement before RO design', 'Routine plant log readings'],
    compat: 'No power or instrument needed. Refill reagents and SDI papers available separately.',
    select: 'A hardness kit is the single most useful daily test on any softener. An SDI kit is more relevant than turbidity when designing RO pre-treatment.',
    guides: [['water-testing-kya-karayein', 'Which water tests you need'], ['softener-not-working-troubleshooting', 'Softener troubleshooting']]
  }],
  [/cartridge housing/, {
    apps: ['Final filtration before RO membranes', 'Point-of-use and process filtration', 'Chemical and dosing line filtration', 'Pre-filtration on softeners and plants'],
    compat: 'Takes standard 10, 20 and 30 inch cartridges in slim and jumbo diameters. 15NB to 40NB connections.',
    select: 'Size on flow, not plant output. Always take the air release version. Choose SS304 where pressure is higher, water is hot, or the plant runs continuously.',
    guides: [['cartridge-housing-size-guide', 'Housing size guide'], ['ss304-housing-kab-zaroori', 'When SS304 is necessary'], ['housing-se-leakage-o-ring', 'Fixing housing leaks']]
  }],
  [/disc & screen|disc filter|screen filter/, {
    apps: ['Ahead of cartridge filters to cut consumption', 'Borewell water with sand', 'Cooling tower side stream filtration', 'Irrigation and garden lines'],
    compat: 'Y type up to 1.5 inch, T type from 2 inch upward. Fits directly in line, no housing needed.',
    select: 'Use a screen filter for sand and coarse particles; a disc filter where there is algae or organic matter. Both are washed and reused, so there is no recurring cost.',
    guides: [['disc-vs-screen-filter-kaunsa-lein', 'Disc vs screen filter'], ['cartridge-filter-kitne-micron-lagayein', 'Choosing the micron rating']]
  }],
  [/bag filter|filters bag|filter bag/, {
    apps: ['Very dirty borewell and river water', 'ETP and STP filter feed', 'Pre-filtration ahead of cartridges', 'Cooling tower side stream'],
    compat: 'Fits PP and SS304 bag housings. Available 5 to 100 micron in several sizes.',
    select: 'Use a bag filter where cartridges are choking weekly. Fit 25 to 50 micron ahead of a 5 micron cartridge; the cartridge then lasts far longer.',
    guides: [['bag-filter-kab-behtar-hai', 'When a bag filter is better'], ['cartridge-filter-kitne-micron-lagayein', 'Micron selection']]
  }],
  [/cartridge|gopani|clarywound|ro protect/, {
    apps: ['Final protection before RO membranes', 'Sediment removal on borewell water', 'Polishing after media filters', 'Process and drinking water lines'],
    compat: 'Standard lengths fit common housings. Slim and jumbo diameters available.',
    select: '5 micron is the standard before RO. On dirty water fit 20 micron first and 5 micron after. Change on pressure drop, not on a guess.',
    guides: [['cartridge-filter-kitne-micron-lagayein', 'What micron to use'], ['pp-spun-vs-string-wound-vs-pleated', 'PP spun vs string wound vs pleated'], ['cartridge-kitne-din-mein-badlein', 'When to change it']]
  }],
  [/frp vessel|pentair|qflo/, {
    apps: ['Water softeners', 'Multigrade and sand filters', 'Activated carbon filters', 'DM and iron removal plants'],
    compat: 'Fits standard top and side mount multiport valves. Needs a distribution system and graded media.',
    select: 'Work out the media volume you need first, then take the smallest vessel that holds it, keeping media under about 60 percent so backwash works. Check flow as well as volume.',
    guides: [['frp-vessel-size-chart', 'FRP vessel size chart'], ['vessel-media-freeboard-rule', 'Media loading and freeboard'], ['top-mount-vs-side-mount-vessel', 'Top vs side mount']]
  }],
  [/distribution system|diffuser/, {
    apps: ['Inside softener and filter vessels', 'ETP and STP aeration tanks', 'Even flow distribution across media beds', 'Backwash water distribution'],
    compat: 'Sized to vessel diameter and service flow. Hub and lateral systems for larger vessels.',
    select: 'Choose on vessel size and flow together. An undersized distributor causes channelling, so the vessel treats far less water than it should.',
    guides: [['distribution-system-hub-lateral', 'Distribution system guide'], ['vessel-media-freeboard-rule', 'Media loading guide']]
  }],
  [/multiport|mpv/, {
    apps: ['Softener service and regeneration', 'Sand and carbon filter backwash', 'Multigrade filter operation', 'Automatic plant sequencing with EVOLVE'],
    compat: 'Filter and softener versions are not interchangeable. Must match the vessel mounting, top or side. 20NB to 65NB.',
    select: 'Decide four things: filter or softener, top or side mount, NB size from your flow, and manual or automatic. A filter valve cannot regenerate a softener.',
    guides: [['mpv-kaise-chunein', 'How to select a multiport valve'], ['mpv-code-samajhna', 'Understanding MPV codes'], ['manual-vs-automatic-mpv', 'Manual vs automatic']]
  }],
  [/membrane housing|pipe joint|coupling/, {
    apps: ['Holding RO membrane elements', 'Multi-element RO skids', 'Membrane replacement on existing plants'],
    compat: 'Takes standard 4040 and 8040 elements. Supplied with O-rings and end connections.',
    select: 'Choose a pressure rating comfortably above your operating pressure. Allow clear space at one end equal to the vessel length so elements can be withdrawn.',
    guides: [['ro-membrane-housing-pressure-rating', 'Housing pressure rating'], ['ro-membrane-4040-vs-8040', '4040 vs 8040']]
  }],
  [/membrane/, {
    apps: ['RO plants for drinking and process water', 'Boiler feed water treatment', 'Packaged drinking water', 'UF pre-treatment and tertiary reuse'],
    compat: 'Standard element sizes fit existing housings. Needs antiscalant dosing and chlorine removal upstream.',
    select: 'Choose the element size and count from your plant capacity and feed TDS. Life depends far more on pre-treatment and dosing than on the brand.',
    guides: [['ro-membrane-4040-vs-8040', 'Membrane sizing'], ['membrane-life-kaise-badhayein', 'How to extend membrane life'], ['ro-membrane-kab-badlein', 'When to replace it'], ['membrane-cip-cleaning', 'CIP cleaning']]
  }],
  [/soft[ei]n/, {
    apps: ['Boiler feed water pre-treatment', 'Hotels, hospitals and housing societies', 'Laundry and process water', 'Protecting geysers, fittings and RO membranes'],
    compat: 'Needs a brine tank with a brine director and a supply of clean softener salt.',
    select: 'Size from your water hardness, daily consumption and how often you are willing to regenerate. Check the service flow limit as well as the resin volume.',
    guides: [['softener-sizing-hardness-resin', 'Softener sizing'], ['softener-regeneration-process', 'Regeneration explained'], ['hard-water-nuksan', 'What hard water costs you']]
  }],
  [/multigrade|sand filter/, {
    apps: ['Turbidity removal ahead of RO', 'Borewell water with silt and sand', 'Pre-treatment for softeners', 'Tertiary filtration in ETP and STP'],
    compat: 'FRP vessel with graded media and a filter multiport valve. Needs a drain able to take backwash flow.',
    select: 'Size on flow and inlet turbidity. Above about 5 NTU a media filter is needed before cartridges, otherwise cartridge cost becomes very high.',
    guides: [['turbidity-meter-ntu-kitna-hona-chahiye', 'Turbidity and NTU levels'], ['ro-plant-pretreatment-design', 'Pre-treatment design']]
  }],
  [/chemical|antiscalant|resin|carbon/, {
    apps: ['RO membrane scale and fouling control', 'Boiler scale and corrosion protection', 'Cooling tower biocide and inhibitor programmes', 'CIP cleaning of membranes'],
    compat: 'Dosed with a metering pump into the feed line. Keep each chemical in its own tank with its own pump.',
    select: 'Dose on feed flow, not plant output. Match the product to your water analysis; send us the analysis and we will confirm the dosage.',
    guides: [['ro-antiscalant-kya-karta-hai', 'What antiscalant does'], ['antiscalant-dosing-calculation', 'Dosing calculation'], ['cip-acidic-vs-alkaline', 'Acidic vs alkaline CIP']]
  }],
  [/industrial ro plant|ro plant\b/, {
    apps: ['Drinking water for offices, schools and hostels', 'Hotels, hospitals and housing societies', 'Packaged drinking water units', 'Industrial process and boiler feed water'],
    compat: 'Supplied as a complete skid. Needs raw water storage able to supply the feed flow, a drain for reject, and the stated power supply.',
    select: 'Size from daily requirement divided by running hours, then work back through recovery to the feed flow. Check your borewell can actually deliver that feed flow.',
    guides: [['ro-plant-capacity-kaise-nikalein', 'RO plant sizing'], ['ro-plant-pretreatment-design', 'Pre-treatment design'], ['ro-recovery-reject-water', 'Recovery and reject water']]
  }],
  [/dm plant/, {
    apps: ['High pressure boiler feed water', 'Pharmaceutical and laboratory water', 'Battery and electronics rinsing', 'Polishing after RO'],
    compat: 'Needs acid and alkali for regeneration, with safe storage and effluent neutralisation.',
    select: 'DM running cost rises with feed TDS, so RO followed by DM is usually far cheaper than DM alone. Decide from the outlet conductivity your process actually requires.',
    guides: [['dm-plant-vs-ro-plant', 'DM vs RO'], ['tds-meter-vs-conductivity-meter', 'Conductivity monitoring']]
  }],
  [/uf plant/, {
    apps: ['RO pre-treatment on river and surface water', 'Housing societies and institutions', 'STP tertiary treatment and reuse', 'Bacteria and turbidity removal'],
    compat: 'Needs a controller for automatic backwash, a drain, and feed water within the stated turbidity.',
    select: 'UF removes turbidity and bacteria but not dissolved salts. If the TDS also needs reducing, use UF ahead of an RO rather than instead of it.',
    guides: [['uf-vs-ro-membrane', 'UF vs RO'], ['uf-plant-backwash-cycle', 'UF backwash and operation']]
  }],
  [/etp plant|stp plant/, {
    apps: ['Industrial effluent treatment', 'Housing society and hotel sewage', 'Hospitals, malls and institutions', 'Treated water reuse for gardening and flushing'],
    compat: 'Needs civil tanks or a prefab skid, power for blowers and pumps, and pH and DO monitoring to run properly.',
    select: 'Size on KLD and inlet BOD/COD. MBBR and SBR suit limited space; conventional needs more land but is simpler to operate.',
    guides: [['etp-plant-stages-explained', 'ETP stages explained'], ['stp-plant-mbbr-sbr-difference', 'MBBR vs SBR vs conventional'], ['do-meter-etp-mein-kaise-use-karein', 'DO monitoring and power saving']]
  }],
  [/u\.?v\.?|purif/, {
    apps: ['Final disinfection after RO', 'Drinking water polishing', 'STP and reuse water disinfection', 'Borewell water bacteriological safety'],
    compat: 'Fits in line at the stated LPH. Water must be low in turbidity for UV to work, so filtration comes first.',
    select: 'Choose on the flow rate through the unit, not on tank size. UV needs clear water, so fit it after filtration and RO, never before.',
    guides: [['turbidity-meter-ntu-kitna-hona-chahiye', 'Why turbidity matters'], ['chlorine-meter-kab-lagayein', 'UV vs chlorination']]
  }],
  [/solenoid valve/, {
    apps: ['Automatic RO permeate diversion on TDS', 'Water ATM and dispenser taps', 'Automatic flush and drain lines', 'Panel-controlled on-off duty'],
    compat: 'Driven by a relay from a controller or panel. SS304 and brass bodies, 15NB to 50NB.',
    select: 'Size on the line NB and check the pressure rating. Choose the normally-closed or open position so that on power failure water goes where it is safe.',
    guides: [['conductivity-controller-se-ro-reject-control', 'Automatic TDS diversion'], ['ro-plant-control-panel-kaise-chunein', 'Panel selection']]
  }],
  [/water atm|dispenser/, {
    apps: ['Community and society water points', 'RO water shops and vending', 'Schools, factories and bus stands', 'Paid water dispensing with usage records'],
    compat: 'Each tap needs a flow sensor and a solenoid valve. Card, coin and QR options; more taps can be added later.',
    select: 'Choose the payment types you actually need, then count the taps. Every additional tap needs its own flow sensor and solenoid valve.',
    guides: [['conductivity-controller-se-ro-reject-control', 'Keeping dispensed water quality right'], ['ro-plant-capacity-kaise-nikalein', 'Sizing the RO plant behind it']]
  }],
  [/pool light|swimming pool/, {
    apps: ['Swimming pool underwater lighting', 'Fountain and water feature lighting', 'Decorative pond lighting'],
    compat: 'Low-voltage operation with a matching LED driver, supplied separately by wattage.',
    select: 'Choose the wattage from pool size and depth, and the colour from the effect you want. Order the driver to match the wattage.',
    guides: [['orp-kya-hai-cooling-tower-mein', 'Pool water ORP and disinfection'], ['ph-correction-dosing-system', 'Pool pH control']]
  }],
  [/aster products/, {
    apps: ['Pollution board online monitoring (CPCB)', 'Borewell water level monitoring (DWLR)', 'Tank level indication and transmission', 'Remote plant data logging'],
    compat: 'Outputs 4-20mA and RS485. Telemetry versions include SIM and server data hosting for the first year.',
    select: 'Confirm what your pollution board or process actually requires before choosing, since these are specialised instruments with annual hosting costs.',
    guides: [['etp-discharge-norms-monitoring', 'ETP discharge monitoring'], ['sensor-calibration-kaise-karein', 'Sensor calibration']]
  }],
  [/blower/, {
    apps: ['ETP and STP aeration tanks', 'Diffused aeration systems', 'Tank mixing and agitation'],
    compat: 'Supplied with standard accessories ready to install. Pair with disc or tube diffusers sized to the airflow.',
    select: 'Size on airflow and discharge pressure for your tank depth. The blower is the largest power consumer in an ETP, so DO monitoring pays for itself.',
    guides: [['do-meter-etp-mein-kaise-use-karein', 'DO monitoring and blower cost'], ['etp-plant-stages-explained', 'ETP stages']]
  }],
];

function guideFor(cat) {
  const c = String(cat || '').toLowerCase();
  for (const [re, g] of CATEGORY_GUIDE) if (re.test(c)) return g;
  return null;
}

const FEATURE_RULES = [
  /* --- order matters: most specific first --- */

  /* plants */
  [/industrial ro plant|ro plant/, ['Complete skid — pre-treatment, membranes, pump and panel', 'Sized for your feed TDS and daily requirement', 'Low/high pressure cut-off protects the pump and membranes', 'Installation and commissioning support across India']],
  [/dm plant/, ['Produces low-conductivity water for boilers and process use', 'Cation and anion resin beds sized for your inlet TDS', 'Manual regeneration with acid and alkali', 'Ideal as a polishing stage after RO']],
  [/uf plant/, ['Removes turbidity, bacteria and colloids without chemicals', 'Hollow-fibre membranes with automatic backwash', 'Brings SDI below 3 — good RO pre-treatment', '90–95% water recovery, very little reject']],
  [/etp plant|stp plant/, ['Designed to meet pollution board discharge norms', 'Biological treatment with diffused aeration', 'Tertiary filtration and disinfection included', 'Treated water suitable for gardening and flushing']],

  /* pumps and dosing */
  [/dosing vessel|lldpe/, ['Food-grade LLDPE — safe with antiscalant, SMBS and acid', 'Moulded in one piece, no joints to leak', 'Graduated body for easy solution make-up', 'Fits standard dosing pump suction assemblies']],
  [/dosing|edose|metering pump/, ['Adjustable stroke for precise chemical dosing', 'Chemical-resistant wetted parts (PP / PVDF options)', 'Protects membranes from scale and biofouling', 'Suitable for antiscalant, chlorine and pH correction']],

  /* instruments — split from controllers */
  [/test kit/, ['Simple drop-count method — results in minutes', 'No power or calibration needed', 'Essential for softener and boiler feed checks', 'Refill reagents available separately']],
  [/pressure gauge/, ['Shows filter choking before flow drops', 'Glycerine-filled options damp pump vibration', 'Standard bottom or back entry connections', 'Stainless internals for water treatment duty']],
  [/pressure & level switch|level switch|pressure switch/, ['Stops the pump on low or high pressure', 'Protects membranes and pump from dry running', 'Adjustable set point on NXT models', 'Simple two-wire panel connection']],
  [/instrument|meter|sensor|indicator|transmitter|datalogger/, ['Continuous reading — catch problems before they cost you', 'Field-replaceable sensor keeps running cost low', 'Relay and 4-20mA / RS485 output options', 'Fittings supplied for easy in-line mounting']],

  /* controllers / panels */
  [/controller|astero|panel/, ['Automatic pump protection against dry run', 'Clear display for quick operator checks', 'Reduces manual supervision and downtime', 'Panel-mount design for RO, UF and ETP plants']],

  /* flow */
  [/rotameter|flow ?meter|electromagnetic/, ['Direct in-line flow reading — no power needed on basic rotameters', 'Corrosion-resistant body suited to treated and raw water lines', 'Helps you spot fouling or leakage before it damages the plant', 'Standard NB end connections for easy retrofit']],

  /* valves */
  [/solenoid valve/, ['Opens and closes automatically on a panel signal', 'SS304 and brass bodies for water treatment lines', 'Normally-closed operation fails safe on power loss', 'Available from 15NB to 50NB']],
  [/mpv accessor|multiport valve accessor|brine director|brine switch|vaccum breaker|vacuum breaker/, ['Genuine spares for Initiative Engineering multiport valves', 'Correct fit — no leakage or thread damage', 'Brine directors, switches, adaptors and air release valves', 'Keeps softener regeneration working as designed']],
  [/multiport|mpv/, ['Single-handle control of service, backwash and rinse', 'Available in filter and softener configurations', 'Top and side-mount options for different vessels', 'Durable body for continuous plant duty']],

  /* vessels and internals */
  [/distribution system|diffuser/, ['Spreads flow evenly so the whole media bed works', 'Prevents channelling and media loss', 'Sized to vessel diameter and service flow', 'Corrosion-free construction for long life']],
  [/frp vessel|pentair|qflo/, ['Corrosion-free FRP construction — no rusting like MS tanks', 'Rated for continuous working pressure', 'Fits standard top or side-mount multiport valves', 'Long service life with minimal maintenance']],
  [/multigrade|sand filter|media filter/, ['Removes turbidity, silt and suspended solids', 'Graded media bed with backwash and rinse', 'Protects cartridges, membranes and softener resin', 'Sized on flow and inlet turbidity']],

  /* membranes and housings */
  [/u\.?f\.? membrane|uf membrane|everflow/, ['Removes turbidity, bacteria and colloids — not dissolved salts', 'Hollow-fibre construction withstands repeated backwash', 'Brings SDI below 3 for RO pre-treatment', 'Replacement modules for existing UF skids']],
  [/membrane housing|pipe joint|coupling|end cap/, ['Rated for RO working pressure with margin', 'Takes standard 4040 and 8040 elements', 'Supplied with O-rings and end connections', 'Corrosion-free construction for long service']],
  [/membrane/, ['High salt rejection for consistent permeate quality', 'Standard element size — fits existing housings', 'Long life when antiscalant dosing is maintained', 'Genuine sourcing with brand traceability']],

  /* filters */
  [/cartridge housing/, ['Holds standard 10, 20 and 30 inch cartridges', 'Air release valve makes cartridge changes easy', 'PP and SS304 options for pressure and temperature', 'Standard NB inlet and outlet connections']],
  [/disc & screen|disc filter|screen filter/, ['Washable and reusable — no recurring cartridge cost', 'Stops sand and coarse particles before the cartridges', 'Y and T type bodies from 3/4 inch to 3 inch', 'Cuts cartridge consumption noticeably']],
  [/bag filter|filters bag|filter bag/, ['Holds far more dirt than a cartridge of the same size', 'Quick to change — lift out and replace the bag', 'Available from 5 to 100 micron', 'Ideal ahead of cartridges on dirty water']],
  [/cartridge|gopani|clarywound|ro protect/, ['Protects RO membranes and pumps from sediment', 'Available in multiple micron ratings', 'Standard length — fits common housings', 'Economical, easy scheduled replacement']],

  /* softener */
  [/soft[ei]n/, ['Removes calcium and magnesium hardness', 'Stops scale in pipes, geysers and boilers', 'Automatic or manual regeneration options', 'Extends the life of downstream equipment']],

  /* chemicals and media */
  [/chemical|antiscalant|resin|carbon/, ['Formulated for Indian feed-water conditions', 'Protects membranes and equipment from scale and fouling', 'Economical dosing rates', 'Technical dosage support on request']],

  /* uv */
  [/u\.?v\.?|purif/, ['Chemical-free disinfection — no taste or odour change', 'Effective against bacteria and viruses', 'Low power consumption, continuous operation', 'Simple lamp replacement schedule']],

  /* misc */
  [/blower/, ['Supplies diffused air to the aeration tank', 'Twin lobe design for steady low-pressure air', 'Dynamically balanced rotors for long bearing life', 'Supplied ready to install with standard accessories']],
  [/water atm|dispenser/, ['Card, coin and QR dispensing options', 'Flow sensor and solenoid valve on every tap', 'Suits community and society water points', 'Expandable — add taps as demand grows']],
  [/pool light|swimming pool/, ['Sealed for continuous underwater use', 'Low-voltage LED — safe and economical', 'Cool white, warm white and RGB options', 'Driver supplied to match the wattage']],
];
function featuresFor(category) {
  const c = String(category || '').toLowerCase();
  for (const [re, list] of FEATURE_RULES) if (re.test(c)) return list;
  return ['Genuine, tested product — no local duplicates', 'Supplied with a valid GST invoice', 'Pan-India dispatch with tracking', 'Technical support on selection and installation'];
}
/* FAQ — SEO ke liye sabse zyada faydemand (Google me accordion dikhta hai) */
function faqsFor(p, blurb) {
  const nm = p.n;
  const f = [
    [`What is the price of ${nm}?`, p.p > 0
      ? `The current price is ${rupee(p.p)} plus GST, ex-Faridabad. Freight is extra at actual. Prices can change with market rates, so please confirm on WhatsApp at 9899193589 before placing your order.`
      : `The price for this item is quoted on request as rates vary with specification and quantity. Send us the required size and quantity on WhatsApp at 9899193589 and our team will share a GST quotation the same working day.`],
    [`Is a GST invoice provided for ${nm}?`,
      `Yes. Every order is billed with a valid GST invoice under GSTIN 06DMUPS2289L1ZZ from Aqua Filtration System, Faridabad, so you can claim input credit where applicable.`],
    [`Do you deliver ${blurb.label} across India?`,
      `Yes. We dispatch pan-India through reputed courier and transport partners with tracking. Delivery time depends on your location and current stock — confirm on WhatsApp before ordering.`],
    [`How do I choose the right ${blurb.label.toLowerCase()} for my plant?`,
      `Share your water source, required capacity in LPH and the line or vessel size with our team. We will recommend the correct model, or you can use the free plant calculators on our website for a quick estimate.`]
  ];
  if (p.make) f.splice(1, 0, [`Is this a genuine ${p.make} product?`,
    `Yes. We supply only authentic ${p.make} products sourced through proper channels — no local duplicates or refurbished units.`]);
  return f;
}

/* ---------- duplicate-naam detector ----------
   Sheet me kai products ka naam bilkul ek jaisa hota hai (jaise "5/10 micron" 5 baar).
   Aise products ka slug bhi ek hi banta hai, isliye unke page ek doosre ko mita dete the.

   Alag page banana bhi theek nahi hoga — kyunki 5 page jinme sirf price ka farq hai,
   Google ke liye "thin/duplicate content" hain aur wo poore site ko neeche kheenchte hain.
   ("5/10 micron" jaise naam par koi search bhi nahi karta.)

   Isliye: aise products ka static page NAHI banta. Wo apni category page par dikhte hain,
   aur unka link wahin jaata hai. Sheet me naam unique karte hi page apne aap ban jayega.
*/
/* ---------------------------------------------------------------
   NAME_FIXES - straight typo corrections applied to the Sheet name
   before anything else. Key = exact name in the Sheet.
--------------------------------------------------------------- */
const NAME_FIXES = {
  'RO PLANNT 3000 LPH': 'RO PLANT 3000 LPH',
  'PP WITH BAG FLITER': 'PP WITH BAG FILTER',
  'EDOSE NEO PRO 10LPH PVDF WITH LEVEL SWITCH (10LPH at 4 kg/cm2)': 'EDOSE NEO PRO 10LPH PVDF WITH LEVEL SWITCH (10LPH at 4 kg/cm2)',
};

/* words that carry no meaning when building a disambiguating suffix */
const CAT_STOP = new Set(['and','the','for','with','of','systems','system','filters','filter',
  'cartridges','cartridge','valves','valve','vessels','vessel','pumps','pump','meters','meter',
  'instruments','instrument','products','product','plant','kits','kit','accessories','accessory',
  'engineering','initiative','zero','scale','type','types','o','r','u','f','p','c']);

function catToken(cat) {
  return String(cat || '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(w => w && !CAT_STOP.has(w.toLowerCase()))
    .slice(0, 3)
    .join(' ')
    .trim();
}

function specToken(spec) {
  const t = String(spec || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  /* prefer a volume / size / capacity looking fragment */
  const m = t.match(/\b\d[\d.,]*\s*(?:litre|liter|l\b|kg|mm|inch|"|lph|kld|m3|micron)\b[^,|]*/i);
  if (m) return m[0].trim().slice(0, 28);
  return t.split(/[|,\n]/)[0].trim().slice(0, 28);
}

function normName(n) { return String(n || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

/* ---------------------------------------------------------------
   autoUniqueNames
   The product NAME decides the URL slug, so names must be unique
   across the whole catalogue. Rather than asking the Sheet to be
   perfect, we disambiguate here:
     typo fix -> model -> category words -> spec fragment
   Anything still colliding after that is left excluded and listed
   in seo-rename-list.txt for a human to sort out.
--------------------------------------------------------------- */
function markDuplicateNames(P) {
  /* 0. typo corrections */
  P.forEach(p => {
    const fix = NAME_FIXES[String(p.n).trim()];
    if (fix && fix !== p.n) { p.nOrig = p.n; p.n = fix; }
  });

  /* catalogue table headings leak in as "[VESSEL MODEL]" etc.
     Drop them - but never if that would collide with a name that is
     already fine, and never if it leaves nothing to identify the row. */
  const existing = new Set(P.map(p => normName(p.n)));
  P.forEach(p => {
    const stripped = String(p.n).replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!stripped || stripped === p.n || stripped.length < 3) return;
    if (existing.has(normName(stripped))) return;      /* would clash - leave as is */
    if (!p.model && !p.spec) return;                   /* nothing left to re-identify it */
    if (!p.nOrig) p.nOrig = p.n;
    p.n = stripped;
  });

  const groupsOf = () => {
    const m = {};
    P.forEach(p => { const k = normName(p.n); (m[k] = m[k] || []).push(p); });
    return m;
  };

  /* --- helpers: keep only what actually differs inside a clashing group --- */
  const tok = v => String(v || '').split(/[\s\-_/]+/).filter(Boolean);
  function distinctive(values) {
    /* strip the tokens every value shares at the start and at the end */
    const lists = values.map(tok);
    if (lists.some(l => !l.length)) return values.map(v => String(v || '').trim());
    let head = 0;
    const minLen = Math.min(...lists.map(l => l.length));
    while (head < minLen - 1 &&
           lists.every(l => l[head].toLowerCase() === lists[0][head].toLowerCase())) head++;
    let tail = 0;
    while (tail < minLen - head - 1 &&
           lists.every(l => l[l.length - 1 - tail].toLowerCase() ===
                            lists[0][lists[0].length - 1 - tail].toLowerCase())) tail++;
    return lists.map(l => l.slice(head, l.length - tail).join(' ').trim().slice(0, 30));
  }

  /* 1..3 - progressively add a suffix, only inside groups that still clash */
  const steps = [
    rows => distinctive(rows.map(p => p.model || '')),
    rows => rows.map(p => catToken(p.c)),
    rows => distinctive(rows.map(p => specToken(p.spec) || '')),
  ];

  for (const pick of steps) {
    const g = groupsOf();
    Object.keys(g).forEach(k => {
      const rows = g[k];
      if (rows.length < 2) return;
      const suffixes = pick(rows);
      const distinctSet = new Set(suffixes.filter(Boolean).map(x => x.toLowerCase()));
      /* only useful if it actually separates the rows */
      if (distinctSet.size < 2) return;
      rows.forEach((p, i) => {
        const sfx = (suffixes[i] || '').trim();
        if (!sfx) return;
        if (normName(p.n).includes(normName(sfx))) return;
        p.nAuto = true;
        p.n = p.n.trim() + ' ' + sfx;
      });
    });
  }

  /* whatever still collides is excluded, as before */
  const dupGroups = [];
  const g = groupsOf();
  Object.keys(g).forEach(k => {
    if (g[k].length > 1) {
      g[k].forEach(p => { p.dupName = true; });
      dupGroups.push(g[k]);
    }
  });

  const renamed = P.filter(p => p.nAuto).length;
  const fixed = P.filter(p => p.nOrig).length;
  if (fixed) console.log('name typos fixed: ' + fixed);
  if (renamed) console.log('names auto-disambiguated: ' + renamed);
  return dupGroups;
}

/* ---------- individual product page ---------- */
function productPage(p, related, blurb) {
  const catSlug = slug(p.c);
  const off = p.mrp && p.mrp > p.p ? Math.round((p.mrp - p.p) * 100 / p.mrp) : 0;
  const priceBlock = p.p > 0
    ? `<div class="pp-price">${off ? `<span class="old">${rupee(p.mrp)}</span>` : ''}${rupee(p.p)}<small> + GST</small>${off ? `<span class="off">${off}% OFF</span>` : ''}</div>`
    : `<div class="pp-price" style="color:#565959;font-size:16px">Price on request — ask on WhatsApp</div>`;
  const wa = `https://wa.me/919899193589?text=${encodeURIComponent('Hi WTPESTORE, I want a quotation for: ' + p.n + (p.model ? ' (Model ' + p.model + ')' : '') + '. Please share best price.')}`;
  const imgBlock = p.img
    ? `<img class="pp-img" src="${esc(p.img)}" alt="${esc(p.n)}" loading="lazy">`
    : `<div class="pp-imgph"><span>${esc(blurb.label)}</span></div>`;

  const specRows = [];
  const autoModel = p.model || extractModel(p.n);
  if (p.make) specRows.push(['Brand', p.make]);
  if (autoModel) specRows.push(['Model', autoModel]);
  if (p.c) specRows.push(['Category', titleCaseCat(p.c)]);
  /* Sheet ki Specification ko rows me todo; na ho to naam ke bracket se nikaalo */
  const parsed = specRowsFromSpec(p.spec);
  if (parsed.length) parsed.forEach(r => specRows.push(r));
  else if (p.spec) specRows.push(['Specification', p.spec]);
  else specFromName(p.n).forEach(r => specRows.push(r));
  specRows.push(['Price basis', p.p > 0 ? `${rupee(p.p)} + GST, ex-Faridabad` : 'On request']);
  specRows.push(['Supplied by', 'Aqua Filtration System, Faridabad · GSTIN 06DMUPS2289L1ZZ']);
  const specTable = `<h2>Specifications</h2><table class="pp-spec"><tbody>${specRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;

  const feats = featuresFor(p.c);
  const featBlock = `<h2>Key features</h2><ul class="pp-feat">${feats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`;

  const faqs = faqsFor(p, blurb);
  const faqBlock = `<h2>Frequently asked questions</h2><div class="pp-faq">${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;

  const pageUrl = SITE + '/products/' + p.slug + '.html';
  const shareBlock = `<div class="pp-share"><span class="lbl">Share this product:</span>
<a class="sh wa" href="https://wa.me/?text=${encodeURIComponent(p.n + ' — ' + pageUrl)}" target="_blank" rel="noopener nofollow">WhatsApp</a>
<a class="sh fb" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener nofollow">Facebook</a>
<button class="sh cp" onclick="ppCopy(this)" data-u="${esc(pageUrl)}">Copy link</button></div>`;

  const pdfLink = p.pdf && /^https?:\/\//i.test(p.pdf)
    ? `<p><a class="pp-pdf" href="${esc(p.pdf)}" target="_blank" rel="noopener">Download catalogue (PDF)</a></p>` : '';

  /* --- category-specific content: applications, compatibility, selection, guides --- */
  const G = guideFor(p.c);
  const introBlock = `<p class="pp-intro">${esc(productIntro(p, G))}</p>`;
  const appsBlock = (G && G.apps && G.apps.length)
    ? `<h2>Applications</h2><ul class="pfeat">${G.apps.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '';
  const selBlock = (G && (G.select || G.compat))
    ? `<h2>How to choose</h2>${G.select ? `<p>${esc(G.select)}</p>` : ''}${G.compat ? `<p><b>Compatibility:</b> ${esc(G.compat)}</p>` : ''}` : '';
  const guideBlock = (G && G.guides && G.guides.length)
    ? `<h2>Related guides</h2><ul class="pfeat">${G.guides.map(function (x) {
        return `<li><a href="/blog/${x[0]}.html">${esc(x[1])}</a></li>`;
      }).join('')}</ul>` : '';

  const relBlock = related.length
    ? `<h2>Related ${esc(blurb.label)}</h2><div class="pgrid">${related.map(card).join('')}</div>` : '';

  const body = `<nav class="bc"><a href="/">Home</a> › <a href="/products.html#${catSlug}">${esc(titleCaseCat(p.c))}</a> › ${esc(p.n)}</nav>
<div class="pp-top">
  ${imgBlock}
  <div class="pp-info">
    <h1>${esc(p.n)}</h1>
    ${autoModel ? `<span class="pp-model">Model: ${esc(autoModel)}</span>` : ''}
    ${priceBlock}
    <p class="pp-avail">In stock — dispatched pan-India · GST invoice · Reply within 2 working hours</p>
    <div class="pp-cta"><a class="b wa" href="${wa}" rel="nofollow">💬 Get Quotation on WhatsApp</a><a class="b vw" href="tel:+919910646957">📞 Call 9910646957</a></div>
    ${shareBlock}
    ${introBlock}
  </div>
</div>
${specTable}
${featBlock}
${appsBlock}
${selBlock}
<section class="pp-about"><h2>About ${esc(blurb.label)}</h2><p>${esc(blurb.text)}</p>
<p>This ${esc(p.n)} is supplied by <b>WTPESTORE — powered by Aqua Filtration System</b>, a water-treatment manufacturer, trader and supplier operating from Faridabad, Haryana since 2017. Every unit is genuine, billed with a GST invoice and dispatched pan-India with tracking. For dosage, sizing or compatibility questions, message our team on WhatsApp and we will help you pick the right model for your plant.</p>
${pdfLink}</section>
${faqBlock}
${guideBlock}
${relBlock}
<p style="margin-top:18px"><a href="/products.html#${catSlug}">← View all ${esc(titleCaseCat(p.c))} products</a></p>`;

  const ldProduct = {
    "@context": "https://schema.org", "@type": "Product", "name": p.n,
    ...(p.img ? { "image": [p.img] } : {}),
    ...(p.make ? { "brand": { "@type": "Brand", "name": p.make } } : {}),
    ...(autoModel ? { "model": autoModel, "sku": autoModel } : {}),
    "category": p.c,
    "description": (p.spec || blurb.text).slice(0, 300),
    "url": pageUrl,
    ...(p.p > 0 ? {
      "offers": {
        "@type": "Offer", "price": p.p, "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": PRICE_VALID_UNTIL,
        "url": pageUrl,
        "seller": { "@type": "Organization", "name": "Aqua Filtration System" }
      }
    } : {})
  };
  const ldBreadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/" },
      { "@type": "ListItem", "position": 2, "name": titleCaseCat(p.c), "item": SITE + "/products.html#" + catSlug },
      { "@type": "ListItem", "position": 3, "name": p.n, "item": pageUrl }
    ]
  };
  const ldFaq = {
    "@context": "https://schema.org", "@type": "FAQPage",
    "mainEntity": faqs.map(([q, a]) => ({
      "@type": "Question", "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a }
    }))
  };

  const extraLd = `<script type="application/ld+json">${JSON.stringify(ldProduct)}</script>
<script type="application/ld+json">${JSON.stringify(ldBreadcrumb)}</script>
<script type="application/ld+json">${JSON.stringify(ldFaq)}</script>
<style>
.pp-top{display:flex;gap:20px;flex-wrap:wrap;margin:14px 0}
.pp-img{width:260px;height:260px;object-fit:contain;background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px}
.pp-imgph{width:260px;height:260px;background:linear-gradient(135deg,#eef4f6,#dce8ec);border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;color:#0B2A4A;font-weight:700;font-size:14px;padding:14px}
.pp-info{flex:1;min-width:240px}
.pp-model{display:inline-block;font-size:12px;font-weight:800;color:#8a5a00;background:#fff6e6;border:1px solid #ffe0a3;border-radius:6px;padding:3px 9px;margin-bottom:8px}
.pp-price{font-size:26px;font-weight:800;color:var(--green);margin:8px 0}
.pp-price small{font-size:13px;color:#565959;font-weight:500}
.pp-price .old{color:#8a94a6;text-decoration:line-through;font-size:15px;font-weight:600;margin-right:6px}
.pp-price .off{background:#e7f7ee;color:#0e7a3d;border:1px solid #bfe6cf;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:800;margin-left:6px}
.pp-avail{font-size:12.5px;color:#0e7a3d;font-weight:600;margin:2px 0 4px}
.pp-intro{font-size:15px;line-height:1.65;color:#333;margin:14px 0 4px;max-width:70ch}
.pp-cta{display:flex;gap:9px;margin-top:12px;flex-wrap:wrap}
.pp-cta a.b{text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 16px;border-radius:9px}
.pp-cta a.wa{background:#25d366;color:#fff}
.pp-cta a.vw{background:var(--navy);color:#fff}
.pp-share{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px dashed #dfe6ec}
.pp-share .lbl{font-size:12.5px;color:#64737f;font-weight:600}
.pp-share .sh{font-size:12.5px;font-weight:700;padding:7px 13px;border-radius:8px;text-decoration:none;border:1px solid var(--border);background:#fff;color:#0B2A4A;cursor:pointer;font-family:inherit}
.pp-share .sh.wa{background:#25d366;color:#fff;border-color:#25d366}
.pp-share .sh.fb{background:#1877f2;color:#fff;border-color:#1877f2}
.pp-share .sh:hover{opacity:.9}
.pp-spec{width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:13.5px;border:1px solid var(--border);border-radius:10px;overflow:hidden}
.pp-spec td{padding:9px 12px;border-bottom:1px solid #eef1f4;vertical-align:top}
.pp-spec tr:nth-child(odd){background:#f8fafc}
.pp-spec td:first-child{width:32%;font-weight:700;color:#0b2545}
.pp-feat{margin:8px 0 18px;padding-left:20px}
.pp-feat li{font-size:13.5px;color:#3f4f5b;margin:6px 0;line-height:1.6}
.pp-about p{font-size:13.5px;color:#444;margin-bottom:8px}
.pp-pdf{display:inline-block;margin-top:6px;font-size:13px;font-weight:700;color:#0B2A4A;background:#eef4f8;border:1px solid #d9e5ee;padding:9px 14px;border-radius:9px;text-decoration:none}
.pp-faq details{background:#fff;border:1px solid var(--border);border-radius:11px;padding:12px 16px;margin-bottom:9px}
.pp-faq summary{font-weight:700;color:#0B2A4A;cursor:pointer;font-size:14px}
.pp-faq p{margin-top:9px;color:#51606e;font-size:13.5px;line-height:1.7}
@media(max-width:560px){.pp-img,.pp-imgph{width:100%;height:220px}}
</style>
<script>
function ppCopy(b){var u=b.getAttribute('data-u');var done=function(){var o=b.textContent;b.textContent='Copied!';setTimeout(function(){b.textContent=o;},1600);};
if(navigator.clipboard){navigator.clipboard.writeText(u).then(done).catch(function(){prompt('Copy this link:',u);});}
else{var i=document.createElement('input');i.value=u;document.body.appendChild(i);i.select();try{document.execCommand('copy');done();}catch(e){prompt('Copy this link:',u);}document.body.removeChild(i);}}
</script>`;

  return shell(
    `${shortTitle(p.n, 52)}${p.model && p.n.toUpperCase().indexOf(p.model.toUpperCase()) === -1 ? ' - ' + p.model : ''} | WTPESTORE`,
    `${p.n}${p.spec ? ' — ' + p.spec.slice(0, 120) : ''}. Genuine product, GST invoice, best price. WTPESTORE — powered by Aqua Filtration System, Faridabad.`,
    SITE + '/products/' + p.slug + '.html',
    body, extraLd
  );
}

/* Sabhi quality products ke liye /products/<slug>.html banao.
   Purani/hata di gayi product ki file bhi apne aap saaf ho jaati hai (dir clear karke dobara banate hain). */
function buildProductPages(qualityList) {
  fs.rmSync(PRODUCTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });

  const byCat = {};
  qualityList.forEach(p => { (byCat[p.c] = byCat[p.c] || []).push(p); });

  let n = 0;
  for (const p of qualityList) {
    const blurb = catBlurb(p.c);
    const related = (byCat[p.c] || []).filter(x => x.slug !== p.slug).slice(0, 6);
    const html = productPage(p, related, blurb);
    fs.writeFileSync(path.join(PRODUCTS_DIR, p.slug + '.html'), html);
    STATIC_SLUGS.add(p.slug);
    n++;
  }
  return n;
}

/* ---- Blog pages me live price table bharo ----
   Blog HTML me marker lagao:
     <!--WTPE_PRICES:ASTER ROTAMETERS-->  ...purana table...  <!--WTPE_PRICES_END-->
   Har build par table Sheet ke live data se dobara ban jaata hai —
   yaani blog ka price kabhi purana nahi rehta.
*/
function injectBlogPrices(P) {
  let files = [];
  try { files = fs.readdirSync('blog').filter(f => f.endsWith('.html')).map(f => 'blog/' + f); }
  catch (e) { return; }
  let count = 0;
  for (const f of files) {
    let html;
    try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    if (html.indexOf('<!--WTPE_PRICES:') < 0) continue;

    const out = html.replace(/<!--WTPE_PRICES:([^>]+)-->[\s\S]*?<!--WTPE_PRICES_END-->/g, (m, catRaw) => {
      const want = String(catRaw).trim().toUpperCase();
      const items = P.filter(p => String(p.c).trim().toUpperCase() === want && p.p > 0);
      if (!items.length) return m;   /* category na mile to purana hi rehne do */

      /* flow range aur NB naam se nikaal lete hain (Sheet me alag column nahi hai) */
      const rows = items.map(p => {
        const model = (p.n.match(/ROTAMETER\s+(\S+)/i) || [])[1] || p.model || extractModel(p.n) || '—';
        const rg = p.n.match(/FLOW RANGE\s+([\d,]+)\s*TO\s*([\d,]+)\s*LPH/i);
        const nb = p.n.match(/I\/O\s*(\d+\s?NB)/i);
        const link = STATIC_SLUGS.has(p.slug) ? `/products/${p.slug}.html` : `/?p=${p.slugOrig || p.slug}`;
        return `<tr><td><b>${esc(model)}</b></td><td>${rg ? esc(rg[1] + ' – ' + rg[2]) : '—'}</td><td>${nb ? esc(nb[1].replace(/\s+/g, '')) : '—'}</td><td>${rupee(p.p)}</td><td><a href="${link}">Dekhein</a></td></tr>`;
      }).join('\n');

      return `<!--WTPE_PRICES:${catRaw}-->
<table>
<thead><tr><th>Model</th><th>Flow range (LPH)</th><th>I/O size</th><th>Price</th><th>Page</th></tr></thead>
<tbody>
${rows}
</tbody></table>
<p style="font-size:12.5px;color:#8b9aa5;margin-top:-8px">Live price list se — last updated ${new Date().toISOString().slice(0, 10)}. GST extra, confirm before order.</p>
<!--WTPE_PRICES_END-->`;
    });

    if (out !== html) { fs.writeFileSync(f, out); count++; }
  }
  console.log('Blog price tables refreshed in', count, 'file(s)');
}

/* ---------- build ---------- */

/* ---- Category pages me static product list bharo (Google ke liye) ---- */
function injectStatic(P) {
  const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
  let count = 0;
  for (const f of files) {
    let html;
    try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    if (html.indexOf('<!--WTPE_STATIC_START-->') < 0) continue;
    const cm = html.match(/var CATS\s*=\s*\[([^\]]*)\]/);
    if (!cm) continue;
    const cats = (cm[1].match(/"([^"]+)"/g) || []).map(x => x.slice(1, -1).trim().toUpperCase());
    if (!cats.length) continue;

    const items = P.filter(p => cats.indexOf(String(p.c).trim().toUpperCase()) > -1);
    if (!items.length) continue;
    const top = items.slice(0, 12);

    const rows = top.map(p => {
      const price = p.p > 0 ? (rupee(p.p) + ' + GST') : 'Price on request';
      const bits = [];
      if (p.model) bits.push('Model: ' + esc(p.model));
      if (p.make) bits.push('Brand: ' + esc(p.make));
      if (p.spec) bits.push(esc(p.spec.slice(0, 140)));
      return '<li><b>' + esc(p.n) + '</b>' +
        (bits.length ? ' &mdash; <span>' + bits.join(' &middot; ') + '</span>' : '') +
        ' &mdash; <b>' + price + '</b></li>';
    }).join('\n');

    const block = '<!--WTPE_STATIC_START-->\n' +
      '<section class="statlist"><h2>Available Models &amp; Price List</h2>\n' +
      '<p class="ssub">Live prices from our current price list. Click any product above for full specification, or ask us on WhatsApp.</p>\n' +
      '<ul>\n' + rows + '\n</ul>\n' +
      '<p class="snote">Showing ' + top.length + ' of ' + items.length +
      ' products in this category. Prices exclusive of GST and subject to change &mdash; confirm before order.</p>' +
      '</section>\n<!--WTPE_STATIC_END-->';

    let out = html.replace(/<!--WTPE_STATIC_START-->[\s\S]*?<!--WTPE_STATIC_END-->/, block);
    if (out !== html) {
      if (out.indexOf('.statlist{') < 0) {
        const css = '.statlist{background:#fff;border:1px solid #e3ecf4;border-radius:14px;padding:18px;margin:20px 0}' +
          '.statlist h2{font-size:18px;color:var(--navy);margin:0 0 4px;border:none;padding:0}' +
          '.statlist .ssub{font-size:13px;color:#6b7a88;margin:0 0 12px}' +
          '.statlist ul{margin:0;padding-left:18px}' +
          '.statlist li{font-size:13.5px;line-height:1.7;margin-bottom:7px;color:#333}' +
          '.statlist li b{color:var(--navy)}' +
          '.statlist li span{color:#666;font-size:12.5px}' +
          '.statlist .snote{font-size:12px;color:#8a94a6;margin:12px 0 0}\n';
        const k = out.lastIndexOf('</style>');
        if (k > 0) out = out.slice(0, k) + css + out.slice(k);
      }
      fs.writeFileSync(f, out);
      count++;
    }
  }
  console.log('Static blocks injected into', count, 'category pages');
}

(async () => {
  const P = await load();
  console.log('Products loaded:', P.length);

  /* page-change dates from the previous build (read BEFORE products/ is wiped) */
  const LASTMOD_PREV = readLastmodState();

  /* every product remembers the slug of its ORIGINAL Sheet name -
     that is what old /?p= links and index.html use */
  P.forEach(p => { p.slugOrig = p.slug; });

  /* ---- duplicate naam pakdo (inka static page nahi banega) ---- */
  const dupGroups = markDuplicateNames(P);

  /* names may have been corrected / disambiguated above - the URL must
     follow the FINAL name, otherwise two products land on one page */
  P.forEach(p => { p.slug = slug(p.n); });

  /* last line of defence: one URL = one product. If two products still
     end up on the same slug (80-char cut), only the first gets the page. */
  {
    const seen = new Map(); let clash = 0;
    P.forEach(p => {
      if (!isQualityProduct(p)) return;
      if (seen.has(p.slug)) { p.dupName = true; clash++; }
      else seen.set(p.slug, p);
    });
    if (clash) console.log('slug clashes excluded: ' + clash);
  }
  const dupCount = dupGroups.reduce((a, g) => a + g.length, 0);
  if (dupCount) {
    let rep = 'SHEET ME YE NAAM SUDHARNE HAIN\n';
    rep += '='.repeat(60) + '\n\n';
    rep += `${dupCount} products ka naam doosre products se bilkul milta hai.\n`;
    rep += `Isliye inka alag page NAHI banaya gaya — ye category page par dikhte hain.\n\n`;
    rep += `Naam unique karte hi page apne aap ban jayega. Kuch aur karne ki zaroorat nahi.\n\n`;
    rep += `TIP: naam aisa rakhein jaise customer Google par khojta hai —\n`;
    rep += `     "5/10 micron" ki jagah "PP Spun Cartridge Filter 10 inch 5 Micron"\n\n`;
    rep += '='.repeat(60) + '\n';
    dupGroups
      .sort((a, b) => b.length - a.length)
      .forEach(g => {
        rep += `\n"${g[0].n}"  — ${g.length} products ka yahi naam hai:\n`;
        g.forEach(p => { rep += `    ${p.c}  |  ${p.p > 0 ? rupee(p.p) : 'price nahi'}\n`; });
      });
    fs.writeFileSync('seo-rename-list.txt', rep);
    console.log('⚠ ' + dupCount + ' products ke naam duplicate hain — seo-rename-list.txt dekhein');
  } else {
    try { fs.unlinkSync('seo-rename-list.txt'); } catch (e) { }
  }

  /* ---- individual SEO product pages (naye) ---- */
  const QP = P.filter(isQualityProduct);
  const skipped = P.length - QP.length;
  const madeCount = buildProductPages(QP);
  console.log('Product pages built:', madeCount, '(skipped as thin/junk:', skipped, ')');
  writeOldSharedSlugPages(P);
  writeStaticMapIntoIndex(P);

  const cats = {};
  P.forEach(p => { (cats[p.c] = cats[p.c] || []).push(p); });
  const catNames = Object.keys(cats).sort((a, b) => cats[b].length - cats[a].length);
  console.log('Categories:', catNames.length);

  /* ---- products.html (sab kuch ek jagah, Google ke liye) ---- */
  const toc = `<div class="toc"><b style="font-size:13px;color:#565959">Jump to category:</b><br>` +
    catNames.map(c => `<a href="#${slug(c)}">${esc(titleCaseCat(c))} (${cats[c].length})</a>`).join('') + `</div>`;

  const body = `<nav class="bc"><a href="/">Home</a> › All Products</nav>
<h1>All Water Treatment Products &amp; Spares — Price List</h1>
<p class="lede">Complete list of <b>${P.length}+ water treatment products</b> across <b>${catNames.length} categories</b> — RO plants, water softeners, RO membranes, dosing pumps, FRP vessels, flow meters, instruments, cartridge filters and spares. Genuine branded products with GST invoice, supplied by <b>Aqua Filtration System, Faridabad</b> across Delhi NCR and India. Prices are exclusive of GST and updated regularly.</p>
${toc}
${catNames.map(c => `<section><h2 id="${slug(c)}">${esc(titleCaseCat(c))} <span style="font-size:13px;color:#777;font-weight:500">(${cats[c].length} products)</span></h2>
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
        "url": STATIC_SLUGS.has(p.slug) ? (SITE + "/products/" + p.slug + ".html") : (SITE + "/?p=" + (p.slugOrig || p.slug)),
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
  /* blog filenames — used to purge stale ROOT-level copies from an old sitemap */
  const BLOG_FILES = new Set(BLOG_PAGES.filter(u => u.startsWith('/blog/')).map(u => u.split('/').pop()));
  const staticUrls = (sm.match(/<loc>[^<]*<\/loc>/g) || []).map(x => x.replace(/<\/?loc>/g, ''))
    .filter(u => !/\?p=/.test(u) && !/\/products\//.test(u))
    /* drop /slug.html when the real page is /blog/slug.html  */
    .filter(u => {
      const path = u.replace(SITE, '');
      const file = path.split('/').pop();
      const atRoot = /^\/[^/]+\.html$/.test(path);
      if (atRoot && BLOG_FILES.has(file)) {
        console.log('  purged stale root URL: ' + path);
        return false;
      }
      return true;
    });
  const all = new Set(staticUrls);
  all.add(SITE + '/products.html');
  CHEM_PAGES.forEach(u => all.add(SITE + u));
  BLOG_PAGES.forEach(u => all.add(SITE + u));
  const today = new Date().toISOString().slice(0, 10);

  /* lastmod: keep the previous date unless the page content changed */
  const lastmodNext = {};
  const lastmodFor = (u, file) => {
    const h = file ? contentHash(file) : null;
    const prev = LASTMOD_PREV[u];
    const d = (prev && h && prev.h === h) ? prev.d : today;
    lastmodNext[u] = { h: h, d: d };
    return d;
  };

  const seenUrl = new Set();
  let dropped = 0;
  const urls = [];
  [...all].forEach(u => {
    const file = urlToFile(u);
    if (!file || seenUrl.has(u)) { dropped++; return; }   /* no 404s, no folders, no repeats */
    seenUrl.add(u);
    urls.push(`<url><loc>${u}</loc><lastmod>${lastmodFor(u, file)}</lastmod><priority>${u.endsWith('.co.in/') ? '1.0' : '0.8'}</priority></url>`);
  });
  QP.forEach(p => {
    const u = SITE + '/products/' + p.slug + '.html';
    if (seenUrl.has(u)) { dropped++; return; }
    seenUrl.add(u);
    const img = p.img ? `<image:image><image:loc>${esc(p.img)}</image:loc></image:image>` : '';
    urls.push(`<url><loc>${u}</loc><lastmod>${lastmodFor(u, path.join(PRODUCTS_DIR, p.slug + '.html'))}</lastmod><priority>0.6</priority>${img}</url>`);
  });
  if (dropped) console.log('sitemap: skipped ' + dropped + ' url(s) - missing file, folder or repeat');
  fs.writeFileSync(LASTMOD_FILE, JSON.stringify(lastmodNext));
  fs.writeFileSync('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);
  console.log('sitemap.xml ✓ (' + urls.length + ' URLs)');

  /* ---- robots.txt ----
     A hand-written robots.txt may already exist and be better than
     anything generated here, so NEVER overwrite it. We only:
       - create one if the file is missing
       - add the Sitemap: line if it is absent
  --------------------------------------------------------------- */
  const SITEMAP_LINE = 'Sitemap: ' + SITE + '/sitemap.xml';
  let existingRobots = null;
  try { existingRobots = fs.readFileSync('robots.txt', 'utf8'); } catch (e) { }

  if (existingRobots === null) {
    const robots = [
      '# WTPESTORE - powered by Aqua Filtration System',
      '',
      'User-agent: *',
      'Allow: /',
      '',
      '# Admin and billing pages - should not appear in Google',
      'Disallow: /admin.html',
      'Disallow: /admin-add-product.html',
      'Disallow: /admin-add-blog.html',
      'Disallow: /admin-change-pin.html',
      'Disallow: /admin-settings.html',
      'Disallow: /admin-quick-quote.html',
      'Disallow: /admin-seo-pages.html',
      'Disallow: /admin-leads.html',
      'Disallow: /admin-panel.html',
      'Disallow: /quotation.html',
      'Disallow: /proforma-invoice.html',
      'Disallow: /payment.html',
      '',
      '# Google Sheet / data URLs',
      'Disallow: /pub',
      'Disallow: /pubhtml',
      'Disallow: /groq',
      'Disallow: /*?output=csv',
      '',
      SITEMAP_LINE,
      ''
    ].join('\n');
    fs.writeFileSync('robots.txt', robots);
    console.log('robots.txt ✓ (created)');
  } else if (!/^\s*Sitemap:/mi.test(existingRobots)) {
    fs.writeFileSync('robots.txt', existingRobots.replace(/\s*$/, '') + '\n\n' + SITEMAP_LINE + '\n');
    console.log('robots.txt ✓ (kept yours, added Sitemap line)');
  } else {
    console.log('robots.txt ✓ (kept as-is, not overwritten)');
  }

  /* ---- redirect pages for renamed products ---- */
  const redirKeys = Object.keys(REDIRECTS);
  if (redirKeys.length) {
    let made = 0;
    for (const oldSlug of redirKeys) {
      const newSlug = REDIRECTS[oldSlug];
      if (!STATIC_SLUGS.has(newSlug)) {
        console.log('  ! redirect target missing, skipped: ' + newSlug);
        continue;
      }
      const target = SITE + '/products/' + newSlug + '.html';
      const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="robots" content="noindex,follow">' +
        '<link rel="canonical" href="' + target + '">' +
        '<meta http-equiv="refresh" content="0; url=' + target + '">' +
        '<title>Moved</title></head><body>' +
        '<p>This page has moved to <a href="' + target + '">' + target + '</a>.</p>' +
        '<script>location.replace(' + JSON.stringify(target) + ');<\/script>' +
        '</body></html>';
      fs.writeFileSync('products/' + oldSlug + '.html', html);
      made++;
    }
    console.log('redirects ✓ (' + made + ')');
  }

  injectStatic(P);
  injectBlogPrices(P);

  /* ---- summary for the action log ---- */
  fs.writeFileSync('seo-build-log.txt',
    `Last build: ${new Date().toISOString()}\nProducts: ${P.length}\nCategories: ${catNames.length}\nProduct pages built: ${madeCount}\nSkipped (thin/junk/duplicate-name): ${skipped}\nDuplicate names to fix in Sheet: ${dupCount}\nSitemap URLs: ${urls.length}\n`);
})().catch(e => { console.error('BUILD FAIL:', e.message); process.exit(1); });
