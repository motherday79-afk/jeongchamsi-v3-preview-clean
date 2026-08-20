import { pageShell } from "./layout.js";
import { getDomain } from "../core/repository.js";

const esc = (v="") => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

export async function renderNow(){
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NOW RANK</span><h1>NOW Rank</h1><p>순위 엔진·정치인 데이터·사진 공급방식을 협의한 뒤 연결합니다. 현재는 페이지 구조만 완성된 상태입니다.</p></section><section class="content-card empty-state tall"><div class="empty-icon">N</div><h2>Rank Engine 연결 전</h2><p>v2 순위 데이터나 Redis 키를 가져오지 않습니다.<br>v3 전용 수집 → 계산 → 발행 구조를 별도로 설계합니다.</p></section></main>`);
}

export async function renderPresident(){
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">PRESIDENT</span><h1>대통령</h1><p>대통령 전용 상세 허브입니다. 실제 대통령 데이터 공급방식 확정 후 연결합니다.</p></section><section class="content-card empty-state tall"><h2>대통령 데이터 연결 전</h2><p>정치인 공통 데이터 모델과 분리하지 않고 동일한 인물 엔진을 사용하도록 준비합니다.</p></section></main>`);
}

export async function renderPolls(){
  const data=await getDomain("polls"); const items=(data.items||[]).filter(x=>x.published!==false);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CITIZENS’ CHOICE</span><h1>시민들의 선택</h1><p>설문은 1~10개 선택지를 지원하고 메인에는 최대 3개만 노출합니다.</p></section><section class="content-card">${items.length?`<div class="poll-page-list">${items.map(p=>`<article><span class="poll-status">진행중</span><h2>${esc(p.question)}</h2><div class="poll-choice-list">${(p.options||[]).map((o,i)=>`<button data-poll-vote="${esc(p.id)}" data-option="${i}">${esc(o)}</button>`).join("")}</div></article>`).join("")}</div>`:`<div class="empty-state"><h2>진행 중인 설문이 없습니다.</h2><p>관리자에서 설문을 등록하면 이곳에서 참여할 수 있습니다.</p></div>`}</section></main>`);
}

export async function renderAcademy(){
  const data=await getDomain("academy"); const slots=data.slots||[];
  return pageShell(`<main class="subpage"><section class="page-hero academy-hero"><span class="eyebrow">JEONGCHAMSI ACADEMY</span><h1>정참시 아카데미</h1><p>정치인의 꿈을 키우는 사람이 빈 일정을 확인하고 수강신청하는 공간입니다.</p></section><section class="content-card"><div class="section-title"><h2>수강 가능 일정</h2><span>${slots.length}개</span></div>${slots.length?`<div class="academy-slot-list">${slots.map(s=>`<article><div><b>${esc(s.date||"")}</b><span>${esc(s.title||"정참시 아카데미")}</span></div><button ${s.closed?'disabled':''}>${s.closed?'마감':'수강신청'}</button></article>`).join("")}</div>`:`<div class="empty-state"><h2>등록된 일정이 없습니다.</h2><p>관리자에서 빈 스케줄을 등록하면 회원이 신청할 수 있습니다.</p></div>`}</section></main>`);
}

export async function renderItsme(){
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">IT’S ME</span><h1>IT’S ME</h1><p>정치 속의 나를 발견하고 정책 제안과 개인화 참여로 이어지는 공간입니다.</p></section><section class="feature-grid"><article class="content-card"><b>나의 정치성향</b><p>문항 설계 후 활성화</p></article><article class="content-card"><b>나와 가까운 정치인</b><p>정치인 데이터 연결 후 활성화</p></article><article class="content-card"><b>내 지역 정치</b><p>지역 설정과 연결</p></article><article class="content-card"><b>내가 국회의원이라면</b><p>정책 제안 작성 기능</p></article><article class="content-card"><b>오늘의 정치 질문</b><p>짧은 참여 기능</p></article><article class="content-card accent-card"><b>IT’S ME</b><p>개인 참여 허브</p></article></section></main>`);
}

export async function renderCompare(){
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">COMPARE · SAMPLE</span><h1>정치인 비교분석</h1><p>상시 노출은 실제 정치인이 아닌 가상후보를 사용합니다.</p></section><section class="content-card"><div class="compare-demo"><div><span class="fake-avatar a"></span><h2>가상후보 A</h2><p>정책·민생형</p></div><div class="compare-demo-bars"><label>활동도 <i><em style="width:72%"></em></i>72</label><label>관심도 <i><em style="width:61%"></em></i>61</label><label>언급량 <i><em style="width:48%"></em></i>48</label><label>참여도 <i><em style="width:67%"></em></i>67</label></div><div><span class="fake-avatar b"></span><h2>가상후보 B</h2><p>개혁·소통형</p></div></div><div class="notice-box">실제 정치인 비교는 정치인 데이터 연결 후 사용자가 직접 두 사람을 선택하는 방식으로 활성화합니다.</div></section></main>`);
}

export async function renderGeneration(){
  const data=await getDomain("generation");
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MOCK VOTE</span><h1>세대가 뽑은 대통령</h1><p>10대부터 60대+까지 정참시 참여자의 모의투표 결과를 세대별로 비교합니다.</p></section><section class="content-card">${(data.candidates||[]).length?`<div class="generation-page-grid">${["10대","20대","30대","40대","50대","60대+"].map(age=>`<article><b>${age}</b><p>후보 선택</p>${data.candidates.map(c=>`<button>${esc(c.name)}</button>`).join("")}</article>`).join("")}</div>`:`<div class="empty-state"><h2>후보가 등록되지 않았습니다.</h2><p>관리자에서 모의투표 후보를 구성한 뒤 활성화합니다.</p></div>`}</section></main>`);
}

export async function renderNationalEvaluation(){
  const data=await getDomain("nationalEvaluation");
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NATIONAL EVALUATION</span><h1>국회의원 전국 평가제</h1><p>지역구가 아닌 전국 유권자의 시선으로 한 명의 입법기관을 가상 평가하는 정참시 참여 기능입니다.</p></section><section class="content-card"><div class="notice-box">모든 의원에게 동일한 기준과 동일한 노출 규칙을 적용하도록 설계합니다.</div>${data.subjectId?`<div class="empty-state"><h2>평가 대상 연결 준비</h2><p>정치인 ID ${esc(data.subjectId)}가 설정되어 있습니다. 정치인 공급자가 연결되면 활성화됩니다.</p></div>`:`<div class="empty-state"><h2>평가 대상 의원이 아직 없습니다.</h2><p>정치인 데이터 연결 후 관리자에서 평가 대상을 선택합니다.</p></div>`}</section></main>`);
}

export async function renderSearch(query=""){
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">SEARCH</span><h1>통합검색</h1><p>검색어: <b>${esc(query||"—")}</b></p></section><section class="content-card empty-state tall"><h2>정치인 검색 데이터 연결 전</h2><p>검색 결과 페이지 구조는 완성되어 있으며 정치인·정당 데이터 공급방식 확정 후 같은 인물 엔진을 연결합니다.</p></section></main>`);
}
