/* =====================================================================
   WTPESTORE — CART + CHECKOUT (Phase A)
   - Cart sirf tab dikhta hai jab CART_LIVE = true ho,
     ya browser me preview chalu ho (?cartpreview=1 se on, ?cartpreview=0 se off).
   - Add to Cart sirf un products par jinke Sheet me Price + Courier Charge dono hain.
   - Rate/shipping/GST ka asli hisaab server (Apps Script) karta hai — yahan sirf estimate.
   ===================================================================== */
(function(){
  var CART_LIVE = true;    // LIVE: cart sabke liye chalu (band karna ho to false)
  var ORDER_URL = 'https://script.google.com/macros/s/AKfycbzzi3a8MZGV5_f-nt-hYA29OCn50ir3KD8WX66mNJTn4dhzOKYr1zkAv5w9aYlXD2dG/exec';
  var WA_NUM = '919899193589';
  var KEY = 'wtpe_cart';
  var MAX_ITEMS = 20, MAX_QTY = 99;

  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){ return null; } }
  try{
    var q = new URLSearchParams(location.search).get('cartpreview');
    if(q === '1') ls('wtpe_cart_preview', '1');
    if(q === '0') ls('wtpe_cart_preview', null);
  }catch(e){}
  function enabled(){ return CART_LIVE || ls('wtpe_cart_preview') === '1'; }
  window.WTPE_CART_ON = enabled;
  window.WTPE_ORDER_URL = ORDER_URL;

  function num(v){ var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : NaN; }
  function rupee(n){ return '₹' + Number(n || 0).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2}); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function load(){ try{ var a = JSON.parse(ls(KEY) || '[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function save(c){ ls(KEY, JSON.stringify(c)); badge(); }

  /* Ek product cart me lene layak hai? (price > 0 aur courier charge number) */
  function sellable(p){ return p && num(p.p) > 0 && !isNaN(num(p.ship)) && String(p.ship).trim() !== ''; }
  window.WTPE_SELLABLE = function(p){ return enabled() && sellable(p); };

  /* Hisaab — server bhi bilkul yahi formula use karta hai (paise me) */
  var PAY = { online: false, pct: 2.36 };   // server se "payInfo" aata hai
  function totals(c){
    var sub = 0, gst = 0, ship = 0, gmax = 0, disp = 0;
    c.forEach(function(it){
      var line = Math.round(it.p * 100) * it.q;
      var g = isNaN(num(it.gst)) ? 18 : num(it.gst);
      sub += line; gst += Math.round(line * g / 100);
      ship = Math.max(ship, Math.round(num(it.ship) * 100));
      gmax = Math.max(gmax, g);
      disp = Math.max(disp, isNaN(num(it.disp)) ? 3 : num(it.disp));
    });
    gst += Math.round(ship * gmax / 100);
    var base = sub + ship + gst, payfee = PAY.online ? Math.round(base / (1 - PAY.pct / 100)) - base : 0;  // server bhi yahi formula
    return { sub: sub / 100, ship: ship / 100, gst: gst / 100, payfee: payfee / 100, total: (base + payfee) / 100, disp: disp };
  }

  function add(p){
    if(!enabled() || !sellable(p)) return false;
    var c = load(), k = p.k || p.n;
    for(var i = 0; i < c.length; i++){ if(c[i].k === k){ c[i].q = Math.min(MAX_QTY, c[i].q + 1); save(c); open(); return true; } }
    if(c.length >= MAX_ITEMS){ alert('Maximum ' + MAX_ITEMS + ' products per order. Please WhatsApp us for larger orders.'); return false; }
    c.push({ k: k, n: p.dn || p.n, p: num(p.p), ship: num(p.ship), gst: isNaN(num(p.gst)) ? 18 : num(p.gst),
             disp: isNaN(num(p.disp)) ? 3 : num(p.disp), img: p.img || '', url: p.url || '', q: 1 });
    save(c); open(); return true;
  }
  window.wtpeAddToCart = add;
  window.wtpeAddFromBtn = function(b){
    var d = b.dataset;
    add({ k: d.k, dn: d.n, p: d.p, ship: d.ship, gst: d.gst, disp: d.disp, img: d.img, url: location.pathname });
  };

  /* ---------- UI ---------- */
  var css = '.wcfab{position:fixed;left:16px;bottom:16px;z-index:898;background:#ff9900;color:#111;border:0;border-radius:30px;padding:11px 16px;font:700 14px Inter,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer;display:none}'+
    '.wcfab b{background:#0b2545;color:#fff;border-radius:12px;padding:1px 8px;margin-left:6px}'+
    '.wcov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;display:none}.wcov.open{display:block}'+
    '.wcp{position:fixed;top:0;right:0;height:100%;width:min(440px,100%);background:#fff;z-index:2147483001;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .2s;font:14px/1.5 Inter,Arial,sans-serif;color:#111}'+
    '.wcp.open{transform:none}.wch{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#0b2545;color:#fff}.wch h3{margin:0;font-size:17px}'+
    '.wch button{background:none;border:0;color:#fff;font-size:26px;cursor:pointer;line-height:1}.wcb{flex:1;overflow:auto;padding:12px 16px}'+
    '.wci{display:flex;gap:10px;border-bottom:1px solid #eee;padding:10px 0}.wci img{width:56px;height:56px;object-fit:contain;border:1px solid #eee;border-radius:6px;background:#fafafa}'+
    '.wci .t{flex:1;min-width:0}.wci .t div{font-weight:600;font-size:13px;overflow-wrap:anywhere}.wci .pr{color:#b12704;font-weight:700}'+
    '.wcq{display:flex;align-items:center;gap:6px;margin-top:4px}.wcq button{width:28px;height:28px;border:1px solid #ccc;background:#f6f6f6;border-radius:6px;cursor:pointer;font-size:15px}'+
    '.wcq .rm{width:auto;padding:0 8px;color:#b12704;background:#fff;font-size:12px}'+
    '.wct{background:#f6f8fb;border-radius:8px;padding:10px 12px;margin-top:12px}.wct div{display:flex;justify-content:space-between;padding:2px 0}.wct .g{font-weight:800;font-size:16px;border-top:1px solid #dde3ea;margin-top:4px;padding-top:6px}'+
    '.wcf label{display:block;font-size:12px;font-weight:600;margin:9px 0 3px;color:#333}.wcf input,.wcf textarea,.wcf select{width:100%;box-sizing:border-box;border:1px solid #ccd3db;border-radius:6px;padding:9px;font:14px Inter,Arial,sans-serif}'+
    '.wcf .row{display:flex;gap:8px}.wcf .row>div{flex:1}.wcagree{display:flex;gap:8px;align-items:flex-start;background:#fff7e6;border:1px solid #f3d38a;border-radius:8px;padding:10px;margin-top:12px;font-size:13px}'+
    '.wcagree input{width:auto;margin-top:3px}.wcbtn{display:block;width:100%;background:#ff9900;border:0;border-radius:8px;padding:13px;font:800 15px Inter,Arial,sans-serif;cursor:pointer;margin-top:12px}'+
    '.wcbtn.sec{background:#eef2f7}.wcbtn:disabled{opacity:.6;cursor:wait}.wcerr{color:#b12704;font-weight:600;margin-top:8px}.wcok{text-align:center;padding:10px 0}.wcok h4{font-size:19px;margin:6px 0;color:#067d62}'+
    '.wtpe-atc{display:none}.wtpe-atc.on{display:inline-flex}.wcnote{font-size:12px;color:#565959;margin-top:6px}';

  var fab, ov, panel, view = 'cart';
  function build(){
    if(panel) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    fab = document.createElement('button'); fab.className = 'wcfab'; fab.type = 'button'; fab.onclick = open;
    ov = document.createElement('div'); ov.className = 'wcov'; ov.onclick = close;
    panel = document.createElement('div'); panel.className = 'wcp'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Cart');
    document.body.appendChild(fab); document.body.appendChild(ov); document.body.appendChild(panel);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
  }
  function badge(){
    if(!panel) return;
    var c = load(), n = 0; c.forEach(function(i){ n += i.q; });
    fab.innerHTML = '🛒 Cart<b>' + n + '</b>';
    fab.style.display = (enabled() && n > 0) ? 'block' : 'none';
    /* home page par Share/WhatsApp/Call buttons ke upar rakho, warna neeche kone me */
    fab.style.bottom = document.querySelector('.wtp-share-fab,.float-cta') ? '216px' : '16px';
  }
  function open(){ if(!enabled()) return; build(); view = 'cart'; render(); ov.classList.add('open'); panel.classList.add('open'); }
  function close(){ if(!panel) return; ov.classList.remove('open'); panel.classList.remove('open'); }
  window.wtpeOpenCart = open;

  function head(t){ return '<div class="wch"><h3>' + t + '</h3><button type="button" aria-label="Close" data-a="close">×</button></div>'; }
  function totalsHTML(t){
    return '<div class="wct"><div><span>Products</span><span>' + rupee(t.sub) + '</span></div>' +
      '<div><span>Shipping</span><span>' + rupee(t.ship) + '</span></div>' +
      '<div><span>GST</span><span>' + rupee(t.gst) + '</span></div>' +
      (t.payfee > 0 ? '<div><span>Online payment charges (' + PAY.pct + '%)</span><span>' + rupee(t.payfee) + '</span></div>' : '') +
      '<div class="g"><span>Total</span><span>' + rupee(t.total) + '</span></div></div>';
  }

  function render(){
    var c = load(), h = '';
    if(view === 'cart'){
      h += head('🛒 Your Cart') + '<div class="wcb">';
      if(!c.length){ h += '<p>Your cart is empty.</p></div>'; panel.innerHTML = h; return; }
      c.forEach(function(it, i){
        h += '<div class="wci">' + (it.img ? '<img src="' + esc(it.img) + '" alt="">' : '') +
          '<div class="t"><div>' + esc(it.n) + '</div><span class="pr">' + rupee(it.p) + '</span> <small>+ GST</small>' +
          '<div class="wcq"><button type="button" data-a="dec" data-i="' + i + '">−</button><b>' + it.q + '</b>' +
          '<button type="button" data-a="inc" data-i="' + i + '">+</button><button type="button" class="rm" data-a="rm" data-i="' + i + '">Remove</button></div></div></div>';
      });
      var t = totals(c);
      h += totalsHTML(t) + '<p class="wcnote">Dispatch within ' + t.disp + ' working days · GST invoice included</p>' +
        '<button type="button" class="wcbtn" data-a="checkout">Checkout →</button></div>';
    } else if(view === 'form'){
      var s = {}; try{ s = JSON.parse(ls('wtpe_ship') || '{}'); }catch(e){}
      var f = function(id, lab, type, extra){ return '<label for="wc_' + id + '">' + lab + '</label><input id="wc_' + id + '" type="' + (type || 'text') + '" value="' + esc(s[id] || '') + '" ' + (extra || '') + '>'; };
      h += head('Delivery details') + '<div class="wcb wcf">' +
        f('name', 'Full name *', 'text', 'autocomplete="name" maxlength="80"') +
        '<div class="row"><div>' + f('phone', 'Mobile *', 'tel', 'inputmode="numeric" maxlength="10" autocomplete="tel-national"') + '</div><div>' + f('email', 'Email *', 'email', 'autocomplete="email" maxlength="100"') + '</div></div>' +
        '<label for="wc_addr">Full address *</label><textarea id="wc_addr" rows="3" maxlength="300" autocomplete="street-address">' + esc(s.addr || '') + '</textarea>' +
        '<div class="row"><div>' + f('city', 'City *', 'text', 'maxlength="60"') + '</div><div>' + f('pin', 'Pincode *', 'text', 'inputmode="numeric" maxlength="6"') + '</div></div>' +
        f('state', 'State *', 'text', 'maxlength="40"') +
        '<div class="row"><div>' + f('gstin', 'GSTIN (optional)', 'text', 'maxlength="15" style="text-transform:uppercase"') + '</div><div>' + f('biz', 'Business name (for GST)', 'text', 'maxlength="100"') + '</div></div>' +
        totalsHTML(totals(c)) +
        '<label class="wcagree"><input type="checkbox" id="wc_agree"><span>I understand that orders <b>cannot be cancelled or refunded</b> after placing. Damaged or wrong items are replaced only if reported within 48 hours with an unboxing video. <a href="/cancellation-refund-policy.html" target="_blank">Read policy</a></span></label>' +
        '<div class="wcerr" id="wc_err"></div>' +
        '<button type="button" class="wcbtn" id="wc_place" data-a="place">' + placeLabel(c) + '</button>' +
        '<button type="button" class="wcbtn sec" data-a="back">← Back to cart</button></div>';
    }
    panel.innerHTML = h;
  }

  function val(id){ var e = document.getElementById('wc_' + id); return e ? String(e.value || '').trim() : ''; }
  function validate(){
    var d = { name: val('name'), phone: val('phone').replace(/\D/g, '').slice(-10), email: val('email'), addr: val('addr'),
              city: val('city'), pin: val('pin').replace(/\D/g, ''), state: val('state'), gstin: val('gstin').toUpperCase(), biz: val('biz') };
    ls('wtpe_ship', JSON.stringify(d));
    if(d.name.length < 2) return 'Please enter your name.';
    if(!/^[6-9]\d{9}$/.test(d.phone)) return 'Please enter a valid 10-digit mobile number.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'Please enter a valid email address.';
    if(d.addr.length < 10) return 'Please enter your full address.';
    if(d.city.length < 2) return 'Please enter your city.';
    if(!/^[1-9]\d{5}$/.test(d.pin)) return 'Please enter a valid 6-digit pincode.';
    if(d.state.length < 2) return 'Please enter your state.';
    if(d.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(d.gstin)) return 'GSTIN looks invalid (15 characters).';
    if(!document.getElementById('wc_agree').checked) return 'Please tick the policy box to continue.';
    return d;
  }

  function jsonp(url, cb){
    var fn = 'wco_' + Math.floor(Math.random() * 1e9), sc = document.createElement('script'), done = false;
    function fin(r){ if(done) return; done = true; try{ delete window[fn]; sc.remove(); }catch(e){} cb(r); }
    window[fn] = fin; sc.src = url + '&callback=' + fn; sc.onerror = function(){ fin({ ok: false, error: 'network' }); };
    document.body.appendChild(sc); setTimeout(function(){ fin({ ok: false, error: 'timeout' }); }, 25000);
  }

  function place(){
    var d = validate(), err = document.getElementById('wc_err');
    if(typeof d === 'string'){ err.textContent = d; return; }
    err.textContent = '';
    var c = load(), btn = document.getElementById('wc_place');
    btn.disabled = true; btn.textContent = 'Placing your order…';
    var items = c.map(function(i){ return { n: i.k, q: i.q }; });
    var u = ORDER_URL + '?action=createOrder&items=' + encodeURIComponent(JSON.stringify(items));
    Object.keys(d).forEach(function(k){ u += '&' + k + '=' + encodeURIComponent(d[k]); });
    u += '&agree=1&page=' + encodeURIComponent(location.pathname);
    jsonp(u, function(r){
      if(!r || !r.ok){
        btn.disabled = false; btn.textContent = placeLabel(c);
        var m = { network: 'Could not connect. Please check your internet and try again.', timeout: 'The server did not respond. Please try again.',
                  busy: 'We are receiving many orders right now. Please try again in 2 minutes.', quote: 'Some items are now available on quotation only: ', notfound: 'Some items are no longer available: ' };
        err.textContent = (m[r && r.error] || ('Order could not be placed: ' + ((r && r.error) || 'unknown'))) + ((r && r.items) ? r.items.join(', ') : '');
        return;
      }
      save([]);
      try{ /* "My Orders" ke liye is device par order yaad rakho */
        var mo = JSON.parse(ls('wtpe_orders') || '[]'); if(!Array.isArray(mo)) mo = [];
        var cnt = 0; c.forEach(function(i){ cnt += i.q; });
        mo.push({ id: r.orderId, date: new Date().toLocaleDateString('en-IN'), total: r.total, items: cnt, disp: r.disp, phone: d.phone });
        ls('wtpe_orders', JSON.stringify(mo.slice(-30)));
      }catch(e){}
      if(r.rzp){ LAST = { r: r, d: d }; remember(r.orderId, { rzp: r.rzp }); return pay(r, d); }
      if(r.payError) return screen('Payment could not start', '⚠️', 'Your order is saved, but online payment could not start right now. Please message us on WhatsApp with your Order ID and we will send you a payment link.', r,
        waBtn('Hello WTPESTORE, online payment did not start for order ' + r.orderId + '. Total ' + rupee(r.total) + '. Please send a payment link.'));
      var wa = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent('Hello WTPESTORE, I have placed order ' + r.orderId + '. Total ' + rupee(r.total) + '. Please share payment details.');
      panel.innerHTML = head('Order received ✅') + '<div class="wcb"><div class="wcok"><div style="font-size:40px">✅</div><h4>Order ID: ' + esc(r.orderId) + '</h4>' +
        '<p>Thank you! Your order has been placed.</p></div>' + totalsHTML(r) +
        '<p class="wcnote">Our team will contact you shortly for payment and dispatch. For a faster response, message us on WhatsApp.</p>' +
        '<a class="wcbtn" style="text-align:center;text-decoration:none;color:#111" href="' + wa + '" target="_blank" rel="noopener">💬 Confirm on WhatsApp</a></div>';
    });
  }

  function placeLabel(c){ return PAY.online ? ('Place Order & Pay ' + rupee(totals(c).total)) : 'Place Order'; }

  /* ---------- Razorpay ---------- */
  var LAST = null;
  function remember(id, extra){
    try{ var mo = JSON.parse(ls('wtpe_orders') || '[]'); mo.forEach(function(o){ if(o.id === id){ for(var k in extra) o[k] = extra[k]; } }); ls('wtpe_orders', JSON.stringify(mo)); }catch(e){}
  }
  function loadRzp(cb){
    if(window.Razorpay) return cb(true);
    var sc = document.createElement('script'); sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
    sc.onload = function(){ cb(!!window.Razorpay); }; sc.onerror = function(){ cb(false); }; document.head.appendChild(sc);
  }
  function screen(title, icon, msg, r, buttons){
    build(); ov.classList.add('open'); panel.classList.add('open');
    panel.innerHTML = head(title) + '<div class="wcb"><div class="wcok"><div style="font-size:40px">' + icon + '</div><h4>Order ID: ' + esc(r.orderId) + '</h4><p>' + msg + '</p></div>' +
      (r.sub != null ? totalsHTML(r) : '<div class="wct"><div class="g"><span>Total</span><span>' + rupee(r.total) + '</span></div></div>') + buttons + '</div>';
  }
  function waBtn(text){ return '<a class="wcbtn sec" style="text-align:center;text-decoration:none;color:#111" href="https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">💬 WhatsApp us</a>'; }
  function pay(r, d){
    LAST = { r: r, d: d };
    loadRzp(function(ok){
      if(!ok){ return screen('Payment not started', '⚠️', 'Your order is saved, but the payment window could not open. Please check your internet and tap Pay Now.', r,
                   '<button type="button" class="wcbtn" data-a="payagain">Pay Now ' + rupee(r.total) + '</button>' + waBtn('Hello WTPESTORE, I need help paying for order ' + r.orderId)); }
      var rz = new window.Razorpay({
        key: r.rzp.key, amount: r.rzp.amount, currency: 'INR', order_id: r.rzp.order_id,
        name: 'WTPESTORE', description: 'Order ' + r.orderId,
        prefill: { name: (d && d.name) || '', email: (d && d.email) || '', contact: (d && d.phone) || '' },
        notes: { order_id: r.orderId }, theme: { color: '#0b2545' },
        handler: function(resp){
          screen('Confirming payment…', '⏳', 'Please wait, do not close this page.', r, '');
          jsonp(ORDER_URL + '?action=verifyPayment&id=' + encodeURIComponent(r.orderId) + '&rzp_order_id=' + encodeURIComponent(resp.razorpay_order_id) +
                '&rzp_payment_id=' + encodeURIComponent(resp.razorpay_payment_id) + '&rzp_signature=' + encodeURIComponent(resp.razorpay_signature), function(v){
            if(v && v.ok){ remember(r.orderId, { paid: true }); LAST = null;
              return screen('Payment successful ✅', '✅', 'Thank you! We have received your payment. A confirmation email is on its way. We will share the courier tracking number once your order ships.', r,
                '<button type="button" class="wcbtn sec" data-a="close">Continue shopping</button>'); }
            screen('Payment received — confirming', '⏳', 'Your payment went through. Our system will confirm it within 15 minutes. Payment ID: ' + esc(resp.razorpay_payment_id), r,
              waBtn('Hello WTPESTORE, I paid for order ' + r.orderId + '. Payment ID ' + resp.razorpay_payment_id));
          });
        },
        modal: { ondismiss: function(){
          screen('Payment pending', '🕒', 'Your order is saved but payment is not complete yet. Tap Pay Now to complete it.', r,
            '<button type="button" class="wcbtn" data-a="payagain">Pay Now ' + rupee(r.total) + '</button>' + waBtn('Hello WTPESTORE, I need help paying for order ' + r.orderId));
        } }
      });
      rz.on('payment.failed', function(){ /* Razorpay khud retry dikhata hai; band karne par ondismiss chalega */ });
      rz.open();
    });
  }
  /* My Orders se "Pay Now" */
  window.wtpePayAgain = function(id){
    try{ var mo = JSON.parse(ls('wtpe_orders') || '[]'), o = mo.filter(function(x){ return x.id === id; })[0], s = JSON.parse(ls('wtpe_ship') || '{}');
      if(o && o.rzp){ pay({ orderId: o.id, total: o.total, rzp: o.rzp }, s); return true; } }catch(e){}
    return false;
  };

  function onClick(e){
    var a = e.target.closest && e.target.closest('[data-a]'); if(!a || !panel.contains(a)) return;
    var c = load(), i = +a.getAttribute('data-i'), act = a.getAttribute('data-a');
    if(act === 'close') return close();
    if(act === 'inc'){ c[i].q = Math.min(MAX_QTY, c[i].q + 1); save(c); render(); }
    if(act === 'dec'){ c[i].q--; if(c[i].q < 1) c.splice(i, 1); save(c); render(); }
    if(act === 'rm'){ c.splice(i, 1); save(c); render(); }
    if(act === 'checkout'){ view = 'form'; render(); }
    if(act === 'back'){ view = 'cart'; render(); }
    if(act === 'place') place();
    if(act === 'payagain' && LAST) pay(LAST.r, LAST.d);
  }

  function init(){
    if(!enabled()) return;
    build(); panel.addEventListener('click', onClick); badge();
    jsonp(ORDER_URL + '?action=payInfo', function(r){ if(r && r.ok){ PAY.online = !!r.online; if(r.feePct) PAY.pct = r.feePct; if(panel.classList.contains('open')) render(); } });
    var bs = document.querySelectorAll('.wtpe-atc'); for(var i = 0; i < bs.length; i++){ bs[i].classList.add('on'); bs[i].style.display = ''; }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
