'use strict';

const VERSION='JCS_DECISION_INTELLIGENCE_V1';
const CORE_KEYS=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'];

function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function round(v,d=1){const n=num(v);if(n===null)return null;const p=10**d;return Math.round(n*p)/p;}
function avg(values=[]){const nums=values.map(num).filter(v=>v!==null);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;}
function signed(v){const n=num(v);return n===null?'—':`${n>0?'+':''}${round(n,1)}`;}
function conditionLabel(value){const n=num(value);if(n===null)return '판독 대기';if(n>=30)return '강한 상승';if(n>=12)return '상승';if(n<=-30)return '강한 하락';if(n<=-12)return '하락';return '보합';}
function impactLabel(strength){const n=Math.abs(num(strength)||0);return n>=26?'HIGH':n>=12?'MEDIUM':'LOW';}
function trajectoryFrom(value){const n=num(value)||0;return n>=5?'IMPROVING':n<=-5?'WORSENING':'STABLE';}
function safeDays(history={}){return Math.max(0,Number(history?.summary?.dailySampleSize??history?.daily?.length??0)||0);}
function externalCount(pi={}){return Array.isArray(pi?.evidence?.external)?pi.evidence.external.length:Number(pi?.confidence?.externalEvidenceCount)||0;}

function deriveEvidenceState({politicalIntelligence:pi={},history={},currentRow={}}={}){
  const basis=[];
  const days=safeDays(history);
  const searchReady=String(currentRow?.search?.state||'').toUpperCase()==='READY';
  const newsReady=String(currentRow?.news?.state||'').toUpperCase()==='READY';
  const external=externalCount(pi);
  const events=Array.isArray(history?.events)?history.events.length:0;
  if(searchReady)basis.push('검색 현재 관측');
  if(newsReady)basis.push('뉴스 현재 관측');
  if(days>0)basis.push(`HISTORY ${days}일`);
  if(external>0)basis.push(`외부 공개 근거 ${external}건`);
  if(events>0)basis.push(`정치 이벤트 ${events}건`);
  let level='BUILDING',label='근거 보강 중';
  const liveAxes=(searchReady?1:0)+(newsReady?1:0);
  if(days>=7&&liveAxes>=2&&(external>0||events>0)){level='STRONG';label='분석 근거 강함';}
  else if((days>=3&&liveAxes>=1)||basis.length>=2){level='SUFFICIENT';label='분석 근거 충분';}
  return {level,label,basis:basis.length?basis:['현재 관측 연결 확인 필요']};
}

function observationComposite(row={}){
  const s=row?.intelligence?.scores||row?.scores||{};
  const values=['overallInterest','highEngagement','massExpansion','issueHeat','mediaSpread'].map(k=>num(s[k])).filter(v=>v!==null);
  return values.length?avg(values):null;
}
function windowDelta(observations=[],days=7,asOf=null){
  const endMs=Date.parse(asOf||observations.at(-1)?.publishedAt||'');
  if(!Number.isFinite(endMs))return null;
  const cutoff=endMs-days*86400000;
  const rows=(Array.isArray(observations)?observations:[]).filter(r=>{const t=Date.parse(r?.publishedAt||'');return Number.isFinite(t)&&t>=cutoff&&t<=endMs;}).sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt));
  if(rows.length<2)return null;
  const a=observationComposite(rows[0]),b=observationComposite(rows.at(-1));
  return a===null||b===null?null:round(b-a,1);
}
function summaryDelta(history={}){
  const d=history?.summary?.coreDeltas||{};
  return round(avg(['overallInterest','highEngagement','massExpansion','issueHeat','mediaSpread'].map(k=>d[k])),1);
}

function firstLast(observations=[],getter){
  const rows=(Array.isArray(observations)?observations:[]).filter(Boolean).slice().sort((a,b)=>(Date.parse(a?.publishedAt)||0)-(Date.parse(b?.publishedAt)||0));
  let first=null,last=null;
  for(const row of rows){const v=num(getter(row));if(v===null)continue;if(first===null)first=v;last=v;}
  return {first,last};
}
function percentChange(first,last){if(first===null||last===null||first===0)return null;return round((last-first)/Math.abs(first)*100,1);}
function deltaPair(first,last){return first===null||last===null?null:round(last-first,1);}

