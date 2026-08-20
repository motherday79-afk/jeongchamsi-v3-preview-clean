import { pageShell } from "./layout.js";
import { getDomain, saveDomain } from "../core/repository.js";
import { APP_VERSION, BUILD_NAME } from "../version.js";

const domains = [
  ["columns","COLUMN"],["community","정뮤니티"],["news","정참시 NEWS"],["polls","시민들의 선택"],["academy","정참시 아카데미"],["generation","세대별 대통령"],["nationalEvaluation","전국 평가제"]
];
const esc = (v="") => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function adminMenu(active){
  return `<nav class="admin-tabs"><button data-admin-tab="dashboard" class="${active==='dashboard'?'active':''}">대시보드</button><button data-admin-tab="people" class="${active==='people'?'active':''}">인물 관리</button>${domains.map(([k,n])=>`<button data-admin-tab="${k}" class="${active===k?'active':''}">${n}</button>`).join("")}</nav>`;
}

export async function renderAdmin(tab="dashboard"){
  let panel = "";
  if(tab==="dashboard") panel = `<section class="admin-panel"><h2>v3 운영 대시보드</h2><div class="admin-stat-grid"><article><b>LAYOUT</b><strong>LOCKED</strong><span>PC · Mobile · Fold</span></article><article><b>PERSON DATA</b><strong>0</strong><span>공급방식 협의 전</span></article><article><b>VERSION</b><strong>${APP_VERSION}</strong><span>${BUILD_NAME}</span></article></div><div class="notice-box">v2 코드·API·Redis key를 사용하지 않는 독립 v3 기반입니다.</div></section>`;
  else if(tab==="people") panel = `<section class="admin-panel"><h2>인물 관리</h2><div class="people-admin-grid"><article><b>국회의원</b><strong>0 / 300</strong><span>목록·상세 Shell 준비 완료</span></article><article><b>지방자치단체장</b><strong>0 / 300</strong><span>목록·상세 Shell 준비 완료</span></article><article><b>데이터 공급자</b><strong>UNDECIDED</strong><span>협의 후 활성화</span></article><article><b>사진 공급자</b><strong>UNDECIDED</strong><span>협의 후 활성화</span></article></div><div class="notice-box">이 영역은 일부러 CRUD를 만들지 않았습니다. 데이터 원천과 정규화 규칙을 확정한 다음 같은 구조에 연결합니다.</div></section>`;
  else panel = await domainPanel(tab);

  return pageShell(`<main class="subpage admin-page"><section class="page-hero"><span class="eyebrow">ADMIN</span><h1>정참시 관리자</h1><p>${APP_VERSION} · ${BUILD_NAME}</p></section>${adminMenu(tab)}${panel}</main>`);
}

async function domainPanel(domain){
  const data=await getDomain(domain);
  if(["columns","community","news"].includes(domain)){
    const items=data.items||[];
    return `<section class="admin-panel" data-domain="${domain}"><div class="admin-panel-head"><h2>${domains.find(x=>x[0]===domain)?.[1]}</h2><button class="primary-btn" data-admin-new="${domain}">새 글</button></div><div class="admin-list">${items.length?items.map(x=>`<article><div><b>${esc(x.title)}</b><span>${esc(x.author||"정참시")} · ${x.published===false?'비노출':'노출'}</span></div><button data-admin-delete="${domain}" data-id="${esc(x.id)}">삭제</button></article>`).join(""):`<div class="empty-inline">등록된 글이 없습니다.</div>`}</div><div class="admin-editor" data-editor></div></section>`;
  }
  if(domain==="polls"){
    const items=data.items||[];
    return `<section class="admin-panel"><div class="admin-panel-head"><h2>시민들의 선택</h2><button class="primary-btn" data-admin-new="polls">새 설문</button></div><div class="admin-list">${items.length?items.map(x=>`<article><div><b>${esc(x.question)}</b><span>선택지 ${(x.options||[]).length}개</span></div><button data-admin-delete="polls" data-id="${esc(x.id)}">삭제</button></article>`).join(""):`<div class="empty-inline">등록된 설문이 없습니다.</div>`}</div><div class="admin-editor" data-editor></div></section>`;
  }
  if(domain==="academy"){
    return `<section class="admin-panel"><div class="admin-panel-head"><h2>정참시 아카데미</h2><button class="primary-btn" data-admin-new="academy">일정 추가</button></div><div class="admin-list">${(data.slots||[]).map(x=>`<article><div><b>${esc(x.date||'날짜 미정')}</b><span>${esc(x.title||'아카데미')} · ${x.closed?'마감':'신청가능'}</span></div><button data-admin-delete="academy" data-id="${esc(x.id)}">삭제</button></article>`).join("")||'<div class="empty-inline">등록된 일정이 없습니다.</div>'}</div><div class="admin-editor" data-editor></div></section>`;
  }
  if(domain==="generation") return `<section class="admin-panel"><h2>세대별 대통령</h2><p>후보는 정치인 데이터 공급방식 확정 후 정치인 MASTER에서 선택하도록 연결합니다.</p><div class="notice-box">현재 후보 직접입력 기능을 만들지 않아 중복 인물 DB 생성을 방지합니다.</div></section>`;
  if(domain==="nationalEvaluation") return `<section class="admin-panel"><h2>국회의원 전국 평가제</h2><p>평가 대상은 정치인 MASTER가 연결된 뒤 동일한 인물 ID를 선택하도록 설계되어 있습니다.</p><div class="notice-box">정치인 데이터를 별도로 복제하지 않습니다.</div></section>`;
  return `<section class="admin-panel"><div class="empty-inline">준비 중</div></section>`;
}

