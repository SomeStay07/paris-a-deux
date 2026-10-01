// Full cached audio must support Safari's byte-range requests and seeking.
async function rangedResponse(request,response){
 const range=request.headers.get('range');
 if(!range)return response;
 const data=await response.arrayBuffer(),size=data.byteLength;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);
 const invalid=()=>new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
 if(!match||(!match[1]&&!match[2]))return invalid();
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 let end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return invalid();
 const headers=new Headers(response.headers);
 headers.delete('Content-Encoding');
 headers.set('Content-Length',String(end-start+1));
 headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
 headers.set('Accept-Ranges','bytes');
 return new Response(data.slice(start,end+1),{status:206,headers});
}
if(typeof module!=='undefined')module.exports={rangedResponse};
