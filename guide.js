'use strict';
const stories=JSON.parse(document.getElementById('catalog').textContent);
const navigationData=JSON.parse(document.getElementById('navigation-data').textContent);
const $=id=>document.getElementById(id);
function readSaved(){try{const x=JSON.parse(localStorage.getItem('paris-progress')||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}}
const saved=readSaved(),done=new Set(Array.isArray(saved.done)?saved.done:[]);
let selected=stories.find(s=>s.id===saved.selected)||stories.find(s=>s.id==='eiffel')||stories[0],variant=saved.variant==='short'?'short':'long';
let journey=navigationData.journeys.find(j=>j.id===saved.journey&&j.ids.includes(selected.id))?.id||'free';
let speed=[0.85,1,1.15,1.3].includes(saved.speed)?saved.speed:1;
function save(){try{localStorage.setItem('paris-progress',JSON.stringify({selected:selected.id,variant,journey,speed,done:[...done]}))}catch{}}
const duration=(s,v)=>{const t=Math.round(s.durations[v]);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
const route=()=>navigationData.journeys.find(j=>j.id===journey);
const group=()=>route()?route().ids.map(id=>stories.find(s=>s.id===id)):stories.filter(s=>!!s.indoor===!!selected.indoor);
function choose(s){selected=s;if(route()&&!route().ids.includes(s.id))journey='free';render();$('finder-panel').hidden=true;$('place').scrollIntoView({behavior:'smooth',block:'start'})}
let playbackStorage;try{playbackStorage=localStorage}catch{playbackStorage={getItem(){return null},setItem(){}}}
const playback=ParisPlayback.attach($('audio'),{storage:playbackStorage,onResume(time){$('resume-note').textContent=time?'Сохранено '+Math.floor(time/60)+':'+String(Math.floor(time%60)).padStart(2,'0')+' · нажмите «Слушать», чтобы продолжить.':''}});
const navigation=ParisNavigation.mount({stories,data:navigationData,onSelect:choose});
function updatePlayButton(){$('listen').textContent=$('audio').paused?'▶ Слушать':'Ⅱ Пауза';$('listen').setAttribute('aria-label',$('audio').paused?'Слушать: '+selected.place:'Пауза: '+selected.place)}
function render(){
 save();const queue=group(),i=queue.indexOf(selected),next=queue[i+1];
 $('journey-select').value=journey;$('journey-note').textContent=route()?.note||'';
 $('place').textContent=selected.place;$('counter').textContent=(selected.indoor?'ЛУВР':'ПАРИЖ')+' · '+(journey==='free'?'СВОБОДНО':(i+1)+' / '+queue.length);$('look').textContent=selected.look;$('duo').textContent=selected.duo;
 $('room').textContent=selected.indoor?selected.wing+' · уровень '+selected.level+' · зал '+selected.room:'';
 $('museum-route').hidden=!selected.indoor;
 $('progress-label').textContent='Отмечено '+queue.filter(s=>done.has(s.id)).length+' из '+queue.length+(journey==='free'?' в этом разделе':' на маршруте');
 $('next-title').textContent=next?'Далее: '+next.place:(journey==='free'?'Последняя история в этом разделе':'Маршрут завершён');
 // A skipped work changes the next destination: never reuse the full-tour hint blindly.
 const museum=stories.filter(s=>s.indoor),canonicalNext=museum[museum.indexOf(selected)+1];
 $('next-hint').textContent=next?(selected.indoor?(next===canonicalNext?selected.next_hint:next.wing+' · уровень '+next.level+' · зал '+next.room+'. Сверяйтесь с планом и указателями; при закрытом проходе спросите сотрудника.'):('Следующая аудиоостановка. Откройте её и нажмите «Идти сюда».')):'Можно закончить прогулку или выбрать другое место. Ничего не запускается автоматически.';
 for(const v of ['short','long']){$(v).setAttribute('aria-pressed',String(v===variant));$(v).textContent=(v==='short'?'Коротко':'Подробно')+' · '+duration(selected,v)}
 const src=selected.audio_urls[variant];playback.select(src);$('audio').playbackRate=speed;$('speed').value=String(speed);$('download').href=src;$('status').textContent='';$('status').className='';
 $('transcript').replaceChildren();for(const text of selected[variant].split('\n\n')){const p=document.createElement('p');p.textContent=text;$('transcript').append(p)}
 $('sources').replaceChildren();for(const source of selected.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.title;a.target='_blank';a.rel='noopener noreferrer';$('sources').append(a)}
 $('done').textContent=done.has(selected.id)?'✓ Прослушано':'Прослушано';$('done').setAttribute('aria-pressed',String(done.has(selected.id)));
 $('previous').disabled=i===0;$('next').disabled=!next;$('next').setAttribute('aria-label',next?'Следующая остановка: '+next.place:'Маршрут завершён');
 navigation.renderSelected(selected);renderMap();updatePlayButton();
 if('mediaSession' in navigator&&typeof MediaMetadata!=='undefined'){
  navigator.mediaSession.metadata=new MediaMetadata({title:selected.place,artist:'Париж на двоих · Дмитрий',album:variant==='short'?'Короткая история':'Подробная история'});
 }
}
$('listen').onclick=async()=>{const src=$('audio').currentSrc||$('audio').src;if(!$('audio').paused){$('audio').pause();return}try{if($('audio').error)$('audio').load();await $('audio').play();if(src===($('audio').currentSrc||$('audio').src))$('status').textContent=''}catch(error){if(error.name==='AbortError')return;$('status').textContent='Не удалось включить запись. Повторите нажатие; без сети нужен заранее скачанный набор.'}};
for(const event of ['play','pause','ended'])$('audio').addEventListener(event,updatePlayButton);
$('audio').addEventListener('ended',()=>{$('resume-note').textContent='Рассказ закончился. Можно отметить «Прослушано» и перейти дальше.'});
$('speed').onchange=()=>{speed=Number($('speed').value);$('audio').playbackRate=speed;save()};
$('rewind').onclick=()=>playback.seek(-15);$('forward').onclick=()=>playback.seek(15);$('restart').onclick=()=>playback.restart();
for(const v of ['short','long'])$(v).onclick=()=>{variant=v;render()};
$('journey-select').onchange=()=>{journey=$('journey-select').value;if(route())selected=stories.find(s=>s.id===route().ids[0]);render()};
for(const [id,delta] of [['previous',-1],['next',1]])$(id).onclick=()=>{const queue=group(),s=queue[queue.indexOf(selected)+delta];if(s)choose(s)};
$('done').onclick=()=>{done.has(selected.id)?done.delete(selected.id):done.add(selected.id);render()};
$('museum-minutes').textContent=Math.round(stories.filter(s=>s.indoor).reduce((total,s)=>total+s.durations.long,0)/60);
$('open-offline').onclick=()=>{$('offline-setup').open=true;$('offline-panel').scrollIntoView({behavior:'smooth',block:'start'})};
$('audio').addEventListener('error',()=>{$('status').className='error';$('status').textContent='Эта запись недоступна. Подключитесь к сети и скачайте набор через «Без интернета», затем повторите.'});
function renderMap(){
 $('city-route').hidden=selected.indoor;if(selected.indoor)return;
 const city=stories.filter(s=>!s.indoor),svg=$('city-map'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();$('city-map-links').replaceChildren();
 const bounds={west:Math.min(...city.map(s=>s.lon)),east:Math.max(...city.map(s=>s.lon)),south:Math.min(...city.map(s=>s.lat)),north:Math.max(...city.map(s=>s.lat))};
 city.forEach((s,i)=>{const x=40+(s.lon-bounds.west)/(bounds.east-bounds.west)*680,y=40+(bounds.north-s.lat)/(bounds.north-bounds.south)*230;
 const a=document.createElementNS(ns,'a');a.setAttribute('href','#place');a.setAttribute('aria-label',s.place);if(s.id===selected.id)a.classList.add('selected');
 const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r',18);const t=document.createElementNS(ns,'text');t.setAttribute('x',x);t.setAttribute('y',y+5);t.setAttribute('text-anchor','middle');t.style.fill='white';t.textContent=i+1;a.append(c,t);svg.append(a);
 const link=document.createElement('a');link.href='#place';link.textContent=(i+1)+'. '+s.place;$('city-map-links').append(link);
 for(const target of [a,link])target.onclick=e=>{e.preventDefault();choose(s)};
 });
}
if('mediaSession' in navigator){for(const [action,handler] of [['play',()=>$('audio').play().catch(()=>{})],['pause',()=>$('audio').pause()],['seekbackward',()=>playback.seek(-15)],['seekforward',()=>playback.seek(15)]]){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}}
render();
if(location.protocol==='file:')$('offline-status').textContent='Для сохранения на iPhone нужна HTTPS-ссылка в Safari. Из архива слушайте отдельные MP3.';
