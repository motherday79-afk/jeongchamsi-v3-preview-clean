'use strict';

const crypto=require('node:crypto');
const {COHORT_KEYS}=require('./age-gender-baseline-v2');

const ENGINE_VERSION='JCS_AGE_GENDER_INTELLIGENCE_V2_AGGRESSIVE_R2';
const CONFIDENCE_THRESHOLD=55;
const AGE_GROUPS=[['18-29',0,1],['30-39',2,3],['40-49',4,5],['50-59',6,7],['60-69',8,9],['70+',10,11]];
const ISSUE_RULES=[
  {code:'HOUSING',terms:['주거','주택','부동산','전세','월세','대출'],age:[1.1,1,.65,.55,.35,.25],gender:[0,0]},
  {code:'EMPLOYMENT',terms:['취업','고용','일자리','노동','청년'],age:[1.15,1,.65,.55,.35,.2],gender:[0,0]},
  {code:'EDUCATION_FAMILY',terms:['교육','학교','입시','육아','자녀','보육'],age:[.45,.85,1.1,1,.45,.2],gender:[0,.08]},
  {code:'PENSION_HEALTH',terms:['연금','의료','건강','노인','고령','복지'],age:[.15,.25,.4,.65,1,1.15],gender:[0,.05]},
  {code:'MILITARY_SECURITY',terms:['병역','군대','국방','안보','보훈'],age:[1,.65,.5,.5,.65,.75],gender:[.08,0]},
  {code:'GENDER_SOCIAL',terms:['젠더','여성','남성','성평등','페미'],age:[1.15,1,.75,.5,.3,.2],gender:[.08,.08]},
  {code:'TECH',terms:['ai','인공지능','플랫폼','게임','코인','가상자산','스타트업'],age:[1.15,1.05,.7,.45,.25,.15],gender:[0,0]},
  {code:'TAX_ECONOMY',terms:['세금','조세','경제','물가','금리','소상공인','자영업','재정'],age:[.65,.85,1,1,.85,.6],gender:[0,0]},
  {code:'WELFARE',terms:['복지','돌봄','생계','기초생활','지원금'],age:[.55,.7,.8,.85,1,1.05],gender:[0,.03]},
  {code:'GOVERNANCE_REFORM',terms:['정치개혁','선거제','개헌','협치','거버넌스','행정개혁','정부조직'],age:[.7,.8,.9,.9,.75,.6],gender:[0,0]},
  {code:'LOCAL',terms:['교통','철도','도로','지역개발','산업단지','재개발'],age:[.55,.8,1,1,.75,.55],gender:[0,0]},
  {code:'SCANDAL',terms:['논란','의혹','수사','기소','구속','폭로','파문','사퇴'],age:[.8,.85,.9,.9,.8,.75],gender:[0,0]},
  {code:'MOBILIZATION',terms:['출마','선언','영입','합류','공약','개혁','성과','승리'],age:[.8,.85,.9,.9,.8,.7],gender:[0,0]}
];
const POSITIVE=['성과','확대','상승','지지','호평','승리','개혁','공약','협력','회복','돌파','개선'];
const NEGATIVE=['논란','의혹','수사','기소','구속','폭로','반발','비판','사퇴','패배','하락','갈등','파문'];

