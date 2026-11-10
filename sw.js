const CACHE = 'ricettario-v16';
const ASSETS = ['./','./index.html','./style.css','./manifest.webmanifest','./js/app.js','./js/api.js','./js/local-recipes.js','./js/db.js','./js/ui.js','./icons/icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===location.origin) e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res.ok&&res.type==='basic'){const clone=res.clone();caches.open(CACHE).then(c=>c.put(req,clone));}
    return res;
  })));
});