export async function handleAdminAction(target, rerender){
  const tabBtn=target.closest('[data-admin-tab]'); if(tabBtn){ rerender(tabBtn.dataset.adminTab); return true; }
  const newBtn=target.closest('[data-admin-new]'); if(newBtn){ openEditor(newBtn.dataset.adminNew); return true; }
  const delBtn=target.closest('[data-admin-delete]'); if(delBtn){ const domain=delBtn.dataset.adminDelete; const id=delBtn.dataset.id; const data=await getDomain(domain); if(domain==='academy') data.slots=(data.slots||[]).filter(x=>String(x.id)!==String(id)); else data.items=(data.items||[]).filter(x=>String(x.id)!==String(id)); await saveDomain(domain,data,localStorage.getItem('jcv3:adminToken')||''); rerender(domain); return true; }
  return false;
}

function openEditor(domain){
  const host=document.querySelector('[data-editor]'); if(!host) return;
  const token = localStorage.getItem('jcv3:adminToken')||'';
  if(["columns","community","news"].includes(domain)) host.innerHTML=`<form class="admin-form" data-admin-form="${domain}"><label>제목<input name="title" required></label><label>요약<input name="summary"></label><label>작성자<input name="author" value="정참시"></label><label>본문<textarea name="body" rows="8"></textarea></label><label class="check"><input type="checkbox" name="published" checked> 메인/목록 노출</label><label>관리자 토큰<input name="token" value="${esc(token)}" placeholder="JCV3_ADMIN_TOKEN (없으면 브라우저 미리보기 저장)"></label><button class="primary-btn">저장</button><span class="save-state" data-save-state></span></form>`;
  else if(domain==='polls') host.innerHTML=`<form class="admin-form" data-admin-form="polls"><label>질문<input name="question" required></label><label>선택지 (줄바꿈, 최대 10개)<textarea name="options" rows="8" required></textarea></label><label>관리자 토큰<input name="token" value="${esc(token)}"></label><button class="primary-btn">저장</button><span class="save-state" data-save-state></span></form>`;
  else if(domain==='academy') host.innerHTML=`<form class="admin-form" data-admin-form="academy"><label>날짜/시간<input name="date" required placeholder="2026-08-25 14:00"></label><label>과정명<input name="title" required placeholder="정치 입문"></label><label class="check"><input type="checkbox" name="closed"> 마감</label><label>관리자 토큰<input name="token" value="${esc(token)}"></label><button class="primary-btn">저장</button><span class="save-state" data-save-state></span></form>`;
}

export async function handleAdminSubmit(form, rerender){
  const domain=form.dataset.adminForm; if(!domain) return false;
  const fd=new FormData(form); const token=String(fd.get('token')||''); localStorage.setItem('jcv3:adminToken',token);
  const data=await getDomain(domain);
  const id=`${domain}-${Date.now().toString(36)}`;
  if(["columns","community","news"].includes(domain)) data.items=[{id,title:String(fd.get('title')||''),summary:String(fd.get('summary')||''),author:String(fd.get('author')||'정참시'),body:String(fd.get('body')||''),published:fd.get('published')==='on',createdAt:new Date().toISOString(),likes:0,views:0},...(data.items||[])];
  else if(domain==='polls'){ const options=String(fd.get('options')||'').split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,10); data.items=[{id,question:String(fd.get('question')||''),options,published:true,createdAt:new Date().toISOString()},...(data.items||[])]; }
  else if(domain==='academy') data.slots=[...(data.slots||[]),{id,date:String(fd.get('date')||''),title:String(fd.get('title')||''),closed:fd.get('closed')==='on'}];
  const result=await saveDomain(domain,data,token); const state=form.querySelector('[data-save-state]'); if(state) state.textContent=result.mode==='server'?'서버 저장 완료':'브라우저 미리보기 저장 완료'; setTimeout(()=>rerender(domain),350); return true;
}
