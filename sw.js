/* WTPESTORE Service Worker v3
 * ------------------------------------------------------------------
 * JAB BHI WEBSITE UPDATE KAREIN: neeche 'wtpe-v3' ko 'wtpe-v4' kar dein
 * (phir v5, v6...). Isse sabke phone/app me naya version apne aap aa jayega.
 * ------------------------------------------------------------------ */
var CACHE = 'wtpe-v3';
var CORE = ['/', '/index.html', '/catalogues.html', '/plant-calculators.html',
  '/icons/icon-192.png', '/icons/icon-512.png', '/apple-touch-icon.png', '/manifest.json'];
/* Ye pages kabhi cache nahi hote — hamesha fresh (admin tools + live data)
   .json bhi yahan hai: catalogues/list.json jaisi list turant update dikhe */
function isAlwaysFresh(url) {
  return /\/admin[-\w]*\.html$/i.test(url.pathname)
      || /\/(quotation|proforma-invoice|payment|instagram-post)\.html$/i.test(url.pathname)
      || /\.json$/i.test(url.pathname);
}
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () {
    return self.clients.claim();
  }).then(function () {
    /* sabhi khuli tabs ko batao ki naya version aa gaya */
    return self.clients.matchAll({ type: 'window' }).then(function (list) {
      list.forEach(function (c) { c.postMessage({ type: 'WTPE_UPDATED', version: CACHE }); });
    });
  }));
});
/* page se "turant update karo" ka message */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  /* Google Sheet / Apps Script / Worker => hamesha network (live price & leads) */
  if (url.hostname.indexOf('google') > -1 || url.hostname.indexOf('workers.dev') > -1 || url.hostname.indexOf('script.google') > -1) return;
  /* Admin tools, documents & .json list => hamesha network, kabhi purana nahi */
  if (url.origin === location.origin && isAlwaysFresh(url)) {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(function () { return caches.match(req); }));
    return;
  }
  /* HTML => network-first (site hamesha fresh) */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(fetch(req).then(function (r) {
      var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return r;
    }).catch(function () {
      return caches.match(req).then(function (m) { return m || caches.match('/index.html'); });
    }));
    return;
  }
  /* images/css/js/pdf => stale-while-revalidate
     (turant cache se dikhta hai, par background me naya bhi utar lete hain,
      isliye agli baar apne aap naya mil jaata hai) */
  e.respondWith(caches.match(req).then(function (m) {
    var net = fetch(req).then(function (r) {
      if (r && r.status === 200 && url.origin === location.origin) {
        var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); });
      }
      return r;
    }).catch(function () { return m; });
    return m || net;
  }));
});
