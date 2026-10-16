/* =============================================================
   WTPESTORE Auto-Heal — sirf ZAROORI files (homepage, cart, payment)
   agar toot gayi hon, to unhe pichhle "achhe" version (tag: good-latest)
   se wapas laata hai. Baaki kuch nahi chhoota.
   ============================================================= */
const fs = require('fs'), vm = require('vm'), { execSync } = require('child_process');
const CRITICAL = { 'index.html': 50000, 'cart.js': 3000, 'cat-cart.js': 1000, 'sw.js': 500, 'payment.html': 5000 };
const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function broken(text, file, min) {
  if (text == null) return 'file gayab';
  if (text.length < min) return 'file khaali / adhoori';
  try {
    if (/\.js$/.test(file)) { new vm.Script(text, { filename: file }); return ''; }
    if (file === 'index.html' && text.indexOf('</html>') < 0) return 'file adhoori (</html> nahi)';
    for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(m[1]) || !m[2].trim() || /type\s*=\s*["']?(application\/(ld\+)?json|module)/i.test(m[1])) continue;
      new vm.Script(m[2], { filename: file });
    }
  } catch (e) { return 'JavaScript galti: ' + e.message; }
  return '';
}

let good;
try { sh('git rev-parse -q --verify refs/tags/good-latest'); good = true; } catch (e) { good = false; }
if (!good) { console.log('Koi purana achha version (good-latest) abhi save nahi hai — auto-restore nahi ho sakta.'); process.exit(0); }

const fixed = [];
for (const [f, min] of Object.entries(CRITICAL)) {
  const now = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
  const why = broken(now, f, min);
  if (!why) continue;
  let old = null; try { old = sh(`git show good-latest:${f}`); } catch (e) {}
  if (old == null || broken(old, f, min)) { console.log(`${f}: toota hai (${why}) par purana version bhi sahi nahi mila — haath se theek karna hoga`); continue; }
  fs.writeFileSync(f, old);
  fixed.push(`${f} (${why})`);
}
if (!fixed.length) { console.log('Zaroori files theek hain — auto-restore ki zaroorat nahi.'); process.exit(0); }

sh('git config user.name "wtpestore-guard"');
sh('git config user.email "guard@users.noreply.github.com"');
sh('git add ' + Object.keys(CRITICAL).filter(f => fs.existsSync(f)).join(' '));
sh(`git commit -m "Auto-restore (Site Guard): ${fixed.join(', ').replace(/"/g, "'").slice(0, 200)}"`);
for (let i = 0; i < 3; i++) {
  try { sh('git pull --rebase --autostash -q origin main'); sh('git push -q origin HEAD:main'); console.log('✅ AUTO-RESTORE ho gaya: ' + fixed.join(', ')); process.exit(0); }
  catch (e) { console.log('push retry ' + (i + 1)); execSync('sleep 15'); }
}
console.log('⚠ Auto-restore push nahi ho paaya — "Restore last good version" haath se chalaayein');
