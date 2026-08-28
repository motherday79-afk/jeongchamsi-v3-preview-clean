const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function core(){ return require('../server/v3/lib/history-core'); }

test('history versions are explicitly frozen at v1 contracts',()=>{ const {VERSIONS}=core(); assert.deepEqual(VERSIONS,{now:'JCS_NOW_V1',pipeline:'JCS_HISTORY_PIPELINE_V1',derived:'JCS_DERIVED_V1'}); });
test('history access scopes include public internal admin and future b2b',()=>{ const {ACCESS}=core(); assert.deepEqual(ACCESS,{PUBLIC:'PUBLIC',INTERNAL_ADMIN:'INTERNAL_ADMIN',FUTURE_B2B:'FUTURE_B2B'}); });
test('history current scope is internal admin',()=>{ assert.equal(core().CURRENT_ACCESS,'INTERNAL_ADMIN'); });
test('snapshot keys are namespaced and deterministic',()=>{ assert.equal(core().snapshotKey('now-abc'),'jcv3:history:v1:snapshot:now-abc'); });
test('observation keys include person and publish identity',()=>{ assert.equal(core().observationKey('assembly-001','now-abc'),'jcv3:history:v1:observation:assembly-001:now-abc'); });
test('snapshot builder keeps immutable publish identity and versions',()=>{ const s=core().buildSnapshot({draftId:'d1',publishedAt:'2026-08-29T00:00:00.000Z',weights:{search:60,news:40},providers:['naver-search-ads','naver-news'],ranked:[]}); assert.equal(s.draftId,'d1'); assert.equal(s.publishedAt,'2026-08-29T00:00:00.000Z'); assert.equal(s.versions.pipeline,'JCS_HISTORY_PIPELINE_V1'); assert.equal(s.accessScope,'INTERNAL_ADMIN'); });
test('snapshot builder records roster total from ranked rows',()=>{ const s=core().buildSnapshot({draftId:'d',publishedAt:'2026-08-29T00:00:00.000Z',ranked:[{person:{id:'assembly-001',name:'A'}}]}); assert.equal(s.rosterTotal,1); assert.equal(s.people.length,1); });
test('snapshot rows preserve numeric source inputs and calculated scores',()=>{ const row=core().snapshotPersonRow({rank:3,score:77.2,searchScore:68,newsScore:84,person:{id:'assembly-001',name:'A',type:'assembly',party:'P',jurisdiction:'J',office:'국회의원'},search:{state:'OK',monthlyPcQcCnt:10,monthlyMobileQcCnt:20,monthlyTotalQcCnt:30,ambiguousName:false},news:{state:'OK',count6:1,count24:2,count7d:3,sources24:4},providers:['naver-search-ads','naver-news']}); assert.equal(row.external.search.monthlyTotalQcCnt,30); assert.equal(row.external.news.count24,2); assert.equal(row.calculated.score,77.2); assert.equal(row.rank.global,3); });
test('snapshot rows never store raw search term fields',()=>{ const text=JSON.stringify(core().snapshotPersonRow({person:{id:'assembly-001',name:'A'},search:{query:'A 국회의원',keyword:'A',searchTerm:'A'},news:{}})); assert.doesNotMatch(text,/"(?:query|keyword|searchTerm)"/); });
test('snapshot rows do not carry member identity fields',()=>{ const text=JSON.stringify(core().snapshotPersonRow({person:{id:'assembly-001',name:'A'},userId:'u',email:'e',nickname:'n',ip:'1.1.1.1'})); assert.doesNotMatch(text,/"(?:userId|email|nickname|ip)"/i); });
test('action signal sanitizer keeps only allowlisted anonymous dimensions',()=>{ const x=core().sanitizeActionSignal('favorite-toggle',{personId:'assembly-001',userId:'u',email:'e',text:'secret'}); assert.deepEqual(x,{kind:'favorite-toggle',personId:'assembly-001'}); });
test('action signal sanitizer rejects unknown actions instead of storing arbitrary payloads',()=>{ assert.equal(core().sanitizeActionSignal('free-text-action',{text:'hello'}),null); });
