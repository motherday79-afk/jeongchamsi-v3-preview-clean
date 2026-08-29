const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

function mod(){return require('../server/v3/tools/build-age-gender-baseline-v2');}

test('CSV parser handles quoted Korean fields and commas',()=>{
  const {parseCsv}=mod();
  const rows=parseCsv('시도명,선거구명,후보자,득표수\n경기,"화성시을, 일부",이준석,"12,345"\n');
  assert.deepEqual(rows,[{시도명:'경기',선거구명:'화성시을, 일부',후보자:'이준석',득표수:'12,345'}]);
});

test('population row aggregates one-year male/female ages into approved 12 cells',()=>{
  const {aggregatePopulationRow,COHORT_KEYS}=mod();
  const row={지역:'동탄1동'};
  for(let age=0;age<=100;age++){row[`남_${age}세`]=String(age===18?10:age===29?20:age===30?30:age===40?40:age===50?50:age===60?60:age===70?70:0);row[`여_${age}세`]=String(age===18?11:age===29?21:age===30?31:age===40?41:age===50?51:age===60?61:age===70?71:0);}
  const result=aggregatePopulationRow(row);
  assert.deepEqual(COHORT_KEYS,['18_29_m','18_29_f','30_39_m','30_39_f','40_49_m','40_49_f','50_59_m','50_59_f','60_69_m','60_69_f','70_plus_m','70_plus_f']);
  assert.deepEqual(result,[30,32,30,31,40,41,50,51,60,61,70,71]);
});

test('roster resolver requires candidate identity and jurisdiction agreement and surfaces ambiguity',()=>{
  const {resolveRosterPerson}=mod();
  const roster=[
    {id:'a',name:'홍길동',jurisdiction:'서울 강남구갑',type:'assembly',party:'A'},
    {id:'b',name:'홍길동',jurisdiction:'부산 북구갑',type:'assembly',party:'B'},
    {id:'c',name:'김철수',jurisdiction:'경기 화성시을',type:'assembly',party:'C'}
  ];
  assert.equal(resolveRosterPerson({후보자:'김철수',선거구명:'화성시을',시도명:'경기'},roster,{}).person.id,'c');
  assert.equal(resolveRosterPerson({후보자:'홍길동',선거구명:'',시도명:''},roster,{}).status,'UNRESOLVED_AMBIGUOUS');
});

test('curated crosswalk override wins without name-only guessing',()=>{
  const {resolveRosterPerson}=mod();
  const roster=[{id:'x',name:'개명후',jurisdiction:'서울 중구성동구갑',type:'assembly'}];
  const overrides={'2024|개명전|중구성동구갑':'x'};
  const result=resolveRosterPerson({선거일:'2024',후보자:'개명전',선거구명:'중구성동구갑'},roster,overrides);
  assert.equal(result.status,'OVERRIDE');assert.equal(result.person.id,'x');
});

