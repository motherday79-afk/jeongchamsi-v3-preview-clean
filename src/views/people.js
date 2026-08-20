import { pageShell, esc } from "./layout.js";
import {
  PERSON_COUNTS,
  PERSON_PROVIDER_STATUS,
  PHOTO_PROVIDER_STATUS,
  listAssemblyMembers,
  listMetropolitanLeaders,
  listBasicLeaders,
  getPersonSlotById
} from "../data/person-provider.js";

function slotCard(person) {
  return `<a class="person-slot-card" href="/person/${esc(person.id)}" data-route aria-label="${esc(person.roleLabel)} ${person.slot}번 상세페이지">
    <span class="slot-no">#${String(person.slot).padStart(3, "0")}</span>
    <div class="person-photo-placeholder" aria-hidden="true"></div>
    <div class="slot-lines" aria-hidden="true"><span class="slot-line name"></span><span class="slot-line meta"></span><span class="slot-line short"></span></div>
    <span class="slot-state">정보 연결 전</span>
  </a>`;
}

function directoryHeader(title, description, count, totalLabel) {
  return `<section class="page-hero">
    <span class="eyebrow">POLITICIAN DIRECTORY · V3 EMPTY PROVIDER</span>
    <h1>${esc(title)}</h1>
    <p>${esc(description)}</p>
    <div class="status-pill"><b>DATA</b><span>${PERSON_PROVIDER_STATUS}</span></div>
    <div class="capacity-line"><span>실제 인물정보 0명 · 슬롯 전체 표시</span><b>${count.toLocaleString("ko-KR")} / ${totalLabel}</b></div>
  </section>`;
}

function directoryTools(type) {
  if (type === "assembly") return `<section class="content-card"><div class="directory-tools"><label><span>정치인 검색</span><input disabled placeholder="실제 정치인 데이터 연결 후 검색 활성화"></label><div class="filter-row"><button class="active" type="button">전체 300</button><button type="button" disabled>정당</button><button type="button" disabled>지역</button><button type="button" disabled>선수</button></div></div></section>`;
  return `<section class="content-card"><div class="directory-tools"><label><span>단체장 검색</span><input disabled placeholder="실제 단체장 데이터 연결 후 검색 활성화"></label><div class="directory-jump"><a href="#metropolitan" class="active">광역 16</a><a href="#basic">기초 227</a></div></div></section>`;
}

export async function renderAssemblyDirectory() {
  const people = listAssemblyMembers();
  return pageShell(`<main class="subpage">
    ${directoryHeader("국회의원", "300명의 국회의원 자리를 먼저 완성했습니다. 이름·정당·지역·사진은 데이터 공급방식을 확정한 뒤 같은 슬롯에 연결합니다.", people.length, "300")}
    ${directoryTools("assembly")}
    <section class="content-card directory-section" id="assembly-list"><div class="section-title"><h2>국회의원 전체</h2><span>${people.length}개 슬롯</span></div><div class="person-grid">${people.map(slotCard).join("")}</div></section>
  </main>`);
}

export async function renderLocalLeaderDirectory() {
  const metro = listMetropolitanLeaders();
  const basic = listBasicLeaders();
  return pageShell(`<main class="subpage">
    ${directoryHeader("지방자치단체장", "광역단체장 16명과 기초단체장 227명의 자리를 모두 표시합니다. 실제 인물정보는 아직 연결하지 않습니다.", metro.length + basic.length, `${PERSON_COUNTS.metropolitan + PERSON_COUNTS.basic}`)}
    ${directoryTools("local")}
    <div class="local-directory-stack">
      <section class="content-card directory-section" id="metropolitan"><div class="section-title"><h2>광역단체장</h2><span>${metro.length} / 16</span></div><div class="person-grid">${metro.map(slotCard).join("")}</div></section>
      <section class="content-card directory-section" id="basic"><div class="section-title"><h2>기초단체장</h2><span>${basic.length} / 227</span></div><div class="person-grid">${basic.map(slotCard).join("")}</div></section>
    </div>
  </main>`);
}

const empty = () => `<span class="info-empty" aria-label="정보 연결 전"></span>`;

function basicInfo(person) {
  const jurisdiction = person.jurisdictionLabel;
  return `<dl class="info-list">
    <div><dt>이름</dt><dd>${empty()}</dd></div>
    <div><dt>직책</dt><dd>${esc(person.roleLabel)}</dd></div>
    <div><dt>정당</dt><dd>${empty()}</dd></div>
    <div><dt>${esc(jurisdiction)}</dt><dd>${empty()}</dd></div>
    <div><dt>출생 / 나이</dt><dd>${empty()}</dd></div>
    <div><dt>성별</dt><dd>${empty()}</dd></div>
    <div><dt>학력</dt><dd>${empty()}</dd></div>
    <div><dt>공식 채널</dt><dd>${empty()}</dd></div>
  </dl>`;
}

function electionInfo(person) {
  const second = person.type === "assembly" ? "선수" : "연임 / 재선 여부";
  const third = person.type === "assembly" ? "소속 위원회" : "소속 지방정부";
  return `<dl class="info-list">
    <div><dt>현 임기</dt><dd>${empty()}</dd></div>
    <div><dt>${second}</dt><dd>${empty()}</dd></div>
    <div><dt>최근 당선</dt><dd>${empty()}</dd></div>
    <div><dt>득표율</dt><dd>${empty()}</dd></div>
    <div><dt>${third}</dt><dd>${empty()}</dd></div>
    <div><dt>선거 이력</dt><dd>${empty()}</dd></div>
  </dl>`;
}