function deriveCauseTrace({politicalIntelligence:pi={},history={},currentRow={}}={}){
  const d=history?.summary?.coreDeltas||{};
  const obs=Array.isArray(history?.observations)?history.observations:[];
  const events=Array.isArray(history?.events)?history.events:[];
  const causes=[];
  const newsPair=firstLast(obs,r=>r?.external?.news?.count24);
  const searchPair=firstLast(obs,r=>r?.external?.search?.monthlyTotalQcCnt);
  const mediaDelta=num(d.mediaSpread)||0,overallDelta=num(d.overallInterest)||0,issueDelta=num(d.issueHeat)||0,massDelta=num(d.massExpansion)||0,engageDelta=num(d.highEngagement)||0;
  const newsPct=percentChange(newsPair.first,newsPair.last),searchPct=percentChange(searchPair.first,searchPair.last);
  if(Math.abs(mediaDelta)>=1||newsPct!==null){
    const strength=Math.abs(mediaDelta)+(newsPct===null?0:Math.min(22,Math.abs(newsPct)/4));
    causes.push({type:'MEDIA',title:mediaDelta>=0?'뉴스·미디어 확산 상승':'뉴스·미디어 확산 둔화',observedChange:`미디어 ${signed(mediaDelta)}${newsPct===null?'':` · 뉴스24h ${signed(newsPct)}%`}`,timeRange:'최근 관측 구간',evidence:[`HISTORY 미디어 확산 ${signed(mediaDelta)}`,newsPct===null?'뉴스 24시간 관측 연결':'뉴스 24시간 변화 '+signed(newsPct)+'%'],direction:mediaDelta>=0?'UP':'DOWN',strength:round(strength,1)});
  }
  if(Math.abs(overallDelta)>=1||searchPct!==null){
    const strength=Math.abs(overallDelta)+(searchPct===null?0:Math.min(22,Math.abs(searchPct)/4));
    causes.push({type:'SEARCH',title:overallDelta>=0?'검색 관심 상승':'검색 관심 둔화',observedChange:`종합 관심 ${signed(overallDelta)}${searchPct===null?'':` · 검색량 ${signed(searchPct)}%`}`,timeRange:'최근 관측 구간',evidence:[`HISTORY 종합 관심 ${signed(overallDelta)}`,searchPct===null?'검색 현재 관측 연결':'검색량 변화 '+signed(searchPct)+'%'],direction:overallDelta>=0?'UP':'DOWN',strength:round(strength,1)});
  }
  if(Math.abs(issueDelta)>=1||events.length){
    const recentEvent=events.slice().sort((a,b)=>(Date.parse(b?.occurredAt)||0)-(Date.parse(a?.occurredAt)||0))[0];
    const issue=Array.isArray(pi?.issueImpacts)?pi.issueImpacts[0]:null;
    const title=recentEvent?.title||issue?.title||'최근 이슈';
    causes.push({type:'ISSUE',title:`${title} 이슈 영향`,observedChange:`이슈 반응 ${signed(issueDelta)}`,timeRange:recentEvent?.occurredAt?String(recentEvent.occurredAt).slice(0,10):'최근 관측 구간',evidence:[`HISTORY 이슈 반응 ${signed(issueDelta)}`,recentEvent?`정치 이벤트 · ${recentEvent.title}`:`이슈 분석 · ${title}`],direction:issueDelta>=0?'UP':'DOWN',strength:round(Math.abs(issueDelta)+(recentEvent?8:0),1)});
  }
  if(Math.abs(massDelta)>=1||Math.abs(engageDelta)>=1){
    causes.push({type:'AUDIENCE',title:massDelta>=0?'대중 확산 확대':'대중 확산 약화',observedChange:`대중 확산 ${signed(massDelta)} · 심층 관심 ${signed(engageDelta)}`,timeRange:'최근 관측 구간',evidence:[`HISTORY 대중 확산 ${signed(massDelta)}`,`HISTORY 심층 관심 ${signed(engageDelta)}`],direction:massDelta>=0?'UP':'DOWN',strength:round(Math.abs(massDelta)+Math.abs(engageDelta)*0.45,1)});
  }
  const rankDelta=num(history?.summary?.rankDelta?.global);
  if(rankDelta!==null&&Math.abs(rankDelta)>=1)causes.push({type:'RANK',title:rankDelta>0?'전체 NOW 순위 상승':'전체 NOW 순위 하락',observedChange:`전체 순위 ${rankDelta>0?'+':''}${rankDelta}계단`,timeRange:'최근 관측 구간',evidence:[`HISTORY 전체 순위 변화 ${rankDelta>0?'+':''}${rankDelta}`],direction:rankDelta>0?'UP':'DOWN',strength:round(Math.abs(rankDelta)*1.4,1)});
  return causes.filter(x=>x.strength>0).sort((a,b)=>b.strength-a.strength).slice(0,6).map((x,i)=>({...x,rank:i+1}));
}

