const { getJSON } = require('./redis');
const { defaultDomain } = require('./schema');

const BASE_BADGE_KEYS = Object.freeze([
  'noon-signal','midnight','weekman','superhero','first-participation','citizen-choice','first-penguin','influencer','policy-proposer','opinion-leader','top-community','top-itsme','jungchamsi-partner'
]);
const NEW_BADGE_KEYS = Object.freeze([
  'first-step','first-voice','participation-sprout','connection-start','attention-start',
  'steady-walker','diligent-participant','field-responder','debate-participant','execution-maker',
  'growth-signal','rising-current','potential-spotted','rising-prospect','growth-acceleration',
  'communication-connector','empathy-maker','conversation-catalyst','community-bridge','participation-inducer',
  'stable-contributor','honest-voice','quality-participant','trust-builder','faithful-contributor',
  'issue-maker','influence-leader','participation-driver','public-discussion-expander','debate-axis','reaction-catalyst','community-hub','attention-driver','trust-leader','content-driver',
  'signature-influencer','agenda-leader','public-icon','grand-connector','elite-strategist','operator'
]);
const VALID_BADGE_KEYS = new Set([...BASE_BADGE_KEYS, ...NEW_BADGE_KEYS]);

function number(v){ const n=Number(v||0); return Number.isFinite(n)?n:0; }
function countObject(v){ return Object.keys(v||{}).length; }
function dateKey(v){ const d=new Date(v||0); if(!Number.isFinite(d.getTime())) return ''; return new Date(d.getTime()+9*3600000).toISOString().slice(0,10); }
function maxConsecutiveDays(keys=[]){
  const days=[...new Set(keys.filter(Boolean))].sort();
  let best=0, run=0, prev=null;
  for(const key of days){
    const t=Date.parse(`${key}T00:00:00.000Z`);
    if(prev===null) run=1; else run=(t-prev===86400000)?run+1:1;
    best=Math.max(best,run); prev=t;
  }
  return best;
}

function computeBadgeMetrics(userId, activity={}, domains={}){
  const uid=String(userId||'');
  const postsByDomain={
    community:(domains.community?.items||[]), itsme:(domains.itsme?.items||[]), columns:(domains.columns?.items||[]), news:(domains.news?.items||[])
  };
  const owned=[];
  for(const [domain,items] of Object.entries(postsByDomain)) for(const post of items){
    if(String(post.ownerId||'')===uid) owned.push({...post,domain});
  }
  const comments=(domains.comments?.items||[]);
  const mine=comments.filter(c=>String(c.ownerId||'')===uid);
  const ownKeys=new Set(owned.map(p=>`${p.domain}:${p.id}`));
  const responses=comments.filter(c=>String(c.ownerId||'')!==uid && ownKeys.has(`${c.domain}:${c.postId}`));
  const uniqueResponders=new Set(responses.map(c=>String(c.ownerId||c.author||'')).filter(Boolean)).size;
  const ownPostsWithResponses=new Set(responses.map(c=>`${c.domain}:${c.postId}`)).size;
  const likedGiven=(activity.likedPosts||[]).length;
  const pollCount=countObject(activity.pollVotes);
  const generationCount=countObject(activity.generationVotes);
  const evaluationCount=countObject(activity.nationalEvaluationVotes);
  const academyCount=(activity.academyApplications||[]).length;
  const participationCount=pollCount+generationCount+evaluationCount+academyCount;
  const likesReceived=owned.reduce((s,p)=>s+number(p.likes),0);
  const viewsReceived=owned.reduce((s,p)=>s+number(p.views),0);
  const highImpactPosts=owned.filter(p=>number(p.likes)>=5 || number(p.views)>=100).length;
  const strongImpactPosts=owned.filter(p=>number(p.likes)>=15 || number(p.views)>=500).length;
  const threadKeys=new Set([...mine.map(c=>`${c.domain}:${c.postId}`), ...(activity.likedPosts||[]).map(String)]);
  const events=(activity.badgeSignals?.events||[]).filter(x=>x&&x.at);
  const activeDateKeys=[...owned.map(p=>dateKey(p.createdAt)),...mine.map(c=>dateKey(c.createdAt)),...events.map(e=>dateKey(e.at))].filter(Boolean);
  const activeDays=new Set(activeDateKeys).size;
  const maxStreak=maxConsecutiveDays(activeDateKeys);
  const types=[owned.length>0,mine.length>0,likedGiven>0,pollCount>0,generationCount>0,evaluationCount>0,academyCount>0].filter(Boolean).length;
  const noonSignals=events.filter(e=>{const h=(new Date(e.at).getUTCHours()+9)%24;return h>=11&&h<=13;}).length;
  const midnightSignals=events.filter(e=>((new Date(e.at).getUTCHours()+9)%24)===0).length;
  const actionTotal=owned.length+mine.length+likedGiven+participationCount;
  const contentDomains=Object.values(postsByDomain).filter(items=>items.some(p=>String(p.ownerId||'')===uid)).length;
  return {
    actionTotal, authoredPosts:owned.length, comments:mine.length, likesGiven, likesReceived, viewsReceived, participationCount, pollCount, generationCount, evaluationCount, academyCount,
    participationTypes:types, activeDays, maxStreak, communityPosts:owned.filter(p=>p.domain==='community').length,
    itsmePosts:owned.filter(p=>p.domain==='itsme').length, uniqueResponders, responsesReceived:responses.length,
    engagedThreads:threadKeys.size, highImpactPosts, strongImpactPosts, contentDomains, ownPostsWithResponses, noonSignals, midnightSignals
  };
}

