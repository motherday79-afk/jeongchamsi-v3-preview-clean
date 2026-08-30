import { pageShell, esc } from "./layout.js?v=alpha6.0.36.23-copy-scroll-hotfix";
import { getDomain } from "../core/repository.js";
import { FINAL_ABOUT_INTRO, FINAL_ABOUT_BODY, normalizeAboutCopy } from "../core/brand-about-copy.js?v=jcs-clean-rebuild-r1";

function paragraphs(text = "") {
  return String(text || "").split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
}

function defaults(data = {}) {
  return {
    about: normalizeAboutCopy({ title: "왜 정참시인가", intro: FINAL_ABOUT_INTRO, body: FINAL_ABOUT_BODY, ...(data.about || {}) }),
    support: {
      title: "정참시 후원하기",
      intro: "정치에 참여할 수 있는 더 나은 공간을 함께 만들어 주세요",
      body: "정참시는 시민이 정치 정보를 더 쉽게 이해하고, 비교하고, 선택하고, 평가할 수 있는 공간을 만들고 있습니다\n\n후원은 정참시의 서비스 운영, 데이터 정비, 콘텐츠 제작, 시민 참여 기능 개선에 사용됩니다\n\n후원 방법과 세부 운영 원칙은 준비되는 대로 투명하게 공개하겠습니다",
      note: "현재 후원 방법은 준비 중입니다",
      ...(data.support || {})
    }
  };
}

export async function renderAbout() {
  const data = defaults(await getDomain("brand"));
  return pageShell(`<main class="subpage brand-story-page">
    <section class="brand-story-hero">
      <span class="eyebrow">WHY JEONGCHAMSI</span>
      <h1>${esc(data.about.title)}</h1>
      <p>${esc(data.about.intro)}</p>
    </section>
    <section class="content-card brand-story-card">
      <div class="brand-story-lead">정치는 정치인만의 것이 아닙니다</div>
      <div class="brand-story-body">${paragraphs(data.about.body)}</div>
      <div class="brand-story-closing">
        <span>정참시 — 정치에 참여할 시간</span>
        <b>바라볼 때가 아닌, 행동할 때 정치가 시작됩니다.</b>
      </div>
      <div class="brand-story-actions"><button class="primary-btn" type="button" data-go="/">정참시 메인으로</button><a class="ghost-btn" href="https://toon.at/donate/jungchamsi" target="_blank" rel="noopener noreferrer">정참시 후원하기</a></div>
    </section>
  </main>`);
}

export async function renderSupport() {
  const data = defaults(await getDomain("brand"));
  return pageShell(`<main class="subpage brand-story-page brand-support-page">
    <section class="brand-story-hero">
      <span class="eyebrow">SUPPORT JEONGCHAMSI</span>
      <h1>${esc(data.support.title)}</h1>
      <p>${esc(data.support.intro)}</p>
    </section>
    <section class="content-card brand-story-card">
      <div class="brand-support-mark">♡</div>
      <div class="brand-story-body">${paragraphs(data.support.body)}</div>
      <div class="notice-box brand-support-note">${esc(data.support.note)}</div>
      <div class="brand-story-actions"><a class="primary-btn" href="https://toon.at/donate/jungchamsi" target="_blank" rel="noopener noreferrer">후원 페이지로 이동</a><button class="ghost-btn" type="button" data-go="/about">정참시 더 알아보기</button><button class="ghost-btn" type="button" data-go="/">메인으로</button></div>
    </section>
  </main>`);
}
