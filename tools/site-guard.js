/* =============================================================
   WTPESTORE Site Guard — website ki jaanch (sirf padhta hai, kuch nahi badalta)
   GitHub Action isse har ghante + har upload ke baad chalata hai.
   Koi problem mili -> exit code 1 -> GitHub aapko email bhejta hai.
   Usage: node tools/site-guard.js            (poori jaanch)
          node tools/site-guard.js --local    (sirf files, live site nahi)
   ============================================================= */
const fs = require('fs'), path = require('path'), vm = require('vm'), https = require('https');

const SITE = 'https://www.wtpestore.co.in';
const SHEET = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSwvqzlRLqyMtcXio41rcwR4jZK0aHASM0uApcARGUC-qvIn9Zvk6ywVUfSUVbO3OsjGbvzFgrikg-/pub?gid=170402937&single=true&output=csv';
/* Website par sirf in jagah se script / iframe aana theek hai. Naya service jodna ho to yahan naam daalein. */
const ALLOWED = ['www.wtpestore.co.in', 'wtpestore.co.in', 'cdnjs.cloudflare.com', 'www.googletagmanager.com', 'checkout.razorpay.com',
  'cdn.jsdelivr.net', 'unpkg.com', 'maps.google.com', 'www.google.com', 'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'translate.google.com'];
/* Ye files hamesha honi chahiye (aur kam se kam itne bytes ki) */
const REQUIRED = { 'index.html': 50000, 'cart.js': 3000, 'sw.js': 500, 'sitemap.xml': 5000, 'robots.txt': 50, 'products.html': 20000,
  'payment.html': 5000, 'build-seo.js': 20000, 'CNAME': 5, 'llms.txt': 500, 'manifest.json': 100, '.github/workflows/seo-update.yml': 200 };
/* Hack / virus wale nishaan */
const BAD = [
  [/eval\s*\(\s*(atob|unescape|String\.fromCharCode)\s*\(/i, 'chhupa hua (encoded) code chalaya ja raha hai'],
  [/document\.write\s*\(\s*unescape\s*\(/i, 'encoded document.write'],
  [/coinhive|cryptonight|coin-hive|webminer|cryptoloot/i, 'crypto-mining script'],
  [/<iframe[^>]+(width|height)\s*=\s*["']?0["'\s>]/i, 'chhupa hua iframe'],
  [/window\.location(\.href)?\s*=\s*["']https?:\/\/(?!www\.wtpestore\.co\.in|wtpestore\.co\.in|wa\.me|api\.whatsapp)/i, 'site ko kisi bahar ki site par bhejne wala code']
];

const problems = [], notes = [];
const bad = (m) => problems.push(m), ok = (m) => notes.push(m);

function walk(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    if (f === '.git' || f === 'node_modules') continue;
    const p = path.join(dir, f), st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p.replace(/^\.\//, ''));
  }
  return out;
}

/* 1) Zaroori files */
for (const [f, min] of Object.entries(REQUIRED)) {
  if (!fs.existsSync(f)) bad(`File GAYAB hai: ${f}`);
  else if (fs.statSync(f).size < min) bad(`File bahut chhoti / khaali lag rahi hai: ${f} (${fs.statSync(f).size} bytes)`);
}
ok('Zaroori files check');

/* 2) JavaScript ki galti (syntax) — .js files aur HTML ke andar ke <script> */
const all = walk('.', []);
const jsFiles = all.filter(f => /\.js$/.test(f) && !/^tools\//.test(f));
for (const f of jsFiles) {
  try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); }
  catch (e) { bad(`JavaScript galti: ${f} — ${e.message}`); }
}
const htmlFiles = all.filter(f => /\.html$/.test(f));
const mainHtml = htmlFiles.filter(f => !/^products\//.test(f));
const sampleProducts = htmlFiles.filter(f => /^products\//.test(f)).slice(0, 25);
let scriptCount = 0;
const domains = {};
for (const f of htmlFiles) {
  const t = fs.readFileSync(f, 'utf8');
  /* bahar ki script / iframe kahan se aa rahi hai */
  for (const m of t.matchAll(/<(script|iframe)\b[^>]*\bsrc\s*=\s*["'](https?:)?\/\/([^\/"']+)/gi)) {
    const d = m[3].toLowerCase(); (domains[d] = domains[d] || new Set()).add(f);
  }
  for (const [re, why] of BAD) if (re.test(t)) bad(`Shak wala code (${why}) — file: ${f}`);
  if (!mainHtml.includes(f) && !sampleProducts.includes(f)) continue;
  /* inline script ka syntax */
  for (const m of t.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1], code = m[2];
    if (/\bsrc\s*=/.test(attrs) || !code.trim()) continue;
    if (/type\s*=\s*["']?(application\/ld\+json|application\/json|text\/template|module)/i.test(attrs)) {
      if (/ld\+json/i.test(attrs)) { try { JSON.parse(code); } catch (e) { bad(`Google schema (JSON-LD) toota hua: ${f}`); } }
      continue;
    }
    scriptCount++;
    try { new vm.Script(code, { filename: f }); }
    catch (e) { bad(`Page ke andar JavaScript galti: ${f} — ${e.message}`); }
  }
}
ok(`JavaScript check (${jsFiles.length} files, ${scriptCount} inline blocks)`);
for (const [d, files] of Object.entries(domains)) {
  if (!ALLOWED.includes(d)) bad(`ANJAAN bahar ki script/iframe: ${d} — files: ${[...files].slice(0, 5).join(', ')}  (agar ye aapne khud joda hai to tools/site-guard.js ki ALLOWED list me daalein)`);
}
ok('Bahar ki script domains check');

/* 3) Product pages aur sitemap */
const prodCount = all.filter(f => /^products\/.+\.html$/.test(f)).length;
if (prodCount < 100) bad(`Product pages bahut kam hain: ${prodCount} (normal ~400+)`);
const sm = fs.existsSync('sitemap.xml') ? fs.readFileSync('sitemap.xml', 'utf8') : '';
const smCount = (sm.match(/<loc>/g) || []).length;
if (smCount < 100) bad(`Sitemap me URL bahut kam hain: ${smCount}`);
if (sm && !/<\/urlset>\s*$/.test(sm)) bad('sitemap.xml adhoori (toot gayi) hai');
ok(`Products: ${prodCount} pages, sitemap: ${smCount} URLs`);

/* 4) index.html ke zaroori hisse */
if (fs.existsSync('index.html')) {
  const ix = fs.readFileSync('index.html', 'utf8');
  [['cart.js', 'cart'], ['function buildHomepage', 'homepage banane wala code'], ['openZara', 'Zara chatbot'], ['</html>', 'file ka aakhri hissa']]
    .forEach(([k, n]) => { if (ix.indexOf(k) < 0) bad(`index.html me ${n} nahi mila ("${k}")`); });
}

/* ---- live site (internet) ---- */
function get(url, tries) {
  return new Promise(res => {
    const go = (n) => {
      const req = https.get(url, { headers: { 'User-Agent': 'WTPESTORE-SiteGuard' }, timeout: 20000 }, r => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) { r.resume(); return get(new URL(r.headers.location, url).href, 1).then(res); }
        let b = ''; r.setEncoding('utf8'); r.on('data', c => b += c); r.on('end', () => res({ s: r.statusCode, b }));
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', () => n > 1 ? setTimeout(() => go(n - 1), 5000) : res({ s: 0, b: '' }));
    };
    go(tries || 3);
  });
}

(async () => {
  if (!process.argv.includes('--local')) {
    for (const [p, must] of [['/', 'WTPESTORE'], ['/products.html', 'WTPESTORE'], ['/payment.html', 'Pay'], ['/cart.js', 'wtpe'], ['/sitemap.xml', '<urlset'], ['/llms.txt', 'WTPESTORE']]) {
      let r = await get(SITE + p);
      if (r.s !== 200 || r.b.indexOf(must) < 0) { await new Promise(z => setTimeout(z, 20000)); r = await get(SITE + p); }
      if (r.s !== 200) bad(`Live site: ${p} nahi khul raha (HTTP ${r.s || 'no response'})`);
      else if (r.b.indexOf(must) < 0) bad(`Live site: ${p} khula par andar sahi content nahi mila`);
    }
    ok('Live site pages check');
    const sh = await get(SHEET);
    const rows = sh.s === 200 ? sh.b.split('\n').filter(l => l.trim()).length - 1 : 0;
    if (rows < 100) bad(`Google Sheet se products nahi aa rahe (rows: ${rows}, HTTP ${sh.s}) — Sheet ka sharing/publish check karein`);
    else ok(`Google Sheet: ${rows} products`);
  }

  const report = (problems.length ? '❌ ' + problems.length + ' PROBLEM MILI:\n' + problems.map((p, i) => `  ${i + 1}. ${p}`).join('\n')
    : '✅ Sab theek hai — koi problem nahi') + '\n\nChecks:\n' + notes.map(n => '  • ' + n).join('\n');
  console.log(report);
  try { fs.writeFileSync(process.env.GUARD_REPORT || require('path').join(require('os').tmpdir(), 'guard-report.txt'), report + '\n'); } catch (e) {}
  if (process.env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + report + '\n```\n'); } catch (e) {} }
  process.exit(problems.length ? 1 : 0);
})();
