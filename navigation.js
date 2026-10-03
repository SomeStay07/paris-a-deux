/* Local place finder: no tracking, no API keys, no geolocation until a click. */
(function(root){
'use strict';
function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/œ/g,'oe').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function coordinate(p){return p.lat.toFixed(6)+', '+p.lon.toFixed(6)}
function links(p){
 const point=p.lat+','+p.lon, name=p.fr||p.place;
 return {
  apple:'https://maps.apple.com/?'+new URLSearchParams({ll:point,q:name}),
  google:'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:point}),
  appleWalk:'https://maps.apple.com/?'+new URLSearchParams({daddr:point,dirflg:'w'}),
  googleWalk:'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:point,travelmode:'walking'})
 };
}
function distance(a,b){
 const rad=x=>x*Math.PI/180, lat=rad(b.lat-a.lat),lon=rad(b.lon-a.lon);
 const h=Math.sin(lat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(lon/2)**2;
 return 6371000*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
function find(places,query,scope,position){
 const terms=normalize(query).split(' ').filter(Boolean);
 return places.filter(p=>(scope==='all'||(scope==='museum'?p.indoor:scope==='extra'?p.extra:scope==='audio'?!p.indoor&&!p.extra:!p.indoor))&&terms.every(t=>normalize([p.place,p.fr,p.room,p.wing,p.area,...(p.aliases||[])].join(' ')).includes(t)))
 .map(p=>({...p,metres:position&&!p.indoor?distance(position,p):null}))
 .sort((a,b)=>position?(a.metres??Infinity)-(b.metres??Infinity):0);
}
function mount({stories,data,onSelect}){
 const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e};
 const places=[...stories.map(s=>({...s,fr:data.labels[s.id]})),...data.extras.map(p=>({...p,extra:true}))];
 let position=null,request=0;
 const anchor=(text,url)=>{const a=make('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
 function maps(p,container){
  const urls=links(p),actions=make('div',null,'place-actions');
  for(const [text,key] of [['Apple Maps','apple'],['Google Maps','google'],['Пешком · Apple','appleWalk'],['Пешком · Google','googleWalk']]){const a=anchor(text,urls[key]);a.setAttribute('aria-label',text+' — '+p.place);actions.append(a)}
  container.append(actions);
 }
 function coordinates(p,container){
  const d=make('details'),sum=make('summary','Координаты · скопировать');d.append(sum);
  const input=make('input',null,'coordinates');input.readOnly=true;input.value=coordinate(p);input.setAttribute('aria-label','Координаты: '+p.place);input.onclick=()=>input.select();d.append(input);
  const b=make('button','Скопировать координаты'),actions=make('div',null,'place-actions'),status=make('p');status.setAttribute('role','status');
  b.onclick=async()=>{try{await navigator.clipboard.writeText(input.value);status.textContent='Координаты скопированы.'}catch{input.focus();input.select();status.textContent='Выделено: удерживайте текст и выберите «Скопировать».'}};
  actions.append(b);d.append(actions,status);container.append(d);
 }
 function indoor(p,container){
  container.append(make('p',p.wing+' · уровень '+p.level+' · зал '+p.room,'fr-name'));
  const details=make('details'),sum=make('summary','Показать сотруднику, если потерялись');details.append(sum);
  details.append(make('p',`Bonjour ! Nous cherchons « ${p.fr} », salle ${p.room}, aile ${p.wing}, niveau ${p.level}. Pouvez-vous nous indiquer le chemin, s’il vous plaît ?`,'staff-phrase'));container.append(details);
  const actions=make('div',null,'place-actions');actions.append(anchor('План Лувра · PDF',$('museum-map').href));container.append(actions);
 }
 function renderSelected(s){
  const p=places.find(p=>p.id===s.id),box=$('wayfinding');box.replaceChildren();box.append(make('p',p.fr,'fr-name'));
  if(p.indoor){indoor(p,box);box.append(make('p','Ищите зал по табличкам и плану. GPS не определяет положение внутри музея.'))}
  else{maps(p,box);coordinates(p,box);box.append(make('p','Метка — ориентир для рассказа. Маршрут строится во внешнем приложении карт.'))}
 }
 function renderResults(){
  const matches=find(places,$('place-search').value,$('place-scope').value,position),box=$('place-results');box.replaceChildren();
  $('finding-status').textContent='Найдено: '+matches.length+(position?' · городские точки по расстоянию, ближайшие сверху':'');
  if(!matches.length)box.append(make('p','Ничего не найдено. Измените запрос или выберите «Все места».'));
  for(const p of matches){
   const card=make('article',null,'finder-card');card.append(make('h3',p.place),make('p',p.fr,'fr-name'));
   const metric=p.metres===null?'':p.metres<1000?' · ≈'+Math.round(p.metres/50)*50+' м по прямой':' · ≈'+(p.metres/1000).toFixed(1)+' км по прямой';
   card.append(make('p',(p.extra?'Без аудио · '+p.area:p.indoor?'Аудио · внутри Лувра':'Есть аудиорассказ')+metric,'finder-meta'));
   if(p.indoor)indoor(p,card);else{card.append(make('p',p.note||p.look));maps(p,card);coordinates(p,card)}
   if(p.extra){const sources=make('details');sources.append(make('summary','Информация о месте'),anchor('Официальный сайт',p.url));if(p.coordinate_source)sources.append(make('span',' · '),anchor('Источник геометки',p.coordinate_source));card.append(sources)}
   else{const actions=make('div',null,'place-actions'),b=make('button','Открыть рассказ');b.setAttribute('aria-label','Открыть рассказ: '+p.place);b.onclick=()=>onSelect(stories.find(s=>s.id===p.id));actions.append(b);card.append(actions)}
   box.append(card);
  }
 }
 $('place-search').oninput=()=>{if($('place-search').value.trim())$('place-scope').value='all';renderResults()};
 $('place-scope').onchange=renderResults;
 $('open-finder').onclick=()=>{$('place-finder').open=true};
 $('clear-location').onclick=()=>{request++;position=null;$('clear-location').hidden=true;$('locate-me').disabled=false;$('nearby-status').textContent='Расстояния убраны. Можно снова выбрать место вручную.';renderResults()};
 $('locate-me').onclick=()=>{
  if(!navigator.geolocation){$('nearby-status').textContent='Геопозиция недоступна. Выберите место вручную — карты работают и без доступа к геопозиции гида.';return}
  const current=++request;const button=$('locate-me');button.disabled=true;$('nearby-status').textContent='Определяем положение… Разрешение запрашивает браузер.';
  const failure=error=>{if(current!==request)return;button.disabled=false;$('nearby-status').textContent=error.code===1?'Доступ к геопозиции не разрешён. Выберите место вручную или разрешите доступ в настройках браузера.':'Не удалось определить положение. Попробуйте у окна или на улице; все места можно выбрать вручную.'};
  try{navigator.geolocation.getCurrentPosition(result=>{
   if(current!==request)return;button.disabled=false;
   const {latitude:lat,longitude:lon,accuracy}=result.coords;
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){failure({code:2});return}
   position={lat,lon};$('place-scope').value='city';$('place-search').value='';$('clear-location').hidden=false;
   const far=distance(position,{lat:48.86,lon:2.33})>30000;
   $('nearby-status').textContent=(far?'Вы далеко от центра Парижа. ':'')+'Ближайшие точки сверху. Расстояния по прямой, не длина прогулки.'+(Number.isFinite(accuracy)?' Точность геопозиции около '+Math.round(accuracy)+' м.':'')+' Это разовый замер; при перемещении нажмите кнопку снова.';
   renderResults();
  },failure,{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}catch{failure({code:2})}
 };
 renderResults();return {renderSelected};
}
root.ParisNavigation={normalize,links,distance,find,mount};
})(globalThis);
