importScripts('./range.js');
const SHELL='paris-shell-5f8a3dfe8a948f0326f9', CONTENT='paris-content-v1';
const root=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch(new URL('offline-manifest.json',root),{cache:'no-store'});
 if(!response.ok)throw new Error('Manifest unavailable');
 const manifest=await response.clone().json();
 if(manifest.version!=='5f8a3dfe8a948f0326f9')throw new Error('Deployment changed; retry update');
 const cache=await caches.open(SHELL);
 for(const asset of manifest.assets.filter(a=>a.kind==='shell')){
  const r=await fetch(new URL(asset.url,root),{cache:'no-store'});
  if(!r.ok)throw new Error('Incomplete app shell');
  const buf=await r.clone().arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf)),b=>b.toString(16).padStart(2,'0')).join('');
  if(buf.byteLength!==asset.bytes||hash!==asset.sha256)throw new Error('Invalid app shell');
  await cache.put(new URL(asset.url,root),r);
 }
 await cache.put(new URL('offline-manifest.json',root),response);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('paris-shell-')&&name!==SHELL)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return;
 if(event.request.headers.get('X-Paris-Download')==='1')return;
 event.respondWith((async()=>{
  const shell=await caches.open(SHELL);
  const cached=await shell.match(event.request);
  if(cached)return cached;
  if(event.request.mode==='navigate'&&(url.pathname===root.pathname||url.pathname===root.pathname+'index.html')){
   const page=await shell.match(new URL('index.html',root));
   if(page)return page;
  }
  const content=await caches.open(CONTENT);
  const audio=await content.match(event.request.url);
  if(audio)return rangedResponse(event.request,audio);
  return fetch(event.request);
 })());
});
