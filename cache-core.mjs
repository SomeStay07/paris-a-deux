export const CONTENT_CACHE='paris-content-v1';
export async function validResponse(response, asset){
 if(!response||!response.ok)return false;
 const data=await response.clone().arrayBuffer();
 if(data.byteLength!==asset.bytes)return false;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
 return hash===asset.sha256;
}
export async function saveAsset(cache,asset,{fetcher=fetch,signal}={}){
 if(await validResponse(await cache.match(asset.url),asset))return false;
 const response=await fetcher(asset.url,{cache:'no-store',signal,headers:{'X-Paris-Download':'1'}});
 if(!await validResponse(response,asset))throw new Error('invalid');
 await cache.put(asset.url,response);
 return true;
}
