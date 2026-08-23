const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

async function loadBrowserCatalog(){
  const code=fs.readFileSync(path.join(__dirname,'../src/data/badge-catalog.js'),'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

test('badge catalog keeps 13 originals and adds exactly 41 expansion badges by requested tier counts',async()=>{
  const {BADGE_CATALOG}=await loadBrowserCatalog();
  assert.equal(BADGE_CATALOG.length,56);
  const added=BADGE_CATALOG.filter(x=>x.series==='EXPANSION_2026');
  assert.equal(added.length,41);
  const counts=Object.fromEntries(['BRONZE','SILVER','GOLD','PLATINUM','BLACK'].map(t=>[t,added.filter(x=>x.tier===t).length]));
  assert.deepEqual(counts,{BRONZE:5,SILVER:20,GOLD:10,PLATINUM:5,BLACK:1});
  for(const name of ['퍼스트 스텝','첫 목소리','커뮤니티 브릿지','신뢰 리더','시그니처 인플루언서','아젠다 리더','운영자']){
    assert.ok(added.some(x=>x.name===name),`${name} missing`);
  }
  for(const badge of added){
    assert.ok(String(badge.mission||'').length>=10,`${badge.name} needs user-facing acquisition description`);
    assert.ok(String(badge.kind||'').length>=2,`${badge.name} needs strength category`);
  }
});

test('server badge engine exposes all catalog keys and automatically awards different strengths',()=>{
  const engine=require('../lib/v3/badge-engine');
  assert.equal(engine.VALID_BADGE_KEYS.size,56);
  const metrics={
    actionTotal:200, authoredPosts:70, comments:180, likesGiven:100, likesReceived:400, viewsReceived:25000,
    participationCount:20, participationTypes:7, activeDays:120, maxStreak:35, communityPosts:30, itsmePosts:30,
    uniqueResponders:90, responsesReceived:180, engagedThreads:70, highImpactPosts:20, strongImpactPosts:12,
    contentDomains:4, ownPostsWithResponses:25, noonSignals:3, midnightSignals:3
  };
  const member=engine.evaluateBadgeRules({id:'u1',role:'member'}, {pollVotes:{p:'1'},grantedBadges:[]}, metrics);
  for(const key of engine.NEW_BADGE_KEYS.filter(k=>!['operator','jeongcham-mayor','michael'].includes(k))) assert.ok(member.earned.has(key),`${key} should be earned by an exceptionally active member`);
  assert.equal(member.earned.has('operator'),false);
  const admin=engine.evaluateBadgeRules({id:'admin',role:'admin'}, {grantedBadges:[]}, metrics);
  assert.equal(admin.earned.has('operator'),true);
});

test('starter badge paths reward different first actions rather than one generic counter',()=>{
  const engine=require('../lib/v3/badge-engine');
  const base={actionTotal:0,authoredPosts:0,comments:0,likesGiven:0,likesReceived:0,viewsReceived:0,participationCount:0,participationTypes:0,activeDays:0,maxStreak:0,communityPosts:0,itsmePosts:0,uniqueResponders:0,responsesReceived:0,engagedThreads:0,highImpactPosts:0,strongImpactPosts:0,contentDomains:0,ownPostsWithResponses:0,noonSignals:0,midnightSignals:0};
  const voice=engine.evaluateBadgeRules({role:'member'},{grantedBadges:[]},{...base,actionTotal:1,comments:1,participationTypes:1});
  assert.ok(voice.earned.has('first-voice'));
  assert.equal(voice.earned.has('attention-start'),false);
  const noticed=engine.evaluateBadgeRules({role:'member'},{grantedBadges:[]},{...base,actionTotal:1,authoredPosts:1,likesReceived:1,viewsReceived:25,participationTypes:1});
  assert.ok(noticed.earned.has('attention-start'));
});

test('badge status is evaluated only on badge surface and representative unlock uses server engine',()=>{
  const userCore=fs.readFileSync(path.join(__dirname,'../src/core/user.js'),'utf8');
  const userView=fs.readFileSync(path.join(__dirname,'../src/views/user.js'),'utf8');
  const action=fs.readFileSync(path.join(__dirname,'../server/v3/routes/action.js'),'utf8');
  const adminUsers=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/users.js'),'utf8');
  assert.match(userCore,/getBadgeStatus/);
  assert.match(userCore,/\/api\/v3\/user\/badges/);
  assert.match(userView,/tab === "badges"[\s\S]*getBadgeStatus/);
  assert.match(userView,/badge-tier-section/);
  assert.match(action,/isBadgeUnlocked/);
  assert.doesNotMatch(action,/const VALID_BADGES = new Set\(\[/);
  assert.match(adminUsers,/VALID_BADGE_KEYS/);
  assert.match(adminUsers,/operator/);
});

test('badge signals track future activity days without bloating normal session reads',()=>{
  const activity=fs.readFileSync(path.join(__dirname,'../lib/v3/activity.js'),'utf8');
  const action=fs.readFileSync(path.join(__dirname,'../server/v3/routes/action.js'),'utf8');
  const session=fs.readFileSync(path.join(__dirname,'../server/v3/routes/user/session.js'),'utf8');
  assert.match(activity,/badgeSignals/);
  assert.match(activity,/recordBadgeEvent/);
  assert.match(action,/recordBadgeEvent/);
  assert.match(session,/recordBadgeEvent\(activity, "login"/);
});

test('premium tier visuals include platinum jewel treatment and admin-only black obsidian treatment',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../css/pages.css'),'utf8');
  assert.match(css,/badge-gem-black/);
  assert.match(css,/badge-tier-black/);
  assert.match(css,/badge-gem-platinum[\s\S]*drop-shadow/);
  assert.match(css,/badge-gem-black[\s\S]*radial-gradient/);
  assert.match(css,/badge-tier-section/);
});
