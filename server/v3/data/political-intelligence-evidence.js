'use strict';

const EVIDENCE=Object.freeze({
  'assembly-023':Object.freeze([
    Object.freeze({
      observedAt:'2025-05-22T00:00:00.000Z',
      ingestedAt:'2026-08-29T00:00:00.000Z',
      institution:'한국갤럽',
      sourceType:'POLL_AGE_SUPPORT',
      title:'데일리 오피니언 제623호 · 제21대 대선 후보 지지도 연령별',
      url:'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1559',
      values:Object.freeze({age2030:23,age4050:4,age60plus:4}),
      note:'20대 29%, 30대 17%, 40대 이상 2~6%를 JCS 연령군 기준으로 구조화한 외부 근거'
    }),
    Object.freeze({
      observedAt:'2025-06-05T00:00:00.000Z',
      ingestedAt:'2026-08-29T00:00:00.000Z',
      institution:'한국갤럽',
      sourceType:'POST_ELECTION_AGE_VOTE',
      title:'데일리 오피니언 제624호 · 제21대 대선 사후조사 연령별 투표 후보',
      url:'https://www.gallup.co.kr/dir/GallupKoreaDaily/GallupKoreaDailyOpinion_624(20250606).pdf',
      values:Object.freeze({age2030:19.5,age4050:2.5,age60plus:1}),
      note:'18~29세 20%, 30대 19%, 40대 1%, 50대 4%, 60대 2%를 JCS 연령군 기준으로 구조화한 외부 근거'
    })
  ])
});

function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function average(values=[]){const nums=values.map(finite).filter(v=>v!==null);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;}
function asTime(value){const t=Date.parse(value||'');return Number.isFinite(t)?t:Date.now();}

function getPoliticalIntelligenceEvidence(personId,{asOf=new Date().toISOString()}={}){
  const cutoff=asTime(asOf);
  const sources=(EVIDENCE[String(personId||'')]||[])
    .filter(row=>asTime(row.observedAt)<=cutoff&&asTime(row.ingestedAt||row.observedAt)<=cutoff)
    .map(row=>({
      observedAt:row.observedAt,ingestedAt:row.ingestedAt||row.observedAt,institution:row.institution,sourceType:row.sourceType,title:row.title,url:row.url,note:row.note,values:{...row.values}
    }));
  const demographic=sources.length?{
    age2030:average(sources.map(x=>x.values?.age2030)),
    age4050:average(sources.map(x=>x.values?.age4050)),
    age60plus:average(sources.map(x=>x.values?.age60plus))
  }:null;
  return {personId:String(personId||''),sources,demographic};
}

module.exports={getPoliticalIntelligenceEvidence,_evidence:EVIDENCE};
