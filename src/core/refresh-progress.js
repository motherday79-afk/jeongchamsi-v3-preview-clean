export const REFRESH_STAGES = Object.freeze([
  { key:"now", pct:50, label:"NOW SEARCH + NEWS COLLECTION" },
  { key:"evidence", pct:62, label:"PUBLIC RESEARCH + POLL EVIDENCE" },
  { key:"official", pct:74, label:"OFFICIAL ELECTION + POPULATION + AGE×GENDER" },
  { key:"market", pct:80, label:"PARTY · REGION · COMPETITOR MARKET CONTEXT" },
  { key:"history", pct:86, label:"JCS HISTORY CONTEXT" },
  { key:"cohort", pct:94, label:"AGE · GENDER · AGE×GENDER COHORT ANALYSIS" },
  { key:"intelligence", pct:98, label:"AGGRESSIVE JCS INTELLIGENCE" },
  { key:"verify", pct:100, label:"SNAPSHOT VERIFY + SAVE" }
]);
export function stageProgress(key,fraction=1){
  const index=Math.max(0,REFRESH_STAGES.findIndex(stage=>stage.key===key));
  const end=REFRESH_STAGES[index]?.pct||0;
  const start=index?REFRESH_STAGES[index-1].pct:0;
  const f=Math.max(0,Math.min(1,Number(fraction)||0));
  return Math.round((start+(end-start)*f)*10)/10;
}
export function stageLabel(key){return REFRESH_STAGES.find(stage=>stage.key===key)?.label||"JCS INTELLIGENCE";}
