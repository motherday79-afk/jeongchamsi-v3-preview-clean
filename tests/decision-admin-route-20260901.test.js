const test=require('node:test');
const assert=require('node:assert/strict');

function res(){return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return v;}};}
function history(){return {summary:{dailySampleSize:12,coreDeltas:{overallInterest:8,highEngagement:3,massExpansion:5,issueHeat:6,mediaSpread:9},rankDelta:{global:4},latest:{publishedAt:'2026-09-01T00:00:00Z',globalRank:10,scores:{overallInterest:60,highEngagement:55,massExpansion:58,issueHeat:63,mediaSpread:65}}},events:[],observations:[{publishedAt:'2026-08-30T00:00:00Z',rank:{global:14},intelligence:{scores:{overallInterest:52,highEngagement:52,massExpansion:53,issueHeat:57,mediaSpread:56}}},{publishedAt:'2026-09-01T00:00:00Z',rank:{global:10},intelligence:{scores:{overallInterest:60,highEngagement:55,massExpansion:58,issueHeat:63,mediaSpread:65}}}]};}
function pi(){return {version:'JCS_POLITICAL_INTELLIGENCE_V1',asOf:'2026-09-01T00:00:00Z',diagnosis:{condition:28,label:'상승'},confidence:{observedDays:12,externalEvidenceCount:1},support:{ageMomentum:{age2030:3,age4050:5,age60plus:2},coreAttritionPct:.2,newSupportInflowPct:1.3},media:{momentum:{news:15},persistence:'BUILDING'},riskOpportunity:{risks:['즉시 경보 수준의 구조적 위험 신호는 제한적'],opportunities:['다채널 확산 가능성 확대']},attentionSupportGap:{gap:7},evidence:{external:[{institution:'공개기관'}]}};}
function deps(admin=true){
  const cases=[];const actions=[];
  return {
    requireAdmin:async()=>admin?{id:'admin'}:null,
    getJSON:async key=>key==='nowDataPublicAdmin'?{draftId:'now-1',publishedAt:'2026-09-01T00:00:00Z'}:key.startsWith('nowDataPersonPublic:')?{row:{person:{id:'p1'},search:{state:'READY'},news:{state:'READY'}}}:null,
    readPersonHistoryV2:async()=>history(),readPoliticalIntelligenceV2:async()=>pi(),
    decisionStore:{
      async listCases(){return cases;},async listActions(){return actions;},async listActionsForCase(id){return actions.filter(x=>x.caseId===id);},
      async getCase(id){return cases.find(x=>x.caseId===id)||null;},
      async createCase(input){const row={caseId:'c1',status:'OPEN',personId:input.personId,sourceDraftId:input.sourceDraftId,sourcePublishedAt:input.sourcePublishedAt,currentState:input.decision.currentState,decisionVersion:input.decision.version,headline:input.headline,note:input.note};cases.push(row);return {ok:true,case:row};},
      async closeCase(id){const row=cases.find(x=>x.caseId===id);if(!row)return {ok:false,error:'CASE_NOT_FOUND'};row.status='CLOSED';return {ok:true,case:row};},
      async addAction(input){actions.push({actionId:'a1',...input});return {ok:true,action:actions.at(-1)};},
      async updateActionNote(id,note){const row=actions.find(x=>x.actionId===id);if(!row)return {ok:false,error:'ACTION_NOT_FOUND'};row.note=note;return {ok:true,action:row};}
    }
  };
}

test('decision route requires admin for GET and POST',async()=>{
  const {createDecisionAdminRoute}=require('../server/v3/routes/admin/decision');
  const handler=createDecisionAdminRoute(deps(false));
  for(const method of ['GET','POST']){const r=res();await handler({method,query:{personId:'p1'},body:{action:'case-create',personId:'p1'}},r);assert.equal(r.statusCode,401);assert.equal(r.body.error,'ADMIN_LOGIN_REQUIRED');}
});

test('GET returns decision, cases, actions, outcomes and patterns for one politician',async()=>{
  const {createDecisionAdminRoute}=require('../server/v3/routes/admin/decision');
  const handler=createDecisionAdminRoute(deps(true));const r=res();
  await handler({method:'GET',query:{personId:'p1',range:'30'},body:{}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.ok,true);assert.equal(r.body.personId,'p1');
  assert.equal(r.body.decision.version,'JCS_DECISION_INTELLIGENCE_V1');
  assert.ok(Array.isArray(r.body.cases));assert.ok(Array.isArray(r.body.actions));assert.ok(Array.isArray(r.body.outcomes));assert.ok(Array.isArray(r.body.patterns));
});

test('case-create ignores client supplied decision numbers and stores server-derived decision',async()=>{
  const d=deps(true);const {createDecisionAdminRoute}=require('../server/v3/routes/admin/decision');const handler=createDecisionAdminRoute(d);const r=res();
  await handler({method:'POST',query:{},body:{action:'case-create',personId:'p1',decision:{currentState:{condition:-50}},currentState:{condition:-50},note:'관리 시작'}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.case.currentState.condition,28);assert.notEqual(r.body.case.currentState.condition,-50);assert.equal(r.body.case.sourceDraftId,'now-1');
});

test('action-add ignores client baseline and uses latest server history baseline',async()=>{
  const d=deps(true);const {createDecisionAdminRoute}=require('../server/v3/routes/admin/decision');const handler=createDecisionAdminRoute(d);
  let r=res();await handler({method:'POST',query:{},body:{action:'case-create',personId:'p1'}},r);
  r=res();await handler({method:'POST',query:{},body:{action:'action-add',caseId:'c1',personId:'evil',title:'정책 발표',type:'POLICY',occurredAt:'2026-09-01T01:00:00Z',baseline:{overallInterest:999,globalRank:1}}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.action.personId,'p1');assert.equal(r.body.action.baseline.overallInterest,60);assert.equal(r.body.action.baseline.globalRank,10);assert.notEqual(r.body.action.baseline.overallInterest,999);
});

test('unknown decision POST action returns 400',async()=>{
  const {createDecisionAdminRoute}=require('../server/v3/routes/admin/decision');const r=res();
  await createDecisionAdminRoute(deps(true))({method:'POST',body:{action:'hack'},query:{}},r);
  assert.equal(r.statusCode,400);assert.equal(r.body.error,'UNKNOWN_DECISION_ACTION');
});

test('gateway contains one literal admin decision loader',()=>{
  const fs=require('node:fs'),path=require('node:path');const text=fs.readFileSync(path.join(__dirname,'../api/gateway.js'),'utf8');
  assert.equal((text.match(/"admin\/decision"/g)||[]).length,1);
});

test('decision read fetches each NOW storage key only once',async()=>{
  const d=deps(true),calls=[];const original=d.getJSON;
  d.getJSON=async key=>{calls.push(key);return original(key);};
  const {createDecisionAdminRoute}=require('../server/v3/routes/admin/decision');const r=res();
  await createDecisionAdminRoute(d)({method:'GET',query:{personId:'p1',range:'30'},body:{}},r);
  assert.equal(r.statusCode,200);
  assert.equal(calls.filter(x=>x==='nowDataPersonPublic:p1').length,1);
  assert.equal(calls.filter(x=>x==='nowDataPublicAdmin').length,1);
});
