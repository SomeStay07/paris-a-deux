import {CONTENT_CACHE,validResponse,saveAsset,saveBatch} from './cache-core.mjs';
const $=id=>document.getElementById(id);
let manifest,working=false,controller;
const say=text=>{$('offline-status').textContent=text};
const scopeAssets=scope=>manifest.assets.filter(a=>a.kind==='shell'||scope==='all'||a.group==='museum');
const busy=value=>{working=value;document.querySelectorAll('[data-offline]').forEach(b=>b.disabled=value);$('cancel-download').hidden=!value;};
async function inspect(scope){
 const shell=await caches.open('paris-shell-'+manifest.version),content=await caches.open(CONTENT_CACHE);
 const assets=scopeAssets(scope);let count=0;
 for(const a of assets){if(await validResponse(await (a.kind==='shell'?shell:content).match(a.url),a))count++;}
 return {count,total:assets.length,complete:count===assets.length};
}
async function status(){
 if(working||!manifest)return;
 const all=await inspect('all'),museum=await inspect('museum');
 say(all.complete?'Весь гид сохранён и проверен. Перед выходом проверьте его в авиарежиме.':museum.complete?'Лувр сохранён и проверен. Городские записи ещё не все скачаны.':'Гид ещё не готов целиком для прогулки без сети. Скачайте Лувр или весь гид заранее.');
}
async function download(scope){
 if(working||!manifest)return;busy(true);controller=new AbortController();
 const assets=scopeAssets(scope),content=await caches.open(CONTENT_CACHE),shell=await caches.open('paris-shell-'+manifest.version);
 say('Сохраняем и проверяем файлы. Не закрывайте приложение.');
 $('offline-progress').max=assets.length;$('offline-progress').value=0;$('offline-progress').hidden=false;
 try{
  if(navigator.storage?.persist)await navigator.storage.persist().catch(()=>false);
  await saveBatch(assets,(a,signal)=>saveAsset(a.kind==='shell'?shell:content,a,{signal}),done=>{
   $('offline-progress').value=done;say(`Сохраняем и проверяем: ${done} из ${assets.length}. Не закрывайте приложение.`);
  },controller);
  const check=await inspect(scope);
  if(!check.complete)throw new Error('incomplete');
  say((scope==='all'?'Весь гид':'Лувр')+' сохранён и проверен. Включите авиарежим, снова откройте гид и запустите другую запись.');
 }catch(error){
  say(error.name==='AbortError'?'Загрузка остановлена. Готовые файлы сохранены; нажмите скачать, чтобы продолжить.':error.name==='QuotaExceededError'?'Не хватает места на телефоне. Освободите память и повторите загрузку. Гид ещё не готов офлайн.':'Загрузка не завершена. Проверьте соединение и повторите: готовые файлы сохранятся.');
 }finally{busy(false)}
}
$('cancel-download').onclick=()=>controller?.abort();
document.querySelectorAll('[data-offline]').forEach(b=>b.onclick=()=>download(b.dataset.offline));
$('check-offline').onclick=async()=>{if(working)return;say('Проверяем сохранённые файлы…');await status()};
window.addEventListener('online',()=>{$('connection').textContent='Подключение к сети есть'});
window.addEventListener('offline',()=>{$('connection').textContent='Без сети · доступны сохранённые записи'});
$('connection').textContent=navigator.onLine?'Подключение к сети есть':'Без сети · доступны сохранённые записи';
(async()=>{
 if(!('serviceWorker' in navigator)||!window.isSecureContext||location.protocol==='file:'){
  say('Для сохранения на iPhone откройте гид по HTTPS в Safari. Из распакованного архива слушайте отдельные MP3.');
  document.querySelectorAll('[data-offline],#check-offline').forEach(b=>b.disabled=true);return;
 }
 try{
  const registration=await navigator.serviceWorker.register('./sw.js');
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload()});
  function offerUpdate(){if(registration.waiting){$('update-app').hidden=false;$('update-app').onclick=()=>{reloading=true;registration.waiting.postMessage('ACTIVATE_UPDATE')}}}
  offerUpdate();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',offerUpdate));
  await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),20000))]);
  if(!navigator.serviceWorker.controller)await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),5000))]);
  const r=await fetch('./offline-manifest.json');if(!r.ok)throw new Error('manifest');manifest=await r.json();
  for(const b of document.querySelectorAll('[data-offline]')){
   const bytes=scopeAssets(b.dataset.offline).reduce((n,a)=>n+a.bytes,0);
   b.textContent+=' · '+(bytes/1024/1024).toFixed(1)+' МБ';b.disabled=false;
  }
  $('check-offline').disabled=false;await status();
 }catch(error){say('Офлайн-режим пока не готов. Подключитесь к сети и обновите страницу, затем повторите сохранение.');}
})();
