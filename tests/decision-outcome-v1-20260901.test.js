const test=require('node:test');
const assert=require('node:assert/strict');

const action={actionId:'a1',caseId:'c1',personId:'p1',occurredAt:'2026-09-01T12:00:00Z',baseline:{publishedAt:'2026-09-01T10:00:00Z',condition:20,overallInterest:50,highEngagement:48,massExpansion:45,issueHeat:60,mediaSpread:52,globalRank:20}};
function obs(at,values={}){return {publishedAt:at,rank:{global:values.globalRank},intelligence:{scores:{overallInterest:values.overallInterest,highEngagement:values.highEngagement,massExpansion:values.massExpansion,issueHeat:values.issueHeat,mediaSpread:values.mediaSpread}}};}

test('outcome ignores observations before the action and waits when no post-action observation exists',()=>{
  const {evaluateDecisionOutcomeV1}=require('../server/v3/lib/decision-outcome-v1');
  const result=evaluateDecisionOutcomeV1({action,observations:[obs('2026-09-01T11:00:00Z',{overallInterest:80})],evaluatedAt:'2026-09-02T12:00:00Z'});
  assert.equal(result.status,'WAITING');
  assert.equal(result.assessment,'WAITING');
  assert.match(result.headline,/후속 관측 대기/);
});

test('outcome measures post-action deltas and rank improvement with cautious language',()=>{
  const {evaluateDecisionOutcomeV1}=require('../server/v3/lib/decision-outcome-v1');
  const rows=[
    obs('2026-09-01T11:00:00Z',{overallInterest:99,globalRank:1}),
    obs('2026-09-04T13:00:00Z',{overallInterest:58,highEngagement:54,massExpansion:53,issueHeat:63,mediaSpread:61,globalRank:14})
  ];
  const result=evaluateDecisionOutcomeV1({action,observations:rows,currentCondition:31,evaluatedAt:'2026-09-04T14:00:00Z'});
  assert.equal(result.status,'MEASURED');
  assert.equal(result.latestWindow,'72H');
  assert.equal(result.change.overallInterest,8);
  assert.equal(result.change.massExpansion,8);
  assert.equal(result.change.globalRank,6);
  assert.equal(result.change.condition,11);
  assert.equal(result.assessment,'POSITIVE');
  assert.match(result.headline,/대응 이후/);
  assert.doesNotMatch(result.headline,/때문|효과로/);
  assert.match(result.caution,/인과/);
});

test('early observation is shown but not promoted to measured status before 72 hours',()=>{
  const {evaluateDecisionOutcomeV1}=require('../server/v3/lib/decision-outcome-v1');
  const result=evaluateDecisionOutcomeV1({action,observations:[obs('2026-09-02T12:00:00Z',{overallInterest:52,highEngagement:49,massExpansion:47,issueHeat:59,mediaSpread:53,globalRank:19})],evaluatedAt:'2026-09-02T12:30:00Z'});
  assert.equal(result.status,'EARLY');
  assert.equal(result.latestWindow,'EARLY');
});

test('case patterns require at least three comparable measured outcomes',()=>{
  const {deriveCasePatternsV1}=require('../server/v3/lib/decision-outcome-v1');
  const two=deriveCasePatternsV1({actions:[{actionId:'a1',type:'MEDIA'},{actionId:'a2',type:'MEDIA'}],outcomes:[{actionId:'a1',status:'MEASURED',change:{massExpansion:4}},{actionId:'a2',status:'MEASURED',change:{massExpansion:6}}]});
  assert.deepEqual(two,[]);
  const three=deriveCasePatternsV1({actions:[{actionId:'a1',type:'MEDIA'},{actionId:'a2',type:'MEDIA'},{actionId:'a3',type:'MEDIA'}],outcomes:[{actionId:'a1',status:'MEASURED',change:{massExpansion:4}},{actionId:'a2',status:'MEASURED',change:{massExpansion:6}},{actionId:'a3',status:'MEASURED',change:{massExpansion:8}}]});
  assert.equal(three.length,1);
  assert.match(three[0].title,/미디어/);
  assert.match(three[0].summary,/평균/);
});