test('manifest hashes source bytes and reports coverage counters honestly',()=>{
  const {buildManifest}=mod();
  const bytes=Buffer.from('official-source');
  const rows=[{baselineKind:'DIRECT_CANDIDATE'},{baselineKind:'PARTY_PROXY'},{baselineKind:'LIMITED'}];
  const manifest=buildManifest({rosterTotal:3,baselineRows:rows,sources:[{authority:'TEST',title:'T',date:'2024-01-01',url:'https://example.test',bytes}],unresolved:[{row:1}]});
  assert.equal(manifest.sourceFiles[0].sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(manifest.directCount,1);assert.equal(manifest.partyProxyCount,1);assert.equal(manifest.limitedCount,1);assert.equal(manifest.unresolvedMappingRows,1);
});

test('official-file builder can create a direct candidate ecological baseline from matched geographic units',()=>{
  const {buildDirectBaselines}=mod();
  const roster=[{id:'p',name:'김철수',jurisdiction:'경기 화성시을',region:'경기',type:'assembly',party:'A'}];
  const electionRows=[];
  const add=(dong,candidate,votes)=>electionRows.push({시도명:'경기',선거구명:'화성시을',법정읍면동명:dong,투표구명:'전체',후보자:candidate,득표수:String(votes)});
  add('가동','김철수',70);add('가동','상대',30);add('나동','김철수',60);add('나동','상대',40);add('다동','김철수',35);add('다동','상대',65);add('라동','김철수',25);add('라동','상대',75);
  const mk=(dong,young,old)=>({법정읍면동명:dong,남_18세:String(young),여_18세:String(young),남_70세:String(old),여_70세:String(old)});
  const populationRows=[mk('가동',90,10),mk('나동',70,30),mk('다동',30,70),mk('라동',10,90)];
  const result=buildDirectBaselines({electionRows,populationRows,roster,overrides:{},electionDate:'2024-04-10'});
  assert.equal(result.unresolved.length,0);
  const row=result.people.p;
  assert.equal(row.baselineKind,'DIRECT_CANDIDATE');
  assert.ok(row.baselineQuality>20);
  assert.equal(row.populationWeights.length,12);
  assert.ok(Math.abs(row.populationWeights.reduce((a,b)=>a+b,0)-1)<1e-6);
  assert.equal(row.cohortAffinity.length,12);
  assert.ok(Number.isFinite(row.cohortAffinity[0]));
  assert.ok(row.cohortAffinity[0]>row.cohortAffinity[10],'young affinity should exceed old affinity in synthetic data');
});

test('proxy builder gives non-direct same-party politicians explicit lower-confidence party or regional proxy baselines',()=>{
  const {applyProxyBaselines}=mod();
  const v=(x)=>Array(12).fill(x);
  const roster=[
    {id:'d1',name:'직접1',type:'assembly',party:'A',jurisdiction:'서울 갑'},
    {id:'d2',name:'직접2',type:'assembly',party:'A',jurisdiction:'부산 갑'},
    {id:'d3',name:'직접3',type:'assembly',party:'A',jurisdiction:'경기 갑'},
    {id:'proxy',name:'비례A',type:'assembly',party:'A',jurisdiction:'비례대표'},
    {id:'regional',name:'지역B',type:'assembly',party:'B',jurisdiction:'서울 을'},
    {id:'b1',name:'직접B',type:'assembly',party:'B',jurisdiction:'서울 병'},
    {id:'ind',name:'무소속',type:'assembly',party:'무소속',jurisdiction:'서울 정'}
  ];
  const direct={
    d1:{...roster[0],personId:'d1',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:v(1/12),cohortAffinity:v(.1)},
    d2:{...roster[1],personId:'d2',baselineKind:'DIRECT_CANDIDATE',baselineQuality:70,populationWeights:v(1/12),cohortAffinity:v(.2)},
    d3:{...roster[2],personId:'d3',baselineKind:'DIRECT_CANDIDATE',baselineQuality:75,populationWeights:v(1/12),cohortAffinity:v(.3)},
    b1:{...roster[5],personId:'b1',baselineKind:'DIRECT_CANDIDATE',baselineQuality:70,populationWeights:v(1/12),cohortAffinity:v(-.1)}
  };
  const rows=roster.map(p=>({personId:p.id,name:p.name,type:p.type,party:p.party,jurisdiction:p.jurisdiction,baselineKind:'LIMITED',baselineQuality:0,populationWeights:Array(12).fill(null),cohortAffinity:Array(12).fill(null),limitedReasons:['TEST']}));
  const out=applyProxyBaselines({rows,directPeople:direct,electionDate:'2024-04-10'});
  const byId=Object.fromEntries(out.map(x=>[x.personId,x]));
  assert.equal(byId.proxy.baselineKind,'PARTY_PROXY');
  assert.ok(byId.proxy.baselineQuality>0&&byId.proxy.baselineQuality<70);
  assert.equal(byId.regional.baselineKind,'REGIONAL_PARTY_PROXY');
  assert.ok(byId.regional.baselineQuality>0&&byId.regional.baselineQuality<byId.b1.baselineQuality);
  assert.equal(byId.ind.baselineKind,'LIMITED');
});

test('baseline merge preserves previously ingested direct people and lets a newer direct result replace a proxy',()=>{
  const {mergeBaselineRows}=mod();
  const roster=[{id:'a',name:'A',type:'assembly',party:'P',jurisdiction:'X'},{id:'b',name:'B',type:'local',party:'P',jurisdiction:'Y'}];
  const previous={a:{personId:'a',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(0)},b:{personId:'b',baselineKind:'PARTY_PROXY',baselineQuality:40,populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(0)}};
  const incoming={b:{personId:'b',baselineKind:'DIRECT_CANDIDATE',baselineQuality:72,populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(.1)}};
  const out=mergeBaselineRows({roster,previousPeople:previous,incomingPeople:incoming});
  const byId=Object.fromEntries(out.map(x=>[x.personId,x]));
  assert.equal(byId.a.baselineKind,'DIRECT_CANDIDATE');
  assert.equal(byId.b.baselineKind,'DIRECT_CANDIDATE');
  assert.equal(byId.b.baselineQuality,72);
});
