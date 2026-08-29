'use strict';

const VERSION='JCS_POLITICAL_INTELLIGENCE_V1';
const NEGATIVE_TERMS=['사퇴','사임','내려놓','탈당','논란','수사','기소','구속','폭로','갈등','비판','사과','패배','낙선','해임','불출마','의혹','충격','반발','파문'];
const POSITIVE_TERMS=['출마','선언','승리','영입','합류','지지','공약','정책','개혁','성과','회복','상승','확대','돌파','협력'];
const DIGITAL_TERMS=['유튜브','youtube','sns','커뮤니티','온라인','영상','숏폼','실시간','단독','폭로','논란','충격','긴급'];
const AGE_TERMS={
  age2030:['청년','2030','대학생','취업','주거','게임','ai','인공지능','코인','가상자산','병역','젠더','스타트업','플랫폼'],
  age4050:['4050','부동산','교육','자녀','자영업','세금','경제','직장','육아','대출','주택'],
  age60plus:['60대','70대','고령','노인','연금','의료','복지','안보','보훈','농업','기초연금']
};

function finite(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
function clamp(v,min,max){return Math.max(min,Math.min(max,finite(v)));}
function axis(v){return Math.round(clamp(v,-50,50));}
function pct(v,max=20){return Math.round(clamp(v,0,max)*10)/10;}
function score(v){return Math.round(clamp(v,0,100));}
function avg(values=[]){const nums=values.map(Number).filter(Number.isFinite);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0;}
function text(value=''){return String(value||'').toLowerCase();}
function termHits(value,terms=[]){const s=text(value);return terms.reduce((n,term)=>n+(s.includes(String(term).toLowerCase())?1:0),0);}
function headlineRows(view={}){return Array.isArray(view?.row?.news?.headlines)?view.row.news.headlines.slice(0,12):[];}
function scoreAxis(value){return axis(finite(value)-50);}
function delta(summary,key){const n=Number(summary?.coreDeltas?.[key]);return Number.isFinite(n)?n:0;}
function evidenceAffinity(evidence={},key){const d=evidence?.demographic||null;if(!d)return 0;const values=['age2030','age4050','age60plus'].map(k=>finite(d[k],NaN)).filter(Number.isFinite);if(!values.length)return 0;const target=finite(d[key],avg(values));const mean=avg(values);const spread=Math.max(4,Math.max(...values)-Math.min(...values));return clamp((target-mean)/spread,-1,1);}
function historyVolatility(history={}){
  const rows=Array.isArray(history.observations)?history.observations:[];
  const vals=rows.map(x=>Number(x?.intelligence?.scores?.overallInterest)).filter(Number.isFinite);
  if(vals.length<2)return 0;
  const ds=[];for(let i=1;i<vals.length;i++)ds.push(vals[i]-vals[i-1]);
  return avg(ds.map(Math.abs));
}
function historyRecoveryDays(history={}){
  const rows=(Array.isArray(history.observations)?history.observations:[]).filter(x=>Number.isFinite(Number(x?.intelligence?.scores?.overallInterest)));
  if(rows.length<3)return null;
  let best=null;
  for(let i=1;i<rows.length-1;i++){
    const before=Number(rows[i-1].intelligence.scores.overallInterest),low=Number(rows[i].intelligence.scores.overallInterest);
    if(before-low<8)continue;
    for(let j=i+1;j<rows.length;j++){
      const value=Number(rows[j].intelligence.scores.overallInterest);
      if(value>=before*.9){const days=Math.max(0,(Date.parse(rows[j].publishedAt)-Date.parse(rows[i].publishedAt))/86400000);if(Number.isFinite(days))best=best===null?days:Math.min(best,days);break;}
    }
  }
  return best===null?null:Math.round(best*10)/10;
}
function normalizeQuality(parts){
  const raw=parts.map(v=>Math.max(1,finite(v,1)));const total=raw.reduce((a,b)=>a+b,0);const ints=raw.map(v=>Math.floor(v/total*100));let remain=100-ints.reduce((a,b)=>a+b,0);
  const order=raw.map((v,i)=>({i,f:v/total*100-ints[i]})).sort((a,b)=>b.f-a.f);
  for(let i=0;i<remain;i++)ints[order[i%order.length].i]++;
  return {core:ints[0],active:ints[1],soft:ints[2],floating:ints[3]};
}
function classifyHeadline(row={},base={}){
  const title=String(row?.title||'');
  const negative=termHits(title,NEGATIVE_TERMS),positive=termHits(title,POSITIVE_TERMS),digital=termHits(title,DIGITAL_TERMS);
  const demographic={};for(const [key,terms] of Object.entries(AGE_TERMS))demographic[key]=termHits(title,terms);
  const shock=clamp(negative*11-positive*5+digital*2,-25,35);
  const opportunity=clamp(positive*10-negative*4,0,30);
  let category='GENERAL POLITICAL EVENT';
  if(/사퇴|사임|내려놓|해임|불출마/.test(title))category='LEADERSHIP SHOCK';
  else if(/논란|의혹|수사|기소|폭로|파문/.test(title))category='REPUTATION RISK';
  else if(/출마|선언|영입|합류/.test(title))category='MOBILIZATION';
  else if(/정책|공약|개혁|성과/.test(title))category='POLICY SIGNAL';
  return {title,category,negative,positive,digital,demographic,shock,opportunity,source:String(row?.source||''),ts:row?.ts||null,...base};
}
function currentSignals(view={},history={}){
  const s=view?.analysis?.scores||{},summary=history?.summary||{};
  const rankDelta=finite(view?.rankDelta,0);
  const interestTrend=delta(summary,'overallInterest'),engagementTrend=delta(summary,'highEngagement'),massTrend=delta(summary,'massExpansion');
  const mediaTrend=delta(summary,'mediaSpread'),issueTrend=delta(summary,'issueHeat');
  const supportBase=axis(interestTrend*.55+engagementTrend*.45+rankDelta*.8);
  const attention=axis(scoreAxis(s.overallInterest)*.35+scoreAxis(s.issueHeat)*.25+scoreAxis(s.mediaSpread)*.25+rankDelta*.7+interestTrend*.6);
  return {s,summary,rankDelta,interestTrend,engagementTrend,massTrend,mediaTrend,issueTrend,supportBase,attention};
}
function derivePoliticalIntelligenceV1({view={},history={},evidence={sources:[],demographic:null},asOf=new Date().toISOString()}={}){
  const sig=currentSignals(view,history),headlines=headlineRows(view).map(h=>classifyHeadline(h));
  const shock=avg(headlines.slice(0,5).map(x=>x.shock)),opportunity=avg(headlines.slice(0,5).map(x=>x.opportunity)),digitalHits=headlines.slice(0,8).reduce((n,x)=>n+x.digital,0);
  const digitalPressure=clamp(scoreAxis(sig.s.mobileResponse)*.55+scoreAxis(sig.s.issueExplosiveness)*.45+digitalHits*2,-50,50);
  const coreWeakness=clamp(-sig.engagementTrend*.8-scoreAxis(sig.s.coreRetention)*.25+shock*.55,0,45);
  const base=sig.supportBase+opportunity*.18-shock*.22;
  const ageMomentum={
    age2030:axis(base+digitalPressure*.28+evidenceAffinity(evidence,'age2030')*(Math.abs(shock)+Math.abs(opportunity))*.55),
    age4050:axis(base+sig.massTrend*.18+evidenceAffinity(evidence,'age4050')*(Math.abs(shock)+Math.abs(opportunity))*.55),
    age60plus:axis(base+scoreAxis(sig.s.activityPersistence)*.15+evidenceAffinity(evidence,'age60plus')*(Math.abs(shock)+Math.abs(opportunity))*.55)
  };
  const coreAttritionPct=pct(coreWeakness*.18+Math.max(0,-sig.engagementTrend)*.11+Math.max(0,-sig.rankDelta)*.07,20);
  const newSupportInflowPct=pct(Math.max(0,sig.massTrend)*.08+Math.max(0,scoreAxis(sig.s.audienceExpansion))*.06+opportunity*.08+Math.max(0,sig.rankDelta)*.04,20);
  const quality=normalizeQuality([
    18+finite(sig.s.coreRetention)*.32-coreAttritionPct*1.4,
    20+finite(sig.s.highEngagement)*.30+Math.max(0,sig.engagementTrend)*.6,
    20+finite(sig.s.massExpansion)*.23+newSupportInflowPct*1.1,
    16+(100-finite(sig.s.coreRetention,50))*.18+historyVolatility(history)*1.2
  ]);
  const newsMomentum=axis(scoreAxis(sig.s.newsAcceleration)*.55+sig.mediaTrend*.6+sig.issueTrend*.25);
  const media={
    momentum:{
      news:newsMomentum,
      youtube:axis(newsMomentum*.5+digitalPressure*.55+digitalHits*1.5),
      sns:axis(newsMomentum*.44+digitalPressure*.62+digitalHits*1.8),
      community:axis(newsMomentum*.38+digitalPressure*.68+digitalHits*2)
    },
    persistence:'STABLE',burst:Math.round(clamp(1+Math.max(0,scoreAxis(sig.s.newsAcceleration))/18+Math.max(0,sig.issueTrend)/30,0.6,8)*10)/10,breadth:0
  };
  const persistenceScore=finite(sig.s.issuePersistence,50)+finite(sig.s.activityPersistence,50)-100;
  if(newsMomentum>=25&&persistenceScore<0)media.persistence='FLASH';
  else if(newsMomentum>=12&&persistenceScore>=0)media.persistence='BUILDING';
  else if(Math.abs(newsMomentum)<=12&&persistenceScore>=15)media.persistence='SUSTAINED';
  else if(newsMomentum<=-10)media.persistence='COOLING';
  media.breadth=Object.values(media.momentum).filter(v=>v>=12).length;
  const issueImpacts=headlines.slice(0,4).map(h=>({
    title:h.title,category:h.category,
    age2030:axis((h.opportunity-h.shock)*.5+h.demographic.age2030*5+digitalPressure*.12),
    age4050:axis((h.opportunity-h.shock)*.45+h.demographic.age4050*5),
    age60plus:axis((h.opportunity-h.shock)*.4+h.demographic.age60plus*5),
    core:axis(h.opportunity*.35-h.shock*.65),source:h.source,ts:h.ts
  }));
  const risks=[],opportunities=[];
  if(coreAttritionPct>=1)risks.push(`강성지지층 이탈 압력 ${coreAttritionPct.toFixed(1)}% JCS EST.`);
  if(ageMomentum.age2030<=-10)risks.push('2030 지지 흐름 약화 신호');
  if(ageMomentum.age4050<=-10)risks.push('4050 지지 흐름 약화 신호');
  if(ageMomentum.age60plus<=-10)risks.push('60+ 지지 흐름 약화 신호');
  if(media.persistence==='FLASH'&&Math.max(...Object.values(media.momentum))>=20)risks.push('확산은 강하지만 단기성 가능성');
  if(newSupportInflowPct>=1)opportunities.push(`신규지지층 유입 압력 +${newSupportInflowPct.toFixed(1)}% JCS EST.`);
  if(Math.max(...Object.values(ageMomentum))>=12){const top=Object.entries(ageMomentum).sort((a,b)=>b[1]-a[1])[0];opportunities.push(`${top[0]==='age2030'?'2030':top[0]==='age4050'?'4050':'60+'} 확장 신호 우세`);}
  if(media.breadth>=3)opportunities.push('다채널 확산 가능성 확대');
  if(!risks.length)risks.push('즉시 경보 수준의 구조적 위험 신호는 제한적');
  if(!opportunities.length)opportunities.push('추가 확장 신호 관측 대기');
  const recoveryDays=historyRecoveryDays(history),volatility=historyVolatility(history);
  const resilienceScore=score(62+scoreAxis(sig.s.coreRetention)*.35+scoreAxis(sig.s.activityPersistence)*.25-volatility*.9-coreAttritionPct*1.1);
  const supportComposite=axis(avg(Object.values(ageMomentum))+(newSupportInflowPct-coreAttritionPct)*1.4);
  const attentionSupportGap=axis(sig.attention-supportComposite);
  const competitorFlow=(Array.isArray(view.related)?view.related:[]).slice(0,3).map((row,index)=>({id:row?.person?.id||'',name:row?.person?.name||'',estimatedShare:pct(coreAttritionPct*(0.28-index*.06),8)})).filter(x=>x.id);
  const observedDays=Number(history?.summary?.dailySampleSize??history?.daily?.length??0)||0,externalCount=Array.isArray(evidence?.sources)?evidence.sources.length:0;
  const currentSearch=String(view?.row?.search?.state||'').toUpperCase()==='READY',currentNews=String(view?.row?.news?.state||'').toUpperCase()==='READY';
  const confidenceScore=score(Math.min(95,34+Math.min(24,observedDays*2.5)+(currentSearch?8:0)+(currentNews?8:0)+Math.min(21,externalCount*10.5)));
  const strongestAge=Object.entries(ageMomentum).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))[0];
  const ageLabel=strongestAge?.[0]==='age2030'?'2030':strongestAge?.[0]==='age4050'?'4050':'60+';
  const diagnosis=[
    sig.attention>=18?'관심 급등':sig.attention<=-12?'관심 둔화':'관심 보합',
    coreAttritionPct>=1.5?'핵심지지층 이탈 압력':coreAttritionPct>=0.6?'핵심지지층 미세 이탈':'핵심지지층 안정',
    `${ageLabel} ${strongestAge?.[1]>=8?'확장':strongestAge?.[1]<=-8?'약화':'변화'} 신호`,
    media.persistence==='FLASH'?'미디어 확산 단기성':media.persistence==='SUSTAINED'?'미디어 지속성':'미디어 확산 진행'
  ].join(' · ');
  return {
    version:VERSION,asOf,
    diagnosis:{label:diagnosis,condition:axis((supportComposite+sig.attention)/2)},
    support:{ageMomentum,coreAttritionPct,newSupportInflowPct,quality},
    media,
    issueImpacts,
    riskOpportunity:{risks:risks.slice(0,4),opportunities:opportunities.slice(0,4)},
    resilience:{score:resilienceScore,recoveryDays,volatility:Math.round(volatility*10)/10},
    attentionSupportGap:{attention:sig.attention,support:supportComposite,gap:attentionSupportGap,label:attentionSupportGap>=15?'화제성 대비 지지전환 낮음':attentionSupportGap<=-15?'노출 대비 지지 기반 강함':'관심과 지지 신호 균형'},
    competitorFlow,
    confidence:{score:confidenceScore,observedDays,externalEvidenceCount:externalCount,label:confidenceScore>=75?'HIGH':confidenceScore>=55?'MEDIUM':'LOW'},
    evidence:{basis:externalCount?'JCS 현재 관측 + HISTORY + 외부기관 공개 근거':'JCS 현재 관측 + HISTORY 기반 추정',external:(evidence?.sources||[]).map(x=>({observedAt:x.observedAt,institution:x.institution,sourceType:x.sourceType,title:x.title,url:x.url}))}
  };
}

module.exports={VERSION,derivePoliticalIntelligenceV1,_internals:{axis,classifyHeadline,normalizeQuality,historyRecoveryDays}};
