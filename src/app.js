import { startPerformanceMonitor } from "./performance.js";

const placeholderRows = (count, type="line") =>
  Array.from({length: count}, (_, i) => `
    <div class="ph-row ${type}">
      <span class="ph-num">${String(i+1).padStart(2,"0")}</span>
      <span class="ph-thumb"></span>
      <span class="ph-copy"><i></i><em></em></span>
    </div>
  `).join("");

const miniCards = (count) =>
  Array.from({length:count}, () => `
    <div class="mini-card">
      <span class="mini-image"></span>
      <span class="mini-lines"><i></i><em></em></span>
    </div>
  `).join("");

document.querySelector("#app").innerHTML = `
<div class="shell">
  <header class="portal-header">
    <div class="header-top">
      <button class="plain-icon" aria-label="전체메뉴">☰</button>
      <a href="/" class="brand">정참시</a>
      <div class="header-spacer"></div>
      <button class="plain-icon" aria-label="알림">○</button>
      <button class="plain-icon" aria-label="즐겨찾기">☆</button>
    </div>

    <div class="search-zone">
      <label class="portal-search">
        <span class="search-mark">정</span>
        <input aria-label="통합검색" placeholder="정치인, 정당, 정책, COLUMN, 정뮤니티 검색">
        <button type="button">검색</button>
      </label>
    </div>

    <nav class="quick-nav">
      <a href="#president">대통령</a>
      <a href="#now">NOW</a>
      <a href="#itsme">IT’S ME</a>
      <a href="#column">COLUMN</a>
      <a href="#poll">시민들의 선택</a>
      <a href="#community">정뮤니티</a>
      <a href="#compare">비교분석</a>
    </nav>
  </header>

  <main class="portal-page">
    <div class="portal-grid">
      <div class="portal-main">

        <section class="module president-module" id="president">
          <div class="president-avatar"></div>
          <div class="president-copy">
            <span class="eyebrow">PRESIDENT · OUT OF RANK</span>
            <h1>대통령부터</h1>
            <p>대통령 영역 실제 데이터는 기능 연결 단계에서 적용합니다.</p>
          </div>
          <button class="module-more">대통령 보기 →</button>
        </section>

        <section class="module" id="now">
          <div class="module-head">
            <div>
              <span class="eyebrow">NOW RANK</span>
              <h2>지금 가장 뜨거운 정치인</h2>
            </div>
            <button class="module-more">전체보기 →</button>
          </div>
          <div class="layout-note">메인 10명 노출 · 실제 순위 엔진은 다음 단계에서 연결</div>
          <div class="rank-blueprint">${placeholderRows(10,"rank")}</div>
        </section>

        <section class="module" id="itsme">
          <div class="module-head">
            <div>
              <span class="eyebrow">IT’S ME</span>
              <h2>정치 속의 나를 발견하세요</h2>
            </div>
            <button class="module-more">전체보기 →</button>
          </div>
          <div class="itsme-blueprint">
            ${Array.from({length:6}, (_,i)=>`
              <div class="itsme-slot ${i===5?"accent":""}">
                <span>${String(i+1).padStart(2,"0")}</span>
                <b>기능 카드 영역</b>
                <p>실제 IT’S ME 기능을 이 위치에 연결</p>
              </div>`).join("")}
          </div>
        </section>

        <section class="module" id="column">
          <div class="module-head">
            <div>
              <span class="eyebrow">TODAY POLITICS</span>
              <h2>COLUMN</h2>
            </div>
            <button class="module-more">전체 COLUMN →</button>
          </div>
          <div class="column-lead-blueprint">
            <div class="lead-image"></div>
            <div class="lead-copy">
              <span class="ph-kicker"></span>
              <span class="ph-title"></span>
              <span class="ph-title short"></span>
              <span class="ph-paragraph"></span>
              <span class="ph-paragraph short"></span>
            </div>
          </div>
          <div class="column-mini-grid">${miniCards(4)}</div>
        </section>

        <section class="module" id="poll">
          <div class="module-head">
            <div>
              <span class="eyebrow">SURVEY</span>
              <h2>지금 시민들의 선택</h2>
            </div>
            <button class="module-more">전체 설문 →</button>
          </div>
          <div class="poll-grid">
            ${Array.from({length:3},()=>`
              <div class="poll-slot">
                <span class="poll-title"></span>
                <span class="poll-title short"></span>
                <div class="poll-bar"><i></i></div>
                <span class="poll-meta"></span>
              </div>`).join("")}
          </div>
        </section>

        <section class="module" id="community">
          <div class="module-head">
            <div>
              <span class="eyebrow">COMMUNITY</span>
              <h2>지금 시민들이 말하는 것</h2>
            </div>
            <button class="module-more">더보기 →</button>
          </div>
          <div class="community-hot">
            <div class="hot-card"><span>HOT</span><b>정뮤니티 강조 게시물 영역</b></div>
            <div class="hot-card"><span>HOT</span><b>정뮤니티 강조 게시물 영역</b></div>
          </div>
          <div class="community-list">${placeholderRows(8,"community")}</div>
        </section>

        <section class="module" id="compare">
          <div class="module-head">
            <div>
              <span class="eyebrow">COMPARE</span>
              <h2>오늘의 정치 비교</h2>
            </div>
            <button class="module-more">비교분석 →</button>
          </div>
          <div class="compare-box">
            <div class="compare-person"><span class="compare-avatar"></span><b>정치인 A</b></div>
            <div class="compare-center">
              <div><span>관심도</span><i></i></div>
              <div><span>활동도</span><i></i></div>
              <div><span>언급량</span><i></i></div>
              <div><span>참여도</span><i></i></div>
            </div>
            <div class="compare-person"><span class="compare-avatar"></span><b>정치인 B</b></div>
          </div>
        </section>

        <section class="module">
          <div class="module-head">
            <div>
              <span class="eyebrow">LIVE POLITICS</span>
              <h2>실시간 정치 흐름</h2>
            </div>
          </div>
          <div class="flow-grid">
            <div class="flow-card"><b>실시간 급상승</b>${placeholderRows(5,"compact")}</div>
            <div class="flow-card"><b>정치 키워드</b><div class="keyword-cloud">${Array.from({length:10},()=>`<i></i>`).join("")}</div></div>
            <div class="flow-card"><b>많이 본 COLUMN</b>${placeholderRows(5,"compact")}</div>
            <div class="flow-card"><b>많이 본 정뮤니티</b>${placeholderRows(5,"compact")}</div>
          </div>
        </section>

        <section class="module">
          <div class="module-head">
            <div>
              <span class="eyebrow">ACTIVITY</span>
              <h2>정참시 참여와 배지</h2>
            </div>
          </div>
          <div class="badge-layout">
            <div class="badge-big"><span class="badge-circle"></span><b>이번 주 참여</b><p>활동 요약 영역</p></div>
            <div class="badge-small"><span class="badge-circle"></span><b>배지</b></div>
            <div class="badge-small"><span class="badge-circle"></span><b>출석</b></div>
            <div class="badge-small"><span class="badge-circle"></span><b>다음 미션</b></div>
          </div>
        </section>

        <section class="module archive-module">
          <div class="module-head">
            <div>
              <span class="eyebrow">ARCHIVE</span>
              <h2>정치 아카이브</h2>
            </div>
          </div>
          <div class="archive-grid">${miniCards(6)}</div>
        </section>
      </div>

      <aside class="portal-rail">
        <section class="rail-card login-card">
          <b>정참시에 로그인하세요</b>
          <p>로그인/내정보 기능 영역</p>
          <button>로그인</button>
        </section>

        <section class="rail-card">
          <div class="rail-head"><b>실시간 정치키워드</b><span>더보기</span></div>
          <div class="keyword-placeholder">${Array.from({length:8},()=>`<i></i>`).join("")}</div>
        </section>

        <section class="rail-card">
          <div class="rail-head"><b>정참시 NEWS</b><span>더보기</span></div>
          ${placeholderRows(4,"rail")}
        </section>

        <section class="rail-card">
          <div class="rail-head"><b>실시간 급상승</b><span>더보기</span></div>
          ${placeholderRows(5,"rail")}
        </section>

        <section class="rail-card">
          <div class="rail-head"><b>오늘의 설문</b><span>참여</span></div>
          <div class="rail-poll"></div>
        </section>

        <section class="rail-card">
          <div class="rail-head"><b>최근 본 정치인</b><span>전체</span></div>
          <div class="recent-people">
            ${Array.from({length:4},()=>`<span></span>`).join("")}
          </div>
        </section>
      </aside>
    </div>
  </main>

  <footer class="portal-footer">
    <div><b>정참시</b> · 정치에 참여할 시간.</div>
    <div>이용안내 · 개인정보처리방침 · 운영정책</div>
  </footer>
</div>`;

startPerformanceMonitor();
