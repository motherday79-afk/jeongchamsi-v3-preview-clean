import { getDomain } from "../core/repository.js";
import { pageShell, esc } from "./layout.js";

function pct(option, options) {
  const total = (options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
  return total ? Math.round(Number(option.votes || 0) * 100 / total) : 0;
}

export async function renderPresident() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">PRESIDENT · OUT OF RANK</span><h1>대통령부터</h1><p>대통령은 NOW Rank와 분리된 독립 정보 허브입니다. 실제 대통령 데이터 연결방식은 정치인 데이터 구조와 함께 확정합니다.</p></section><section class="content-card empty-state tall"><div class="empty-icon">P</div><h2>대통령 데이터 연결 전</h2><p>메인에서 확정한 대통령 영역과 연결되는 전용 페이지 Shell입니다.</p></section></main>`);
}

export async function renderNow() {
  const rows = Array.from({ length: 15 }, (_, i) => `<article class="person-slot-card"><span class="slot-no">#${String(i + 1).padStart(2, "0")}</span><div class="person-photo-placeholder"></div><div class="slot-lines"><span class="slot-line name"></span><span class="slot-line meta"></span><span class="slot-line short"></span></div><span class="slot-state">순위 데이터 연결 전</span></article>`).join("");
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NOW RANK</span><h1>NOW Rank</h1><p>정치인 실데이터와 순위 산식은 아직 연결하지 않습니다. 순위 엔진을 협의한 뒤 동일한 정치인 ID를 사용합니다.</p></section><section class="content-card"><div class="section-title"><h2>1–15위 표시 영역</h2><span>EMPTY PROVIDER</span></div><div class="person-grid">${rows}</div><div class="notice-box">v2 순위 데이터나 Redis snapshot을 읽지 않습니다. v3 Rank Engine은 별도로 설계합니다.</div></section></main>`);
}

export async function renderPolls() {
  const data = await getDomain("polls");
  const items = (data.items || []).filter(x => x.published !== false);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CITIZENS’ CHOICE</span><h1>시민들의 선택</h1><p>관리자가 질문과 최대 10개의 선택지를 등록하면 참여자가 투표할 수 있습니다.</p></section><section class="content-card">${items.length ? `<div class="poll-page-list">${items.map(poll => `<article><span class="status-pill"><b>POLL</b>진행중</span><h2>${esc(poll.question)}</h2><p>총 ${(poll.options || []).reduce((s, x) => s + Number(x.votes || 0), 0).toLocaleString("ko-KR")}표</p><div class="poll-choice-list">${(poll.options || []).map(opt => `<button type="button" data-poll-vote data-poll-id="${esc(poll.id)}" data-option-id="${esc(opt.id)}"><span>${esc(opt.label)}</span><b>${pct(opt, poll.options)}%</b></button>`).join("")}</div></article>`).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">✓</div><h2>등록된 설문이 없습니다.</h2><p>관리자에서 첫 설문을 만들면 이 페이지와 메인에 함께 노출됩니다.</p></div>`}</section></main>`);
}

export async function renderAcademy() {
  const data = await getDomain("academy");
  const slots = (data.slots || []).filter(x => x.published !== false);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">JEONGCHAMSI ACADEMY</span><h1>정참시 아카데미</h1><p>정치를 꿈꾸는 사람이 수강 가능한 일정을 확인하는 공간입니다.</p></section><section class="content-card"><div class="section-title"><h2>수강 가능 일정</h2><span>${slots.length}개</span></div>${slots.length ? `<div class="academy-slot-list">${slots.map(s => `<article><div><b>${esc(s.date || "날짜 미정")}</b><span>${esc(s.title || "정참시 아카데미")} · ${esc(s.description || "")}</span></div><button type="button" ${s.closed ? "disabled" : ""}>${s.closed ? "마감" : "수강신청"}</button></article>`).join("")}</div>` : `<div class="empty-state"><h2>등록된 일정이 없습니다.</h2><p>관리자에서 일정을 등록하면 이곳에 표시됩니다.</p></div>`}</section></main>`);
}

export async function renderItsme() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">IT’S ME</span><h1>IT’S ME</h1><p>정치 속의 나를 발견하고 참여로 이어지는 개인화 허브입니다.</p></section><section class="feature-grid"><article class="content-card"><b>나의 정치성향</b><p>문항 기반 정치성향 기능</p></article><article class="content-card"><b>나와 가까운 정치인</b><p>정치인 데이터 연결 후 활성화</p></article><article class="content-card"><b>내 지역 정치</b><p>회원 지역설정과 연결</p></article><article class="content-card"><b>내가 국회의원이라면</b><p>정책 제안 작성 기능</p></article><article class="content-card"><b>오늘의 정치 질문</b><p>짧은 참여 기능</p></article><article class="content-card accent-card"><b>IT’S ME</b><p>정참시 개인 참여 허브</p></article></section></main>`);
}

