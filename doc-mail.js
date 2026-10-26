/* =====================================================================
   WTPESTORE — Quotation / Quick Quote / Proforma Invoice: Email + PDF
   Page ka data padh kar 1B7 script ("mailDoc") ko bhejta hai. Wahan
   letterhead par PDF banti hai aur aquazone350@gmail.com se customer ko
   jaati hai. Sirf admin login ke baad chalta hai.
   ===================================================================== */
(function () {
  var URL = 'https://script.google.com/macros/s/AKfycbzzi3a8MZGV5_f-nt-hYA29OCn50ir3KD8WX66mNJTn4dhzOKYr1zkAv5w9aYlXD2dG/exec';
  try { URL = localStorage.getItem('wtpe_login_url') || URL; } catch (e) { }
  var isPI = /proforma/i.test(location.pathname);
  var KIND = isPI ? 'Proforma Invoice' : 'Quotation';

  function $(id) { return document.getElementById(id); }
  function v(id) { var e = $(id); if (!e) return ''; return String(('value' in e && e.tagName !== 'DIV' && e.tagName !== 'SPAN') ? e.value : e.textContent).trim(); }
  function x(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shown(id) { var e = $(id); return e && e.style.display !== 'none' && getComputedStyle(e).display !== 'none'; }
  function token() { try { return localStorage.getItem('wtpe_tok') || localStorage.getItem('wtpe_admin_token') || ''; } catch (e) { return ''; } }
  function say(t, bad, quiet) {
    var m = $('msg');
    if (m) { m.className = 'msg ' + (bad ? 'err' : 'ok'); m.textContent = t; window.scrollTo(0, 0); }
    else if (!quiet) alert(t);
  }

  /* ---- PDF ka body (letterhead server lagata hai) ---- */
  function body() {
    var hasHsn = !!document.querySelector('#rows .hsn'), hasDisc = !!document.querySelector('#rows .disc');
    var tr = '', i = 0;
    document.querySelectorAll('#rows tr').forEach(function (r) {
      var g = function (c) { var e = r.querySelector('.' + c); return e ? String(e.value).trim() : ''; };
      if (!g('desc')) return; i++;
      var amt = r.querySelector('.cell-amt'); amt = amt ? amt.textContent : '';
      tr += '<tr><td class="c">' + i + '</td><td>' + x(g('desc')) + '</td>' + (hasHsn ? '<td class="c">' + x(g('hsn')) + '</td>' : '') +
        '<td class="c">' + x(g('qty')) + ' ' + x(g('unit')) + '</td><td class="r">₹' + x(Number(g('rate') || 0).toLocaleString('en-IN')) + '</td>' +
        (hasDisc ? '<td class="c">' + x(g('disc') || 0) + '%</td>' : '') + '<td class="r">' + x(amt) + '</td></tr>';
    });
    if (!i) return '';
    var head = '<tr><th class="c">#</th><th>Description</th>' + (hasHsn ? '<th class="c">HSN</th>' : '') + '<th class="c">Qty</th><th class="r">Rate</th>' +
      (hasDisc ? '<th class="c">Disc</th>' : '') + '<th class="r">Amount</th></tr>';
    var T = function (lbl, id) { return $(id) ? '<tr><td>' + lbl + '</td><td class="r">' + x(v(id)) + '</td></tr>' : ''; };
    var tot = T('Sub Total', 'subtotal') +
      (shown('row-disc') ? T('Discount', 'disctot') : '') +
      (Number(v('freight') || 0) ? '<tr><td>Freight / Packing</td><td class="r">₹' + x(Number(v('freight')).toLocaleString('en-IN')) + '</td></tr>' : '') +
      T('Taxable Value', 'taxable') +
      ((shown('row-igst') || shown('r-igst')) ? T('IGST @ ' + x(v('igstp')) + '%', 'igst')
        : T('CGST @ ' + x(v('cgstp')) + '%', 'cgst') + T('SGST @ ' + x(v('sgstp')) + '%', 'sgst')) +
      T('Round Off', 'roundoff') +
      '<tr class="gt"><td>Grand Total</td><td class="r">' + x(v('grand')) + '</td></tr>';
    var meta = 'No: <b>' + x(v('qno')) + '</b> &nbsp;|&nbsp; Date: ' + x(v('qdate')) +
      (v('qvalid') ? ' &nbsp;|&nbsp; <b style="color:#b12704">Valid till: ' + x(v('qvalid')) + '</b>' : '') +
      (v('qpo') ? '<br>PO No: ' + x(v('qpo')) + (v('podate') ? ' &nbsp;|&nbsp; PO Date: ' + x(v('podate')) : '') : '');
    var to = '<b>To:</b> ' + x(v('cname') || 'Customer') + (v('cattn') ? '<br>Kind Attn: ' + x(v('cattn')) : '') +
      (v('caddr') ? '<br>' + x(v('caddr')).replace(/\n/g, '<br>') : '') +
      (v('cgstin') ? '<br>GSTIN: ' + x(v('cgstin')) : '') + (v('cphone') ? '<br>Mobile: ' + x(v('cphone')) : '') +
      (v('csub') ? '<br><b>Subject:</b> ' + x(v('csub')) : '');
    var ship = isPI && v('saddr') ? '<td style="vertical-align:top;padding-left:16px"><b>Ship To:</b><br>' + x(v('saddr')).replace(/\n/g, '<br>') + '</td>' : '';
    var terms = v('terms') ? '<div class="terms"><b>Terms &amp; Conditions</b><br>' + x(v('terms')).replace(/\n/g, '<br>') + '</div>' : '';
    var bank = v('bkacc') ? '<div class="box"><b>Bank details:</b> ' + x(v('bkname')) + ' · ' + x(v('bkbank')) + ' · A/c ' + x(v('bkacc')) +
      ' · IFSC ' + x(v('bkifsc')) + (v('bkbranch') ? ' · ' + x(v('bkbranch')) : '') + '</div>' : '';
    var decl = v('decl') ? '<div class="terms"><b>Declaration:</b> ' + x(v('decl')) + '</div>' : '';
    return '<table style="width:100%;margin:2px 0 10px"><tr><td style="font-size:17px;font-weight:bold;color:#1e293b;letter-spacing:1px">' + KIND.toUpperCase() + '</td>' +
      '<td class="meta">' + meta + '</td></tr></table>' +
      '<table style="width:100%"><tr><td style="vertical-align:top">' + to + '</td>' + ship + '</tr></table>' +
      '<table class="t">' + head + tr + '</table>' +
      '<table style="width:55%;margin-left:45%" class="tot">' + tot + '</table>' +
      (v('words') ? '<div class="box"><b>In words:</b> ' + x(v('words').replace(/^amount in words:\s*/i, '')) + '</div>' : '') +
      bank + terms + decl +
      (v('cby') ? '<div style="margin-top:14px;text-align:right;font-size:11px">For Aqua Filtration System<br><br><b>' + x(v('cby')) + '</b></div>' : '');
  }

  function send() {
    var to = v('cemail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) { say('Pehle customer ka sahi Email bharo (Bill To me).', true); return; }
    var tok = token();
    if (!tok) { say('Email ke liye pehle admin login karein (homepage → Owner panel → login), phir ye page refresh karein.', true); return; }
    try { if (typeof reserveQno === 'function') reserveQno(); else if (typeof reserveNo === 'function') reserveNo(); } catch (e) { }
    var doc = body();
    if (!doc) { say('Quotation me koi item nahi hai.', true); return; }
    say('📤 ' + KIND + ' PDF ke saath bheja ja raha hai…', false, true);
    var p = { action: 'mailDoc', token: tok, kind: isPI ? 'pi' : 'qt', to: to, no: v('qno'), name: v('cname'), by: v('cby'), doc: doc };
    fetch(URL, { method: 'POST', body: new URLSearchParams(p) })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var d = {}; try { d = JSON.parse(t); } catch (e) { }
        if (d.ok) say('✅ ' + KIND + ' ' + v('qno') + ' PDF ke saath ' + to + ' ko bhej di gayi (aquazone350 se, 1-2 min me pahunchegi).');
        else if (d.error === 'unauthorized') say('❌ Login purana ho gaya — homepage par dobara admin login karein, phir yahan Email dabayein.', true);
        else say('❌ Email nahi gaya: ' + (d.error || 'server ne jawab nahi diya') + '. WhatsApp / Print use karein.', true);
      })
      .catch(function () { say('❌ Network issue — internet check karke dobara Email dabayein.', true); });
  }
  window.emailQuote = send;      // quotation.html, proforma-invoice.html
  window.emailDirect = send;     // admin-quick-quote.html
})();

