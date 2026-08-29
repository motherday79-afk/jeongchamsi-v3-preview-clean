const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const people=[
  {id:'assembly-023',name:'이준석',party:'개혁신당',jurisdiction:'경기 화성시을',type:'assembly'},
  {id:'assembly-101',name:'한동훈',party:'국민의힘',jurisdiction:'서울',type:'assembly'},
  {id:'assembly-102',name:'조국',party:'조국혁신당',jurisdiction:'서울',type:'assembly'}
];

const gallupHtml=`
<table><tbody>
<tr><td>1637</td><td><a href="reportContent.asp?seqNo=1637">데일리 오피니언 제661호(2026년 4월 4주) - 조국·한동훈 국회의원 재보궐선거 출마, 경제 전망</a></td><td>2026/04/24</td></tr>
<tr><td>1639</td><td><a href="reportContent.asp?seqNo=1639">데일리 오피니언 제662호(2026년 4월 5주) - 지방선거 결과 기대</a></td><td>2026/05/01</td></tr>
</tbody></table>`;
const nesdcHtml=`
<table><tbody>
<tr><td>17208</td><td>케이에스오아이 주식회사</td><td><a href="/portal/bbs/B0000005/view.do?nttId=20001">전국 정기(정례)조사 정당지지도</a></td><td>2026-08-04</td></tr>
<tr><td>17209</td><td>테스트리서치</td><td><a href="/portal/bbs/B0000005/view.do?nttId=20002">화성시을 이준석 의정활동 평가 및 차기 선호도</a></td><td>2026-08-11</td></tr>
</tbody></table>`;

