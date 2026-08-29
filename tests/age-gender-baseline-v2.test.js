const test=require('node:test');
const assert=require('node:assert/strict');
const roster=require('../server/v3/lib/politician-live-roster');

const EXPECTED=['18_29_m','18_29_f','30_39_m','30_39_f','40_49_m','40_49_f','50_59_m','50_59_f','60_69_m','60_69_f','70_plus_m','70_plus_f'];

test('V2 baseline registry covers the full 542-person roster with explicit states',()=>{
  const lib=require('../server/v3/lib/age-gender-baseline-v2');
  assert.deepEqual(lib.COHORT_KEYS,EXPECTED);
  const manifest=lib.getAgeGenderBaselineManifestV2();
  const people=roster.allPeople();
  assert.equal(people.length,542);
  assert.equal(manifest.rosterTotal,542);
  const seen=new Set();
  for(const person of people){
    const row=lib.getAgeGenderBaselineV2(person.id);
    assert.ok(row,person.id);
    assert.equal(row.personId,person.id);
    assert.ok(['DIRECT_CANDIDATE','PARTY_PROXY','REGIONAL_PARTY_PROXY','LIMITED'].includes(row.baselineKind),`${person.id}:${row.baselineKind}`);
    assert.equal(row.populationWeights.length,12);
    assert.equal(row.cohortAffinity.length,12);
    for(const value of row.cohortAffinity)assert.ok(value===null||Number.isFinite(value),`${person.id}:affinity`);
    const finiteWeights=row.populationWeights.filter(Number.isFinite);
    if(finiteWeights.length){
      assert.equal(finiteWeights.length,12,`${person.id}:partial weights forbidden`);
      assert.ok(Math.abs(finiteWeights.reduce((a,b)=>a+b,0)-1)<1e-6,`${person.id}:weights must normalize`);
    }
    assert.equal(seen.has(row.personId),false,`duplicate ${row.personId}`);seen.add(row.personId);
  }
  assert.equal(seen.size,542);
});

test('baseline manifest names the version and does not claim trusted ingestion when only registry coverage exists',()=>{
  const lib=require('../server/v3/lib/age-gender-baseline-v2');
  const manifest=lib.getAgeGenderBaselineManifestV2();
  assert.equal(lib.BASELINE_VERSION,'JCS_AGE_GENDER_BASELINE_V2');
  assert.equal(manifest.baselineVersion,lib.BASELINE_VERSION);
  assert.equal(typeof manifest.trustedBaselineReady,'boolean');
  if(!manifest.trustedBaselineReady){
    assert.equal(manifest.validationStatus,'BASELINE_INGESTION_REQUIRED');
    assert.equal(manifest.directCount,0);
  }
});
