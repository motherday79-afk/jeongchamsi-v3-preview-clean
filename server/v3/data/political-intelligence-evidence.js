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

function getPoliticalIntelligenceEvidence(personId,{asOf=new Date().toISOString(),dynamicBundle=null,person=null}={}){
  const id=String(personId||''),cutoff=asTime(asOf);
  const curated=(EVIDENCE[id]||[])
    .filter(row=>asTime(row.observedAt)<=cutoff&&asTime(row.ingestedAt||row.observedAt)<=cutoff)
    .map(row=>({
      fingerprint:row.fingerprint||'',observedAt:row.observedAt,ingestedAt:row.ingestedAt||row.observedAt,collectedAt:row.ingestedAt||row.observedAt,
      institution:row.institution,sourceType:row.sourceType,title:row.title,url:row.url,note:row.note,values:row.values?{...row.values}:null,origin:'CURATED'
    }));
  const party=String(person?.party||'').trim();
  const dynamic=(Array.isArray(dynamicBundle?.records)?dynamicBundle.records:[])
    .filter(row=>{
      const direct=Array.isArray(row?.personIds)&&row.personIds.map(String).includes(id);
      const partyContext=party&&Array.isArray(row?.partyTags)&&row.partyTags.map(String).includes(party);
      return (direct||partyContext)&&asTime(row.observedAt)<=cutoff&&asTime(row.collectedAt||row.ingestedAt||row.observedAt)<=cutoff;
    })
    .map(row=>({
      fingerprint:String(row.fingerprint||''),observedAt:row.observedAt||row.collectedAt||null,ingestedAt:row.collectedAt||row.ingestedAt||row.observedAt||null,collectedAt:row.collectedAt||row.ingestedAt||row.observedAt||null,
      institution:String(row.institution||''),sourceType:String(row.sourceType||'PUBLIC_EXTERNAL_EVIDENCE'),title:String(row.title||''),url:String(row.url||''),note:String(row.note||''),values:row.values&&typeof row.values==='object'?{...row.values}:null,origin:'COLLECTED',
      relationship:Array.isArray(row?.personIds)&&row.personIds.map(String).includes(id)?'PERSON':'PARTY_CONTEXT'
    }));
  const sources=[...new Map([...curated,...dynamic].map(row=>[row.fingerprint||[row.institution,row.url,row.title,row.observedAt].join('|'),row])).values()];
  const numericSources=sources.filter(x=>x.values&&typeof x.values==='object');
  const demographic=numericSources.length?{
    age2030:average(numericSources.map(x=>x.values?.age2030)),
    age4050:average(numericSources.map(x=>x.values?.age4050)),
    age60plus:average(numericSources.map(x=>x.values?.age60plus))
  }:null;
  return {personId:id,sources,demographic};
}

module.exports={getPoliticalIntelligenceEvidence,_evidence:EVIDENCE};