export async function renderCompare() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">COMPARE · SAMPLE</span><h1>정치인 비교분석</h1><p>HOME과 동일하게 실제 정치인이 아닌 가상후보로 결과 형태를 보여줍니다.</p></section><section class="content-card"><div class="compare-demo"><div><span class="fake-avatar a"></span><h2>가상후보 A</h2><p>정책·민생형</p></div><div class="compare-demo-bars"><label>활동도 <i><em style="width:72%"></em></i>72</label><label>관심도 <i><em style="width:61%"></em></i>61</label><label>언급량 <i><em style="width:48%"></em></i>48</label><label>참여도 <i><em style="width:67%"></em></i>67</label></div><div><span class="fake-avatar b"></span><h2>가상후보 B</h2><p>개혁·소통형</p></div></div><div class="notice-box">실제 비교는 543개 정치인 슬롯에 실데이터가 연결된 뒤 같은 ID를 선택하는 구조로 활성화합니다.</div></section></main>`);
}

export async function renderGeneration() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h1>세대가 뽑은 대통령</h1><p>10대부터 60대+까지 정참시 참여자의 모의투표 결과를 세대별로 비교합니다.</p></section><section class="content-card"><div class="generation-page-grid">${["10대", "20대", "30대", "40대", "50대", "60대+"].map(age => `<article><b>${age}</b><p>대통령 후보 데이터 연결 전</p><button type="button" disabled>후보 선택 영역</button></article>`).join("")}</div><div class="notice-box">후보는 별도 인물 DB를 만들지 않고 정치인 MASTER가 확정된 뒤 동일 ID를 사용합니다.</div></section></main>`);
}

export async function renderNationalEvaluation() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NATIONAL EVALUATION</span><h1>국회의원 전국 평가제</h1><p>지역구를 넘어 한 명의 입법기관을 전국 참여자가 동일 기준으로 평가하는 기능입니다.</p></section><section class="content-card"><div class="empty-state tall"><div class="empty-icon">評</div><h2>평가 대상 연결 전</h2><p>국회의원 300명 슬롯에 실데이터가 연결된 뒤 관리자에서 동일 인물 ID를 선택하도록 활성화합니다.</p></div><div class="notice-box">특정 정치인을 위한 기능이 아니라 모든 의원에게 같은 평가 규칙과 노출 규칙을 적용합니다.</div></section></main>`);
}

export async function renderSearch(query = "") {
  const q = String(query || "").trim().toLowerCase();
  const [columns, community, news] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news")]);
  const groups = [
    ["COLUMN", "column", columns.items || []],
    ["정뮤니티", "community", community.items || []],
    ["정참시 NEWS", "news", news.items || []]
  ];
  const matches = q ? groups.flatMap(([label, route, items]) => items.filter(x => x.published !== false && `${x.title || ""} ${x.summary || ""} ${x.body || ""}`.toLowerCase().includes(q)).map(x => ({ ...x, label, route }))) : [];
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">SEARCH</span><h1>통합검색</h1><p>검색어: <b>${esc(query || "—")}</b></p></section><section class="content-card">${matches.length ? `<div class="board-list">${matches.map(x => `<article class="no-thumb"><a href="/${x.route}/${esc(x.id)}" data-route><span class="type">${esc(x.label)}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary || x.body || "")}</p></a><small>${esc(x.author || "정참시")}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><h2>${q ? "검색 결과가 없습니다." : "검색어를 입력해 주세요."}</h2><p>게시판 검색은 지금 동작합니다. 정치인·정당 검색은 실제 정치인 데이터 공급방식을 확정한 뒤 543개 슬롯에 연결합니다.</p></div>`}</section></main>`);
}
