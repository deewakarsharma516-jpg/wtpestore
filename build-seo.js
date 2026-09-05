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

function card(p) {
  const off = p.mrp && p.mrp > p.p ? Math.round((p.mrp - p.p) * 100 / p.mrp) : 0;
  const price = p.p > 0
    ? `<div class="pr">${off ? `<span class="old">${rupee(p.mrp)}</span>` : ''}${rupee(p.p)}<small> +GST</small>${off ? `<span class="off">${off}% OFF</span>` : ''}</div>`
    : `<div class="pr" style="color:#565959;font-size:15px">Price on request</div>`;
  const wa = `https://wa.me/919899193589?text=${encodeURIComponent('Hi WTPESTORE, I want a quotation for: ' + p.n + (p.model ? ' (Model ' + p.model + ')' : '') + '. Please share best price.')}`;
  const viewHref = STATIC_SLUGS.has(p.slug) ? `/products/${p.slug}.html` : `/?p=${p.slug}`;
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
const FEATURE_RULES = [
  [/rotameter|flow ?meter|electromagnetic/, ['Direct in-line flow reading — no power needed on basic rotameters', 'Corrosion-resistant body suited to treated and raw water lines', 'Helps you spot fouling or leakage before it damages the plant', 'Standard NB end connections for easy retrofit']],
  [/dosing|edose|metering pump/, ['Adjustable stroke for precise chemical dosing', 'Chemical-resistant wetted parts (PP / PVDF options)', 'Protects membranes from scale and biofouling', 'Suitable for antiscalant, chlorine and pH correction']],
  [/frp|vessel/, ['Corrosion-free FRP construction — no rusting like MS tanks', 'Rated for continuous working pressure', 'Fits standard top or side-mount multiport valves', 'Long service life with minimal maintenance']],
  [/u\.?v\.?|purif/, ['Chemical-free disinfection — no taste or odour change', 'Effective against bacteria and viruses', 'Low power consumption, continuous operation', 'Simple lamp replacement schedule']],
  [/membrane/, ['High salt rejection for consistent permeate quality', 'Standard element size — fits existing housings', 'Long life when antiscalant dosing is maintained', 'Genuine sourcing with brand warranty']],
  [/cartridge|filter/, ['Protects RO membranes and pumps from sediment', 'Available in multiple micron ratings', 'Standard length — fits common housings', 'Economical, easy scheduled replacement']],
  [/multiport|mpv|valve/, ['Single-handle control of service, backwash and rinse', 'Available in filter and softener configurations', 'Top and side-mount options for different vessels', 'Durable body rated for plant working pressure']],
  [/controller|astero|instrument|switch|gauge/, ['Automatic pump protection against dry run', 'Clear display for quick operator checks', 'Reduces manual supervision and downtime', 'Panel-mount design for standard enclosures']],
  [/soft[ei]n/, ['Removes calcium and magnesium hardness', 'Stops scale in pipes, geysers and boilers', 'Automatic or manual regeneration options', 'Extends the life of downstream equipment']],
  [/chemical|antiscalant|resin|carbon/, ['Formulated for Indian feed-water conditions', 'Protects membranes and equipment from scale and fouling', 'Economical dosing rates', 'Technical dosage support from our team']]
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
  </div>
</div>
${specTable}
${featBlock}
<section class="pp-about"><h2>About ${esc(blurb.label)}</h2><p>${esc(blurb.text)}</p>
<p>This ${esc(p.n)} is supplied by <b>WTPESTORE — powered by Aqua Filtration System</b>, a water-treatment manufacturer, trader and supplier operating from Faridabad, Haryana since 2017. Every unit is genuine, billed with a GST invoice and dispatched pan-India with tracking. For dosage, sizing or compatibility questions, message our team on WhatsApp and we will help you pick the right model for your plant.</p>
${pdfLink}</section>
${faqBlock}
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

  /* ---- individual SEO product pages (naye) ---- */
  const QP = P.filter(isQualityProduct);
  const skipped = P.length - QP.length;
  const madeCount = buildProductPages(QP);
  console.log('Product pages built:', madeCount, '(skipped as thin/junk:', skipped, ')');

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
        "url": STATIC_SLUGS.has(p.slug) ? (SITE + "/products/" + p.slug + ".html") : (SITE + "/?p=" + p.slug),
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
    .filter(u => !/\?p=/.test(u) && !/\/products\//.test(u));
  const all = new Set(staticUrls);
  all.add(SITE + '/products.html');
  CHEM_PAGES.forEach(u => all.add(SITE + u));
  const today = new Date().toISOString().slice(0, 10);
  const urls = [...all].map(u => `<url><loc>${u}</loc><lastmod>${today}</lastmod><priority>${u.endsWith('.co.in/') ? '1.0' : '0.8'}</priority></url>`)
    .concat(QP.map(p => {
      const img = p.img ? `<image:image><image:loc>${esc(p.img)}</image:loc></image:image>` : '';
      return `<url><loc>${SITE}/products/${p.slug}.html</loc><lastmod>${today}</lastmod><priority>0.6</priority>${img}</url>`;
    }));
  fs.writeFileSync('sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`);
  console.log('sitemap.xml ✓ (' + urls.length + ' URLs)');

  injectStatic(P);

  /* ---- summary for the action log ---- */
  fs.writeFileSync('seo-build-log.txt',
    `Last build: ${new Date().toISOString()}\nProducts: ${P.length}\nCategories: ${catNames.length}\nProduct pages built: ${madeCount}\nSkipped (thin/junk): ${skipped}\nSitemap URLs: ${urls.length}\n`);
})().catch(e => { console.error('BUILD FAIL:', e.message); process.exit(1); });
