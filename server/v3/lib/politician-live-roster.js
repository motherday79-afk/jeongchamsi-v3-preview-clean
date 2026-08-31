const baseline=require('../data/age-gender-baseline-v2.json');

const OFFICE_BY_TYPE={
  assembly:'국회의원',
  metropolitan:'광역단체장',
  basic:'기초단체장'
};

function allPeople(){
  const source=baseline&&baseline.people&&typeof baseline.people==='object'?baseline.people:{};
  return Object.entries(source).map(([id,row])=>({
    id:String(row?.personId||id||''),
    name:String(row?.name||''),
    type:String(row?.type||''),
    party:String(row?.party||''),
    jurisdiction:String(row?.jurisdiction||''),
    office:String(row?.office||OFFICE_BY_TYPE[String(row?.type||'')]||'')
  })).filter(person=>person.id);
}

module.exports={allPeople};
