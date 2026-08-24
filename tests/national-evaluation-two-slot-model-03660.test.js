const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function loadModel() {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/views/national-evaluation-model.js'), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Date.now()}`);
}

test('legacy single assembly evaluation migrates into the assembly slot without losing current votes', async () => {
  const { normalizeNationalEvaluation, votesForEvaluationSlot } = await loadModel();
  const legacy = {
    enabled: true,
    subjectId: 'assembly-007',
    results: { 'assembly-007': { positive: 12, neutral: 3, negative: 2 } },
    history: []
  };
  const data = normalizeNationalEvaluation(legacy);
  assert.equal(data.slots.assembly.subjectId, 'assembly-007');
  assert.equal(data.slots.assembly.enabled, true);
  assert.match(data.slots.assembly.evaluationId, /^legacy-assembly-/);
  assert.deepEqual(votesForEvaluationSlot(data, data.slots.assembly), { positive: 12, neutral: 3, negative: 2 });
  assert.equal(data.slots.local.subjectId, null);
});

test('two fixed slots accept only assembly in A and metro/basic in B', async () => {
  const { isAllowedNationalEvaluationSubject } = await loadModel();
  assert.equal(isAllowedNationalEvaluationSubject('assembly', 'assembly-001'), true);
  assert.equal(isAllowedNationalEvaluationSubject('assembly', 'basic-001'), false);
  assert.equal(isAllowedNationalEvaluationSubject('local', 'metropolitan-001'), true);
  assert.equal(isAllowedNationalEvaluationSubject('local', 'basic-227'), true);
  assert.equal(isAllowedNationalEvaluationSubject('local', 'assembly-001'), false);
});

test('new evaluation ids are cycle-specific so the same politician can be evaluated again later', async () => {
  const { makeNationalEvaluationId } = await loadModel();
  const a = makeNationalEvaluationId('assembly', 1000, 'assembly-001');
  const b = makeNationalEvaluationId('assembly', 2000, 'assembly-001');
  assert.notEqual(a, b);
  assert.match(a, /^ne-assembly-/);
  assert.match(b, /^ne-assembly-/);
});