/* ---------- Preview + niche action buttons (Quotation & Proforma pages) ---------- */
(function () {
  if (!/quotation\.html|proforma-invoice\.html/i.test(location.pathname)) return;   // Quick Quote me pehle se hai
  var st = document.createElement('style');
  st.textContent =
    'body.wtpe-pv .no-print{display:none!important}' +
    'body.wtpe-pv input,body.wtpe-pv textarea,body.wtpe-pv select{border:0!important;background:transparent!important;box-shadow:none!important;outline:0!important;resize:none;-webkit-appearance:none;appearance:none}' +
    'body.wtpe-pv{padding-top:58px}body.wtpe-pv ::placeholder{color:transparent!important}' +
    '#wtpePvBar{display:none;position:fixed;top:0;left:0;right:0;z-index:9999;background:#0B2A4A;color:#fff;padding:9px 12px;gap:8px;align-items:center;flex-wrap:wrap;box-shadow:0 3px 10px rgba(0,0,0,.25)}' +
    'body.wtpe-pv #wtpePvBar{display:flex}#wtpePvBar span{font-weight:700;font-size:14px;margin-right:auto}' +
    '#wtpePvBar button,.wtpe-act button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;font-size:14px;cursor:pointer}' +
    '.wtpe-act{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:18px auto 30px;max-width:900px;padding:14px;background:#fff;border:1px solid #d5d9d9;border-radius:12px}' +
    '.wtpe-act b{width:100%;text-align:center;color:#0B2A4A;font-size:14px}' +
    '.b-pv{background:#6b4fbb;color:#fff}.b-wa{background:#25D366;color:#fff}.b-em{background:#1a73e8;color:#fff}.b-pr{background:#333;color:#fff}.b-cl{background:#fff;color:#0B2A4A}' +
    '@media print{#wtpePvBar,.wtpe-act{display:none!important}body.wtpe-pv{padding-top:0}}';
  document.head.appendChild(st);

  function rq() { try { if (typeof reserveQno === 'function') reserveQno(); } catch (e) { } }
  window.wtpePreview = function () { document.body.classList.add('wtpe-pv'); window.scrollTo(0, 0); };
  window.wtpeClosePreview = function () { document.body.classList.remove('wtpe-pv'); };
  window.wtpePrint = function () { rq(); window.print(); };
  function wa() { if (typeof sendWA === 'function') sendWA(); }
  function em() { if (typeof emailQuote === 'function') emailQuote(); }

  var bar = document.createElement('div'); bar.id = 'wtpePvBar';
  bar.innerHTML = '<span>👁 Preview — customer ko aise dikhega</span>' +
    '<button class="b-cl" onclick="wtpeClosePreview()">✖ Close</button>' +
    '<button class="b-pr" onclick="wtpePrint()">🖨 Save PDF</button>' +
    '<button class="b-em" id="wtpePvEm">📧 Email</button>' +
    '<button class="b-wa" id="wtpePvWa">💬 WhatsApp</button>';
  document.body.appendChild(bar);
  document.getElementById('wtpePvEm').onclick = function () { wtpeClosePreview(); em(); };
  document.getElementById('wtpePvWa').onclick = function () { wtpeClosePreview(); wa(); };

  /* upar toolbar me Preview button */
  var tb = document.querySelector('.toolbar');
  if (tb && !document.getElementById('wtpePvTop')) {
    var b = document.createElement('button'); b.id = 'wtpePvTop'; b.className = 'btn'; b.style.cssText = 'background:#6b4fbb;color:#fff';
    b.textContent = '👁 Preview'; b.onclick = window.wtpePreview;
    var w = tb.querySelector('.btn.wa'); tb.insertBefore(b, w || null);
  }

  /* quotation ke NICHE buttons (bharne ke baad yahin se bhejo) */
  var doc = document.getElementById('doc');
  if (doc && !document.getElementById('wtpeAct')) {
    var a = document.createElement('div'); a.id = 'wtpeAct'; a.className = 'wtpe-act no-print';
    a.innerHTML = '<b>Quotation ready? Ab bhejo:</b>' +
      '<button class="b-pv" onclick="wtpePreview()">👁 Preview</button>' +
      '<button class="b-wa" id="wtpeBotWa">💬 WhatsApp</button>' +
      '<button class="b-em" id="wtpeBotEm">📧 Email (PDF)</button>' +
      '<button class="b-pr" onclick="wtpePrint()">🖨 Print / Save PDF</button>';
    doc.parentNode.insertBefore(a, doc.nextSibling);
    document.getElementById('wtpeBotWa').onclick = wa;
    document.getElementById('wtpeBotEm').onclick = em;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') wtpeClosePreview(); });
})();

/* ---------- Terms & Conditions: aaram se edit + print me saaf ---------- */
(function () {
  var st = document.createElement('style');
  st.textContent =
    '#terms,#scope,#decl{overflow:hidden!important;resize:none!important}' +
    '#terms{border:1.5px dashed #9fb3c8!important;background:#fffef6!important;font-size:13px!important;line-height:1.75!important;color:#111!important;min-height:150px}' +
    '#terms:focus{border-color:#ff9900!important;background:#fff!important}' +
    '.wtpe-thint{font-size:11.5px;color:#7a8a99;margin:4px 0 0;font-style:italic}' +
    'body.wtpe-pv #terms,body.preview #terms{border:0!important;background:transparent!important}' +
    'body.wtpe-pv .wtpe-thint,body.preview .wtpe-thint{display:none}' +
    '@media print{.wtpe-thint{display:none!important}::placeholder{color:transparent!important}' +
    '.pmirror{font-size:13px!important;line-height:1.7!important;color:#000!important}' +
    '.terms .pmirror,.termsbox .pmirror{border:1px solid #cfd8e0;border-radius:6px;padding:8px 10px!important}}';
  document.head.appendChild(st);
  function grow(t) { if (!t) return; t.style.height = 'auto'; t.style.height = (t.scrollHeight + 4) + 'px'; }
  function all() { ['terms', 'scope', 'decl'].forEach(function (id) { grow(document.getElementById(id)); }); }
  function init() {
    ['terms', 'scope', 'decl'].forEach(function (id) {
      var t = document.getElementById(id); if (!t || t._wg) return; t._wg = 1;
      t.addEventListener('input', function () { grow(t); });
    });
    var t = document.getElementById('terms');
    if (t && !document.getElementById('wtpeTHint')) {
      var h = document.createElement('div'); h.id = 'wtpeTHint'; h.className = 'wtpe-thint no-print';
      var quick = /quick-quote/i.test(location.pathname);
      h.textContent = quick ? '✏️ Terms par click karke badal sakte ho — aapka badlav is computer par apne aap yaad rahega.'
                            : '✏️ Terms par click karke badal sakte ho. Hamesha ke liye rakhna ho to upar "💾 Save Defaults" dabao.';
      t.parentNode.insertBefore(h, t.nextSibling);
      if (quick) {
        try { var sv = localStorage.getItem('wtpe_qq_terms'); if (sv) t.value = sv; } catch (e) { }
        t.addEventListener('input', function () { try { localStorage.setItem('wtpe_qq_terms', t.value); } catch (e) { } });
      }
    }
    all(); setTimeout(all, 600); setTimeout(all, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('beforeprint', all);
  var op = window.wtpePreview; if (op) window.wtpePreview = function () { op(); setTimeout(all, 50); };
  var sp = window.showPreview; if (sp) window.showPreview = function () { sp.apply(this, arguments); setTimeout(all, 50); };
})();
