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
      '<tr class="gt"><td>Grand Total</td><td class="r">' + x(v('grand')) + '</td></tr>' +
      (Number(v('advamt') || 0) > 0 ? '<tr><td>Less: Advance Received' + (v('advpct') ? ' (' + x(v('advpct')) + '%)' : '') + '</td><td class="r">−₹' + x(Number(v('advamt')).toLocaleString('en-IN')) + '</td></tr>' +
        '<tr class="gt"><td>Balance Payable</td><td class="r">' + x(v('balance')) + '</td></tr>' : '');
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
    '.wtpe-tbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0 0}.wtpe-tbar button{border:0;border-radius:7px;padding:7px 13px;font-weight:700;font-size:13px;cursor:pointer;background:#0B2A4A;color:#fff}#wtpeTSave{background:#067d62}#wtpeTDef{background:#fff!important;color:#0B2A4A!important;border:1px solid #0B2A4A!important}#wtpeTMsg{font-size:12px;color:#067d62;font-weight:600}' +
    
    'body.wtpe-pv #terms,body.preview #terms{border:0!important;background:transparent!important}' +
    'body.wtpe-pv .wtpe-tbar,body.preview .wtpe-tbar{display:none}' +
    '@media print{.wtpe-tbar{display:none!important}::placeholder{color:transparent!important}' +
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
    if (t && !document.getElementById('wtpeTBar')) {
      if (!t.value.trim() && window.DEF_TERMS) t.value = window.DEF_TERMS;   // khaali ho to purana template
      var bar = document.createElement('div'); bar.id = 'wtpeTBar'; bar.className = 'wtpe-tbar no-print';
      bar.innerHTML = '<button type="button" id="wtpeTDef">↺ Purana Template</button><span id="wtpeTMsg"></span>';
      t.parentNode.insertBefore(bar, t.nextSibling);
      document.getElementById('wtpeTDef').onclick = function () {
        if (t.value.trim() && !confirm('Purana (default) terms template daal dein? Abhi likhe terms hat jayenge.')) return;
        t.value = window.DEF_TERMS || t.value; grow(t); t.focus();
        document.getElementById('wtpeTMsg').textContent = 'Purana template aa gaya — jo chahe badal lo.';
      };
    }
    all(); setTimeout(all, 600); setTimeout(all, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('beforeprint', all);
  var op = window.wtpePreview; if (op) window.wtpePreview = function () { op(); setTimeout(all, 50); };
  var sp = window.showPreview; if (sp) window.showPreview = function () { sp.apply(this, arguments); setTimeout(all, 50); };
})();

/* ---------- WhatsApp par PDF FILE bhejna ----------
   1) Page ki quotation se PDF banti hai (browser me hi)
   2) Mobile / Windows: "Share" se seedha WhatsApp me PDF attach
   3) Share na ho sake: PDF download + customer ki WhatsApp chat khulti hai -> 📎 se attach  */
