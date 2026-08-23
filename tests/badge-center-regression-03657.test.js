const test = require('node:test');
const assert = require('node:assert/strict');
const { computeBadgeMetrics } = require('../lib/v3/badge-engine');

test('badge center metrics expose likesGiven without throwing', () => {
  const metrics = computeBadgeMetrics('member-1', { likedPosts:['community:a','itsme:b'] }, {
    community:{items:[]}, itsme:{items:[]}, columns:{items:[]}, news:{items:[]}, comments:{items:[]}
  }, {});
  assert.equal(metrics.likesGiven, 2);
});
