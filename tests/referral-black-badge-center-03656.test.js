const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function loadCatalog(){
  const code=fs.readFileSync(path.join(__dirname,'../src/data/badge-catalog.js'),'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('badge catalog adds Jeongcham mayor and Michael as BLACK honor badges',async()=>{
  const {BADGE_CATALOG}=await loadCatalog();
  assert.equal(BADGE_CATALOG.length,56);
  const black=BADGE_CATALOG.filter(x=>x.tier==='BLACK');
  assert.deepEqual(black.map(x=>x.key),['operator','jeongcham-mayor','michael']);
  assert.match(black.find(x=>x.key==='jeongcham-mayor').mission,/운영자.*제외|모든.*배지/);
  assert.match(black.find(x=>x.key==='michael').mission,/1,?000/);
});

test('badge engine keeps admin all-badge access and exposes honor rules',()=>{
  const engine=require('../lib/v3/badge-engine');
  assert.equal(engine.VALID_BADGE_KEYS.size,56);
  const base={actionTotal:0,authoredPosts:0,comments:0,likesGiven:0,likesReceived:0,viewsReceived:0,participationCount:0,participationTypes:0,activeDays:0,maxStreak:0,communityPosts:0,itsmePosts:0,uniqueResponders:0,responsesReceived:0,engagedThreads:0,highImpactPosts:0,strongImpactPosts:0,contentDomains:0,ownPostsWithResponses:0,noonSignals:0,midnightSignals:0,referralsRecruited:1000};
  const member=engine.evaluateBadgeRules({id:'u',role:'member'},{grantedBadges:[]},base);
  assert.equal(member.earned.has('michael'),true);
  assert.equal(member.earned.has('operator'),false);
  const allExceptMayorAndOperator=[...engine.VALID_BADGE_KEYS].filter(k=>!['jeongcham-mayor','operator'].includes(k));
  const mayor=engine.evaluateBadgeRules({id:'u',role:'member'},{grantedBadges:allExceptMayorAndOperator},base);
  assert.equal(mayor.earned.has('jeongcham-mayor'),true);
  const admin=engine.evaluateBadgeRules({id:'a',role:'admin'},{grantedBadges:[]},base);
  for(const key of engine.VALID_BADGE_KEYS) assert.equal(admin.earned.has(key),true,`${key} must be usable by admin`);
});

test('users module provides immutable numeric referral migration helpers',()=>{
  const users=require('../lib/v3/users');
  assert.equal(typeof users.ensureReferralNumbers,'function');
  assert.equal(typeof users.referralCountMap,'function');
  const input={
    c:{id:'c',createdAt:'2026-01-03T00:00:00.000Z'},
    a:{id:'a',createdAt:'2026-01-01T00:00:00.000Z'},
    b:{id:'b',createdAt:'2026-01-02T00:00:00.000Z'}
  };
  const migrated=users.ensureReferralNumbers(input);
  assert.equal(migrated.users.a.referralNumber,1);
  assert.equal(migrated.users.b.referralNumber,2);
  assert.equal(migrated.users.c.referralNumber,3);
  assert.equal(migrated.changed,true);
  const again=users.ensureReferralNumbers(migrated.users);
  assert.equal(again.changed,false);
  assert.equal(again.users.a.referralNumber,1);
});

test('signup UI marks referral as optional and has no fabricated example value',()=>{
  const userView=fs.readFileSync(path.join(__dirname,'../src/views/user.js'),'utf8');
  assert.match(userView,/추천인[^<]*· 선택/);
  assert.match(userView,/name="referralNumber"/);
  const referralTag=userView.match(/<input[^>]*name="referralNumber"[^>]*>/)?.[0]||'';
  assert.ok(referralTag,'referral input missing');
  assert.doesNotMatch(referralTag,/placeholder=/);
});

test('my page shows permanent referral number, recruited count, and Michael progress',()=>{
  const userView=fs.readFileSync(path.join(__dirname,'../src/views/user.js'),'utf8');
  const coreUser=fs.readFileSync(path.join(__dirname,'../src/core/user.js'),'utf8');
  assert.match(coreUser,/getMyReferralStatus/);
  assert.match(coreUser,/\/api\/v3\/user\/profile/);
  assert.match(userView,/내 추천인 번호/);
  assert.match(userView,/내가 모집한 정참시민/);
  assert.match(userView,/미카엘/);
  assert.match(userView,/1,000/);
});

test('admin has a dedicated badge center route and tab',()=>{
  const gateway=fs.readFileSync(path.join(__dirname,'../api/gateway.js'),'utf8');
  const adminView=fs.readFileSync(path.join(__dirname,'../src/views/admin.js'),'utf8');
  assert.match(gateway,/"admin\/badges"/);
  assert.match(adminView,/\["badges", "배지센터"\]/);
  assert.match(adminView,/배지센터/);
  assert.match(adminView,/획득자/);
  assert.ok(fs.existsSync(path.join(__dirname,'../server/v3/routes/admin/badges.js')));
});