const atLeast=(field,target,label)=>({test:m=>number(m[field])>=target,progress:m=>({current:Math.min(number(m[field]),target),target,label})});
const all=(conditions,label)=>({
  test:m=>conditions.every(([field,target])=>number(m[field])>=target),
  progress:m=>({current:conditions.filter(([field,target])=>number(m[field])>=target).length,target:conditions.length,label})
});
const any=(conditions,label)=>({
  test:m=>conditions.some(([field,target])=>number(m[field])>=target),
  progress:m=>({current:Math.max(...conditions.map(([field,target])=>Math.min(number(m[field])/target,1))),target:1,label,ratio:true})
});

const AUTO_RULES = Object.freeze({
  'noon-signal':atLeast('noonSignals',1,'정오 활동'), 'midnight':atLeast('midnightSignals',1,'자정 활동'),
  'weekman':atLeast('maxStreak',7,'연속 활동일'), 'superhero':atLeast('maxStreak',30,'연속 활동일'),
  'first-participation':atLeast('actionTotal',1,'참여'), 'citizen-choice':atLeast('pollCount',1,'시민 선택'),
  'policy-proposer':atLeast('itsmePosts',1,'IT’S ME 작성'), 'opinion-leader':all([['comments',30],['engagedThreads',8]],'토론 기여'),

  'first-step':atLeast('actionTotal',1,'첫 활동'), 'first-voice':atLeast('comments',1,'의견 작성'),
  'participation-sprout':atLeast('participationCount',3,'선택 참여'), 'connection-start':atLeast('engagedThreads',3,'연결한 글'),
  'attention-start':any([['likesReceived',1],['viewsReceived',20]],'첫 반응'),

  'steady-walker':atLeast('activeDays',7,'활동일'), 'diligent-participant':atLeast('actionTotal',20,'누적 참여'),
  'field-responder':atLeast('participationCount',5,'선택 참여'), 'debate-participant':atLeast('comments',10,'의견 작성'),
  'execution-maker':all([['authoredPosts',5],['participationCount',3]],'작성+참여'),
  'growth-signal':atLeast('likesReceived',10,'받은 반응'), 'rising-current':atLeast('viewsReceived',300,'누적 조회'),
  'potential-spotted':atLeast('highImpactPosts',3,'주목 콘텐츠'), 'rising-prospect':atLeast('uniqueResponders',5,'고유 반응자'),
  'growth-acceleration':all([['likesReceived',20],['viewsReceived',500]],'반응+조회'),
  'communication-connector':atLeast('uniqueResponders',8,'고유 반응자'), 'empathy-maker':atLeast('likesReceived',25,'받은 반응'),
  'conversation-catalyst':atLeast('responsesReceived',20,'후속 댓글'), 'community-bridge':all([['engagedThreads',10],['communityPosts',3]],'토론+정뮤니티'),
  'participation-inducer':atLeast('responsesReceived',30,'후속 참여'),
  'stable-contributor':all([['activeDays',14],['actionTotal',20]],'지속 기여'), 'honest-voice':all([['comments',20],['authoredPosts',3]],'의견+작성'),
  'quality-participant':all([['authoredPosts',5],['likesReceived',15]],'작성+반응'), 'trust-builder':all([['activeDays',21],['uniqueResponders',8]],'지속+관계'),
  'faithful-contributor':any([['activeDays',30],['actionTotal',80]],'장기 기여'),

  'issue-maker':atLeast('highImpactPosts',5,'주목 콘텐츠'), 'influence-leader':all([['likesReceived',100],['uniqueResponders',20]],'반응+도달'),
  'participation-driver':atLeast('responsesReceived',50,'후속 참여'), 'public-discussion-expander':all([['itsmePosts',10],['responsesReceived',30]],'제안+토론'),
  'debate-axis':all([['comments',100],['engagedThreads',20]],'토론 중심성'), 'reaction-catalyst':atLeast('likesReceived',150,'받은 반응'),
  'community-hub':all([['uniqueResponders',30],['comments',50]],'연결+의견'), 'attention-driver':atLeast('viewsReceived',5000,'누적 조회'),
  'trust-leader':all([['activeDays',60],['likesReceived',75]],'지속+신뢰'), 'content-driver':all([['authoredPosts',40],['viewsReceived',4000]],'콘텐츠+조회'),

  'signature-influencer':all([['likesReceived',300],['viewsReceived',10000],['uniqueResponders',50]],'상징 영향력'),
  'agenda-leader':all([['itsmePosts',25],['highImpactPosts',10],['responsesReceived',100]],'의제 리더십'),
  'public-icon':all([['viewsReceived',20000],['likesReceived',250]],'대중 존재감'),
  'grand-connector':all([['uniqueResponders',75],['engagedThreads',50],['comments',150]],'최상위 연결'),
  'elite-strategist':all([['activeDays',90],['authoredPosts',60],['likesReceived',200],['participationTypes',4]],'종합 기여')
});

