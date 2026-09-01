'use strict';
const {allPeople}=require('./politician-live-roster');
const {modeledSearch,modeledNews}=require('./now-fallback');
const {scoreSnapshot}=require('./now-data-engine');

let cached=null;
function buildBootstrapCurrent(nowMs=Date.now()){
  const stamp=new Date(nowMs).toISOString();
  const day=stamp.slice(0,10);
  if(cached?.day===day&&cached?.current)return cached.current;
  const rows=allPeople().map(person=>({
    ok:true,
    person:{id:person.id,type:person.type,name:person.name,party:person.party,jurisdiction:person.jurisdiction,office:person.office,ambiguousName:Boolean(person.ambiguousName)},
    search:modeledSearch(person,null),
    news:modeledNews(person,null,nowMs),
    fetchedAt:stamp
  }));
  const ranked=scoreSnapshot(rows,{searchWeight:50,newsWeight:50});
  const current={schemaVersion:1,draftId:`bootstrap-${day}`,publishedAt:stamp,snapshotKind:'JCS_MODELED_BOOTSTRAP',modeled:true,weights:{search:50,news:50},ranked,batchCount:0,batches:[],providers:['jcs-modeled-search-fallback','jcs-modeled-news-fallback']};
  cached={day,current};
  return current;
}
function clearBootstrapCache(){cached=null;}
module.exports={buildBootstrapCurrent,clearBootstrapCache};
