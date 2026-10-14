/* WTPESTORE — category pages: Add to Cart + click khole poora product page
   (cart.js ke baad load hota hai; Sheet se Courier/GST/Dispatch padhta hai) */
(function(){
  if (typeof window.card !== 'function' || typeof window.openP !== 'function') return;
  var SH = {}, ready = false;
  function key(n){ return String(n || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function slug(n){ return ('' + (n || '')).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function num(v){ var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : NaN; }
  function canBuy(p){
    var e = SH[key(p.n)];
    return !!(e && p.p > 0 && !isNaN(num(e.ship)) && String(e.ship).trim() !== '' &&
      window.wtpeAddToCart && (!window.WTPE_CART_ON || window.WTPE_CART_ON()));
  }

  /* 1) Card: Get Quote ki jagah Add to Cart (jab product bikne layak ho) */
  var origCard = window.card;
  window.card = function(p){
    var h = origCard(p);
    if (ready && canBuy(p)) {
      h = h.replace(/<button class="pc-q" onclick="event\.stopPropagation\(\);quote\(\d+\)">Get Quote<\/button>/,
        '<button class="pc-q" style="background:#ff9900;color:#111" onclick="event.stopPropagation();wtpeCatAdd(' + p.id + ')">🛒 Add to Cart</button>');
    }
    return h;
  };
  window.wtpeCatAdd = function(id){
    var p = (window.DATA || [])[id]; if (!p) return;
    var e = SH[key(p.n)] || {};
    window.wtpeAddToCart({ k: p.n, n: p.n, p: p.p, ship: e.ship, gst: e.gst, disp: e.disp, img: p.img || '', url: '/products/' + slug(p.n) + '.html' });
  };

  /* 2) Click: poora product page kholo (agar bana hai), warna purani window */
  var origOpen = window.openP, going = false;
  window.addEventListener('pageshow', function(){ going = false; });
  window.openP = function(id){
    var p = (window.DATA || [])[id]; if (!p || going) return;
    var u = '/products/' + slug(p.n) + '.html';
    going = true;
    fetch(u).then(function(r){ return r.ok ? r.text() : ''; }).then(function(t){
      /* asli product page hi kholo; "moved / choose a model" wale chhote page nahi */
      if (t && t.indexOf('noindex') < 0) { location.href = u; } else { going = false; origOpen(id); }
    }).catch(function(){ going = false; origOpen(id); });
  };

  /* 3) Sheet se courier / GST / dispatch padho, phir list dobara banao */
  if (!window.SHEET || typeof window.csvP !== 'function') return;
  fetch(window.SHEET).then(function(r){ return r.text(); }).then(function(t){
    var rows = csvP(t).filter(function(r){ return r.length >= 2 && r.join('').trim(); });
    if (rows.length < 2) return;
    var h = rows[0].map(function(x){ return String(x || '').replace(/^﻿/, '').trim().toLowerCase(); });
    function ix(){ for (var k = 0; k < arguments.length; k++){ var i = h.indexOf(arguments[k]); if (i > -1) return i; } return -1; }
    var ni = ix('product', 'name'), si = ix('courier charge', 'courier', 'shipping', 'shipping charge'),
        gi = ix('gst rate', 'gst', 'gst %', 'gst%'), di = ix('dispatch time', 'dispatch', 'dispatch days');
    if (ni < 0 || si < 0) return;
    for (var i = 1; i < rows.length; i++){
      var r = rows[i], n = key(r[ni]); if (!n) continue;
      SH[n] = { ship: String(r[si] || '').trim(), gst: gi > -1 ? String(r[gi] || '').trim() : '', disp: di > -1 ? String(r[di] || '').trim() : '' };
    }
    ready = true;
    if (typeof window.render === 'function') window.render();
  }).catch(function(){});
})();
