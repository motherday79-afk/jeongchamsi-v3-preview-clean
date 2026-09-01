const { getLiveDataById } = require('./politician-live-data');

function clamp(n,min,max){const v=Number(n);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):min;}
function makeBatches(ids,size=10){const n=Math.max(1,Math.floor(Number(size)||10)),out=[];for(let i=0;i<ids.length;i+=n)out.push(ids.slice(i,i+n));return out;}
function providerOkay(row){return row && !['ERROR','MISSING'].includes(String(row.state||''));}
function resultState(row={}){
  const s=providerOkay(row.search),n=providerOkay(row.news);
  return s&&n?'success':(s||n?'partial':'failed');
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function retryPerson(id,opts={}){
  let first=await getLiveDataById(id,opts);
  if(!first?.ok)return first;
  if(resultState(first)==='success')return first;
  await sleep(240);
  const second=await getLiveDataById(id,opts);
  if(!second?.ok)return first;
  return {
    ...second,
    search:providerOkay(second.search)?second.search:first.search,
    news:providerOkay(second.news)?second.news:first.news,
    retried:true
  };
}
async function mapLimit(items,limit,worker){
  const out=new Array(items.length);let cursor=0;
  const runners=Array.from({length:Math.min(Math.max(1,limit),Math.max(1,items.length))},async()=>{
    while(true){const i=cursor++;if(i>=items.length)return;try{out[i]=await worker(items[i],i);}catch(error){out[i]={ok:false,error:String(error?.message||error)};}}
  });
  await Promise.all(runners);return out;
}
async function collectBatch(ids,{concurrency=5,nowMs=Date.now(),previousById={}}={}){
  const started=Date.now();
  const results=await mapLimit(ids,concurrency,id=>retryPerson(id,{nowMs,previousView:previousById?.[id]||null}));
  return {results,elapsedMs:Date.now()-started};
}
function newsRaw(row={}){
  const n=row.news||{};
  return Math.max(0,Number(n.count6)||0)*4+
    Math.max(0,Number(n.count24)||0)*1.5+
    Math.max(0,Number(n.count7d)||0)*0.15+
    Math.max(0,Number(n.sources24)||0)*1.5;
}
function searchRaw(row={}){return Math.max(0,Number(row.search?.monthlyTotalQcCnt)||0);}
function logNormalize(values){
  const logs=values.map(v=>Math.log1p(Math.max(0,Number(v)||0))),max=Math.max(0,...logs);
  return logs.map(v=>max>0?Math.round((v/max)*1000)/10:0);
}
function scoreSnapshot(rows,{searchWeight=50,newsWeight=50}={}){
  const sw=clamp(searchWeight,0,100),nw=clamp(newsWeight,0,100),den=(sw+nw)||100;
  const searchScores=logNormalize(rows.map(searchRaw)),newsScores=logNormalize(rows.map(newsRaw));
  return rows.map((row,i)=>{
    const searchScore=searchScores[i],newsScore=newsScores[i];
    const score=Math.round(((searchScore*sw+newsScore*nw)/den)*10)/10;
    return {
      ...row,
      state:resultState(row),
      searchScore,newsScore,score,
      scoreInputs:{searchRaw:searchRaw(row),newsRaw:Math.round(newsRaw(row)*100)/100},
      weights:{search:sw,news:nw},providers:[row.search?.provider||'search',row.news?.provider||'news']
    };
  }).sort((a,b)=>b.score-a.score||b.newsScore-a.newsScore||b.searchScore-a.searchScore||String(a.person?.id||'').localeCompare(String(b.person?.id||'')))
    .map((row,i)=>({...row,rank:i+1}));
}
function aggregateBatchSummaries(batches,total){
  const rows=(batches||[]).flatMap(batch=>Array.isArray(batch?.results)?batch.results:[]);
  const summary={total:Number(total)||0,completed:rows.length,success:0,partial:0,failed:0,remaining:0};
  rows.forEach(row=>{summary[resultState(row)]++;});
  summary.remaining=Math.max(0,summary.total-summary.completed);
  return summary;
}
function compactRankRow(row={}){
  return {
    rank:row.rank,score:row.score,state:row.state,searchScore:row.searchScore,newsScore:row.newsScore,
    person:row.person,
    search:{
      state:row.search?.state||'ERROR',monthlyPcQcCnt:Number(row.search?.monthlyPcQcCnt)||0,
      monthlyMobileQcCnt:Number(row.search?.monthlyMobileQcCnt)||0,monthlyTotalQcCnt:Number(row.search?.monthlyTotalQcCnt)||0,
      ambiguousName:Boolean(row.search?.ambiguousName)
    },
    news:{
      state:row.news?.state||'ERROR',count6:Number(row.news?.count6)||0,count24:Number(row.news?.count24)||0,
      count7d:Number(row.news?.count7d)||0,sources24:Number(row.news?.sources24)||0,latest:row.news?.latest||null,
      headlines:Array.isArray(row.news?.headlines)?row.news.headlines.slice(0,12):[]
    },
    providers:[row.search?.provider||'search',row.news?.provider||'news']
  };
}
module.exports={makeBatches,resultState,aggregateBatchSummaries,scoreSnapshot,collectBatch,compactRankRow};
