import { pageShell } from "./layout.js";
import { getHomeSnapshot } from "../core/repository.js";

const rankTop5 = Array.from({length:5}, (_,i) => `
  <article class="rank-top-card">
    <div class="rank-top-no">${i+1}</div>
    <div class="rank-top-avatar"></div>
    <div class="rank-top-copy"><b>순위 데이터 대기</b><span>정치인 데이터 공급방식 협의 후 연결</span></div>
  </article>`).join("");

const rankList10 = Array.from({length:10}, (_,i) => `
  <div class="rank-list-row">
    <span class="rank-list-no">${i+6}</span><span class="rank-list-avatar"></span>
    <span class="rank-list-copy"><b>정치인 데이터 대기</b><em>NOW Rank 데이터 공급방식 협의 후 연결</em></span>
    <span class="rank-list-meta">NOW</span>
  </div>`).join("");

const sideRows = count => Array.from({length:count}, (_,i) => `<div class="side-row"><span>${i+1}</span><i></i></div>`).join("");

function communityHome(data){
  const items = Array.isArray(data?.items) ? data.items.filter(x=>x.published!==false) : [];
  const hot = [...items].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,2);
  const recent = items.slice(0,5);
  const hotHtml = hot.length ? hot.map(x=>`<article data-route="/community/${encodeURIComponent(x.id)}"><span>HOT</span><b>${escapeHtml(x.title)}</b><p>${escapeHtml(x.summary||"")}</p></article>`).join("") : `<article><span>HOT</span><b>아직 등록된 게시물이 없습니다.</b><p>관리자에서 게시물을 등록하면 이곳에 표시됩니다.</p></article><article><span>HOT</span><b>좋아요 상위 게시물 영역</b><p>데이터 등록 전 빈 상태입니다.</p></article>`;
  const rows = recent.length ? recent.map((x,i)=>`<div class="community-row" data-route="/community/${encodeURIComponent(x.id)}"><span class="community-order">${String(i+1).padStart(2,"0")}</span><span class="community-copy"><b>${escapeHtml(x.title)}</b><em>${escapeHtml(x.category||"정뮤니티")} · ${escapeHtml(x.author||"정참시")}</em></span><span class="community-stats">♥ ${x.likes||0} · ${x.views||0}</span></div>`).join("") : Array.from({length:5},(_,i)=>`<div class="community-row"><span class="community-order">${String(i+1).padStart(2,"0")}</span><span class="community-copy"><b>게시물 등록 대기</b><em>관리자에서 직접 등록</em></span><span class="community-stats">—</span></div>`).join("");
  return {hotHtml, rows};
}

