/* Persist separately for each versioned recording; old audio never inherits a seek. */
(function(root){
  const key='paris-playback-v1';
  function read(storage){try{const data=JSON.parse(storage.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}}
  function position(value,duration){return Number.isFinite(value)&&value>0&&Number.isFinite(duration)&&value<duration-3?value:0}
  function attach(audio,{storage,onResume=()=>{}}){
    let active='',restoring=false,last=0;
    function persist(){if(!active||restoring||!Number.isFinite(audio.duration))return;try{const data=read(storage);data[active]=position(audio.currentTime,audio.duration);storage.setItem(key,JSON.stringify(data))}catch{}}
    function select(src){if(active===src&&!audio.error)return;persist();audio.pause();active=src;restoring=true;audio.src=src;audio.preload='metadata';onResume(0)}
    audio.addEventListener('loadedmetadata',()=>{if(!restoring)return;const time=position(read(storage)[active],audio.duration);audio.currentTime=time;restoring=false;onResume(time)});
    for(const event of ['pause','seeked','ended'])audio.addEventListener(event,persist);
    audio.addEventListener('timeupdate',()=>{if(Date.now()-last>3000){persist();last=Date.now()}});
    root.addEventListener?.('pagehide',persist);
    root.document?.addEventListener('visibilitychange',()=>{if(root.document.hidden)persist()});
    return {select,persist,restart(){audio.currentTime=0;persist();onResume(0)},seek(delta){if(Number.isFinite(audio.duration)){audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta));persist()}}};
  }
  root.ParisPlayback={read,position,attach};
})(globalThis);
