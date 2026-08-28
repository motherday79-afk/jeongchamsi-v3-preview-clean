const metric=(key,label,description)=>Object.freeze({key,label,description});

export const CORE_COMPARE_METRICS=Object.freeze([
  metric('overallInterest','종합 관심','현재 이 인물을 둘러싼 사회적 관심의 총체적 강도'),
  metric('highEngagement','심층 관심','일시적 노출을 넘어 추가 정보 탐색으로 이어지는 관심의 깊이'),
  metric('massExpansion','대중 확산','관심이 특정 관심군을 넘어 폭넓게 확산되는 힘'),
  metric('activity','활동성','최근 활동과 이슈 노출이 얼마나 활발하게 포착되고 있는지'),
  metric('issueHeat','이슈 온도','현재 이 인물을 둘러싼 이슈의 즉시성과 집중도'),
  metric('mediaSpread','미디어 확산','관련 이슈가 다양한 정보 채널을 통해 확산되는 정도')
]);

export const AUDIENCE_COMPARE_METRICS=Object.freeze([
  metric('audienceExpansion','관심층 확장','기존 관심 범위를 넘어 새로운 관심군으로 확산되는 정도'),
  metric('mobileResponse','반응 확장력','새로운 관심이 보다 넓은 이용자층으로 빠르게 확산되는 정도'),
  metric('massPenetration','대중 침투력','정치 고관여층을 넘어 일반적인 대중 관심으로 연결되는 힘'),
  metric('coreRetention','심층 유지력','단기 화제 이후에도 정보 탐색형 관심이 지속되는 정도')
]);

export const ACTIVITY_COMPARE_METRICS=Object.freeze([
  metric('activity','활동성','최근 활동과 이슈 노출이 얼마나 활발하게 포착되고 있는지'),
  metric('activityAcceleration','활동 가속도','최근 활동과 관련 노출의 증가 속도가 얼마나 빨라지고 있는지'),
  metric('activityConcentration','활동 집중도','최근 짧은 기간에 활동과 관심이 얼마나 집중되고 있는지'),
  metric('activityPersistence','활동 지속성','일회성 이슈가 아닌 연속적인 활동 흐름이 유지되는 정도'),
  metric('newsAcceleration','미디어 가속도','관련 보도와 언급이 이전 흐름보다 빠르게 확대되는 정도'),
  metric('issueFreshness','이슈 신선도','현재 관심이 최근 발생한 이슈에 얼마나 집중되어 있는지'),
  metric('issuePersistence','이슈 지속성','특정 이슈에 대한 관심이 단발성 반응을 넘어 유지되는 정도'),
  metric('mediaDiversity','채널 다양성','특정 정보원에 편중되지 않고 다양한 경로에서 다뤄지는 정도')
]);

export const FLOW_COMPARE_METRICS=Object.freeze([
  metric('newsSearchTransition','미디어→대중 전이','이슈 노출이 실제 대중 관심으로 연결되는 정도'),
  metric('issueInflux','이슈 유입력','새로운 정치적 이슈가 추가적인 관심을 끌어들이는 힘'),
  metric('mediaPublicGap','미디어·대중 괴리','정보 노출 강도와 실제 대중 관심 사이의 차이'),
  metric('issueExplosiveness','이슈 폭발력','짧은 시간 안에 이슈 노출과 대중 관심이 동시에 증폭되는 힘')
]);

export function scoreFor(live,key){
  const value=Number(live?.analysis?.scores?.[key]);
  return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value*10)/10)):null;
}

export function relativeCompareAxisValue(a,b){
  if(a===null||a===undefined||a===''||b===null||b===undefined||b==='')return null;
  const left=Number(a),right=Number(b);
  if(!Number.isFinite(left)||!Number.isFinite(right))return null;
  const safeLeft=Math.max(0,Math.min(100,left));
  const safeRight=Math.max(0,Math.min(100,right));
  return Math.max(-50,Math.min(50,Math.round(((safeRight-safeLeft)/2)*10)/10));
}

export function buildDifferences(liveA,liveB,metrics=CORE_COMPARE_METRICS,threshold=5){
  return metrics.map(item=>{
    const a=scoreFor(liveA,item.key),b=scoreFor(liveB,item.key);
    const delta=a===null||b===null?null:Math.round((a-b)*10)/10;
    const leader=delta===null||Math.abs(delta)<threshold?'tie':delta>0?'a':'b';
    return {...item,a,b,delta,leader};
  });
}

function topDifference(rows,leader){
  return rows.filter(x=>x.leader===leader).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0]||null;
}

export function buildCompareInsight(personA,liveA,personB,liveB){
  const nameA=String(personA?.name||'A'),nameB=String(personB?.name||'B');
  const differences=buildDifferences(liveA,liveB,CORE_COMPARE_METRICS,5);
  const advantageA=differences.filter(x=>x.leader==='a').length;
  const advantageB=differences.filter(x=>x.leader==='b').length;
  const balanced=differences.filter(x=>x.leader==='tie').length;
  const topA=topDifference(differences,'a');
  const topB=topDifference(differences,'b');
  let headline='두 정치인의 핵심 관심 신호가 근접한 흐름입니다';
  if(topA&&topB)headline=`${nameA}은 ${topA.label}, ${nameB}은 ${topB.label}에서 상대적으로 강한 흐름`;
  else if(topA)headline=`${nameA}, ${topA.label}을 중심으로 상대적으로 강한 흐름`;
  else if(topB)headline=`${nameB}, ${topB.label}을 중심으로 상대적으로 강한 흐름`;
  const signalA=String(liveA?.analysis?.signal?.label||'분석 대기');
  const signalB=String(liveB?.analysis?.signal?.label||'분석 대기');
  const summary=`핵심 6개 지표에서 ${nameA}은 ${advantageA}개, ${nameB}은 ${advantageB}개 지표가 상대적으로 높고 ${balanced}개는 근접합니다. 현재 SIGNAL은 각각 ${signalA}, ${signalB}로 관측됩니다.`;
  return {headline,summary,advantageA,advantageB,balanced,differences,topA,topB};
}

export function trendScoreDelta(live,key){
  const points=Array.isArray(live?.trend?.points)?live.trend.points:[];
  const values=points.map(x=>Number(x?.scores?.[key])).filter(Number.isFinite);
  if(values.length<2)return null;
  return Math.round((values[values.length-1]-values[0])*10)/10;
}

export function trendRankDelta(live,key='globalRank'){
  const points=Array.isArray(live?.trend?.points)?live.trend.points:[];
  const values=points.map(x=>Number(x?.[key])).filter(x=>Number.isFinite(x)&&x>0);
  if(values.length<2)return null;
  return Math.round((values[0]-values[values.length-1])*10)/10;
}
