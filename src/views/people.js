import { pageShell } from "./layout.js";
import { listAssemblyMembers, listLocalLeaders, getPersonById, PERSON_PROVIDER_STATUS } from "../data/person-provider.js";

const esc = (v="") => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function filters(type){
  if(type==="assembly") return `<div class="filter-row"><button class="active">전체</button><button>정당</button><button>지역</button><button>선수</button></div>`;
  return `<div class="filter-row"><button class="active">전체</button><button>시·도</button><button>시·군·구</button><button>정당</button></div>`;
}

export async function renderPeopleList(type){
  const isAssembly = type === "assembly";
  const data = isAssembly ? await listAssemblyMembers() : await listLocalLeaders();
  const title = isAssembly ? "국회의원" : "지방자치단체장";
  const description = isAssembly ? "국회의원 최대 300명을 수용하는 목록 구조입니다." : "지방자치단체장 최대 300명을 수용하는 목록 구조입니다.";
  const items = data.items || [];
  return pageShell(`
    <main class="subpage">
      <section class="page-hero"><span class="eyebrow">PEOPLE DIRECTORY</span><h1>${title}</h1><p>${description} 실제 인물 정보는 데이터 공급방식 확정 후 연결합니다.</p><div class="provider-state"><b>DATA PROVIDER</b><span>${PERSON_PROVIDER_STATUS}</span></div></section>
      <section class="content-card">
        <div class="directory-tools"><label><span>검색</span><input placeholder="이름 또는 지역 검색" disabled></label>${filters(type)}</div>
        <div class="capacity-line"><b>수용 규모 ${data.totalCapacity}명</b><span>현재 연결된 인물 ${items.length}명</span></div>
        ${items.length ? `<div class="person-grid">${items.map(p=>`<article class="person-card" data-route="/person/${encodeURIComponent(p.id)}"><div class="person-photo"></div><b>${esc(p.name)}</b><span>${esc(p.role||"")}</span></article>`).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">人</div><h2>인물 데이터 연결 전입니다.</h2><p>목록·필터·상세페이지 구조만 먼저 완성했습니다.<br>실제 데이터 출처와 정규화 방식을 협의한 뒤 이 영역에 연결합니다.</p></div>`}
      </section>
    </main>`);
}

export async function renderPersonDetail(id){
  const person = await getPersonById(id);
  return pageShell(`
    <main class="subpage">
      <section class="person-detail-hero content-card">
        <div class="person-detail-photo"></div>
        <div><span class="eyebrow">PERSON DETAIL SHELL</span><h1>${person?esc(person.name):"인물 상세페이지"}</h1><p>${person?esc(person.role||""):"국회의원과 지방자치단체장이 함께 사용하는 공통 상세 구조입니다."}</p><div class="provider-state"><b>DATA</b><span>${person?"CONNECTED":"WAITING"}</span></div></div>
      </section>
      <div class="detail-grid">
        <section class="content-card"><div class="section-title"><h2>기본정보</h2></div><dl class="info-list"><div><dt>직책</dt><dd>—</dd></div><div><dt>정당</dt><dd>—</dd></div><div><dt>지역</dt><dd>—</dd></div><div><dt>선수/임기</dt><dd>—</dd></div></dl></section>
        <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2></div><dl class="info-list"><div><dt>NOW Rank</dt><dd>연결 전</dd></div><div><dt>관심도</dt><dd>연결 전</dd></div><div><dt>전국 평가</dt><dd>연결 전</dd></div></dl></section>
      </div>
      <section class="content-card"><div class="section-title"><h2>경력 · 활동</h2></div><div class="empty-inline">데이터 공급방식 확정 후 경력과 활동 이력을 연결합니다.</div></section>
      <section class="content-card"><div class="section-title"><h2>관련 콘텐츠</h2></div><div class="related-grid"><div>관련 NEWS</div><div>관련 COLUMN</div><div>관련 정뮤니티</div><div>관련 설문</div></div></section>
    </main>`);
}
