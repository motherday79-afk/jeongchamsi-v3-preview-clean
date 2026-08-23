const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_CELEBRATION_BADGE_KEYS,
  normalizeCelebrationConfig,
  reconcileBadgeRecognition,
  buildCelebrationEntries
} = require('../lib/v3/badge-celebrations');

test('celebration config accepts only eligible GOLD+ achievement badges', () => {
  const config = normalizeCelebrationConfig({ enabledBadgeKeys:['first-step','influence-leader','operator','public-icon','michael','not-real'] });
  assert.deepEqual(config.enabledBadgeKeys, ['influence-leader','public-icon','michael']);
  assert.ok(DEFAULT_CELEBRATION_BADGE_KEYS.includes('influence-leader'));
});

test('first badge recognition establishes baseline without announcing historical badges', () => {
  const result = reconcileBadgeRecognition({}, ['first-step','influence-leader']);
  assert.equal(result.initialized, true);
  assert.deepEqual(result.newBadgeKeys, []);
  assert.deepEqual(result.recognition.knownBadgeKeys.sort(), ['first-step','influence-leader']);
});

test('later recognition returns only newly earned badges', () => {
  const prior = { initialized:true, knownBadgeKeys:['first-step','influence-leader'] };
  const result = reconcileBadgeRecognition(prior, ['first-step','influence-leader','public-icon']);
  assert.deepEqual(result.newBadgeKeys, ['public-icon']);
  assert.ok(result.recognition.knownBadgeKeys.includes('public-icon'));
});

test('celebration entries use public nickname and selected badges only', () => {
  const entries = buildCelebrationEntries(
    { id:'u1', nickname:'바람의정참시민', name:'실명' },
    ['first-step','influence-leader','public-icon'],
    { enabledBadgeKeys:['influence-leader','public-icon'] },
    '2026-08-24T02:00:00.000Z'
  );
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map(x => x.nickname), ['바람의정참시민','바람의정참시민']);
  assert.deepEqual(entries.map(x => x.badgeName), ['영향력 리더','퍼블릭 아이콘']);
});

test('public celebration feed omits internal member ids', () => {
  const { publicCelebrationFeed } = require('../lib/v3/badge-celebrations');
  const feed = publicCelebrationFeed({items:[{
    id:'internal-event', userId:'secret-login-id', nickname:'바람의정참시민', badgeKey:'public-icon', badgeName:'퍼블릭 아이콘', at:new Date().toISOString()
  }]}, 6);
  assert.equal(feed.length, 1);
  assert.equal(Object.hasOwn(feed[0], 'userId'), false);
  assert.equal(Object.hasOwn(feed[0], 'id'), false);
  assert.equal(feed[0].nickname, '바람의정참시민');
});
