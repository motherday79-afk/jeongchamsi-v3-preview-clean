import { startPerformanceMonitor } from "./performance.js";
import { NOW_RANK_BOOTSTRAP, NOW_RANK_BOOTSTRAP_META } from "./data/now-rank.bootstrap.js";
import { rowsFromSnapshot, startNowRankSync } from "./rank-service.js";
import { imageMarkup, hydrateManagedImages } from "./image-engine.js";

const escapeHtml = (value="") => String(value)
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

const emptyState = (message) => `
  <div class="empty-state">
    <b>데이터 연결 전</b>
    <span>${escapeHtml(message)}</span>
  </div>`;

function rankChangeMarkup(r) {
  const change = Number(r.change);
  if (!Number.isFinite(change)) return `<small class="rank-change same">―</small>`;
  if (change > 0) return `<small class="rank-change up">▲ ${change}</small>`;
  if (change < 0) return `<small class="rank-change down">▼ ${Math.abs(change)}</small>`;
  return `<small class="rank-change same">―</small>`;
}

function rankRowsMarkup(rows) {
  return rows.map((r) => `
    <div class="rank-row">
      <div class="rank-no">${escapeHtml(r.rank)}</div>
      ${r.photoUrl
        ? imageMarkup({
            src: r.photoUrl,
            alt: `${r.name} 프로필 사진`,
            width: 160,
            height: 160,
            className: "avatar",
            priority: false,
            fit: "cover"
          })
        : `<div class="avatar-placeholder" aria-hidden="true">${escapeHtml((r.name || "?").slice(0,1))}</div>`}
      <div class="rank-copy">
        <b>${escapeHtml(r.name)}</b>
        <small>${escapeHtml(r.party)}${r.constituency || r.region ? ` · ${escapeHtml(r.constituency || r.region)}` : ""}</small>
      </div>
      <div class="rank-score">
        <span>${escapeHtml(r.rank)}위</span>
        ${rankChangeMarkup(r)}
      </div>
    </div>`).join("");
}

function renderNowRankRows(rows) {
  const box = document.querySelector("#nowRankRows");
  if (!box || !Array.isArray(rows) || !rows.length) return;
  box.innerHTML = rankRowsMarkup(rows);
  hydrateManagedImages(box);
}

function setNowRankStatus(message, state = "") {
  const note = document.querySelector("#nowRankStatus");
  if (!note) return;
  note.dataset.state = state;
  note.textContent = message;
}

document.querySelector("#app").innerHTML = `
<div class="shell">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/">정참시</a>
      <label class="searchbox">
        <input aria-label="통합검색" placeholder="정치인, 정당, 키워드, COLUMN, 정뮤니티 검색">
      </label>
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
          <div class="president-photo placeholder-photo" aria-hidden="true"></div>
          <div>
            <div class="eyebrow">PRESIDENT · OUT OF RANK</div>
            <h1>대통령부터</h1>
            <p>대통령 데이터는 실제 데이터 소스 연결 단계에서 표시합니다.</p>
          </div>
          <div class="president-badge">OUT OF RANK</div>
        </section>

        <section class="card section" id="now">
          <div class="section-head">
            <div>
              <span>NOW RANK · CURRENT</span>
              <h2>현재 NOW Rank</h2>
            </div>
            <button type="button">전체보기 →</button>
          </div>
          <div class="data-note" id="nowRankStatus">
            현재 확인된 Top ${NOW_RANK_BOOTSTRAP_META.count}를 즉시 표시합니다. 게시 snapshot은 화면 로딩 후 자동 확인합니다.
          </div>
          <div class="rank-list" id="nowRankRows">${rankRowsMarkup(NOW_RANK_BOOTSTRAP)}</div>
        </section>

        <section class="card section" id="itsme">
          <div class="section-head">
            <div><span>IT’S ME</span><h2>정치 속의 나를 발견하세요</h2></div>
            <button type="button">전체보기 →</button>
          </div>
          ${emptyState("관리자 또는 실제 사용자 데이터 구조를 연결한 뒤 표시합니다.")}
        </section>

        <section class="card section" id="column">
          <div class="section-head">
            <div><span>TODAY POLITICS</span><h2>COLUMN</h2></div>
            <button type="button">전체 COLUMN 보기 →</button>
          </div>
          ${emptyState("가짜 칼럼을 만들지 않습니다. 실제 COLUMN 데이터만 연결합니다.")}
        </section>

        <section class="card section" id="survey">
          <div class="section-head">
            <div><span>SURVEY</span><h2>지금 시민들의 선택</h2></div>
            <button type="button">전체 설문 보기 →</button>
          </div>
          ${emptyState("실제 설문 데이터 연결 전입니다.")}
        </section>

        <section class="card section" id="community">
          <div class="section-head">
            <div><span>COMMUNITY</span><h2>지금 시민들이 말하는 것</h2></div>
            <button type="button">더보기 →</button>
          </div>
          ${emptyState("실제 정뮤니티 데이터 연결 전입니다.")}
        </section>
      </main>

      <aside class="rail">
        <section class="card rail-card login-card">
          <strong>정참시에 로그인하세요</strong>
          <p>로그인 기능은 회원 시스템 이관 단계에서 연결합니다.</p>
          <button type="button">로그인</button>
        </section>

        <section class="card rail-card">
          <h3 class="rail-title">실시간 정치키워드</h3>
          ${emptyState("실제 키워드 데이터 연결 전입니다.")}
        </section>

        <section class="card rail-card">
          <h3 class="rail-title">정참시 NEWS</h3>
          ${emptyState("실제 뉴스 데이터 연결 전입니다.")}
        </section>

        <div class="perf-note">
          <b>v3 SPEED FIRST</b><br>
          NOW Rank는 bootstrap으로 즉시 표시되고 실제 게시 snapshot은 뒤에서 갱신됩니다.<br><br>
          <b>?perf=1</b>에서 성능 변화를 확인합니다.
        </div>
      </aside>
    </div>
  </div>
</div>`;

startNowRankSync({
  onSnapshot(snapshot, meta) {
    const rows = rowsFromSnapshot(snapshot, 10);
    if (rows.length) {
      renderNowRankRows(rows);
      setNowRankStatus(
        meta.source === "cache"
          ? `저장된 실제 게시 snapshot Top ${rows.length}을 즉시 표시했습니다. 최신본을 확인 중입니다.`
          : `실제 게시 snapshot Top ${rows.length}으로 갱신되었습니다.`,
        meta.source
      );
    }
  },
  onStatus(status) {
    if (status.state === "checking") {
      setNowRankStatus("현재 게시 snapshot을 백그라운드에서 확인 중입니다.", "checking");
    } else if (status.state === "ready") {
      const rows = document.querySelectorAll("#nowRankRows .rank-row").length;
      setNowRankStatus(`실제 게시 snapshot Top ${rows} · 자동 갱신 정상`, "ready");
    } else if (status.state === "cached") {
      setNowRankStatus("저장된 실제 snapshot을 표시 중입니다. 서버 재확인은 다음 접속에서 다시 시도합니다.", "cached");
    } else if (status.state === "bootstrap") {
      setNowRankStatus("현재 Top 5 기준값을 표시 중입니다. 게시 snapshot 서버 연결을 확인해주세요.", "bootstrap");
    }
  }
});

startPerformanceMonitor();