function persistenceDays(history={}){return Math.max(1,Math.min(90,safeDays(history)||1));}
function normalizeRiskText(text=''){return String(text||'').replace(/\s+JCS EST\.?/gi,'').trim();}
function deriveRisks({politicalIntelligence:pi={},history={}}={}){
  const rows=[];const d=history?.summary?.coreDeltas||{};const support=pi?.support||{};
  const age=support?.ageMomentum||{};
  const source=Array.isArray(pi?.riskOpportunity?.risks)?pi.riskOpportunity.risks:[];
  source.filter(Boolean).forEach((title,i)=>{const t=normalizeRiskText(title);const weakness=/2030/.test(t)?Math.abs(Math.min(0,num(age.age2030)||0)):/4050/.test(t)?Math.abs(Math.min(0,num(age.age4050)||0)):/60\+/.test(t)?Math.abs(Math.min(0,num(age.age60plus)||0)):Math.max(Math.abs(num(d.issueHeat)||0),Math.abs(num(d.highEngagement)||0),8);rows.push({title:t,impact:impactLabel(weakness),trajectory:trajectoryFrom(-weakness),persistenceDays:persistenceDays(history),evidenceState:weakness>=12?'SUFFICIENT':'BUILDING',rationale:/2030/.test(t)?`2030 흐름 ${signed(age.age2030)}`:/4050/.test(t)?`4050 흐름 ${signed(age.age4050)}`:/60\+/.test(t)?`60+ 흐름 ${signed(age.age60plus)}`:`이슈 ${signed(d.issueHeat)} · 심층 관심 ${signed(d.highEngagement)}`,strength:weakness+i*-0.1});});
  if(num(pi?.attentionSupportGap?.gap)>=12)rows.push({title:'관심이 지지 기반으로 충분히 전환되지 않음',impact:'HIGH',trajectory:'WORSENING',persistenceDays:persistenceDays(history),evidenceState:'SUFFICIENT',rationale:`관심 대비 지지전환 격차 ${signed(pi.attentionSupportGap.gap)}`,strength:Math.abs(num(pi.attentionSupportGap.gap)||0)+5});
  return rows.sort((a,b)=>(b.strength||0)-(a.strength||0)).slice(0,3).map(({strength,...x},i)=>({rank:i+1,...x}));
}
function deriveOpportunities({politicalIntelligence:pi={},history={}}={}){
  const rows=[];const d=history?.summary?.coreDeltas||{};const source=Array.isArray(pi?.riskOpportunity?.opportunities)?pi.riskOpportunity.opportunities:[];
  source.filter(Boolean).forEach((title,i)=>{const t=normalizeRiskText(title);const strength=Math.max(8,num(d.massExpansion)||0,num(d.mediaSpread)||0,num(d.overallInterest)||0);rows.push({title:t,impact:impactLabel(strength),trajectory:trajectoryFrom(strength),persistenceDays:persistenceDays(history),evidenceState:strength>=12?'SUFFICIENT':'BUILDING',rationale:`대중 확산 ${signed(d.massExpansion)} · 미디어 ${signed(d.mediaSpread)} · 관심 ${signed(d.overallInterest)}`,strength:Math.abs(strength)+i*-0.1});});
  if((num(d.mediaSpread)||0)>=10&&(num(d.overallInterest)||0)>=5)rows.push({title:'미디어 상승세를 대중 관심 확대로 연결할 구간',impact:'HIGH',trajectory:'IMPROVING',persistenceDays:persistenceDays(history),evidenceState:'STRONG',rationale:`미디어 ${signed(d.mediaSpread)} · 종합 관심 ${signed(d.overallInterest)}`,strength:(num(d.mediaSpread)||0)+(num(d.overallInterest)||0)});
  return rows.sort((a,b)=>(b.strength||0)-(a.strength||0)).slice(0,3).map(({strength,...x},i)=>({rank:i+1,...x}));
}

