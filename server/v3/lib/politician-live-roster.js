const roster=require('../data/politician-photo-roster.json');

function isReal(row){
  return Boolean(row&&row.id&&row.name&&row.id!=='assembly-300'&&row.party!=='공석'&&row.type!=='vacancy'&&!String(row.name).includes('공석'));
}
function locality(jurisdiction=''){
  const parts=String(jurisdiction).trim().split(/\s+/).filter(Boolean);
  return parts.at(-1)||'';
}
function deriveOffice(row){
  if(row.type==='assembly')return '국회의원';
  const j=String(row.jurisdiction||'').trim();
  if(row.type==='metropolitan'){
    if(/도$/.test(j))return `${j}지사`;
    return `${j}장`;
  }
  const loc=locality(j);
  if(/구$/.test(loc))return `${loc}청장`;
  if(/군$/.test(loc))return `${loc}수`;
  if(/시$/.test(loc))return `${loc}장`;
  return `${loc||j}단체장`;
}
function regionOf(row){
  if(row.type==='assembly')return String(row.jurisdiction||'').split(/\s+/)[0]||'';
  if(row.type==='metropolitan')return String(row.jurisdiction||'');
  const parts=String(row.jurisdiction||'').split(/\s+/);return parts.slice(0,-1).join(' ');
}
function jurisdictionClues(row,office){
  const j=String(row.jurisdiction||'').trim(),loc=locality(j);
  const short=loc.replace(/[갑을병정]$/,'');
  return [...new Set([j,short,office,regionOf(row)].map(x=>String(x||'').trim()).filter(x=>x.length>=2))];
}
const real=roster.filter(isReal);
const counts=new Map();for(const row of real)counts.set(row.name,(counts.get(row.name)||0)+1);
const people=real.map(row=>{
  const office=deriveOffice(row);
  return Object.freeze({...row,entityType:row.type,office,region:regionOf(row),constituency:row.jurisdiction,ambiguousName:(counts.get(row.name)||0)>1,disambiguation:jurisdictionClues(row,office)});
});
const byId=new Map(people.map(x=>[x.id,x]));
function allPeople(){return people.slice();}
function getPersonById(id){return byId.get(String(id||'').trim())||null;}
module.exports={allPeople,getPersonById,deriveOffice};
