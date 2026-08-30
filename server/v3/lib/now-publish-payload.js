const TARGET_BYTES = 9_500_000;
const CONTENT_PREFIX = 'jcv3:content:v4:';

function clone(value){ return value == null ? value : JSON.parse(JSON.stringify(value)); }
function contentKey(domain){ return `${CONTENT_PREFIX}${domain}`; }
function requestBytes(entries=[]){
  const args=['MSET'];
  for(const [domain,data] of entries) args.push(contentKey(domain),JSON.stringify(data));
  return Buffer.byteLength(JSON.stringify(args),'utf8');
}
function compactLatest(latest){
  if(!latest || typeof latest!=='object') return null;
  return { title:latest.title||'', source:latest.source||'', ts:Number(latest.ts)||0 };
}
function compactHeadline(headline){
  if(!headline || typeof headline!=='object') return null;
  return { title:headline.title||'', source:headline.source||'', ts:Number(headline.ts)||0 };
}
function compactStoredCurrent(current, headlineLimit=12, keepLatest=true){
  const next=clone(current)||{};
  next.ranked=(Array.isArray(next.ranked)?next.ranked:[]).map(row=>{
    const out={...row};
    const news=row?.news&&typeof row.news==='object'?row.news:{};
    out.news={
      state:news.state||'ERROR',
      count6:Number(news.count6)||0,
      count24:Number(news.count24)||0,
      count7d:Number(news.count7d)||0,
      sources24:Number(news.sources24)||0,
      ...(keepLatest&&news.latest?{latest:compactLatest(news.latest)}:{}),
      headlines:(Array.isArray(news.headlines)?news.headlines:[]).slice(0,Math.max(0,headlineLimit)).map(compactHeadline).filter(Boolean)
    };
    return out;
  });
  return next;
}
function replaceCurrent(entries,current){
  return entries.map(([domain,data])=>[domain,domain==='nowDataCurrent'?current:data]);
}
function fitNowPublishEntries(entries=[], targetBytes=TARGET_BYTES){
  const source=Array.isArray(entries)?entries:[];
  const beforeBytes=requestBytes(source);
  if(beforeBytes<=targetBytes)return {entries:source,beforeBytes,bytes:beforeBytes,savedBytes:0,phase:'unchanged'};
  const hit=source.find(([domain])=>domain==='nowDataCurrent');
  if(!hit||!hit[1]){const e=new Error('NOW_PUBLISH_PAYLOAD_TOO_LARGE');e.code='NOW_PUBLISH_PAYLOAD_TOO_LARGE';throw e;}
  const full=hit[1];
  const phases=[
    {name:'remove-duplicate-news-payload',headlineLimit:12,keepLatest:true},
    {name:'trim-redundant-headlines-8',headlineLimit:8,keepLatest:true},
    {name:'trim-redundant-headlines-4',headlineLimit:4,keepLatest:true},
    {name:'trim-redundant-headlines-2',headlineLimit:2,keepLatest:true},
    {name:'trim-redundant-headlines-0',headlineLimit:0,keepLatest:false}
  ];
  let last=null;
  for(const phase of phases){
    const candidate=replaceCurrent(source,compactStoredCurrent(full,phase.headlineLimit,phase.keepLatest));
    const bytes=requestBytes(candidate);last={entries:candidate,beforeBytes,bytes,savedBytes:beforeBytes-bytes,phase:phase.name};
    if(bytes<=targetBytes)return last;
  }
  const e=new Error(`NOW_PUBLISH_PAYLOAD_TOO_LARGE:${last?.bytes||beforeBytes}`);e.code='NOW_PUBLISH_PAYLOAD_TOO_LARGE';e.bytes=last?.bytes||beforeBytes;e.targetBytes=targetBytes;throw e;
}

module.exports={TARGET_BYTES,requestBytes,fitNowPublishEntries,compactStoredCurrent};