function criterion(metric,targetDirection,description){return {metric,targetDirection,description};}
function derivePriorities({politicalIntelligence:pi={},history={},risks=[],opportunities=[]}={}){
  const out=[];const d=history?.summary?.coreDeltas||{};const gap=num(pi?.attentionSupportGap?.gap)||0;
  const age=pi?.support?.ageMomentum||{};
  if(risks.length){const r=risks[0];let direction='핵심 위험의 추가 확대를 막고 반전 신호를 확보해야 합니다.';let criteria=[criterion('issueHeat','STABILIZE','이슈 반응의 추가 악화가 멈추는지 확인합니다.'),criterion('highEngagement','UP','심층 관심이 반등하는지 확인합니다.')];
    if(/2030/.test(r.title)){direction='20·30대 약화 구간의 메시지·정책 접점을 우선 보강해야 합니다.';criteria=[criterion('age2030','UP','20·30대 흐름이 반등하는지 확인합니다.'),criterion('massExpansion','UP','대중 확산이 함께 개선되는지 확인합니다.')];}
    out.push({mode:'DEFEND',title:r.title,judgement:`현재 가장 큰 위험은 ${r.title}입니다.`,basis:r.rationale,direction,successCriteria:criteria});}
  if(gap>=12)out.push({mode:'CONVERT',title:'높아진 관심을 지지 기반으로 전환',judgement:'화제성에 비해 지지 기반 전환이 뒤처져 있습니다.',basis:`관심 대비 지지전환 격차 ${signed(gap)}`,direction:'현재 주목도가 유지되는 동안 정책·성과 메시지로 지지 전환을 강화해야 합니다.',successCriteria:[criterion('highEngagement','UP','심층 관심이 동반 상승하는지 확인합니다.'),criterion('massExpansion','UP','대중 확산이 관심 상승과 함께 확대되는지 확인합니다.')]});
  if(opportunities.length&&out.length<3){const o=opportunities[0];out.push({mode:'EXPAND',title:o.title,judgement:`현재 가장 큰 기회는 ${o.title}입니다.`,basis:o.rationale,direction:'상승 흐름이 유지되는 채널과 이슈에 공개 메시지와 일정을 집중해야 합니다.',successCriteria:[criterion('mediaSpread','UP','미디어 확산 우위가 유지되는지 확인합니다.'),criterion('overallInterest','UP','종합 관심이 동반 상승하는지 확인합니다.')]});}
  if(!out.length)out.push({mode:'WATCH',title:'다음 변곡점 관찰',judgement:'현재는 급격한 구조 변화보다 안정적 관측이 우선입니다.',basis:`종합 관심 ${signed(d.overallInterest)} · 대중 확산 ${signed(d.massExpansion)} · 2030 ${signed(age.age2030)}`,direction:'다음 HISTORY 관측에서 관심·확산·지지 기반의 동시 변화를 확인해야 합니다.',successCriteria:[criterion('overallInterest','CHANGE','종합 관심의 뚜렷한 방향 변화 여부를 확인합니다.'),criterion('massExpansion','CHANGE','대중 확산의 변곡점 여부를 확인합니다.')]});
  return out.slice(0,3).map((x,i)=>({rank:i+1,...x}));
}

function deriveDecisionIntelligenceV1(input={}){
  const pi=input.politicalIntelligence||{},history=input.history||{};
  const evidenceState=deriveEvidenceState(input);
  const causeTrace=deriveCauseTrace(input);
  const risks=deriveRisks({politicalIntelligence:pi,history});
  const opportunities=deriveOpportunities({politicalIntelligence:pi,history});
  const priorities=derivePriorities({politicalIntelligence:pi,history,risks,opportunities});
  const condition=num(pi?.diagnosis?.condition);
  return {
    version:VERSION,asOf:input.asOf||pi?.asOf||history?.summary?.latest?.publishedAt||null,evidenceState,
    currentState:{condition,conditionLabel:conditionLabel(condition),delta7d:windowDelta(history?.observations||[],7,input.asOf||pi?.asOf),delta30d:summaryDelta(history),globalRank:num(history?.summary?.latest?.globalRank)},
    causeTrace,risks,opportunities,priorities
  };
}

module.exports={VERSION,deriveDecisionIntelligenceV1,deriveEvidenceState,deriveCauseTrace,deriveRisks,deriveOpportunities,derivePriorities,_internals:{windowDelta,summaryDelta,conditionLabel,percentChange,deltaPair}};
