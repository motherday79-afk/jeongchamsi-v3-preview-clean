import { startPerformanceMonitor } from "./performance.js";
import { imageMarkup, hydrateManagedImages } from "./image-engine.js";

const rank = [
  ["1","김민석","더불어민주당 · 서울","▲ 2"],
  ["2","정청래","더불어민주당 · 서울","▲ 1"],
  ["3","한동훈","국민의힘 · 서울","—"],
  ["4","이준석","개혁신당 · 경기","▼ 1"],
  ["5","조국","조국혁신당 · 부산","▲ 3"]
];

const itsme = [
  ["01 정책제안","내가 국회의원이라면 가장 먼저 바꿀 정책은?"],
  ["02 정치성향","내 관심 이슈와 가까운 정치 흐름을 확인합니다."],
  ["03 지역정치","우리 지역에서 지금 가장 중요한 의제를 고릅니다."],
  ["04 비교선택","두 정치인의 정책과 활동을 같은 기준으로 봅니다."],
  ["05 오늘의 질문","짧은 질문으로 정치 참여를 시작합니다."],
  ["06 IT’S ME 시작","정치 속의 나를 발견하세요."]
];

const surveys = [
  ["차기 지방선거에서 가장 중요한 기준은?","64%"],
  ["청년정책에서 가장 시급한 것은?","51%"],
  ["지역 정치인의 핵심 평가 기준은?","47%"]
];

const community = [
  ["이번 주 국회에서 꼭 봐야 할 이슈가 뭘까요?","정치토론 · 12분 전","댓글 18"],
  ["지역 교통정책, 실제 이용자 의견을 듣고 싶습니다","지역정치 · 28분 전","댓글 11"],
  ["정책 공약을 평가할 때 무엇부터 확인하시나요?","질문 · 41분 전","댓글 9"],
  ["청년 정치참여를 늘릴 현실적인 방법","자유토론 · 1시간 전","댓글 24"]
];

document.querySelector("#app").innerHTML = `
<div class="shell">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/">정참시</a>
      <label class="searchbox"><input aria-label="통합검색" placeholder="정치인, 정당, 키워드, COLUMN, 정뮤니티 검색"></label>
      <div class="top-actions">
        <button class="icon-btn" aria-label="알림">○</button>
        <button class="icon-btn" aria-label="관심함">☆</button>
        <button class="icon-btn" aria-label="메뉴">☰</button>
      </div>
    </div>
  </header>

  <div class="page">
    <div class="layout">
      <main class="main">
        <section class="card president">
          ${imageMarkup({src:"/media/demo/avatar.v1.webp",alt:"대통령 대표 이미지 자리",width:160,height:160,className:"president-photo",priority:true,fit:"cover"})}
          <div>
            <div class="eyebrow">PRESIDENT · OUT OF RANK</div>
            <h1>대통령부터</h1>
            <p>대통령은 NOW Rank와 분리해 대한민국 정치 흐름의 기준 인물로 보여줍니다.</p>
          </div>
          <div class="president-badge">공식정보</div>
        </section>

        <section class="card section" id="now">
          <div class="section-head"><div><span>NOW RANK</span><h2>지금 가장 뜨거운 정치인</h2></div><button>전체보기 →</button></div>
          <div class="rank-list">
            ${rank.map(r=>`<div class="rank-row"><div class="rank-no">${r[0]}</div>${imageMarkup({src:"/media/demo/avatar.v1.webp",alt:"정치인 대표 이미지 자리",width:160,height:160,className:"avatar",priority:false,fit:"cover"})}<div class="rank-copy"><b>${r[1]}</b><small>${r[2]}</small></div><div class="delta">${r[3]}</div></div>`).join("")}
          </div>
        </section>

        <section class="card section" id="itsme">
          <div class="section-head"><div><span>IT’S ME</span><h2>정치 속의 나를 발견하세요</h2></div><button>전체보기 →</button></div>
          <div class="itsme-grid">
            ${itsme.map((x,i)=>`<article class="itsme-card ${i===5?"cta":""}"><b>${x[0]}</b><p>${x[1]}</p></article>`).join("")}
          </div>
        </section>

        <section class="card section" id="column">
          <div class="section-head"><div><span>TODAY POLITICS</span><h2>오늘 정치에서 봐야 할 COLUMN</h2></div><button>전체 COLUMN 보기 →</button></div>
          <article class="column-feature">
            ${imageMarkup({src:"/media/demo/column.v1.webp",alt:"COLUMN 대표사진 자리",width:800,height:450,className:"column-image",priority:false,fit:"cover"})}
            <div class="column-copy">
              <div class="kicker">LEAD COLUMN</div>
              <h3>정책을 뉴스가 아니라 맥락으로 읽는 정참시 COLUMN</h3>
              <p>v3에서는 HOME·목록·상세가 하나의 데이터 소스를 공유하고, 사진은 CDN 캐시와 버전 URL을 사용합니다.</p>
              <div class="meta"><span>정참시 편집팀</span><span>PREVIEW</span></div>
            </div>
          </article>
        </section>

        <section class="card section" id="survey">
          <div class="section-head"><div><span>SURVEY</span><h2>지금 시민들의 선택</h2></div><button>전체 설문 보기 →</button></div>
          <div class="survey-grid">
            ${surveys.map((s,i)=>`<article class="survey-item"><b>${s[0]}</b><div class="bar"><i style="width:${s[1]}"></i></div><div class="meta"><span>참여 ${1200-i*211}명</span><strong>${s[1]}</strong></div></article>`).join("")}
          </div>
        </section>

        <section class="card section" id="community">
          <div class="section-head"><div><span>COMMUNITY</span><h2>지금 시민들이 말하는 것</h2></div><button>더보기 →</button></div>
          <div class="community-list">
            ${community.map(x=>`<div class="community-row"><div><b>${x[0]}</b><small>${x[1]}</small></div><div class="stats">${x[2]}</div></div>`).join("")}
          </div>
        </section>
      </main>

      <aside class="rail">
        <section class="card rail-card login-card">
          <strong>정참시에 로그인하세요</strong>
          <p>관심 정치인과 이슈를 저장하고 참여 기록을 이어갈 수 있습니다.</p>
          <button>로그인</button>
        </section>
        <section class="card rail-card">
          <h3 class="rail-title">실시간 정치키워드</h3>
          <div class="keyword-wrap">
            ${["지방선거","연금개혁","반도체특별법","공천","부동산","청년정책"].map(x=>`<span class="keyword">${x}</span>`).join("")}
          </div>
        </section>
        <section class="card rail-card">
          <h3 class="rail-title">정참시 NEWS</h3>
          <div class="news-mini"><div>오늘 정치권 핵심 일정 한눈에 보기</div><div>국회 주요 법안 처리 흐름</div><div>지역정치 주요 이슈 업데이트</div></div>
        </section>
        <div class="perf-note"><b>v3 SPEED FIRST</b><br>현재 HOME Shell은 API 요청 없이 즉시 렌더됩니다.<br><br>주소 뒤에 <b>?perf=1</b>을 붙이면 성능 수치를 볼 수 있습니다.</div>
      </aside>
    </div>
  </div>
</div>`;

hydrateManagedImages();
startPerformanceMonitor();
