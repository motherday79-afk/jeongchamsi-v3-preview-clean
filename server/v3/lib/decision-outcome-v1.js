'use strict';

const VERSION='JCS_DECISION_OUTCOME_V1';
const CAUTION='대응 이후 관측 변화이며 단일 행동의 인과효과로 단정하지 않습니다.';
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function round(v,d=1){const n=num(v);if(n===null)return null;const p=10**d;return Math.round(n*p)/p;}
function delta(a,b){const x=num(a),y=num(b);return x===null||y===null?null:round(y-x,1);}
function rankDelta(a,b){const x=num(a),y=num(b);return x===null||y===null?null:round(x-y,1);}
function metric(row,key){return num(row?.intelligence?.scores?.[key]??row?.scores?.[key]);}
function afterRows(action,observations=[]){const start=Date.parse(action?.occurredAt||action?.baseline?.publishedAt||'');if(!Number.isFinite(start))return [];return (Array.isArray(observations)?observations:[]).filter(Boolean).filter(r=>{const t=Date.parse(r?.publishedAt||'');return Number.isFinite(t)&&t>start;}).sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt));}
function windowName(action,row){const a=Date.parse(action?.occurredAt||''),b=Date.parse(row?.publishedAt||'');if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return 'EARLY';const hours=(b-a)/3600000;if(hours>=14*24)return '14D';if(hours>=7*24)return '7D';if(hours>=72)return '72H';return 'EARLY';}
function assessment(change={}){
  const vals=[change.condition,change.overallInterest,change.highEngagement,change.massExpansion,change.mediaSpread,change.globalRank].map(num).filter(v=>v!==null);
  if(!vals.length)return 'NEUTRAL';
  const pos=vals.filter(v=>v>=2).length,neg=vals.filter(v=>v<=-2).length;
  if(pos>=3&&pos>=neg+2)return 'POSITIVE';
  if(neg>=3&&neg>=pos+2)return 'NEGATIVE';
  if(pos&&neg)return 'MIXED';
  return 'NEUTRAL';
}
function headlineFor(status,assessmentValue,change={}){
  if(status==='WAITING')return '대응 이후 후속 관측 대기';
  const pieces=[];
  if(num(change.condition)!==null)pieces.push(`정치 흐름 ${change.condition>0?'+':''}${change.condition}`);
  if(num(change.overallInterest)!==null)pieces.push(`종합 관심 ${change.overallInterest>0?'+':''}${change.overallInterest}`);
  if(num(change.massExpansion)!==null)pieces.push(`대중 확산 ${change.massExpansion>0?'+':''}${change.massExpansion}`);
  const label={POSITIVE:'긍정 변화',NEGATIVE:'하락 변화',MIXED:'혼합 변화',NEUTRAL:'큰 변화 없음'}[assessmentValue]||'관측';
  return `대응 이후 ${label}${pieces.length?` · ${pieces.slice(0,2).join(' · ')}`:''}`;
}
function supporting(change={}){
  const labels={condition:'정치 흐름',overallInterest:'종합 관심',highEngagement:'심층 관심',massExpansion:'대중 확산',issueHeat:'이슈 반응',mediaSpread:'미디어 확산',globalRank:'전체 순위'};
  return Object.entries(labels).map(([k,label])=>({metric:k,label,change:num(change[k])})).filter(x=>x.change!==null&&Math.abs(x.change)>=2).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,4);
}
function evaluateDecisionOutcomeV1({action={},observations=[],currentCondition=null,evaluatedAt=new Date().toISOString()}={}){
  const rows=afterRows(action,observations);
  if(!rows.length)return {version:VERSION,actionId:action?.actionId||'',evaluatedAt,status:'WAITING',latestWindow:null,change:{condition:null,overallInterest:null,highEngagement:null,massExpansion:null,issueHeat:null,mediaSpread:null,globalRank:null},assessment:'WAITING',headline:'대응 이후 후속 관측 대기',supportingSignals:[],caution:CAUTION};
  const latest=rows.at(-1),window=windowName(action,latest),status=window==='EARLY'?'EARLY':'MEASURED',base=action?.baseline||{};
  const change={
    condition:delta(base.condition,currentCondition),
    overallInterest:delta(base.overallInterest,metric(latest,'overallInterest')),
    highEngagement:delta(base.highEngagement,metric(latest,'highEngagement')),
    massExpansion:delta(base.massExpansion,metric(latest,'massExpansion')),
    issueHeat:delta(base.issueHeat,metric(latest,'issueHeat')),
    mediaSpread:delta(base.mediaSpread,metric(latest,'mediaSpread')),
    globalRank:rankDelta(base.globalRank,latest?.rank?.global)
  };
  const a=assessment(change);
  return {version:VERSION,actionId:action?.actionId||'',evaluatedAt,status,latestWindow:window,latestObservationAt:latest?.publishedAt||null,change,assessment:a,headline:headlineFor(status,a,change),supportingSignals:supporting(change),caution:CAUTION};
}

function actionTypeLabel(type=''){return {MESSAGE:'메시지',MEDIA:'미디어',POLICY:'정책',FIELD:'현장 일정',ISSUE_RESPONSE:'이슈 대응',CAMPAIGN:'캠페인',OTHER:'기타'}[String(type||'').toUpperCase()]||'행동';}
function deriveCasePatternsV1({actions=[],outcomes=[]}={}){
  const byAction=new Map((Array.isArray(actions)?actions:[]).map(a=>[String(a?.actionId||''),a]));
  const groups=new Map();
  for(const o of Array.isArray(outcomes)?outcomes:[]){
    if(o?.status!=='MEASURED')continue;const a=byAction.get(String(o?.actionId||''));if(!a)continue;const type=String(a.type||'OTHER').toUpperCase();if(!groups.has(type))groups.set(type,[]);groups.get(type).push(o);
  }
  const out=[];
  for(const [type,rows] of groups){
    if(rows.length<3)continue;
    const values=rows.map(r=>num(r?.change?.massExpansion)).filter(v=>v!==null);if(values.length<3)continue;
    const mean=round(values.reduce((a,b)=>a+b,0)/values.length,1);
    out.push({type,title:`${actionTypeLabel(type)} 대응 반복 패턴`,sampleSize:rows.length,summary:`${rows.length}개 CASE에서 대응 이후 대중 확산 변화 평균 ${mean>0?'+':''}${mean}`,metric:'massExpansion',averageChange:mean,caution:'반복 관측 패턴이며 단일 행동의 인과효과를 의미하지 않습니다.'});
  }
  return out.sort((a,b)=>b.sampleSize-a.sampleSize).slice(0,5);
}

module.exports={VERSION,CAUTION,evaluateDecisionOutcomeV1,deriveCasePatternsV1,_internals:{afterRows,windowName,assessment}};
