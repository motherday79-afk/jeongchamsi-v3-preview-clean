const test=require('node:test');
const assert=require('node:assert/strict');
const {mergeLegacyObservations,deriveHistoryMetrics,observationScore,round}=require('../server/v3/lib/history-core');

const top=(draftId,publishedAt,personId='assembly-001',score=70)=>({draftId,publishedAt,top30:[{rank:5,score,searchScore:60,newsScore:80,person:{id:personId,name:'A'},search:{monthlyTotalQcCnt:100},news:{count24:10}}]});
const trend=(draftId,publishedAt,score=72)=>({draftId,publishedAt,globalRank:4,categoryRank:2,scores:{overallInterest:score,issueHeat:80}});

test('legacy merge combines trend and top30 copies of the same draft into one observation',()=>{ const out=mergeLegacyObservations('assembly-001',[trend('d1','2026-01-01T00:00:00Z')],[top('d1','2026-01-01T00:00:00Z')]); assert.equal(out.length,1); assert.equal(out[0].draftId,'d1'); assert.equal(out[0].globalRank,4); assert.equal(out[0].score,70); });
test('legacy merge falls back to publishedAt when draft id is absent',()=>{ const out=mergeLegacyObservations('assembly-001',[trend('', '2026-01-01T00:00:00Z')],[top('', '2026-01-01T00:00:00Z')]); assert.equal(out.length,1); });
test('legacy merge keeps different publishes separate',()=>{ const out=mergeLegacyObservations('assembly-001',[trend('d1','2026-01-01T00:00:00Z'),trend('d2','2026-01-02T00:00:00Z')],[]); assert.equal(out.length,2); });
test('legacy merge ignores top30 rows for other politicians',()=>{ const out=mergeLegacyObservations('assembly-001',[],[top('d1','2026-01-01T00:00:00Z','assembly-002')]); assert.equal(out.length,0); });
test('legacy merge sorts observations chronologically',()=>{ const out=mergeLegacyObservations('assembly-001',[trend('d2','2026-01-02T00:00:00Z'),trend('d1','2026-01-01T00:00:00Z')],[]); assert.deepEqual(out.map(x=>x.draftId),['d1','d2']); });
test('observation score prefers published NOW score when available',()=>{ assert.equal(observationScore({score:64,scores:{overallInterest:91}}),64); });
test('observation score falls back to overall interest for trend-only history',()=>{ assert.equal(observationScore({scores:{overallInterest:91}}),91); });
test('derived momentum is last score minus first score',()=>{ const d=deriveHistoryMetrics([{score:50},{score:60},{score:72}]); assert.equal(d.momentum,22); });
test('derived volatility is based on score deltas and is zero for a constant slope',()=>{ const d=deriveHistoryMetrics([{score:50},{score:60},{score:70}]); assert.equal(d.volatility,0); });
test('derived output carries version and sample size without inventing data',()=>{ const d=deriveHistoryMetrics([{score:50},{score:60}]); assert.equal(d.version,'JCS_DERIVED_V1'); assert.equal(d.sampleSize,2); assert.equal(round(NaN),0); });
