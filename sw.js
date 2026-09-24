const APP_CACHE='supertexto-app-v2',RUNTIME_CACHE='supertexto-runtime-v2';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(APP_CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>![APP_CACHE,RUNTIME_CACHE].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url),local=u.origin===self.location.origin,ocr=/(jsdelivr\.net|projectnaptha\.com|tessdata)/i.test(u.hostname+u.pathname);
  if(local)e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(APP_CACHE).then(c=>c.put(e.request,copy));return r;})));
  else if(ocr)e.respondWith(caches.open(RUNTIME_CACHE).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;const r=await fetch(e.request);try{await c.put(e.request,r.clone());}catch(_){}return r;}));
});