function evaluateBadgeRules(user={}, activity={}, metrics={}){
  const granted=new Set((activity.grantedBadges||[]).map(String).filter(k=>VALID_BADGE_KEYS.has(k)));
  const earned=new Set(granted);
  const progress={};
  for(const [key,rule] of Object.entries(AUTO_RULES)){
    const p=rule.progress?rule.progress(metrics):null;
    progress[key]=p;
    if(rule.test(metrics)) earned.add(key);
  }
  if(String(user.role||'')==='partner') earned.add('jungchamsi-partner');
  if(String(user.role||'')==='admin'){
    for(const key of VALID_BADGE_KEYS) earned.add(key);
    earned.add('operator');
  } else {
    earned.delete('operator');
  }
  return {earned,granted,progress};
}

async function loadBadgeStatus(user, activity){
  const [community,itsme,columns,news,comments]=await Promise.all([
    getJSON('community').then(x=>x||defaultDomain('community')),
    getJSON('itsme').then(x=>x||defaultDomain('itsme')),
    getJSON('columns').then(x=>x||defaultDomain('columns')),
    getJSON('news').then(x=>x||defaultDomain('news')),
    getJSON('comments').then(x=>x||defaultDomain('comments'))
  ]);
  const metrics=computeBadgeMetrics(user?.id,activity,{community,itsme,columns,news,comments});
  const evaluated=evaluateBadgeRules(user,activity,metrics);
  return {metrics,earnedBadges:[...evaluated.earned],grantedBadges:[...evaluated.granted],progress:evaluated.progress};
}

async function isBadgeUnlocked(user, activity, badgeKey){
  const key=String(badgeKey||'');
  if(!VALID_BADGE_KEYS.has(key)) return false;
  if(key==='operator') return String(user?.role||'')==='admin';
  if(String(user?.role||'')==='admin') return true;
  if((activity.grantedBadges||[]).map(String).includes(key)) return true;
  if(key==='jungchamsi-partner' && String(user?.role||'')==='partner') return true;
  const status=await loadBadgeStatus(user,activity);
  return status.earnedBadges.includes(key);
}

module.exports={BASE_BADGE_KEYS,NEW_BADGE_KEYS,VALID_BADGE_KEYS,AUTO_RULES,computeBadgeMetrics,evaluateBadgeRules,loadBadgeStatus,isBadgeUnlocked};
