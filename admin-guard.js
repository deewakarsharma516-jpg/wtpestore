/* =====================================================================
   WTPESTORE Admin Guard — har admin page par:
   - bina login page nahi khulega (password server par check hota hai)
   - upar "🔒 Logout" button
   - 60 minute kuch na karo to apne aap logout
   ===================================================================== */
(function () {
  var URL = 'https://script.google.com/macros/s/AKfycbzzi3a8MZGV5_f-nt-hYA29OCn50ir3KD8WX66mNJTn4dhzOKYr1zkAv5w9aYlXD2dG/exec';
  try { URL = localStorage.getItem('wtpe_login_url') || URL; } catch (e) { }
  var IDLE_MIN = 60;
  var KEYS = ['wtpe_admin_token', 'wtpe_tok', 'wtpe_role'];

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function tok() { return ls('wtpe_admin_token') || ls('wtpe_tok') || ''; }
  function jsonp(q, cb) {
    var fn = 'wg_' + Math.floor(Math.random() * 1e9), done = false, s = document.createElement('script');
    function fin(r) { if (done) return; done = true; try { cb(r); } finally { try { delete window[fn]; s.remove(); } catch (e) { } } }
    window[fn] = fin; s.src = URL + '?' + q + '&callback=' + fn; s.onerror = function () { fin({ ok: false, error: 'network' }); };
    document.head.appendChild(s); setTimeout(function () { fin({ ok: false, error: 'timeout' }); }, 15000);
  }

  window.wtpeLogout = function () {
    KEYS.forEach(function (k) { ls(k, null); });
    try { sessionStorage.clear(); } catch (e) { }
    location.reload();
  };

  /* Page ka apna PIN/login gate hai (Quick Quote, Add Product ...) to sirf Logout button lagao */
  var hasOwnGate = function () { return !!document.getElementById('gate'); };

  var hide = document.createElement('style'); hide.id = 'wgHide';
  hide.textContent = 'body>*:not(#wgLogin){visibility:hidden!important}';

  function logoutBtn() {
    if (document.getElementById('wgOut')) return;
    var b = document.createElement('button'); b.id = 'wgOut'; b.type = 'button'; b.textContent = '🔒 Logout';
    b.title = 'Kaam ho gaya? Logout karein';
    b.style.cssText = 'position:fixed;top:10px;right:10px;z-index:100000;background:#b3261e;color:#fff;border:0;border-radius:20px;padding:8px 14px;font:700 13px Arial,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25);cursor:pointer';
    b.onclick = function () { if (confirm('Logout karein? Dobara kholne ke liye password lagega.')) wtpeLogout(); };
    document.body.appendChild(b);
    var t = document.createElement('style'); t.textContent = '@media print{#wgOut{display:none!important}}'; document.head.appendChild(t);
  }

  function idleWatch() {
    var last = Date.now();
    ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(function (e) { window.addEventListener(e, function () { last = Date.now(); }, { passive: true }); });
    setInterval(function () { if (Date.now() - last > IDLE_MIN * 60000 && tok()) wtpeLogout(); }, 60000);
  }

  function showLogin(msg) {
    var o = document.getElementById('wgLogin');
    if (!o) {
      o = document.createElement('div'); o.id = 'wgLogin';
      o.style.cssText = 'position:fixed;inset:0;z-index:100001;background:#0B2A4A;display:flex;align-items:center;justify-content:center;padding:16px;visibility:visible!important';
      o.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:360px;width:100%;padding:24px;font-family:Arial,sans-serif;text-align:center">' +
        '<div style="font-size:20px;font-weight:700;color:#0B2A4A">🔐 WTPESTORE Admin</div>' +
        '<div style="font-size:13px;color:#666;margin:6px 0 16px">Ye page sirf admin ke liye hai. Password daalein.</div>' +
        '<input id="wgPass" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;padding:12px;border:1px solid #ccc;border-radius:9px;font-size:16px;box-sizing:border-box">' +
        '<button id="wgBtn" type="button" style="margin-top:12px;width:100%;padding:12px;border:0;border-radius:9px;background:#ff9900;color:#111;font-weight:700;font-size:16px;cursor:pointer">Login</button>' +
        '<div id="wgErr" style="color:#b3261e;font-size:13px;margin-top:10px;min-height:18px"></div>' +
        '<a href="/" style="display:inline-block;margin-top:6px;font-size:13px;color:#0B2A4A">← Website par jaayein</a></div>';
      document.body.appendChild(o);
      var go = function () {
        var p = document.getElementById('wgPass').value; if (!p) return;
        var bt = document.getElementById('wgBtn'); bt.disabled = true; bt.textContent = 'Checking…';
        jsonp('action=login&pass=' + encodeURIComponent(p), function (d) {
          bt.disabled = false; bt.textContent = 'Login';
          if (d && d.ok && d.token) {
            ls('wtpe_admin_token', d.token); ls('wtpe_tok', d.token); if (d.role) ls('wtpe_role', d.role);
            o.remove(); var h = document.getElementById('wgHide'); if (h) h.remove(); logoutBtn(); idleWatch();
          } else {
            document.getElementById('wgErr').textContent = d && d.error === 'locked' ? 'Bahut galat try — ' + (d.minutes || 15) + ' minute baad try karein.'
              : d && (d.error === 'network' || d.error === 'timeout') ? 'Server se connect nahi hua — internet check karein.' : 'Password galat hai.';
          }
        });
      };
      document.getElementById('wgBtn').onclick = go;
      document.getElementById('wgPass').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    }
    if (msg) document.getElementById('wgErr').textContent = msg;
    setTimeout(function () { var i = document.getElementById('wgPass'); if (i) i.focus(); }, 50);
  }

  function start() {
    if (hasOwnGate()) { logoutBtn(); idleWatch(); return; }
    document.head.appendChild(hide);
    var t = tok();
    if (!t) { showLogin(); return; }
    jsonp('action=verify&token=' + encodeURIComponent(t), function (d) {
      if (d && d.ok) { var h = document.getElementById('wgHide'); if (h) h.remove(); logoutBtn(); idleWatch(); }
      else if (d && (d.error === 'network' || d.error === 'timeout')) showLogin('Server se connect nahi hua — dobara login karein.');
      else { KEYS.forEach(function (k) { ls(k, null); }); showLogin('Login purana ho gaya — dobara password daalein.'); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
