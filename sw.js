/* WTPESTORE Service Worker v1 */
var CACHE='wtpe-v1';
var CORE=['/','/index.html','/catalogues.html','/plant-calculators.html',
  '/icons/icon-192.png','/icons/icon-512.png','/apple-touch-icon.png','/manifest.json'];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE).catch(function(){});}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  /* Google Sheet / API / Worker => hamesha network (live price) */
  if(url.hostname.indexOf('google')>-1||url.hostname.indexOf('workers.dev')>-1||url.hostname.indexOf('script.google')>-1)return;
  /* HTML => network-first (site hamesha fresh) */
  if(req.mode==='navigate'||(req.headers.get('accept')||'').indexOf('text/html')>-1){
    e.respondWith(fetch(req).then(function(r){
      var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});return r;
    }).catch(function(){return caches.match(req).then(function(m){return m||caches.match('/index.html');});}));
    return;
  }
  /* images/css/js/pdf => cache-first */
  e.respondWith(caches.match(req).then(function(m){
    return m||fetch(req).then(function(r){
      if(r&&r.status===200&&url.origin===location.origin){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});}
      return r;
    }).catch(function(){return m;});
  }));
});
