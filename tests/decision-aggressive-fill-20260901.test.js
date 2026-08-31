'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

test('decision intelligence produces a usable brief even when live evidence is sparse',()=>{
  const {deriveDecisionIntelligenceV1}=require('../server/v3/lib/decision-intelligence-v1');
  const result=deriveDecisionIntelligenceV1({personId:'assembly-027',politicalIntelligence:{},history:{},currentRow:{}});
  assert.ok(Number.isFinite(result.currentState.condition));
  assert.notEqual(result.currentState.conditionLabel,'판독 대기');
  assert.ok(Number.isFinite(result.currentState.delta7d));
  assert.ok(Number.isFinite(result.currentState.delta30d));
  assert.ok(Number.isFinite(result.currentState.globalRank));
  assert.equal(result.currentState.delta7dEstimated,true);
  assert.equal(result.currentState.delta30dEstimated,true);
  assert.ok(result.causeTrace.length>=3);
  assert.ok(result.risks.length>=1);
  assert.ok(result.opportunities.length>=1);
  assert.ok(result.priorities.length>=1);
  assert.ok(['STRONG','SUFFICIENT'].includes(result.evidenceState.level));
  assert.ok(result.evidenceState.basis.some(x=>/JCS/.test(x)));
});
