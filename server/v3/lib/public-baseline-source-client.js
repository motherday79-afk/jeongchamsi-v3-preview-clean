'use strict';

const DATA_GO_BASE='https://www.data.go.kr';
const PAGE_TIMEOUT_MS=12_000;
const FILE_TIMEOUT_MS=60_000;
const MAX_FILE_BYTES=180*1024*1024;

function clean(value=''){return String(value??'').trim();}
function charsetFromContentType(contentType=''){
  const m=String(contentType||'').match(/charset\s*=\s*['"]?([^;\s'"]+)/i);return m?m[1].toLowerCase():'';
}
function decodePublicText(bytes,contentType=''){
  const buffer=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes||[]);
  const hint=charsetFromContentType(contentType);
  const strip=s=>String(s||'').replace(/^\uFEFF/,'');
  if(/euc-?kr|cp949|ks_c_5601/i.test(hint)){
    try{return strip(new TextDecoder('euc-kr').decode(buffer));}catch{return strip(buffer.toString('utf8'));}
  }
  try{return strip(new TextDecoder('utf-8',{fatal:true}).decode(buffer));}
  catch{try{return strip(new TextDecoder('euc-kr').decode(buffer));}catch{return strip(buffer.toString('utf8'));}}
}
function extractFileDataDetailPk(html='',publicDataPk=''){
  const text=String(html||''),pk=String(publicDataPk||'').replace(/[^0-9]/g,'');
  const patterns=[
    /fn_fileDataDown\s*\(\s*['"](\d+)['"]\s*,\s*['"]([^'"]+)['"]/i,
    /publicDataDetailPk\s*[:=]\s*['"]([^'"]+)['"]/i,
    /data-public-data-detail-pk\s*=\s*['"]([^'"]+)['"]/i
  ];
  for(const re of patterns){const m=text.match(re);if(!m)continue;if(m.length>=3&&(!pk||m[1]===pk))return clean(m[2]);if(m.length>=2)return clean(m[1]);}
  return '';
}
function headers(extra={}){return {'User-Agent':'Mozilla/5.0 (compatible; JCS-Political-Intelligence/2.0; +https://www.data.go.kr)','Accept':'*/*',...extra};}
async function fetchWithTimeout(fetchImpl,url,options={},timeoutMs=PAGE_TIMEOUT_MS){
  if(typeof fetchImpl!=='function')throw Object.assign(new Error('PUBLIC_DATA_FETCH_UNAVAILABLE'),{code:'PUBLIC_DATA_FETCH_UNAVAILABLE'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetchImpl(url,{redirect:'follow',...options,headers:headers(options.headers||{}),signal:controller.signal});}
  catch(cause){const error=new Error(cause?.name==='AbortError'?'PUBLIC_DATA_FETCH_TIMEOUT':'PUBLIC_DATA_FETCH_FAILED');error.code=error.message;error.cause=cause;throw error;}
  finally{clearTimeout(timer);}
}
function requireOk(response,stage){if(!response?.ok){const error=new Error(`${stage}_HTTP_${response?.status||0}`);error.code='PUBLIC_DATA_HTTP';throw error;}return response;}
async function responseBytes(response,maxBytes=MAX_FILE_BYTES){
  const declared=Number(response?.headers?.get?.('content-length')||0);if(declared>maxBytes)throw Object.assign(new Error('PUBLIC_DATA_FILE_TOO_LARGE'),{code:'PUBLIC_DATA_FILE_TOO_LARGE'});
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>maxBytes)throw Object.assign(new Error('PUBLIC_DATA_FILE_TOO_LARGE'),{code:'PUBLIC_DATA_FILE_TOO_LARGE'});return bytes;
}
function resolveMetadata(body={}){
  const detail=body?.dataSetFileDetailInfo||body?.result?.dataSetFileDetailInfo||body?.data||{};
  const atchFileId=clean(body?.atchFileId||detail?.atchFileId||body?.result?.atchFileId);
  const fileDetailSn=clean(body?.fileDetailSn||detail?.fileDetailSn||body?.result?.fileDetailSn||'1');
  const dataNm=clean(detail?.dataNm||body?.dataNm||body?.result?.dataNm||'public-data.csv');
  return {atchFileId,fileDetailSn,dataNm};
}
async function downloadDataGoFile({publicDataPk,fetchImpl=globalThis.fetch,baseUrl=DATA_GO_BASE,maxBytes=MAX_FILE_BYTES}={}){
  const pk=clean(publicDataPk);if(!/^\d+$/.test(pk))throw Object.assign(new Error('PUBLIC_DATA_PK_REQUIRED'),{code:'PUBLIC_DATA_PK_REQUIRED'});
  const pageUrl=`${baseUrl}/data/${encodeURIComponent(pk)}/fileData.do`;
  const page=requireOk(await fetchWithTimeout(fetchImpl,pageUrl,{headers:{Accept:'text/html,application/xhtml+xml'}},PAGE_TIMEOUT_MS),'PUBLIC_DATA_PAGE');
  const html=await page.text();const publicDataDetailPk=extractFileDataDetailPk(html,pk);if(!publicDataDetailPk)throw Object.assign(new Error('PUBLIC_DATA_DETAIL_PK_NOT_FOUND'),{code:'PUBLIC_DATA_DETAIL_PK_NOT_FOUND'});
  const metaUrl=new URL('/tcs/dss/selectFileDataDownload.do',baseUrl);metaUrl.searchParams.set('publicDataPk',pk);metaUrl.searchParams.set('publicDataDetailPk',publicDataDetailPk);metaUrl.searchParams.set('fileDetailSn','1');
  const metaRes=requireOk(await fetchWithTimeout(fetchImpl,metaUrl.toString(),{headers:{Accept:'application/json,text/plain,*/*'}},PAGE_TIMEOUT_MS),'PUBLIC_DATA_METADATA');
  let body;try{body=await metaRes.json();}catch{body=JSON.parse(await metaRes.text());}
  const meta=resolveMetadata(body);if(!meta.atchFileId)throw Object.assign(new Error('PUBLIC_DATA_ATTACHMENT_NOT_FOUND'),{code:'PUBLIC_DATA_ATTACHMENT_NOT_FOUND'});
  const fileUrl=new URL('/cmm/cmm/fileDownload.do',baseUrl);fileUrl.searchParams.set('atchFileId',meta.atchFileId);fileUrl.searchParams.set('fileDetailSn',meta.fileDetailSn||'1');fileUrl.searchParams.set('dataNm',meta.dataNm);
  const fileRes=requireOk(await fetchWithTimeout(fetchImpl,fileUrl.toString(),{headers:{Accept:'application/octet-stream,text/csv,*/*'}},FILE_TIMEOUT_MS),'PUBLIC_DATA_FILE');
  const bytes=await responseBytes(fileRes,maxBytes);
  return {publicDataPk:pk,publicDataDetailPk,fileName:meta.dataNm,bytes,url:pageUrl,downloadUrl:fileUrl.toString(),contentType:clean(fileRes.headers?.get?.('content-type'))};
}

module.exports={DATA_GO_BASE,MAX_FILE_BYTES,decodePublicText,extractFileDataDetailPk,downloadDataGoFile,_internals:{charsetFromContentType,fetchWithTimeout,responseBytes,resolveMetadata}};