test('external collector parses allowlisted Gallup/NESDC HTML, matches exact politicians, and deduplicates',async()=>{
  const {collectExternalEvidence}=require('../server/v3/lib/external-evidence-collector');
  const responses=new Map([
    ['https://www.gallup.co.kr/gallupdb/report.asp',gallupHtml],
    ['https://www.nesdc.go.kr/portal/bbs/B0000005/list.do?menuNo=200467',nesdcHtml]
  ]);
  const fetchImpl=async url=>({ok:true,status:200,headers:{get:()=> 'text/html; charset=utf-8'},arrayBuffer:async()=>Buffer.from(responses.get(String(url))||'')});
  const out=await collectExternalEvidence({people,sourceIds:['gallup','nesdc'],fetchImpl,now:()=>new Date('2026-08-29T12:00:00.000Z')});
  assert.equal(out.version,'JCS_EXTERNAL_EVIDENCE_V1');
  assert.equal(out.warnings.length,0);
  assert.ok(out.records.some(r=>r.institution==='한국갤럽'&&r.personIds.includes('assembly-101')&&r.personIds.includes('assembly-102')));
  assert.ok(out.records.some(r=>r.institution==='중앙선거여론조사심의위원회'&&r.personIds.includes('assembly-023')));
  assert.ok(out.matchedPeople>=3);
  assert.ok(out.records.every(r=>/^https:\/\//.test(r.url)));
  assert.equal(new Set(out.records.map(r=>r.fingerprint)).size,out.records.length);
});

test('external collector is best-effort and records source failure without failing the refresh',async()=>{
  const {collectExternalEvidence}=require('../server/v3/lib/external-evidence-collector');
  const fetchImpl=async url=>{if(String(url).includes('gallup'))throw new Error('timeout');return {ok:true,status:200,headers:{get:()=> 'text/html; charset=utf-8'},arrayBuffer:async()=>Buffer.from(nesdcHtml)};};
  const out=await collectExternalEvidence({people,sourceIds:['gallup','nesdc'],fetchImpl,now:()=>new Date('2026-08-29T12:00:00.000Z')});
  assert.ok(out.records.length>=1);
  assert.ok(out.warnings.some(x=>x.sourceId==='gallup'));
  assert.equal(out.sources.find(x=>x.sourceId==='nesdc').ok,true);
});

test('dynamic public evidence merges with curated evidence only at or after JCS collection time',()=>{
  const {getPoliticalIntelligenceEvidence}=require('../server/v3/data/political-intelligence-evidence');
  const dynamicBundle={records:[{fingerprint:'r1',institution:'중앙선거여론조사심의위원회',sourceType:'REGISTERED_POLL',title:'화성시을 이준석 의정활동 평가',url:'https://www.nesdc.go.kr/x',observedAt:'2026-08-11T00:00:00.000Z',collectedAt:'2026-08-29T12:00:00.000Z',personIds:['assembly-023'],partyTags:[],values:null}]};
  const before=getPoliticalIntelligenceEvidence('assembly-023',{asOf:'2026-08-29T11:59:59.000Z',dynamicBundle,person:people[0]});
  const after=getPoliticalIntelligenceEvidence('assembly-023',{asOf:'2026-08-29T12:00:00.000Z',dynamicBundle,person:people[0]});
  assert.ok(!before.sources.some(x=>x.fingerprint==='r1'));
  assert.ok(after.sources.some(x=>x.fingerprint==='r1'));
});

test('immutable intelligence snapshot is gzip encoded, indexed once, and can read one frozen person',async()=>{
  const {createPoliticalIntelligenceStore}=require('../server/v3/lib/political-intelligence-store');
  const raw=new Map();const commands=[];
  const command=async args=>{commands.push(args);const op=args[0];if(op==='GET')return raw.get(args[1])||null;if(op==='SET'){if(args.includes('NX')&&raw.has(args[1]))return null;raw.set(args[1],args[2]);return 'OK';}if(op==='ZADD')return 1;if(op==='ZREVRANGE')return [];throw new Error('unsupported '+op);};
  const derivePersonView=(current,history,id)=>({row:current.ranked.find(x=>x.person.id===id),rankDelta:1,categoryRank:1,related:[],analysis:{scores:{overallInterest:60,highEngagement:55,massExpansion:65,activity:60,issueHeat:70,mediaSpread:68,audienceExpansion:65,mobileResponse:67,massPenetration:60,coreRetention:58,activityAcceleration:65,activityConcentration:60,activityPersistence:55,newsAcceleration:70,issueFreshness:68,issuePersistence:52,mediaDiversity:60,newsSearchTransition:61,issueInflux:66,mediaPublicGap:20,issueExplosiveness:72}}});
  const derivePoliticalIntelligenceV1=({view,asOf,evidence})=>({version:'JCS_POLITICAL_INTELLIGENCE_V1',asOf,person:view.row.person.id,confidence:{externalEvidenceCount:evidence.sources.length}});
  const store=createPoliticalIntelligenceStore({command,derivePersonView,derivePoliticalIntelligenceV1,getPoliticalIntelligenceEvidence:(id,{dynamicBundle})=>({sources:(dynamicBundle?.records||[]).filter(x=>(x.personIds||[]).includes(id)),demographic:null})});
  const current={draftId:'now-abc',publishedAt:'2026-08-29T12:00:00.000Z',weights:{search:50,news:50},ranked:people.slice(0,2).map((p,i)=>({person:p,rank:i+1,search:{state:'READY'},news:{state:'READY',headlines:[]}}))};
  const personViews=current.ranked.map(row=>[`nowDataPersonPublic:${row.person.id}`,{draftId:current.draftId,publishedAt:current.publishedAt,row,trend:{points:[{draftId:'old',publishedAt:'2026-08-20T00:00:00.000Z',globalRank:3,categoryRank:3,scores:{overallInterest:50,highEngagement:52,massExpansion:48,activity:49,issueHeat:40,mediaSpread:42}},{draftId:current.draftId,publishedAt:current.publishedAt,globalRank:row.rank,categoryRank:row.rank,scores:{overallInterest:60,highEngagement:55,massExpansion:65,activity:60,issueHeat:70,mediaSpread:68}}]}}]);
  const evidenceBundle={records:[{fingerprint:'r1',personIds:['assembly-023']}]};
  const first=await store.recordPoliticalIntelligenceSnapshotV1({current,legacyHistory:{items:[]},personViews,evidenceBundle});
  const second=await store.recordPoliticalIntelligenceSnapshotV1({current,legacyHistory:{items:[]},personViews,evidenceBundle});
  assert.equal(first.ok,true);assert.equal(first.created,true);assert.equal(first.rosterTotal,2);assert.ok(first.compressedBytes>0);
  assert.equal(second.created,false,'immutable snapshot must not overwrite a prior judgment');
  const frozen=await store.readPoliticalIntelligenceSnapshotPersonV1('now-abc','assembly-023');
  assert.equal(frozen.person,'assembly-023');assert.equal(frozen.confidence.externalEvidenceCount,1);
  const setCalls=commands.filter(x=>x[0]==='SET'&&String(x[1]).includes(':snapshot:'));
  assert.ok(setCalls.every(x=>x.includes('NX')));
  assert.match(setCalls[0][2],/^gz1:/);
});

test('intelligence store can read the newest refresh snapshot from its immutable index',async()=>{
  const {createPoliticalIntelligenceStore}=require('../server/v3/lib/political-intelligence-store');
  const packed=require('../server/v3/lib/political-intelligence-store').encodeSnapshot({draftId:'now-latest',people:{'assembly-023':{asOf:'2026-08-29T13:00:00.000Z',marker:'latest'}}}).encoded;
  const store=createPoliticalIntelligenceStore({command:async args=>{
    if(args[0]==='ZREVRANGE')return ['now-latest'];
    if(args[0]==='GET')return packed;
    throw new Error('unsupported '+args[0]);
  }});
  const row=await store.readLatestPoliticalIntelligenceSnapshotPersonV1('assembly-023');
  assert.equal(row.marker,'latest');
});

test('admin refresh calls external evidence collection before finalize and labels that phase',()=>{
  const admin=read('src/views/admin.js');
  assert.match(admin,/action:"collect-external-evidence"/);
  assert.match(admin,/EXTERNAL EVIDENCE COLLECTION/);
  const collectPos=admin.indexOf('action:"collect-external-evidence"');
  const finalizePos=admin.indexOf('action:"finalize"',collectPos);
  assert.ok(collectPos>=0&&finalizePos>collectPos);
});

test('admin NOW route stores draft evidence and publishes one immutable JCS intelligence snapshot',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  assert.match(route,/collectExternalEvidence/);
  assert.match(route,/nowDataExternalEvidence:/);
  assert.match(route,/recordPoliticalIntelligenceSnapshotV1/);
  assert.match(route,/JCS_INTELLIGENCE_SNAPSHOT_FAILED/);
  const finalizeStart=route.indexOf("if(action==='finalize')");
  const publishStart=route.indexOf("if(action==='publish')");
  const refreshSnapshot=route.indexOf('recordPoliticalIntelligenceSnapshotV1',finalizeStart);
  assert.ok(refreshSnapshot>finalizeStart&&refreshSnapshot<publishStart,'full refresh finalize must freeze the JCS judgment before manual publish');
  assert.doesNotMatch(read('api/gateway.js'),/external-evidence-collector|political-intelligence-store/);
});

test('temporary external evidence is included in safe NOW draft cleanup',()=>{
  const cleanup=require('../server/v3/lib/now-temp-cleanup');
  assert.ok(cleanup.TEMP_PATTERNS.includes('nowDataExternalEvidence:*'));
});

test('admin person Political Intelligence reads latest frozen refresh snapshot first and uses live derivation only as fallback',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let liveDerives=0;
  const frozen={version:'JCS_POLITICAL_INTELLIGENCE_V1_2',validity:{state:'VALID'},asOf:'frozen'};
  const store=createHistoryV2Store({
    getJSON:async key=>key==='nowDataCurrent'?{draftId:'now-x',publishedAt:'2026-08-29T12:00:00.000Z',ranked:[{person:{id:'assembly-023'}}]}:{items:[]},
    readLatestPoliticalIntelligenceSnapshotPersonV1:async id=>id==='assembly-023'?frozen:null,
    readPoliticalIntelligenceSnapshotPersonV1:async()=>{throw new Error('latest refresh snapshot should win');},
    derivePersonView:()=>({row:{person:{id:'assembly-023'}}}),
    getPoliticalIntelligenceEvidence:()=>({sources:[],demographic:null}),
    derivePoliticalIntelligenceV1:()=>{liveDerives++;return {asOf:'live'};}
  });
  assert.deepEqual(await store.readPoliticalIntelligenceV2('assembly-023'),frozen);
  assert.equal(liveDerives,0);
});

test('protected public NOW/detail supply files remain free of the new collector/snapshot modules',()=>{
  for(const file of ['api/gateway.js','server/v3/routes/now-data.js','server/v3/lib/now-public-signals.js','server/v3/lib/now-public-snapshot.js','src/core/repository.js']){
    const source=read(file);assert.doesNotMatch(source,/external-evidence-collector|political-intelligence-store/i,file);
  }
});

test('browser cache tags advance for the refreshed admin Intelligence workflow',()=>{
  const app=read('src/app.js'),index=read('index.html');
  assert.match(app,/history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1/);
  assert.match(index,/jcs-intelligence-refresh-v1/);
});
