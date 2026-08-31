const ENDPOINT="/api/v3/admin/decision";

async function requestDecision({method="GET",query=null,body=null}={}){
  const suffix=query?`?${new URLSearchParams(query).toString()}`:"";
  try{
    const response=await fetch(`${ENDPOINT}${suffix}`,{
      method,
      credentials:"same-origin",
      cache:"no-store",
      headers:{Accept:"application/json",...(body?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)return {ok:false,error:payload?.error||`HTTP_${response.status}`,status:response.status};
    return payload;
  }catch(error){return {ok:false,error:error?.code||error?.message||"DECISION_REQUEST_FAILED"};}
}

export async function getAdminDecisionPerson(id,range="30"){
  const personId=String(id||"").trim();if(!personId)return {ok:false,error:"DECISION_PERSON_REQUIRED"};
  const safe=["7","30","90","365","all"].includes(String(range))?String(range):"30";
  return requestDecision({query:{personId,range:safe,r:String(Date.now())}});
}
export async function getAdminDecisionPeople(ids=[],range="30"){
  const unique=[...new Set((Array.isArray(ids)?ids:[]).map(x=>String(x||"").trim()).filter(Boolean))].slice(0,5);
  const rows=await Promise.all(unique.map(personId=>getAdminDecisionPerson(personId,range)));
  return {ok:rows.some(x=>x?.ok),people:rows.map((row,index)=>({personId:unique[index],...row}))};
}
export async function createAdminDecisionCase(id,note=""){
  return requestDecision({method:"POST",body:{action:"case-create",personId:String(id||"").trim(),note:String(note||"").trim()}});
}
export async function closeAdminDecisionCase(caseId){
  return requestDecision({method:"POST",body:{action:"case-close",caseId:String(caseId||"").trim()}});
}
export async function addAdminDecisionAction(payload={}){
  const clean={caseId:String(payload.caseId||"").trim(),occurredAt:String(payload.occurredAt||"").trim(),type:String(payload.type||"OTHER").trim(),title:String(payload.title||"").trim(),note:String(payload.note||"").trim(),linkedPriorityRank:payload.linkedPriorityRank===""||payload.linkedPriorityRank==null?null:Number(payload.linkedPriorityRank)};
  return requestDecision({method:"POST",body:{action:"action-add",...clean}});
}
export async function updateAdminDecisionActionNote(actionId,note=""){
  return requestDecision({method:"POST",body:{action:"action-note-update",actionId:String(actionId||"").trim(),note:String(note||"").trim()}});
}