function escapeHtml(value="") { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

export async function renderHome(){
  const snapshot = await getHomeSnapshot();
  const community = snapshot.community;
  const polls = snapshot.polls;
  const academy = snapshot.academy;
  const com = communityHome(community);
  const activePoll = (polls.items||[]).find(x=>x.published!==false);
  const pollOptions = (activePoll?.options||[]).slice(0,3);
  const slots = (academy.slots||[]).slice(0,4);

  const content = `
  <div class="portal-layout">
    <section class="mobile-utility" aria-label="모바일 빠른 정보">
      <div class="mobile-login"><div><b>정참시에 로그인하세요</b><span>즐겨찾기 · 참여 · 배지 · 알림</span></div><button type="button">로그인</button></div>
      <div class="mobile-keywords"><div class="mobile-utility-head"><b>실시간 정치키워드</b><span>더보기 →</span></div><div class="mobile-keyword-track">${Array.from({length:8},(_,i)=>`<span>${i+1}</span>`).join("")}</div></div>
      <div class="mobile-mini-tools"><button type="button"><b>내 참여 · 배지</b><span>활동 보기 →</span></button><button type="button"><b>최근 본 정치인</b><span>다시 보기 →</span></button></div>
    </section>

    <main class="main-column">
      <section class="module president-strip" id="president">
        <div class="president-photo"></div><div class="president-text"><span class="eyebrow">PRESIDENT · OUT OF RANK</span><h1>대통령부터</h1><p>정참시의 대통령 전용 영역. 대통령 데이터 공급방식 협의 후 연결합니다.</p></div><button class="more-btn" data-route="/president">대통령 페이지 →</button>
      </section>

      <section class="module now-module" id="now"><div class="module-header"><div><span class="eyebrow">NOW RANK</span><h2>지금 가장 주목받는 정치인</h2><p class="module-desc">상위 5명은 한눈에, 6~15위는 흐름을 읽기 쉽게.</p></div><button class="more-btn" data-route="/now">NOW Rank 전체보기 →</button></div><div class="rank-top-grid">${rankTop5}</div><div class="rank-divider"><span>6–15위</span><i></i></div><div class="rank-list">${rankList10}</div></section>

      <section class="module" id="itsme"><div class="module-header"><div><span class="eyebrow">IT’S ME</span><h2>정치 속의 나를 발견하세요</h2><p class="module-desc">참여형 기능을 한 묶음으로 보여주는 개인화 영역.</p></div><button class="more-btn" data-route="/itsme">IT’S ME 전체보기 →</button></div><div class="itsme-grid"><article class="itsme-card"><span>01</span><b>나의 정치성향</b><p>개인 정치성향 기능</p></article><article class="itsme-card"><span>02</span><b>나와 가까운 정치인</b><p>정치인 데이터 연결 후 활성화</p></article><article class="itsme-card"><span>03</span><b>내 지역 정치</b><p>지역 정치정보 기능</p></article><article class="itsme-card"><span>04</span><b>내가 국회의원이라면</b><p>정책 제안 기능</p></article><article class="itsme-card"><span>05</span><b>오늘의 정치 질문</b><p>짧은 참여 기능</p></article><article class="itsme-card accent"><span>06</span><b>IT’S ME 시작</b><p>정치 속의 나를 발견합니다.</p></article></div></section>

      <section class="module" id="column"><div class="module-header"><div><span class="eyebrow">COLUMN</span><h2>오늘 정치에서 읽어야 할 것</h2><p class="module-desc">대표 COLUMN 1개 + 추가 COLUMN 4개 구조.</p></div><button class="more-btn" data-route="/column">COLUMN 전체보기 →</button></div><div class="column-lead"><div class="column-lead-image"></div><div class="column-lead-copy"><span class="skeleton kicker"></span><span class="skeleton title"></span><span class="skeleton title short"></span><span class="skeleton body"></span><span class="skeleton body"></span><span class="skeleton body short"></span></div></div><div class="column-grid">${Array.from({length:4},()=>`<article class="column-card"><div class="column-thumb"></div><div class="column-card-copy"><span class="skeleton small-title"></span><span class="skeleton mini"></span></div></article>`).join("")}</div></section>

      <section class="module poll-module" id="poll"><div class="module-header"><div><span class="eyebrow">CITIZENS’ CHOICE</span><h2>지금 시민들의 선택</h2><p class="module-desc">메인에서는 질문 1개와 선택지 최대 3개까지만 일관되게 노출.</p></div><button class="more-btn" data-route="/poll">전체 설문 바로가기 →</button></div><div class="poll-main"><div class="poll-question"><span class="poll-status">${activePoll?'진행중':'준비중'}</span><h3>${escapeHtml(activePoll?.question||'설문 등록 대기')}</h3><p>${activePoll?'전체 설문에서 참여할 수 있습니다.':'관리자에서 설문을 등록하면 이 영역에 표시됩니다.'}</p></div><div class="poll-options">${pollOptions.length?pollOptions.map((o,i)=>`<button data-route="/poll"><span>${escapeHtml(o)}</span><i><em style="width:0%"></em></i><b>—</b></button>`).join(""):Array.from({length:3},(_,i)=>`<button data-route="/poll"><span>선택지 ${i+1}</span><i><em style="width:0%"></em></i><b>—</b></button>`).join("")}</div></div></section>

      <section class="module" id="community"><div class="module-header"><div><span class="eyebrow">COMMUNITY</span><h2>지금 시민들이 말하는 것</h2><p class="module-desc">좋아요 상위 2개와 최근 게시글 5개만 노출합니다.</p></div><button class="more-btn" data-route="/community">정뮤니티 전체보기 →</button></div><div class="community-highlight">${com.hotHtml}</div><div class="community-list">${com.rows}</div></section>

      <section class="module" id="compare"><div class="module-header"><div><span class="eyebrow">COMPARE · SAMPLE</span><h2>정치인 비교분석</h2><p class="module-desc">특정 정치인 홍보·비방을 피하기 위해 가상후보 예시로 결과 형태를 보여줍니다.</p></div><button class="more-btn" data-route="/compare">내가 직접 비교하기 →</button></div><div class="compare-sample-badge">예시 화면 · 실제 정치인 아님</div><div class="compare-layout"><div class="compare-person"><span class="compare-avatar sample-a"></span><b>가상후보 A</b><small>정책·민생형</small></div><div class="compare-metrics"><div><b>활동도</b><i><em style="width:72%"></em></i><strong>72</strong></div><div><b>관심도</b><i><em style="width:61%"></em></i><strong>61</strong></div><div><b>언급량</b><i><em style="width:48%"></em></i><strong>48</strong></div><div><b>참여도</b><i><em style="width:67%"></em></i><strong>67</strong></div></div><div class="compare-person"><span class="compare-avatar sample-b"></span><b>가상후보 B</b><small>개혁·소통형</small></div></div><div class="compare-summary"><b>비교 결과 예시</b><span>실제 정치인 데이터 연결 전까지 기능 설명용 가상 결과만 표시합니다.</span></div></section>

      <section class="module generation-president" id="generation-president"><div class="module-header"><div><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h2>세대가 뽑은 대통령</h2><p class="module-desc">같은 대통령 후보를 세대별로 바라보면 선택은 어떻게 달라질까? 정참시 모의투표로 비교합니다.</p></div><button class="more-btn" data-route="/generation-president">세대별 선택 전체보기 →</button></div><div class="generation-feature"><div class="generation-intro"><span class="generation-mark">세대별</span><h3>10대부터 60대+까지<br>각 세대의 선택을 한눈에.</h3><p>실제 선거 결과가 아닌 정참시 참여자 기반 모의투표입니다.</p><button type="button" data-route="/generation-president">모의투표 참여 →</button></div><div class="generation-grid">${["10대","20대","30대","40대","50대","60대+"].map(age=>`<article class="generation-card"><span class="generation-age">${age}</span><span class="generation-avatar"></span><b>후보 데이터 대기</b><small>후보 등록 후 결과 표시</small><div class="generation-bar"><i style="width:0%"></i></div></article>`).join("")}</div></div></section>

      <section class="module national-eval" id="national-eval"><div class="module-header"><div><span class="eyebrow">NATIONAL EVALUATION</span><h2>국회의원 전국 평가제</h2><p class="module-desc">지역구를 넘어, 한 명의 입법기관을 전국 유권자가 평가한다면?</p></div><button class="more-btn" data-route="/national-evaluation">전국 평가제 보기 →</button></div><div class="national-eval-layout"><div class="eval-person"><span class="eval-avatar"></span><div><small>이번 평가 대상</small><b>대상 의원 등록 대기</b></div></div><div class="eval-question"><strong>“전국 유권자가 이 의원을 평가한다면?”</strong><p>정치인 데이터와 평가대상 설정 후 활성화합니다.</p></div><div class="eval-score"><small>전국 평가</small><strong>—</strong><span>참여 전</span></div></div></section>

      <section class="module academy-module" id="academy"><div class="module-header"><div><span class="eyebrow">JEONGCHAMSI ACADEMY</span><h2>정참시 아카데미</h2><p class="module-desc">정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳.</p></div><button class="more-btn" data-route="/academy">아카데미 일정 보기 →</button></div><div class="academy-layout"><div class="academy-intro"><span class="academy-mark">A</span><h3>정치의 꿈을 실제 준비로.</h3><p>관리자가 과정과 수강 가능 일정을 등록하면 회원이 빈 일정을 선택해 신청합니다.</p><button data-route="/academy">수강 가능 일정 확인 →</button></div><div class="academy-schedule"><div class="schedule-head"><b>수강 가능 일정</b><span>월간보기</span></div>${slots.length?slots.map(s=>`<div class="schedule-row"><span class="schedule-date">${escapeHtml(s.date||'일정')}</span><span class="schedule-line"><i></i><em></em></span><button data-route="/academy">${s.closed?'마감':'신청가능'}</button></div>`).join(""):Array.from({length:4},()=>`<div class="schedule-row"><span class="schedule-date">대기</span><span class="schedule-line"><i></i><em></em></span><button data-route="/academy">미등록</button></div>`).join("")}</div></div></section>
    </main>

    <aside class="side-column">
      <section class="side-card login-card side-login"><b>정참시에 로그인하세요</b><p>즐겨찾기, 참여 기록, 배지, 알림을 한곳에서 관리합니다.</p><button>로그인</button></section>
      <section class="side-card side-keywords"><div class="side-head"><b>실시간 정치키워드</b><span>더보기</span></div><div class="keyword-grid">${Array.from({length:10},(_,i)=>`<span>${i+1}</span>`).join("")}</div></section>
      <section class="side-card side-news"><div class="side-head"><b>정참시 NEWS</b><span data-route="/news">전체</span></div>${sideRows(5)}</section>
      <section class="side-card side-rising"><div class="side-head"><b>실시간 급상승</b><span>전체</span></div>${sideRows(5)}</section>
      <section class="side-card participation-card side-participation"><div class="side-head"><b>내 참여 · 배지</b><span>MY</span></div><div class="participation-main"><span class="grade-circle">P</span><div><b>대표 배지</b><p>로그인 후 내 활동과 등급 표시</p></div></div><div class="badge-mini-row"><span></span><span></span><span></span><span></span></div></section>
      <section class="side-card side-recent"><div class="side-head"><b>최근 본 정치인</b><span>전체</span></div><div class="recent-row"><span></span><span></span><span></span><span></span></div></section>
    </aside>
  </div>`;
  return pageShell(content);
}
