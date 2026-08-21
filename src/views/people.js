import { pageShell, esc } from "./layout.js?v=alpha6.0.27-home-story";
import { getPersonSlotById } from "../data/person-provider.js?v=alpha6.0.20-function-detail";
import { getUserSession, isFavoritePerson, recordRecentPerson } from "../core/user.js";

const empty=()=>`<span class="info-empty" aria-label="추가 데이터 준비중"></span>`;
const v=x=>x?esc(x):empty();
function basicInfo(p){
  return `<dl class="info-list">
    <div><dt>이름</dt><dd>${v(p.name)}</dd></div>
    <div><dt>직책</dt><dd>${v(p.office||p.roleLabel)}</dd></div>
    <div><dt>정당</dt><dd>${v(p.party)}</dd></div>
    <div><dt>${esc(p.jurisdictionLabel)}</dt><dd>${v(p.jurisdiction)}</dd></div>
    <div><dt>구분</dt><dd>${v(p.terms)}</dd></div>
    <div><dt>사진</dt><dd>1차 데이터에서 제외</dd></div>
  </dl>`;
}
function electionInfo(p){
  const term=(p.termStart||p.termEnd)?`${p.termStart||"—"} ~ ${p.termEnd||"—"}`:"";
  return `<dl class="info-list">
    <div><dt>현 임기</dt><dd>${v(term)}</dd></div>
    <div><dt>${p.type==="assembly"?"선수":"민선"}</dt><dd>${v(p.terms)}</dd></div>
    <div><dt>최근 선거</dt><dd>${v(p.electionLabel)}</dd></div>
    <div><dt>정당</dt><dd>${v(p.party)}</dd></div>
    <div><dt>${p.type==="assembly"?"소속 위원회":"관할 지역"}</dt><dd>${v(p.type==="assembly"?p.committee:p.jurisdiction)}</dd></div>
  </dl>`;
}
function timeline(p){
  const items=[];
  if(p.electionLabel)items.push([p.type==="assembly"?"2024":"2026",p.electionLabel,p.jurisdiction]);
  if(p.type==="assembly"&&p.terms)items.push(["현재",p.terms,"국회의원 당선 횟수 기준"]);
  if(p.type==="assembly"&&p.committee)items.push(["현재",p.committee,"국회 공개정보 기반"]);
  if(p.type!=="assembly")items.push(["2026.07.01","민선 9기 임기 시작",p.office||p.roleLabel]);
  return items.map(([y,t,s])=>`<div class="timeline-row live"><span class="timeline-year">${esc(y)}</span><div class="timeline-copy"><b>${esc(t)}</b><span>${esc(s)}</span></div></div>`).join("") || `<div class="timeline-row"><span class="timeline-year"></span><div class="timeline-copy"><i></i><i></i></div></div>`;
}

export async function renderPersonDetail(id){
  const p=getPersonSlotById(id);
  if(!p)return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>존재하지 않는 정치인입니다.</h2><button class="primary-btn" type="button" data-go="/now">전체 정치인</button></section></main>`);
  const session=getUserSession(); recordRecentPerson(p.id);
  const favorite=session.authenticated&&isFavoritePerson(p.id);
  const activityTitle=p.type==="assembly"?"의정활동":"행정활동";
  return pageShell(`<main class="subpage">
    <section class="person-detail-hero content-card">
      <div class="person-detail-photo"></div>
      <div class="person-detail-title"><span class="eyebrow">${esc(p.roleLabel)} · TEXT DATA CONNECTED</span><h1>${esc(p.name)}</h1><p>${esc(p.party)} · ${esc(p.jurisdiction)}</p><div class="person-detail-badges"><span>${esc(p.roleLabel)}</span><span>${esc(p.terms||"기본정보")}</span><span>사진 제외</span></div></div>
      <div class="detail-action-bar"><button type="button" class="ghost-btn ${favorite?"active":""}" data-person-favorite="${esc(p.id)}">${favorite?"★ 즐겨찾기됨":"☆ 즐겨찾기"}</button><button type="button" class="ghost-btn" data-go="/compare?a=${esc(p.id)}">비교하기</button></div>
    </section>
    <div class="detail-grid">
      <section class="content-card"><div class="section-title"><h2>기본정보</h2><span>1차 텍스트 데이터</span></div>${basicInfo(p)}</section>
      <section class="content-card"><div class="section-title"><h2>임기 · 선거정보</h2><span>${esc(p.groupLabel)}</span></div>${electionInfo(p)}</section>
    </div>
    <section class="content-card"><div class="section-title"><h2>경력 · 주요 이력</h2><span>기본 이력부터 연결</span></div><div class="timeline-shell">${timeline(p)}</div></section>
    <div class="detail-grid">
      <section class="content-card"><div class="section-title"><h2>${activityTitle}</h2><span>상세 공식데이터 후속</span></div><dl class="info-list"><div><dt>${p.type==="assembly"?"소속 위원회":"관할 지역"}</dt><dd>${v(p.type==="assembly"?p.committee:p.jurisdiction)}</dd></div><div><dt>주요 활동</dt><dd>${empty()}</dd></div><div><dt>주요 성과</dt><dd>${empty()}</dd></div></dl></section>
      <section class="content-card"><div class="section-title"><h2>공약 · 정책</h2><span>선관위 공식자료 후속</span></div><div class="timeline-shell"><div class="empty-inline">공약·정책 원문은 다음 데이터 단계에서 공식자료로 연결합니다.</div></div></section>
    </div>
    <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2><span>뉴스·키워드·NOW는 후속</span></div><div class="metric-shell"><article><small>NOW Rank</small><strong>—</strong><span>후속</span></article><article><small>관심도</small><strong>—</strong><span>후속</span></article><article><small>언급량</small><strong>—</strong><span>후속</span></article><article><small>전국 평가</small><strong>—</strong><span>참여 데이터</span></article></div></section>
    <section class="content-card"><div class="notice-box">출처: ${esc(p.source)} · 사진과 실시간 뉴스는 이번 1차 데이터에서 불러오지 않습니다.</div></section>
  </main>`);
}
