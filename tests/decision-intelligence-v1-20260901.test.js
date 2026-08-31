const test=require('node:test');
const assert=require('node:assert/strict');

function sample(){
  return {
    politicalIntelligence:{
      asOf:'2026-09-01T00:00:00.000Z',
      diagnosis:{condition:34,label:'관심 급등 · 핵심지지층 안정 · 2030 확장 신호 · 미디어 확산 진행'},
      confidence:{score:61,observedDays:18,externalEvidenceCount:2,label:'MEDIUM'},
      support:{ageMomentum:{age2030:-16,age4050:8,age60plus:4},coreAttritionPct:1.6,newSupportInflowPct:3.2},
      media:{momentum:{news:28,youtube:17,sns:21,community:15},persistence:'BUILDING'},
      issueImpacts:[{title:'정책 발표',category:'POLICY',age2030:-11,age4050:14,age60plus:8,core:6,ts:'2026-08-29T03:00:00.000Z'}],
      riskOpportunity:{risks:['2030 지지 흐름 약화 신호'],opportunities:['다채널 확산 가능성 확대']},
      attentionSupportGap:{gap:18,label:'화제성 대비 지지전환 낮음'},
      evidence:{external:[{institution:'공개기관',sourceType:'SURVEY',observedAt:'2026-08-30T00:00:00.000Z'}]}
    },
    history:{
      summary:{dailySampleSize:18,coreDeltas:{overallInterest:12,highEngagement:4,massExpansion:5,activity:2,issueHeat:15,mediaSpread:18},rankDelta:{global:7},latest:{publishedAt:'2026-09-01T00:00:00.000Z',globalRank:12,scores:{overallInterest:66,highEngagement:54,massExpansion:57,activity:51,issueHeat:70,mediaSpread:73}}},
      events:[{eventId:'e1',occurredAt:'2026-08-29T03:00:00.000Z',title:'정책 발표',category:'POLICY'}],
      observations:[
        {publishedAt:'2026-08-25T00:00:00.000Z',rank:{global:19},intelligence:{scores:{overallInterest:54,highEngagement:50,massExpansion:52,activity:49,issueHeat:55,mediaSpread:55}},external:{search:{monthlyTotalQcCnt:1000},news:{count24:20}}},
        {publishedAt:'2026-09-01T00:00:00.000Z',rank:{global:12},intelligence:{scores:{overallInterest:66,highEngagement:54,massExpansion:57,activity:51,issueHeat:70,mediaSpread:73}},external:{search:{monthlyTotalQcCnt:1320},news:{count24:42}}}
      ]
    },
    currentRow:{search:{state:'READY',monthlyTotalQcCnt:1320,monthlyPcQcCnt:420,monthlyMobileQcCnt:900},news:{state:'READY',count24:42,count7:160},person:{id:'assembly-001',name:'테스트 정치인'}},
    competitorRows:[],rangeDays:30,asOf:'2026-09-01T00:00:00.000Z'
  };
}

test('evidence state uses decisive labels instead of percent confidence',()=>{
  const {deriveDecisionIntelligenceV1}=require('../server/v3/lib/decision-intelligence-v1');
  const result=deriveDecisionIntelligenceV1(sample());
  assert.equal(result.evidenceState.label,'분석 근거 강함');
  assert.match(result.evidenceState.basis.join(' '),/HISTORY/);
  assert.doesNotMatch(JSON.stringify(result.evidenceState),/%/);
});

test('cause trace ranks measured media/search/history movement ahead of weaker causes',()=>{
  const {deriveDecisionIntelligenceV1}=require('../server/v3/lib/decision-intelligence-v1');
  const result=deriveDecisionIntelligenceV1(sample());
  assert.ok(result.causeTrace.length>=3);
  assert.equal(result.causeTrace[0].rank,1);
  assert.ok(result.causeTrace[0].strength>=result.causeTrace[1].strength);
  assert.ok(result.causeTrace.some(x=>/뉴스|미디어/.test(x.title)));
  assert.ok(result.causeTrace.some(x=>/검색/.test(x.title)));
  assert.ok(result.causeTrace.every(x=>Array.isArray(x.evidence)&&x.evidence.length));
});

test('priorities are capped at three and each has judgement basis direction and success criteria',()=>{
  const {deriveDecisionIntelligenceV1}=require('../server/v3/lib/decision-intelligence-v1');
  const result=deriveDecisionIntelligenceV1(sample());
  assert.ok(result.priorities.length>=1&&result.priorities.length<=3);
  for(const p of result.priorities){
    assert.ok(['DEFEND','EXPAND','CONVERT','WATCH'].includes(p.mode));
    assert.ok(p.judgement);
    assert.ok(p.basis);
    assert.ok(p.direction);
    assert.ok(Array.isArray(p.successCriteria)&&p.successCriteria.length);
    assert.ok(p.successCriteria.every(x=>x.metric&&x.targetDirection&&x.description));
  }
});

test('current state exposes 7d/30d movement without inventing unsupported values',()=>{
  const {deriveDecisionIntelligenceV1}=require('../server/v3/lib/decision-intelligence-v1');
  const result=deriveDecisionIntelligenceV1(sample());
  assert.equal(result.currentState.condition,34);
  assert.equal(result.currentState.conditionLabel,'강한 상승');
  assert.equal(typeof result.currentState.delta30d,'number');
  assert.ok(result.risks.length);
  assert.ok(result.opportunities.length);
});
