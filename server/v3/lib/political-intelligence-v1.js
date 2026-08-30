'use strict';

const VERSION='JCS_POLITICAL_INTELLIGENCE_V1_3_AGGRESSIVE';
const NEGATIVE_TERMS=['사퇴','사임','내려놓','탈당','논란','수사','기소','구속','폭로','갈등','비판','사과','패배','낙선','해임','불출마','의혹','충격','반발','파문'];
const POSITIVE_TERMS=['출마','선언','승리','영입','합류','지지','공약','정책','개혁','성과','회복','상승','확대','돌파','협력'];
const DIGITAL_TERMS=['유튜브','youtube','sns','커뮤니티','온라인','영상','숏폼','실시간','단독','폭로','논란','충격','긴급'];
const AGE_TERMS={
  age2030:['청년','2030','대학생','취업','주거','게임','ai','인공지능','코인','가상자산','병역','젠더','스타트업','플랫폼'],
  age4050:['4050','부동산','교육','자녀','자영업','세금','경제','직장','육아','대출','주택'],
  age60plus:['60대','70대','고령','노인','연금','의료','복지','안보','보훈','농업','기초연금']
};

function numeric(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function finite(v,fallback=0){const n=numeric(v);return n===null?fallback:n;}
function clamp(v,min,max){return Math.max(min,Math.min(max,finite(v)));}
function axis(v){return Math.round(clamp(v,-50,50));}
function pct(v,max=20){return Math.round(clamp(v,0,max)*10)/10;}
function score(v){return Math.round(clamp(v,0,100));}
function avg(values=[]){const nums=values.map(numeric).filter(v=>v!==null);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0;}
function text(value=''){return String(value||'').toLowerCase();}
function termHits(value,terms=[]){const s=text(value);return terms.reduce((n,term)=>n+(s.includes(String(term).toLowerCase())?1:0),0);}
function headlineRows(view={}){return Array.isArray(view?.row?.news?.headlines)?view.row.news.headlines.slice(0,12):[];}
function scoreAxis(value){const n=numeric(value);return n===null?0:axis(n-50);}
function delta(summary,key){const n=Number(summary?.coreDeltas?.[key]);return Number.isFinite(n)?n:0;}
function evidenceAffinity(evidence={},key){const d=evidence?.demographic||null;if(!d)return 0;const values=['age2030','age4050','age60plus'].map(k=>finite(d[k],NaN)).filter(Number.isFinite);if(!values.length)return 0;const target=finite(d[key],avg(values));const mean=avg(values);const spread=Math.max(4,Math.max(...values)-Math.min(...values));return clamp((target-mean)/spread,-1,1);}
function historyVolatility(history={}){
  const rows=Array.isArray(history.observations)?history.observations:[];
  const vals=rows.map(x=>numeric(x?.intelligence?.scores?.overallInterest)).filter(v=>v!==null);
  if(vals.length<2)return 0;
  const ds=[];for(let i=1;i<vals.length;i++)ds.push(vals[i]-vals[i-1]);
  return avg(ds.map(Math.abs));
}
function historyRecoveryDays(history={}){
  const rows=(Array.isArray(history.observations)?history.observations:[]).filter(x=>numeric(x?.intelligence?.scores?.overallInterest)!==null);
  if(rows.length<3)return null;
  let best=null;
  for(let i=1;i<rows.length-1;i++){
    const before=numeric(rows[i-1].intelligence.scores.overallInterest),low=numeric(rows[i].intelligence.scores.overallInterest);
    if(before-low<8)continue;
    for(let j=i+1;j<rows.length;j++){
      const value=numeric(rows[j].intelligence.scores.overallInterest);
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
const CORE_SCORE_KEYS=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'];
function analysisCoverage(scores={}){
  const coreScoreCount=CORE_SCORE_KEYS.filter(key=>numeric(scores?.[key])!==null).length;
  const totalScoreCount=Object.values(scores||{}).filter(value=>numeric(value)!==null).length;
  return {state:coreScoreCount>=3?'VALID':'INSUFFICIENT_DATA',coreScoreCount,totalScoreCount,requiredCoreScoreCount:3};
}
function evidencePayload(evidence={},externalCount=0){
  return {basis:externalCount?'JCS 현재 관측 + HISTORY + 외부기관 공개 근거':'JCS 현재 관측 + HISTORY 기반 추정',external:(evidence?.sources||[]).map(x=>({fingerprint:x.fingerprint||'',observedAt:x.observedAt,collectedAt:x.collectedAt||x.ingestedAt||null,institution:x.institution,sourceType:x.sourceType,origin:x.origin||'',relationship:x.relationship||'',title:x.title,url:x.url,note:String(x.note||'').slice(0,600),values:x.values&&typeof x.values==='object'?{...x.values}:null}))};
}
function insufficientPoliticalIntelligence({view={},history={},evidence={},asOf,coverage}){
  const observedDays=Number(history?.summary?.dailySampleSize??history?.daily?.length??0)||0;
  const externalCount=Array.isArray(evidence?.sources)?evidence.sources.length:0;
  return {
    version:VERSION,asOf,validity:{...coverage,reason:'CORE_ANALYSIS_INPUT_REQUIRED'},
    diagnosis:{label:'SIGNAL CONFIDENCE LIMITED · JCS HISTORY 정상 유지',condition:null},
    support:{ageMomentum:{age2030:null,age4050:null,age60plus:null},coreAttritionPct:null,newSupportInflowPct:null,quality:{core:null,active:null,soft:null,floating:null}},
    media:{momentum:{news:null,youtube:null,sns:null,community:null},persistence:'INSUFFICIENT_DATA',burst:null,breadth:null},
    issueImpacts:[],riskOpportunity:{risks:['현재 분석 입력이 충분하지 않아 위험 신호를 확정하지 않습니다.'],opportunities:['추가 관측 후 확장 신호를 판정합니다.']},
    resilience:{score:null,recoveryDays:null,volatility:null},attentionSupportGap:{attention:null,support:null,gap:null,label:'관측 부족'},competitorFlow:[],
    strategicSolution:{basisDiagnosis:'SIGNAL CONFIDENCE LIMITED',priorities:[],conclusion:'현재 특정 신호의 신뢰도가 제한적입니다. JCS HISTORY 관측기록은 정상 유지되며, 유효신호가 기준을 충족하는 시점에 우선 대응방향을 제시합니다.'},
    confidence:{score:null,observedDays,externalEvidenceCount:externalCount,label:'INSUFFICIENT'},evidence:evidencePayload(evidence,externalCount)
  };
}

function logScale(v=0){const n=Math.max(0,finite(v,0));return Math.log10(n+1);}
function materializeScores(view={},history={},evidence={}){
  const original={...(view?.analysis?.scores||{})},row=view?.row||{},search=row.search||{},news=row.news||{},rank=finite(view?.rankDelta,0),summary=history?.summary||{};
  const hist=k=>delta(summary,k),searchMass=clamp((logScale(search.monthlyPcQcCnt)+logScale(search.monthlyMobileQcCnt)-5)*6,-12,16),newsMass=clamp(logScale(news.count24||news.count7||0)*7+finite(news.sources24,0)*.35-8,-12,18);
  const issue=hist('issueHeat')+newsMass*.45,media=hist('mediaSpread')+newsMass*.55;
  const est={
    overallInterest:50+searchMass*.45+newsMass*.30+hist('overallInterest')*.9+rank*.8,
    highEngagement:50+searchMass*.24+hist('highEngagement')+rank*.45,
    massExpansion:50+searchMass*.34+newsMass*.28+hist('massExpansion')*.9+rank*.55,
    activity:50+hist('activity')*.8+newsMass*.2,
    issueHeat:50+issue,
    mediaSpread:50+media,
    audienceExpansion:50+hist('massExpansion')*.75+searchMass*.25,
    mobileResponse:50+clamp(logScale(search.monthlyMobileQcCnt)-logScale(search.monthlyPcQcCnt),-2,2)*8+rank*.3,
    coreRetention:50+hist('highEngagement')*.65-hist('massExpansion')*.15,
    activityPersistence:50+hist('activity')*.55,
    newsAcceleration:50+newsMass+hist('mediaSpread')*.35,
    issueExplosiveness:50+issue*.8,
    issuePersistence:50+hist('issueHeat')*.45,
    mediaDiversity:50+clamp(finite(news.sources24,0)-4,-10,15),
    newsSearchTransition:50+(newsMass+searchMass)*.35
  };
  for(const [k,v] of Object.entries(est))if(numeric(original[k])===null)original[k]=score(v);
  return original;
}
function convictionAxis(value,signals=[]){
  const dirs=signals.map(numeric).filter(v=>v!==null&&Math.abs(v)>=2).map(v=>Math.sign(v));
  if(dirs.length<2)return axis(value);
  const pos=dirs.filter(x=>x>0).length,neg=dirs.length-pos,agreement=Math.max(pos,neg)/dirs.length;
  const factor=1+Math.max(0,agreement-.5)*.9;
  return axis(value*factor);
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
function strategicPriorityBand(weight=0){return weight>=28?'HIGH':weight>=16?'MEDIUM':'WATCH';}
function deriveStrategicSolution({diagnosis={},ageMomentum={},coreAttritionPct=0,newSupportInflowPct=0,media={},attentionSupportGap={},resilience={}}={}){
  const rows=[];
  const add=(code,label,meaning,direction,weight)=>rows.push({code,label,meaning,direction,priority:strategicPriorityBand(weight),weight:Math.round(weight*10)/10});
  const attr=finite(coreAttritionPct,0),inflow=finite(newSupportInflowPct,0),attention=finite(attentionSupportGap?.attention,0),gap=finite(attentionSupportGap?.gap,0);
  if(attr>=0.6)add('CORE SUPPORT STABILIZATION','핵심지지층 안정','기존 핵심 지지기반의 흔들림을 먼저 낮추는 방향',`핵심지지층의 이탈 압력이 관측되는 만큼 불확실성을 줄이고 기존 지지기반을 안정시키는 방향이 우선입니다.`,20+attr*8);
  const ageRows=[['age2030','2030','2030 RECOVERY'],['age4050','4050','4050 RECOVERY'],['age60plus','60+','60+ RECOVERY']].map(([key,label,code])=>({key,label,code,value:finite(ageMomentum?.[key],0)})).sort((a,b)=>a.value-b.value);
  if(ageRows[0]?.value<=-5){const a=ageRows[0];add(a.code,`${a.label} 회복`,`${a.label} 지지 약화 신호의 반전`,`${a.label}에서 약화 신호가 나타나는 만큼 해당 연령대의 신뢰와 지지기반을 회복하는 방향이 우선입니다.`,15+Math.abs(a.value)*1.25);}
  if(attention<=-8)add('ATTENTION RECOVERY','관심 회복','둔화된 관심 흐름의 재정렬',`관심 둔화 구간인 만큼 단순 노출 확대보다 현재의 정치적 위치와 다음 방향을 선명하게 만드는 전환이 필요합니다.`,14+Math.abs(attention)*1.05);
  if(gap>=10)add('SUPPORT CONVERSION','지지 전환','높은 관심을 실제 지지 신호로 연결',`관심과 노출이 지지 신호보다 앞서 있는 만큼 단기 화제성에 머물지 않고 지지 기반으로 연결하는 방향이 필요합니다.`,15+gap*.9);
  const mediaMax=Math.max(0,...Object.values(media?.momentum||{}).map(v=>finite(v,0)));
  if(mediaMax>=12&&media?.persistence!=='COOLING')add('MEDIA CONVERSION','미디어 확산 전환','확산 중인 관심의 지속 가능한 전환',`이미 형성된 미디어 확산을 일시적 화제성으로 소진하지 않고 지속 가능한 관심으로 연결하는 방향이 필요합니다.`,12+mediaMax*.55+(media?.persistence==='FLASH'?5:0));
  if(finite(resilience?.score,60)<48)add('RESILIENCE STABILIZATION','회복력 안정','정치적 충격 이후 회복 기반 보강',`현재 회복력이 상대적으로 낮게 나타나는 만큼 추가 변동보다 지지기반 안정과 회복 여력을 먼저 확보하는 방향이 필요합니다.`,12+(48-finite(resilience?.score,48))*.8);
  if(inflow>=1)add('NEW SUPPORT EXPANSION','신규지지층 확장','새로 유입되는 지지 신호의 안정적 확대',`신규지지층 유입 신호가 나타나는 만큼 기존 기반을 해치지 않는 범위에서 확장 흐름을 안정적으로 이어가는 방향이 유효합니다.`,10+inflow*5);
  const positiveAge=[...ageRows].sort((a,b)=>b.value-a.value)[0];
  if(positiveAge?.value>=10)add(`${positiveAge.label.replace('+','PLUS')} EXPANSION`,`${positiveAge.label} 확장`,`강하게 나타나는 연령별 확장 신호 활용`,`${positiveAge.label}에서 상대적으로 강한 확장 신호가 확인되는 만큼 이 강점을 유지하면서 다른 지지층으로 확장하는 방향이 유효합니다.`,9+positiveAge.value*.7);
  if(rows.length<2)add('BASE CONSOLIDATION','지지기반 정비','현재 지지 흐름의 안정적 유지',`뚜렷한 급변 신호가 제한적인 만큼 현재 지지기반을 안정적으로 유지하며 다음 변화를 준비하는 방향이 적절합니다.`,10);
  if(rows.length<2)add('SIGNAL MONITORING','변화 신호 관찰','단기 변동보다 반복 신호 확인',`단일 이슈보다 반복적으로 이어지는 연령·지지층·미디어 변화를 확인하면서 우선순위를 조정하는 방향이 필요합니다.`,8);
  const priorities=rows.sort((a,b)=>b.weight-a.weight).filter((row,index,self)=>self.findIndex(x=>x.code===row.code)===index).slice(0,4).map(({weight,...row})=>row);
  const focus=priorities.slice(0,2).map(x=>x.label);
  const focusText=focus.length>1?`‘${focus[0]}’과 ‘${focus[1]}’`:focus.length?`‘${focus[0]}’`:'현재 지지기반 안정';
  return {basisDiagnosis:String(diagnosis?.label||''),priorities,conclusion:`현재 가장 중요한 것은 ${focusText}입니다. 구체적인 실행전략은 정치적 환경과 대상별 상황을 함께 고려하여 설계되어야 합니다.`};
}
function competitorAffinity(view={},row={},index=0){
  const selfRank=finite(view?.row?.rank,0),otherRank=finite(row?.rank,0),selfScore=finite(view?.row?.score,50),otherScore=finite(row?.score,50);
  const rankGap=selfRank>0&&otherRank>0?Math.abs(selfRank-otherRank):12,scoreGap=Math.abs(selfScore-otherScore);
  const rankProximity=clamp(1-rankGap/30,0,1),scoreProximity=clamp(1-scoreGap/40,0,1);
  return clamp(.28+rankProximity*.18+scoreProximity*.14-index*.035,.18,.62);
}
function deriveCompetitorFlow({view={},coreAttritionPct=0,attentionSupportGap=0,supportComposite=0,volatility=0}={}){
  const rows=(Array.isArray(view.related)?view.related:[]).slice(0,3);
  if(!rows.length)return [];
  const pressure=clamp(
    finite(coreAttritionPct,0)*1.35+
    Math.max(0,finite(attentionSupportGap,0))*.17+
    Math.max(0,-finite(supportComposite,0))*.10+
    Math.max(0,finite(volatility,0))*.08,
    0,14
  );
  return rows.map((row,index)=>({
    id:row?.person?.id||'',name:row?.person?.name||'',
    estimatedShare:pct(pressure*competitorAffinity(view,row,index),8)
  })).filter(x=>x.id);
}
function derivePoliticalIntelligenceV1({view={},history={},evidence={sources:[],demographic:null},asOf=new Date().toISOString()}={}){
  const rawCoverage=analysisCoverage(view?.analysis?.scores||{}),scores=materializeScores(view,history,evidence);
  view={...view,analysis:{...(view?.analysis||{}),scores}};
  const effectiveCoverage=analysisCoverage(scores),coverage={...effectiveCoverage,state:rawCoverage.state==='VALID'?'VALID':'JCS_ESTIMATED',observedCoreScoreCount:rawCoverage.coreScoreCount,estimatedCoreScoreCount:Math.max(0,effectiveCoverage.coreScoreCount-rawCoverage.coreScoreCount)};
  const sig=currentSignals(view,history),headlines=headlineRows(view).map(h=>classifyHeadline(h));
  const shock=avg(headlines.slice(0,5).map(x=>x.shock)),opportunity=avg(headlines.slice(0,5).map(x=>x.opportunity)),digitalHits=headlines.slice(0,8).reduce((n,x)=>n+x.digital,0);
  const digitalPressure=clamp(scoreAxis(sig.s.mobileResponse)*.55+scoreAxis(sig.s.issueExplosiveness)*.45+digitalHits*2,-50,50);
  const coreWeakness=clamp(-sig.engagementTrend*.8-scoreAxis(sig.s.coreRetention)*.25+shock*.55,0,45);
  const base=sig.supportBase+opportunity*.18-shock*.22;
  const ev2030=evidenceAffinity(evidence,'age2030')*(Math.abs(shock)+Math.abs(opportunity))*.8,ev4050=evidenceAffinity(evidence,'age4050')*(Math.abs(shock)+Math.abs(opportunity))*.8,ev60=evidenceAffinity(evidence,'age60plus')*(Math.abs(shock)+Math.abs(opportunity))*.8;
  const ageMomentum={
    age2030:convictionAxis(base+digitalPressure*.34+ev2030,[base,digitalPressure,ev2030]),
    age4050:convictionAxis(base+sig.massTrend*.24+ev4050,[base,sig.massTrend,ev4050]),
    age60plus:convictionAxis(base+scoreAxis(sig.s.activityPersistence)*.20+ev60,[base,scoreAxis(sig.s.activityPersistence),ev60])
  };
  const coreAttritionPct=pct(coreWeakness*.18+Math.max(0,-sig.engagementTrend)*.11+Math.max(0,-sig.rankDelta)*.07,20);
  const newSupportInflowPct=pct(Math.max(0,sig.massTrend)*.08+Math.max(0,scoreAxis(sig.s.audienceExpansion))*.06+opportunity*.08+Math.max(0,sig.rankDelta)*.04,20);
  const quality=normalizeQuality([
    18+finite(sig.s.coreRetention,50)*.32-coreAttritionPct*1.4,
    20+finite(sig.s.highEngagement,50)*.30+Math.max(0,sig.engagementTrend)*.6,
    20+finite(sig.s.massExpansion,50)*.23+newSupportInflowPct*1.1,
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
  const volatility=historyVolatility(history),recoveryDays=historyRecoveryDays(history)??Math.round(clamp(12+volatility*.6-Math.max(-10,Math.min(10,sig.engagementTrend))*.25,3,30)*10)/10;
  const resilienceScore=score(62+scoreAxis(sig.s.coreRetention)*.35+scoreAxis(sig.s.activityPersistence)*.25-volatility*.9-coreAttritionPct*1.1);
  const supportComposite=axis(avg(Object.values(ageMomentum))+(newSupportInflowPct-coreAttritionPct)*1.4);
  const attentionSupportGap=axis(sig.attention-supportComposite);
  const competitorFlow=deriveCompetitorFlow({view,coreAttritionPct,attentionSupportGap,supportComposite,volatility});
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
  const diagnosisObject={label:diagnosis,condition:axis((supportComposite+sig.attention)/2)};
  const strategicSolution=deriveStrategicSolution({diagnosis:diagnosisObject,ageMomentum,coreAttritionPct,newSupportInflowPct,media,attentionSupportGap:{attention:sig.attention,support:supportComposite,gap:attentionSupportGap},resilience:{score:resilienceScore,recoveryDays,volatility:Math.round(volatility*10)/10}});
  return {
    version:VERSION,asOf,validity:coverage,
    diagnosis:diagnosisObject,
    support:{ageMomentum,coreAttritionPct,newSupportInflowPct,quality},
    media,
    issueImpacts,
    riskOpportunity:{risks:risks.slice(0,4),opportunities:opportunities.slice(0,4)},
    resilience:{score:resilienceScore,recoveryDays,volatility:Math.round(volatility*10)/10},
    attentionSupportGap:{attention:sig.attention,support:supportComposite,gap:attentionSupportGap,label:attentionSupportGap>=15?'화제성 대비 지지전환 낮음':attentionSupportGap<=-15?'노출 대비 지지 기반 강함':'관심과 지지 신호 균형'},
    competitorFlow,
    strategicSolution,
    confidence:{score:confidenceScore,observedDays,externalEvidenceCount:externalCount,label:confidenceScore>=75?'HIGH':confidenceScore>=55?'MEDIUM':'LOW'},
    evidence:evidencePayload(evidence,externalCount)
  };
}

module.exports={VERSION,derivePoliticalIntelligenceV1,_internals:{axis,classifyHeadline,normalizeQuality,historyVolatility,historyRecoveryDays,deriveStrategicSolution,deriveCompetitorFlow,competitorAffinity,materializeScores,convictionAxis}};