function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function clamp(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;}
function round(v,d=0){const p=10**d;return Math.round(v*p)/p;}
function mean(values){const a=values.map(num).filter(v=>v!==null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;}
function scoreAxis(v){const n=num(v);return n===null?0:clamp(n-50,-50,50);}
function coreCoverage(view={}){const s=view?.analysis?.scores||{};const keys=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'];return keys.filter(k=>num(s[k])!==null).length/keys.length;}
function historyDays(history={}){return Number(history?.summary?.dailySampleSize??history?.daily?.length??0)||0;}
function historyDelta(history={},key){const n=num(history?.summary?.coreDeltas?.[key]);return n===null?0:n;}
function globalMovement(view={},history={}){
  const s=view?.analysis?.scores||{};const rank=num(view?.rankDelta)||0;
  const current=mean([scoreAxis(s.overallInterest),scoreAxis(s.highEngagement),scoreAxis(s.massExpansion),scoreAxis(s.issueHeat),scoreAxis(s.mediaSpread)])||0;
  const trend=mean(['overallInterest','highEngagement','massExpansion','issueHeat','mediaSpread'].map(k=>historyDelta(history,k)))||0;
  return clamp(current*.22+trend*.68+rank*.55,-24,24);
}
function broadRegion(value=''){const raw=String(value||'').trim().split(/\s+/)[0]||'';const aliases={'서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주'};return aliases[raw]||raw;}
function currentViewSignal(view={}){const s=view?.analysis?.scores||{};const current=mean([scoreAxis(s.overallInterest),scoreAxis(s.highEngagement),scoreAxis(s.massExpansion),scoreAxis(s.issueHeat),scoreAxis(s.mediaSpread)])||0;return clamp(current+(num(view?.rankDelta)||0)*.4,-30,30);}
function deriveMarketContextV2({view={},allViews=[]}={}){
  const rows=(Array.isArray(allViews)?allViews:[]).filter(v=>v?.row?.person?.id),person=view?.row?.person||{},id=String(person.id||''),type=String(person.type||''),party=String(person.party||''),region=broadRegion(person.jurisdiction||person.region||'');
  const market=rows.filter(v=>String(v?.row?.person?.type||'')===type&&String(v?.row?.person?.id||'')!==id),marketMean=mean(market.map(currentViewSignal))??0;
  const partyRows=market.filter(v=>party&&String(v?.row?.person?.party||'')===party),regionRows=market.filter(v=>region&&broadRegion(v?.row?.person?.jurisdiction||v?.row?.person?.region||'')===region);
  const relatedIds=new Set((Array.isArray(view?.related)?view.related:[]).map(r=>String(r?.person?.id||r?.id||'')).filter(Boolean));const competitorRows=market.filter(v=>relatedIds.has(String(v?.row?.person?.id||'')));
  const self=currentViewSignal(view),partyMean=mean(partyRows.map(currentViewSignal)),regionMean=mean(regionRows.map(currentViewSignal)),competitorMean=mean(competitorRows.map(currentViewSignal));
  return {partyMovement:partyMean===null?0:round(clamp((partyMean-marketMean)*.35,-8,8),1),regionalMovement:regionMean===null?0:round(clamp((regionMean-marketMean)*.3,-8,8),1),competitorMovement:competitorMean===null?0:round(clamp((self-competitorMean)*.35,-8,8),1),partyPeerCount:partyRows.length,regionalPeerCount:regionRows.length,competitorCount:competitorRows.length};
}
function normalizeEventTitle(title=''){return String(title||'').toLowerCase().replace(/<[^>]*>/g,' ').replace(/[^0-9a-z가-힣]+/g,' ').trim().replace(/\s+/g,' ');}
function eventFingerprint(title=''){return crypto.createHash('sha1').update(normalizeEventTitle(title)).digest('hex').slice(0,16);}
function eventDirection(title=''){const t=normalizeEventTitle(title);let p=0,n=0;for(const x of POSITIVE)if(t.includes(x))p++;for(const x of NEGATIVE)if(t.includes(x))n++;return clamp((p-n)*1.6,-4,4);}
function eventTokens(title=''){return new Set(normalizeEventTitle(title).split(/\s+/).map(x=>x.trim()).filter(x=>x.length>=2));}
function similarEvent(a,b){const at=a?.tokens||eventTokens(a?.title),bt=b?.tokens||eventTokens(b?.title);if(!at.size||!bt.size)return false;let common=0;for(const t of at)if(bt.has(t))common++;const overlap=common/Math.max(1,Math.min(at.size,bt.size));const ta=num(a?.ts),tb=num(b?.ts),timeOk=ta===null||tb===null||Math.abs(ta-tb)<=48*3600000;return timeOk&&common>=3&&overlap>=.6;}
function collectEvents(view={}){
  const rows=Array.isArray(view?.row?.news?.headlines)?view.row.news.headlines:[],events=[];
  for(const row of rows.slice(0,24)){const title=String(row?.title||'').trim();if(!title)continue;const candidate={fingerprint:eventFingerprint(title),title,ts:num(row?.ts),tokens:eventTokens(title),propagation:1,sources:new Set([String(row?.source||'').trim()].filter(Boolean))};const exact=events.find(e=>e.fingerprint===candidate.fingerprint),matched=exact||events.find(e=>similarEvent(e,candidate));if(matched){matched.propagation++;if(row?.source)matched.sources.add(String(row.source));if(candidate.ts!==null&&(matched.ts===null||candidate.ts<matched.ts))matched.ts=candidate.ts;}else events.push(candidate);}
  return events.map(e=>({fingerprint:e.fingerprint,title:e.title,ts:e.ts,propagation:e.propagation,sourceBreadth:e.sources.size}));
}
function issueEffectForCell(events=[],cellIndex=0){
  const ageIdx=Math.floor(cellIndex/2),sexIdx=cellIndex%2;let effect=0,matched=0;
  for(const event of events){const t=normalizeEventTitle(event.title),dir=eventDirection(event.title);if(!dir)continue;for(const rule of ISSUE_RULES){if(!rule.terms.some(term=>t.includes(term)))continue;effect+=dir*(rule.age[ageIdx]||.5)*(1+(rule.gender[sexIdx]||0));matched++;break;}}
  return {effect:clamp(effect,-10,10),matched};
}
function issueStructureEffectForCell(events=[],cellIndex=0,directionSeed=0){
  const ageIdx=Math.floor(cellIndex/2),sexIdx=cellIndex%2,seed=clamp(directionSeed,-24,24);let effect=0,matched=0;
  if(Math.abs(seed)<2)return {effect:0,matched:0};
  for(const event of events){
    const t=normalizeEventTitle(event.title);if(eventDirection(event.title))continue;
    for(const rule of ISSUE_RULES){
      if(!rule.terms.some(term=>t.includes(term)))continue;
      const ageMean=rule.age.reduce((a,b)=>a+b,0)/rule.age.length,relative=(rule.age[ageIdx]||.5)-ageMean;
      const direction=Math.sign(seed)*clamp(Math.abs(seed)/8,.35,2.2),genderScale=1+(rule.gender[sexIdx]||0),propagation=clamp(1+(Number(event.propagation||1)-1)*.12,1,1.5);
      effect+=direction*relative*2.4*genderScale*propagation;matched++;break;
    }
  }
  return {effect:clamp(effect,-8,8),matched};
}
function evidenceRows(evidence={}){const rows=Array.isArray(evidence?.sources)?evidence.sources:[];const seen=new Set();return rows.filter(r=>{const k=String(r?.fingerprint||[r?.institution,r?.url,r?.title,r?.observedAt].join('|'));if(seen.has(k))return false;seen.add(k);return true;});}
function detailedAnchorValues(evidence={},key){const vals=[];for(const row of evidenceRows(evidence)){const n=num(row?.values?.[key]);if(n!==null)vals.push({value:n,row});}return vals;}
function coarseKeyForCell(cellIndex){const group=Math.floor(cellIndex/2);return group<=1?'age2030':group<=3?'age4050':'age60plus';}
function coarseAnchorValues(evidence={},cellIndex){const coarse=coarseKeyForCell(cellIndex),vals=[];for(const row of evidenceRows(evidence)){const n=num(row?.values?.[coarse]);if(n!==null)vals.push({value:n,row});}return vals;}
function detailedAnchorForCell(evidence={},key){return mean(detailedAnchorValues(evidence,key).map(x=>x.value));}
function coarseAnchorForCell(evidence={},cellIndex){return mean(coarseAnchorValues(evidence,cellIndex).map(x=>x.value));}
function anchorEffect(anchor,baselineAffinity){if(anchor===null)return 0;const relative=clamp((anchor-25)/2.5,-15,15);const affinity=num(baselineAffinity)||0;return clamp(relative+affinity*2,-15,15);}
function anchorDiagnostics(evidence={},key,cellIndex,baselineAffinity,asOf){const detailed=detailedAnchorValues(evidence,key),rows=detailed.length?detailed:coarseAnchorValues(evidence,cellIndex);if(!rows.length)return {agreement:1,freshness:0,hasDetailed:false};const effects=rows.map(x=>anchorEffect(x.value,baselineAffinity));const pos=effects.filter(x=>x>1).length,neg=effects.filter(x=>x<-1).length,neutral=effects.length-pos-neg;const majority=Math.max(pos,neg,neutral),agreement=effects.length<=1?1:majority/effects.length;const asMs=Date.parse(asOf||'');const dates=rows.map(x=>Date.parse(x.row?.observedAt||x.row?.date||'')).filter(Number.isFinite);let freshness=.6;if(Number.isFinite(asMs)&&dates.length){const ageDays=Math.max(0,(asMs-Math.max(...dates))/86400000);freshness=ageDays<=45?1:ageDays<=180?.75:ageDays<=365?.5:.25;}return {agreement,freshness,hasDetailed:detailed.length>0};}
function previousCell(previous,key){const row=previous?.cohorts?.cells?.[key];return row&&row.status==='VALID_SIGNAL'&&num(row.value)!==null?row:null;}
function movementCap({events,evidence,cellKey,cellIndex,baselineAffinity,asOf}){const diag=anchorDiagnostics(evidence,cellKey,cellIndex,baselineAffinity,asOf);if(diag.hasDetailed&&diag.freshness>=.75)return 15;const independent=events.length;const evidenceCount=evidenceRows(evidence).length;if(independent>=3||evidenceCount>=2)return 10;return 5;}
function baselineUsable(baseline={}){return baseline&&baseline.baselineKind!=='LIMITED'&&Number(baseline.baselineQuality)>=20&&Array.isArray(baseline.populationWeights)&&baseline.populationWeights.length===12&&baseline.populationWeights.every(v=>num(v)!==null)&&Array.isArray(baseline.cohortAffinity)&&baseline.cohortAffinity.length===12;}
function sourceReadiness(view={}){const row=view?.row||{},search=row.search||null,news=row.news||null;let ready=0;if(search&&(search.state==='READY'||num(search.monthlyTotalQcCnt)!==null||num(search.monthlyPcQcCnt)!==null))ready++;if(news&&(news.state==='READY'||Array.isArray(news.headlines)||num(news.count24)!==null))ready++;return ready/2;}
function isOfficialDemographicBaseline(baseline={}){
  const state=String(baseline?.sourceState||'').toUpperCase();
  return state.startsWith('OFFICIAL_')&&Array.isArray(baseline?.populationWeights)&&baseline.populationWeights.length===12&&Array.isArray(baseline?.cohortAffinity)&&baseline.cohortAffinity.length===12;
}
function officialBaselineEvidenceBonus(baseline={}){
  if(!isOfficialDemographicBaseline(baseline))return 0;
  const support=Math.max(0,Number(baseline?.matchedGeoUnits)||0,Number(baseline?.proxyEvidenceUnitCount)||0,Number(baseline?.proxyReferenceCount)||0);
  return round(clamp(2+Math.log2(support+1)*1.2,2,8),1);
}
function cellConfidence({baseline,view,history,events,evidence,cellIndex,detailedAnchor,anchorAgreement=1,anchorFreshness=0}){
  const officialDemographic=isOfficialDemographicBaseline(baseline);
  let c=0;
  c+=clamp(Number(baseline?.baselineQuality)||0,0,100)*(officialDemographic?.55:.48);
  c+=coreCoverage(view)*(officialDemographic?22:18);
  c+=clamp(historyDays(history)/180,0,1)*10;
  c+=clamp(events.length/4,0,1)*8;
  c+=clamp(evidenceRows(evidence).length/3,0,1)*6;
  c+=officialDemographic?sourceReadiness(view)*4:(sourceReadiness(view)-.5)*8;
  c+=officialBaselineEvidenceBonus(baseline);if(detailedAnchor!==null)c+=14*anchorFreshness;c-=Math.max(0,1-anchorAgreement)*16;
  if(!officialDemographic&&baseline?.baselineKind==='PARTY_PROXY')c-=8;if(!officialDemographic&&baseline?.baselineKind==='REGIONAL_PARTY_PROXY')c-=13;if(baseline?.baselineKind==='LIMITED')c=Math.min(c,25);
  const sexSpecific=officialDemographic||detailedAnchor!==null||Math.abs(num(baseline?.cohortAffinity?.[cellIndex])||0)>=.015;if(!sexSpecific)c-=5;
  return round(clamp(c,0,100));
}
function cohortProfileEffect(baseline={},cellIndex=0){
  const values=Array.isArray(baseline?.cohortAffinity)?baseline.cohortAffinity.map(num):[];if(values.length!==12||values[cellIndex]===null)return 0;
  const weights=Array.isArray(baseline?.populationWeights)&&baseline.populationWeights.length===12?baseline.populationWeights.map(v=>Math.max(0,num(v)||0)):Array(12).fill(1);let sw=0,sv=0;
  for(let i=0;i<12;i++){if(values[i]===null)continue;const w=weights[i]||0;sw+=w;sv+=w*values[i];}if(!(sw>0))return 0;
  const center=sv/sw;let variance=0;for(let i=0;i<12;i++){if(values[i]===null)continue;const w=weights[i]||0;variance+=w*(values[i]-center)**2;}variance/=sw;
  const dispersion=Math.sqrt(Math.max(0,variance)),centered=values[cellIndex]-center,kind=String(baseline?.baselineKind||''),kindScale=kind==='DIRECT_CANDIDATE'?1:kind==='PARTY_PROXY'?.82:kind==='REGIONAL_PARTY_PROXY'?.7:.62,qualityScale=clamp(.72+(Number(baseline?.baselineQuality)||0)/360,.72,1);
  if(dispersion<.002)return clamp(centered*120*kindScale*qualityScale,-22,22);
  return clamp((centered/dispersion)*10*kindScale*qualityScale,-24,24);
}
function previousProfileCompressed(previous={}){
  const vals=COHORT_KEYS.map(k=>previous?.cohorts?.cells?.[k]).filter(r=>r&&r.status==='VALID_SIGNAL'&&num(r.value)!==null).map(r=>Number(r.value));
  if(vals.length<8)return false;return Math.max(...vals)-Math.min(...vals)<=2;
}
function fitSharedComponents(parts={},limit=0){
  const total=Object.values(parts).reduce((a,b)=>a+(Number(b)||0),0);if(!(limit>0)||Math.abs(total)<=limit)return parts;const scale=limit/Math.abs(total);return Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,Number(v)*scale]));
}

