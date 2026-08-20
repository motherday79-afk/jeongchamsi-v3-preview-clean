import { startPerformanceMonitor } from "./performance.js";

const app=document.querySelector('#app');
app.innerHTML=`
<header class="header">
  <div class="inner">
    <a class="logo" href="/">정참시</a>
    <div class="tag">정치에 참여할 시간 · v3 Preview</div>
  </div>
</header>
<main class="wrap">
  <section class="notice">
    <span class="ok">PREVIEW ONLINE CHECK</span>
    <strong>정참시 v3 독립 개발환경</strong>
    <div>이 화면이 보이면 GitHub → Vercel 연결과 정적 배포가 정상입니다.</div>
  </section>
  <div class="grid">
    <div class="stack">
      <section class="card">
        <h2>HOME 이관 순서</h2>
        <p>현재 운영판의 기능과 디자인을 보존하면서 아래 순서로 v3 모듈을 이관합니다.</p>
        <div class="order">
          <div>01 대통령부터</div>
          <div>02 NOW Rank</div>
          <div>03 IT’S ME</div>
          <div>04 COLUMN</div>
          <div>05 시민들의 선택</div>
          <div>06 COMMUNITY</div>
        </div>
      </section>
      <section class="card">
        <h2>v3 원칙</h2>
        <p>운영 v2는 유지합니다. v3는 Preview에서만 개발하고, API·이미지·검색·History·관리자 기능을 하나씩 독립 모듈로 이관합니다.</p>
      </section>
    </div>
    <aside class="card rail">
      <h2>현재 단계</h2>
      <p>1단계: 속도 기준선 + 성능 계측 고정</p>
      <p style="margin-top:10px">다음: HOME Shell 초고속 이관</p>
      <div class="version">v3.0.0-alpha.1.1 · SPEED FOUNDATION</div>
    </aside>
  </div>
</main>`;


startPerformanceMonitor();
