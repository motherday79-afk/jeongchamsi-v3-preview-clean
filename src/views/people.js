import { pageShell, esc } from "./layout.js";
import { getPersonSlotById } from "../data/person-provider.js";
import { getUserSession, isFavoritePerson, recordRecentPerson } from "../core/user.js";

const empty = () => `<span class="info-empty" aria-label="정보 연결 전"></span>`;
function basicInfo(person) {
  return `<dl class="info-list"><div><dt>이름</dt><dd>${empty()}</dd></div><div><dt>직책</dt><dd>${esc(person.roleLabel)}</dd></div><div><dt>정당</dt><dd>${empty()}</dd></div><div><dt>${esc(person.jurisdictionLabel)}</dt><dd>${empty()}</dd></div><div><dt>출생 / 나이</dt><dd>${empty()}</dd></div><div><dt>성별</dt><dd>${empty()}</dd></div><div><dt>학력</dt><dd>${empty()}</dd></div><div><dt>공식 채널</dt><dd>${empty()}</dd></div></dl>`;
}
function electionInfo(person) {
  const second = person.type === "assembly" ? "선수" : "연임 / 재선 여부";
  const third = person.type === "assembly" ? "소속 위원회" : "소속 지방정부";
  return `<dl class="info-list"><div><dt>현 임기</dt><dd>${empty()}</dd></div><div><dt>${second}</dt><dd>${empty()}</dd></div><div><dt>최근 당선</dt><dd>${empty()}</dd></div><div><dt>득표율</dt><dd>${empty()}</dd></div><div><dt>${third}</dt><dd>${empty()}</dd></div><div><dt>선거 이력</dt><dd>${empty()}</dd></div></dl>`;
}
function timelineRows(count = 5) { return Array.from({ length: count }, () => `<div class="timeline-row"><span class="timeline-year"></span><div class="timeline-copy"><i></i><i></i></div></div>`).join(""); }

export async function renderPersonDetail(id) {
  const person = getPersonSlotById(id);
  if (!person) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>존재하지 않는 정치인 슬롯입니다.</h2><p>국회의원 300명, 광역단체장 16명, 기초단체장 227명 등 총 543개 Slot만 사용합니다.</p><button class="primary-btn" type="button" data-go="/now">NOW 전체 정치인</button></section></main>`);

  const session = getUserSession();
  recordRecentPerson(person.id);
  const favorite = session.authenticated && isFavoritePerson(person.id);
  const activityTitle = person.type === "assembly" ? "의정활동" : "행정활동";
  const primaryMetric = person.type === "assembly" ? "대표발의" : "핵심 정책";
  const secondMetric = person.type === "assembly" ? "본회의 출석" : "공약 이행";
  const thirdMetric = person.type === "assembly" ? "상임위 활동" : "지역 현안";

  return pageShell(`<main class="subpage">
    <section class="person-detail-hero content-card"><div class="person-detail-photo"></div><div class="person-detail-title"><span class="eyebrow">COMMON POLITICIAN DETAIL · ${esc(person.roleLabel)}</span><span class="slot-line name"></span><span class="slot-line meta"></span><span class="slot-line short"></span><div class="person-detail-badges"><span>${esc(person.roleLabel)}</span><span>슬롯 #${String(person.slot).padStart(3, "0")}</span><span>인물정보 연결 전</span></div></div><div class="detail-action-bar"><button type="button" class="ghost-btn ${favorite ? "active" : ""}" data-person-favorite="${esc(person.id)}">${favorite ? "★ 즐겨찾기됨" : "☆ 즐겨찾기"}</button><button type="button" class="ghost-btn" data-go="/compare?a=${esc(person.id)}">비교하기</button></div></section>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>기본정보</h2><span>공통 프로필</span></div>${basicInfo(person)}</section><section class="content-card"><div class="section-title"><h2>임기 · 선거정보</h2><span>${esc(person.groupLabel)}</span></div>${electionInfo(person)}</section></div>
    <section class="content-card"><div class="section-title"><h2>경력 · 주요 이력</h2><span>시간순</span></div><div class="timeline-shell">${timelineRows(6)}</div></section>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>${activityTitle}</h2><span>주요 활동</span></div><dl class="info-list"><div><dt>${primaryMetric}</dt><dd>${empty()}</dd></div><div><dt>${secondMetric}</dt><dd>${empty()}</dd></div><div><dt>${thirdMetric}</dt><dd>${empty()}</dd></div><div><dt>주요 성과</dt><dd>${empty()}</dd></div></dl></section><section class="content-card"><div class="section-title"><h2>공약 · 정책</h2><span>정책 아카이브</span></div><div class="timeline-shell">${timelineRows(4)}</div></section></div>
    <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2><span>동일 인물 ID로 연결</span></div><div class="metric-shell"><article><small>NOW Rank</small><strong>—</strong><span>연결 전</span></article><article><small>관심도</small><strong>—</strong><span>연결 전</span></article><article><small>언급량</small><strong>—</strong><span>연결 전</span></article><article><small>전국 평가</small><strong>—</strong><span>연결 전</span></article></div></section>
    <section class="content-card"><div class="section-title"><h2>최근 뉴스 · 이슈</h2><span>요약 데이터</span></div><div class="timeline-shell">${timelineRows(4)}</div></section>
    <section class="content-card"><div class="section-title"><h2>관련 콘텐츠</h2><span>정참시 내부 연결</span></div><div class="related-grid"><article><b>정참시 NEWS</b><span>관련 뉴스가 여기에 연결됩니다.</span></article><article><b>COLUMN</b><span>관련 칼럼이 여기에 연결됩니다.</span></article><article><b>정뮤니티</b><span>관련 게시물이 여기에 연결됩니다.</span></article><article><b>시민들의 선택</b><span>관련 설문이 여기에 연결됩니다.</span></article></div></section>
    <section class="content-card"><div class="notice-box">현재는 ${esc(person.roleLabel)} ${person.slot}번 공통 상세 레이아웃입니다. 이름·사진·정당·지역·뉴스·NOW 데이터 공급방식을 확정하면 화면을 다시 만들지 않고 이 Slot에 데이터만 연결합니다.</div></section>
  </main>`);
}