function aggressiveTarget(value,parts={}){
  const directional=Object.entries(parts).map(([key,v])=>({key,value:Number(v)||0})).filter(x=>Math.abs(x.value)>=2);
  if(directional.length<2)return clamp(value,-50,50);
  const pos=directional.filter(x=>x.value>0),neg=directional.filter(x=>x.value<0),dominant=pos.length>=neg.length?pos:neg,minor=pos.length>=neg.length?neg:pos;
  const agreement=dominant.length/directional.length;
  const strongest=[...directional].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value))[0]?.value||0;
  let out=value;
  if(agreement>=.67)out*=1+Math.min(.38,(agreement-.5)*.76);
  else if(minor.length&&Math.abs(strongest)>=10)out+=strongest*.18;
  return clamp(out,-50,50);
}
function computeCell({key,index,baseline,view,history,evidence,events,previous,marketContext={},asOf=null}){
  const detailed=detailedAnchorForCell(evidence,key),coarse=coarseAnchorForCell(evidence,index),aff=num(baseline?.cohortAffinity?.[index]);const issue=issueEffectForCell(events,index);const global=globalMovement(view,history),issueStructure=issueStructureEffectForCell(events,index,global);
  const party=clamp(num(marketContext?.partyMovement)||0,-8,8),regional=clamp(num(marketContext?.regionalMovement)||0,-8,8),competitor=clamp(num(marketContext?.competitorMovement)||0,-8,8),hDays=historyDays(history);
  const anchorDiag=anchorDiagnostics(evidence,key,index,aff,asOf),external=anchorEffect(detailed!==null?detailed:coarse,aff)*anchorDiag.freshness,compressedPrevious=previousProfileCompressed(previous),prior=compressedPrevious?null:previousCell(previous,key),profile=cohortProfileEffect(baseline,index),cap=movementCap({events,evidence,cellKey:key,cellIndex:index,baselineAffinity:aff,asOf});let target,components;
  const shared=fitSharedComponents({personalEffect:global*.42,partyEffect:party*.08,regionalEffect:regional*.06,competitorEffect:competitor*.08},cap*.8);
  components={personalEffect:shared.personalEffect+profile,partyEffect:shared.partyEffect,regionalEffect:shared.regionalEffect,competitorEffect:shared.competitorEffect,issueEffect:issue.effect*.45,issueStructureEffect:issueStructure.effect,externalAnchorEffect:external*.72,historyPriorEffect:prior?prior.value:0};
  target=profile+shared.personalEffect+shared.partyEffect+shared.regionalEffect+shared.competitorEffect+components.issueEffect+components.issueStructureEffect+components.externalAnchorEffect;
  target=aggressiveTarget(target,{profile,global:shared.personalEffect,party:shared.partyEffect,regional:shared.regionalEffect,competitor:shared.competitorEffect,issue:components.issueEffect,issueStructure:components.issueStructureEffect,external:components.externalAnchorEffect});
  let value=prior?prior.value+clamp(target-prior.value,-cap,cap):target;
  value=round(clamp(value,-50,50));const confidence=cellConfidence({baseline,view,history,events,evidence,cellIndex:index,detailedAnchor:detailed,anchorAgreement:anchorDiag.agreement,anchorFreshness:anchorDiag.freshness});const status='VALID_SIGNAL';
  return {key,value,status,confidence,baselineQuality:Number(baseline.baselineQuality)||0,evidenceCount:evidenceRows(evidence).length,independentEventCount:events.length,historyDays:hDays,lastValidatedAt:detailed!==null?String(evidenceRows(evidence).find(r=>num(r?.values?.[key])!==null)?.observedAt||'')||null:null,reason:null,components:Object.fromEntries(Object.entries(components).map(([k,v])=>[k,round(v,1)]))};
}
function aggregateWeighted(rows,weights){let sw=0,sv=0,sc=0;for(const {index,cell} of rows){if(cell?.status!=='VALID_SIGNAL'||num(cell.value)===null)continue;const w=(num(weights?.[index])??1)*(Math.max(1,num(cell.confidence)||1)/100);sw+=w;sv+=w*cell.value;sc+=w*(cell.confidence||0);}if(!(sw>0))return {value:null,status:'LIMITED_SIGNAL',confidence:null};return {value:round(sv/sw),status:'VALID_SIGNAL',confidence:round(sc/sw)};}
function aggregateCells(cells={},weights=Array(12).fill(1/12)){
  const age={};for(const [label,m,f] of AGE_GROUPS)age[label]=aggregateWeighted([{index:m,cell:cells[COHORT_KEYS[m]]},{index:f,cell:cells[COHORT_KEYS[f]]}],weights);
  const male=[],female=[];for(let i=0;i<12;i++)((i%2===0)?male:female).push({index:i,cell:cells[COHORT_KEYS[i]]});
  return {age,gender:{MALE:aggregateWeighted(male,weights),FEMALE:aggregateWeighted(female,weights)}};
}
function summaryFromCells(cells={},reference30d=null,volatility30d=null){
  const valid=COHORT_KEYS.map((key,i)=>({key,index:i,...cells[key]})).filter(x=>x.status==='VALID_SIGNAL'&&num(x.value)!==null);const label=k=>k.replace('_m',' M').replace('_f',' F').replace('18_29','18–29').replace('30_39','30–39').replace('40_49','40–49').replace('50_59','50–59').replace('60_69','60–69').replace('70_plus','70+');
  const pos=[...valid].sort((a,b)=>b.value-a.value)[0]||null,neg=[...valid].sort((a,b)=>a.value-b.value)[0]||null;let gap=null;
  for(let g=0;g<6;g++){const m=cells[COHORT_KEYS[g*2]],f=cells[COHORT_KEYS[g*2+1]];if(m?.status!=='VALID_SIGNAL'||f?.status!=='VALID_SIGNAL')continue;const d=Math.abs(m.value-f.value);if(!gap||d>gap.value)gap={label:AGE_GROUPS[g][0],value:d};}
  const refCells=reference30d?.cohorts?.cells||reference30d?.cells||null;let fastest=null;
  if(refCells){const changes=valid.map(v=>{const p=refCells?.[v.key];return p?.status==='VALID_SIGNAL'&&num(p.value)!==null?{...v,delta:round(v.value-Number(p.value))}:null;}).filter(Boolean).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));if(changes[0])fastest={cohort:label(changes[0].key),value:changes[0].delta};}
  let stable=null;if(volatility30d&&typeof volatility30d==='object'){const rows=valid.map(v=>({key:v.key,vol:num(volatility30d[v.key])})).filter(x=>x.vol!==null).sort((a,b)=>a.vol-b.vol);if(rows[0])stable={cohort:label(rows[0].key),volatility:round(rows[0].vol,1)};}
  return {strongestPositive:pos?{cohort:label(pos.key),value:pos.value}:null,strongestNegative:neg?{cohort:label(neg.key),value:neg.value}:null,widestGenderGap:gap,fastest30dChange:fastest,mostStableCohort:stable};
}
function deriveAgeGenderCohortsV2({person={},baseline={},view={},history={},evidence={},previous=null,reference30d=null,volatility30d=null,marketContext={},asOf=null}={}){
  const events=collectEvents(view),cells={};for(let i=0;i<COHORT_KEYS.length;i++){const key=COHORT_KEYS[i];cells[key]=computeCell({key,index:i,baseline,view,history,evidence,events,previous,marketContext,asOf});}
  const aggregates=aggregateCells(cells,baseline?.populationWeights);const validCount=Object.values(cells).filter(x=>x.status==='VALID_SIGNAL').length;
  return {engineVersion:ENGINE_VERSION,asOf:asOf||null,baseline:{kind:baseline?.baselineKind||'LIMITED',quality:Number(baseline?.baselineQuality)||0,sourceState:String(baseline?.sourceState||''),limitedReasons:Array.isArray(baseline?.limitedReasons)?baseline.limitedReasons.slice(0,8):[]},cells,age:aggregates.age,gender:aggregates.gender,summary:summaryFromCells(cells,reference30d,volatility30d),validity:{state:validCount?'VALID_SIGNAL':'LIMITED_SIGNAL',validCellCount:validCount,totalCellCount:12,independentEventCount:events.length,evidenceCount:evidenceRows(evidence).length,historyDays:historyDays(history),confidenceThreshold:CONFIDENCE_THRESHOLD}};
}

module.exports={ENGINE_VERSION,CONFIDENCE_THRESHOLD,deriveAgeGenderCohortsV2,deriveMarketContextV2,_internals:{aggregateCells,collectEvents,eventFingerprint,normalizeEventTitle,issueEffectForCell,issueStructureEffectForCell,globalMovement,detailedAnchorForCell,coarseAnchorForCell,movementCap,baselineUsable,cellConfidence,summaryFromCells,currentViewSignal,broadRegion,eventTokens,similarEvent,anchorDiagnostics,sourceReadiness,isOfficialDemographicBaseline,officialBaselineEvidenceBonus,cohortProfileEffect,fitSharedComponents,previousProfileCompressed,aggressiveTarget}};