(function () {
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  var quick = /quick-quote/i.test(location.pathname), isPI = /proforma/i.test(location.pathname);
  var KIND = isPI ? 'Proforma Invoice' : 'Quotation';
  var oldWA = window.sendWA;
  function v(id) { var e = document.getElementById(id); return e ? String(e.value != null && e.tagName !== 'DIV' ? e.value : e.textContent).trim() : ''; }
  function load(cb) {
    if (window.html2pdf) return cb();
    var s = document.createElement('script'); s.src = LIB; s.onload = cb;
    s.onerror = function () { box('❌ PDF tool load nahi hua (internet check karein).', []); };
    document.head.appendChild(s);
  }
  function pvOn() { if (quick && window.showPreview) showPreview(); else if (window.wtpePreview) wtpePreview(); }
  function pvOff() { if (quick && window.closePreview) closePreview(); else if (window.wtpeClosePreview) wtpeClosePreview(); }
  function phone() { var p = v('cphone').replace(/\D/g, '').slice(-10); return p.length === 10 ? '91' + p : ''; }
  function msgText() {
    return 'Dear ' + (v('cname') || 'Sir/Madam') + ',\nPlease find attached our ' + KIND + ' ' + v('qno') +
      (v('grand') ? ' (Grand Total ' + v('grand') + ')' : '') + '.\n\nFor any query call / WhatsApp 9899193589.\nWTPESTORE — powered by Aqua Filtration System\nwww.wtpestore.co.in';
  }
  /* chhota popup */
  function box(title, btns) {
    var o = document.getElementById('wtpeWaBox');
    if (!o) {
      o = document.createElement('div'); o.id = 'wtpeWaBox';
      o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(o);
    }
    o.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:420px;width:100%;padding:20px;font-family:Arial,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3)">' +
      '<div style="font-size:16px;font-weight:700;color:#0B2A4A;margin-bottom:14px;line-height:1.5">' + title + '</div><div id="wtpeWaBtns" style="display:flex;flex-direction:column;gap:9px"></div></div>';
    var w = document.getElementById('wtpeWaBtns');
    btns.concat([['✖ Band karein', function () { o.remove(); }, '#e5e7eb', '#111']]).forEach(function (b) {
      var x = document.createElement('button'); x.textContent = b[0];
      x.style.cssText = 'border:0;border-radius:9px;padding:12px;font-weight:700;font-size:15px;cursor:pointer;background:' + (b[2] || '#25D366') + ';color:' + (b[3] || '#fff');
      x.onclick = b[1]; w.appendChild(x);
    });
    if (title.indexOf('⏳') === 0) w.firstChild.style.display = 'none';
    return o;
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  /* PDF copy me input/textarea ko saaf text bana do (placeholder na dikhe, terms ki lines na judein) */
  function cleanClone(cd) {
    cd.body.style.background = '#fff'; cd.body.style.padding = '0';
    cd.querySelectorAll('[id="doc"]').forEach(function (d) { d.style.boxShadow = 'none'; d.style.border = '0'; d.style.margin = '0'; d.style.borderRadius = '0'; });
    var so = document.getElementById('scope');
    if (so && !so.value.trim()) cd.querySelectorAll('[id="scopeblock"]').forEach(function (hb) { hb.style.display = 'none'; });
    cd.querySelectorAll('#doc input, #doc textarea, #doc select').forEach(function (el) {
      if (el.type === 'file' || el.type === 'hidden') { el.remove(); return; }
      var nx = el.nextElementSibling; if (nx && nx.classList.contains('pv')) { el.remove(); return; }   // Quick Quote ka apna preview text
      var val = el.tagName === 'SELECT' ? (el.options[el.selectedIndex] || {}).text || '' : el.value;
      var cs = cd.defaultView.getComputedStyle(el), span = cd.createElement(el.tagName === 'TEXTAREA' ? 'div' : 'span');
      span.textContent = val || '';
      span.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';color:#111;text-align:' + cs.textAlign + ';line-height:' + (el.tagName === 'TEXTAREA' ? '1.7' : cs.lineHeight) + ';' +
        (el.tagName === 'TEXTAREA' || cs.display === 'block' || /width:\s*100%/.test(el.getAttribute('style') || '') || el.offsetWidth > 200 ? 'display:block;padding:2px 0;min-height:' + (val ? '0' : '1em') : 'display:inline-block');
      el.parentNode.replaceChild(span, el);
    });
    cd.querySelectorAll('#doc .pmirror').forEach(function (m) { m.remove(); });
  }
  function sendPdfWA() {
    try { if (typeof reserveQno === 'function') reserveQno(); else if (typeof reserveNo === 'function') reserveNo(); } catch (e) { }
    var name = (KIND + ' ' + (v('qno') || '') + (v('cname') ? ' - ' + v('cname') : '')).replace(/[\/\\:*?"<>|]+/g, '-').trim() + '.pdf';
    box('⏳ PDF ban rahi hai…', []);
    load(function () {
      pvOn();
      setTimeout(function () {
        var doc = document.getElementById('doc');
        var opt = {
          margin: [6, 6, 6, 6], filename: name, image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', onclone: cleanClone, ignoreElements: function (el) { return el.classList && (el.classList.contains('no-print') || el.id === 'wtpePvBar' || el.id === 'previewbar'); } },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: [] }
        };
        var w = window.html2pdf().set(opt).from(doc).toCanvas();
        w.get('canvas').then(function (c) {
          /* poori quotation EK page par (lambai jitni chahiye) — bahut lambi ho to A4 pages */
          var r = c.height / Math.max(1, c.width);
          if (r < 2.6) w = w.set({ jsPDF: { unit: 'mm', format: [210, Math.ceil(198 * r) + 14], orientation: 'portrait' } });
          else w = w.set({ pagebreak: { mode: ['avoid-all', 'css'] } });
          return w.toPdf().outputPdf('blob');
        }).then(function (blob) {
          pvOff();
          var file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) { }
          var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
          var canShare = mobile && file && navigator.canShare && navigator.canShare({ files: [file] });   // computer par Windows ka share box nahi
          var txt = encodeURIComponent(msgText()), ph = phone();
          var done = function (how) {
            box('✅ PDF download ho gayi: <br><b>' + name + '</b><br><br>' + how + ' me customer ki chat khulegi — wahan <b>📎 (attach) → Document</b> dabakar ye PDF chuno aur bhejo.<br><span style="font-size:12.5px;color:#666;font-weight:400">(PDF aapke <b>Downloads</b> folder me hai)</span>', []);
          };
          var btns = [];
          if (canShare) btns.push(['📤 WhatsApp par PDF bhejo', function () {
            navigator.share({ files: [file], title: name, text: msgText() }).then(function () { var o = document.getElementById('wtpeWaBox'); if (o) o.remove(); }).catch(function () { });
          }]);
          if (mobile) btns.push(['⬇ PDF download + WhatsApp kholo', function () {
            download(blob, name); location.href = 'https://wa.me/' + ph + '?text=' + txt; done('WhatsApp');
          }, canShare ? '#0B2A4A' : '#25D366']);
          else {
            btns.push(['💻 WhatsApp App (computer) me bhejo', function () {
              download(blob, name);
              location.href = 'whatsapp://send?' + (ph ? 'phone=' + ph + '&' : '') + 'text=' + txt;   // WhatsApp Desktop app seedha khulta hai
              done('WhatsApp App');
            }]);
            btns.push(['🌐 WhatsApp Web me bhejo', function () {
              download(blob, name);
              window.open('https://web.whatsapp.com/send?' + (ph ? 'phone=' + ph + '&' : '') + 'text=' + txt, '_blank');
              done('WhatsApp Web');
            }, '#128C7E']);
          }
          btns.push(['💬 Sirf text bhejo (bina PDF)', function () { var o = document.getElementById('wtpeWaBox'); if (o) o.remove(); if (oldWA) oldWA(); }, '#f1f5f9', '#0B2A4A']);
          box('✅ PDF taiyaar hai — ab WhatsApp par bhejo' + (phone() ? '' : '<br><span style="font-size:12.5px;color:#b45309;font-weight:400">(customer ka phone number khaali hai — WhatsApp me contact khud chunna hoga)</span>'), btns);
        }).catch(function () { pvOff(); box('❌ PDF nahi ban payi. Print → Save PDF use karein.', []); });
      }, 250);
    });
  }
  window.sendWA = sendPdfWA;
})();

/* ---------- Poori Quotation: 💾 Save + 📂 Saved (Open / Edit) ---------- */
(function () {
  if (typeof window.qSave !== 'function' || typeof window.qList !== 'function') return;
  if (/quick-quote/i.test(location.pathname)) { try { QKEY = 'wtpe_saved_docs_qq'; } catch (e) { } }   // Quick Quote ke columns alag hain
  var lbl = /proforma/i.test(location.pathname) ? 'Proforma' : 'Quotation';
  function mk(id, txt, fn, css) { var b = document.createElement('button'); b.id = id; b.className = 'btn'; b.textContent = txt; b.onclick = fn; b.style.cssText = css; return b; }
  var tb = document.querySelector('.toolbar');
  if (tb && !document.getElementById('wtpeQSave')) {
    var ref = tb.querySelector('.btn.wa') || null;
    tb.insertBefore(mk('wtpeQSave', '💾 Save ' + lbl, function () { qSave(); }, 'background:#067d62;color:#fff'), ref);
    tb.insertBefore(mk('wtpeQOpen', '📂 Saved / Edit', function () { qList(); }, 'background:#b45309;color:#fff'), ref);
  }
  var act = document.getElementById('wtpeAct');
  if (act && !document.getElementById('wtpeQSave2')) {
    var first = act.querySelector('button');
    act.insertBefore(mk('wtpeQSave2', '💾 Save ' + lbl, function () { qSave(); }, 'background:#067d62;color:#fff'), first);
    act.insertBefore(mk('wtpeQOpen2', '📂 Saved / Edit', function () { qList(); }, 'background:#b45309;color:#fff'), first);
  }
})();

/* ---------- Bank details + UPI QR apne aap (khaali ho to) ---------- */
(function () {
  var BANK = { bkname: 'AQUA FILTRATION SYSTEM', bkbank: 'Axis Bank Ltd', bkacc: '917020048039102', bkifsc: 'UTIB0002693', bkbranch: 'Green Field Colony, Faridabad' };
  function fill() {
    Object.keys(BANK).forEach(function (id) {
      var e = document.getElementById(id);
      if (e && (!e.value.trim() || (id === 'bkname' && /^aqua filtration system$/i.test(e.value.trim())))) e.value = BANK[id];
    });
    var img = document.getElementById('upiimg'), ph = document.getElementById('upiph');
    if (img && (!img.getAttribute('src') || img.style.display === 'none')) {
      img.src = '/qt/upi-qr.png'; img.style.display = 'block'; if (ph) ph.style.display = 'none';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(fill, 300); }); else setTimeout(fill, 300);
  var ol = window.qRestore; if (typeof ol === 'function') window.qRestore = function (d) { ol(d); setTimeout(fill, 200); };
})();

/* ---------- Proforma Invoice: Advance received + Balance payable ---------- */
(function () {
  if (!/proforma/i.test(location.pathname)) return;
  var g = document.getElementById('grand'); if (!g) return;
  var grow = g.closest('.tr'); if (!grow || document.getElementById('row-adv')) return;
  var st = document.createElement('style');
  st.textContent = '#row-adv input{width:70px;text-align:right}#advpct{width:52px!important}' +
    '#row-bal{font-weight:800;font-size:15px;color:#0B2A4A;border-top:1px dashed #94a3b8;padding-top:6px}' +
    '@media print{#row-adv.zero,#row-bal.zero{display:none!important}}' +
    'body.wtpe-pv #row-adv.zero,body.wtpe-pv #row-bal.zero{display:none!important}';
  document.head.appendChild(st);
  var a = document.createElement('div'); a.className = 'tr'; a.id = 'row-adv';
  a.innerHTML = '<span>Less: Advance Received <input class="pct" id="advpct" type="number" min="0" max="100" step="any" placeholder="%">%</span>' +
    '<span>−₹<input id="advamt" type="number" min="0" step="any" placeholder="0"></span>';
  var b = document.createElement('div'); b.className = 'tr'; b.id = 'row-bal';
  b.innerHTML = '<span>Balance Payable</span><span id="balance">₹0</span>';
  grow.parentNode.insertBefore(a, grow.nextSibling); a.parentNode.insertBefore(b, a.nextSibling);
  var pct = document.getElementById('advpct'), amt = document.getElementById('advamt'), bal = document.getElementById('balance');
  function num(s) { var n = parseFloat(String(s || '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function inr(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function upd(from) {
    var G = num(g.textContent);
    if (from === 'pct') amt.value = pct.value === '' ? '' : Math.round(G * num(pct.value) / 100);
    else if (from === 'amt') pct.value = (amt.value === '' || !G) ? '' : Math.round(num(amt.value) * 1000 / G) / 10;
    else if (pct.value !== '' && amt.value === '') amt.value = Math.round(G * num(pct.value) / 100);
    var A = Math.min(num(amt.value), G);
    bal.textContent = inr(G - A);
    var z = !(A > 0); a.classList.toggle('zero', z); b.classList.toggle('zero', z);
  }
  pct.addEventListener('input', function () { upd('pct'); });
  amt.addEventListener('input', function () { upd('amt'); });
  var oc = window.calc; if (typeof oc === 'function') window.calc = function () { var r = oc.apply(this, arguments); try { upd(pct.value !== '' && document.activeElement !== amt ? 'pct' : ''); } catch (e) { } return r; };
  var orr = window.qRestore; if (typeof orr === 'function') window.qRestore = function (d) { orr(d); setTimeout(function () { upd(''); }, 150); };
  upd('');
})();