function timelineRows(count = 5) {
  return Array.from({ length: count }, () => `<div class="timeline-row"><span class="timeline-year"></span><div class="timeline-copy"><i></i><i></i></div></div>`).join("");
}


export async function renderMetropolitanDirectory() {
  const people = listMetropolitanLeaders();
  return pageShell(`<main class="subpage">
    ${directoryHeader("광역단체장", "광역단체장 16명의 자리를 모두 표시합니다. 실제 이름·정당·지역·사진은 데이터 공급방식 확정 후 연결합니다.", people.length, "16")}
    ${directoryTools("local")}
    <section class="content-card directory-section" id="metropolitan"><div class="section-title"><h2>광역단체장 전체</h2><span>${people.length} / 16</span></div><div class="person-grid">${people.map(slotCard).join("")}</div></section>
  </main>`);
}

export async function renderBasicDirectory() {
  const people = listBasicLeaders();
  return pageShell(`<main class="subpage">
    ${directoryHeader("기초단체장", "기초단체장 227명의 자리를 모두 표시합니다. 실제 이름·정당·지역·사진은 데이터 공급방식 확정 후 연결합니다.", people.length, "227")}
    ${directoryTools("local")}
    <section class="content-card directory-section" id="basic"><div class="section-title"><h2>기초단체장 전체</h2><span>${people.length} / 227</span></div><div class="person-grid">${people.map(slotCard).join("")}</div></section>
  </main>`);
}

export async function renderPersonDetail(id) {
  const person = getPersonSlotById(id);
  if (!person) {
    return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>존재하지 않는 정치인 슬롯입니다.</h2><p>국회의원 300명, 광역단체장 16명, 기초단체장 227명의 유효한 슬롯만 사용할 수 있습니다.</p><div class="inline-actions" style="justify-content:center;margin-top:18px"><button class="primary-btn" type="button" data-go="/assembly">국회의원 목록</button><button class="ghost-btn" type="button" data-go="/local-leaders">단체장 목록</button></div></section></main>`);
  }

  return pageShell(`<main class="subpage">
    <section class="person-detail-hero content-card">
      <div class="person-detail-photo" aria-hidden="true"></div>
      <div class="person-detail-title"><span class="eyebrow">COMMON POLITICIAN DETAIL · ${esc(person.roleLabel)}</span><span class="slot-line name"></span><span class="slot-line meta"></span><span class="slot-line short"></span><div class="person-detail-badges"><span>${esc(person.roleLabel)}</span><span>슬롯 #${String(person.slot).padStart(3, "0")}</span><span>인물정보 연결 전</span></div></div>
      <div class="detail-action-bar"><button type="button" class="ghost-btn" disabled>☆ 즐겨찾기</button><button type="button" class="ghost-btn" disabled>비교하기</button></div>
    </section>

    <div class="detail-grid">
      <section class="content-card"><div class="section-title"><h2>기본정보</h2><span>공통 프로필</span></div>${basicInfo(person)}</section>
      <section class="content-card"><div class="section-title"><h2>임기 · 선거정보</h2><span>${esc(person.groupLabel)}</span></div>${electionInfo(person)}</section>
    </div>

    <section class="content-card"><div class="section-title"><h2>경력 · 주요 이력</h2><span>시간순</span></div><div class="timeline-shell">${timelineRows(6)}</div></section>

    <div class="detail-grid">
      <section class="content-card"><div class="section-title"><h2>${person.type === "assembly" ? "의정활동" : "행정활동"}</h2><span>주요 활동</span></div><dl class="info-list"><div><dt>${person.type === "assembly" ? "대표발의" : "핵심 정책"}</dt><dd>${empty()}</dd></div><div><dt>${person.type === "assembly" ? "본회의 출석" : "공약 이행"}</dt><dd>${empty()}</dd></div><div><dt>${person.type === "assembly" ? "상임위 활동" : "지역 현안"}</dt><dd>${empty()}</dd></div><div><dt>주요 성과</dt><dd>${empty()}</dd></div></dl></section>
      <section class="content-card"><div class="section-title"><h2>공약 · 정책</h2><span>정책 아카이브</span></div><div class="timeline-shell">${timelineRows(4)}</div></section>
    </div>

    <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2><span>동일 인물 ID로 연결</span></div><div class="metric-shell"><article><small>NOW Rank</small><strong>—</strong><span>연결 전</span></article><article><small>관심도</small><strong>—</strong><span>연결 전</span></article><article><small>언급량</small><strong>—</strong><span>연결 전</span></article><article><small>전국 평가</small><strong>—</strong><span>연결 전</span></article></div></section>

    <section class="content-card"><div class="section-title"><h2>최근 뉴스 · 이슈</h2><span>요약 데이터</span></div><div class="timeline-shell">${timelineRows(4)}</div></section>

    <section class="content-card"><div class="section-title"><h2>관련 콘텐츠</h2><span>정참시 내부 연결</span></div><div class="related-grid"><article><b>정참시 NEWS</b><span>관련 뉴스가 여기에 연결됩니다.</span></article><article><b>COLUMN</b><span>관련 칼럼이 여기에 연결됩니다.</span></article><article><b>정뮤니티</b><span>관련 게시물이 여기에 연결됩니다.</span></article><article><b>시민들의 선택</b><span>관련 설문이 여기에 연결됩니다.</span></article></div></section>

    <section class="content-card"><div class="notice-box">현재 상세페이지는 ${esc(person.roleLabel)} 슬롯 ${person.slot}번의 완성된 공통 레이아웃입니다. 이름·사진·정당·지역·뉴스·NOW 데이터의 공급방식을 확정하면 이 레이아웃을 바꾸지 않고 데이터만 연결합니다.</div></section>
  </main>`);
}
