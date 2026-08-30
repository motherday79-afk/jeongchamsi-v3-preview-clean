import { pageShell, esc } from "./layout.js?v=alpha6.0.36.23-copy-scroll-hotfix";
import { getDomain } from "../core/repository.js";

const ABOUT_V2_INTRO = "세계적으로 유명한 배우들도 끊임없이 훈련합니다.";
const ABOUT_V2_BODY = `작품을 쉬는 기간에는 발성과 호흡,
감정을 전달하는 방법을 배우고 다듬습니다.

작품 중에도 필요한 순간마다
조언을 구하며 자신을 정비합니다.

정치도 다르지 않다고 생각합니다.

정참시는
정치를 하려는 곳도,
정치인이 되려는 곳도 아닙니다.

다만 현장에서 더 나은 방법이 필요할 때,
현장의 시각과는 다른 방향에서 해답을 찾고자 할 때,
의도와는 다르게 난처한 상황을 겪게 될 때,
정참시는 분명한 데이터를 기반으로 더 선명한 방법을 제공합니다.

정참시는 정참시가 가장 잘하는 일을 하겠습니다.

막대한 양의 데이터를 빠짐없이 수집하고,
JCS만의 독자적인 시스템을 통해 분석하고,
시장이 요구하는 신호를 읽어
가장 필요한 순간에 전달하겠습니다.

그다음은 여러분의 몫입니다.
시장을 향해 마음껏 목소리를 내십시오.

목적지를 정하는 것은 여러분입니다.
가장 정확한 길을 찾는 것은 정참시가 하겠습니다.`;


function paragraphs(text = "") {
  return String(text || "").split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
}

function defaults(data = {}) {
  return {
    about: {
      title: "왜 정참시인가",
      intro: ABOUT_V2_INTRO,
      body: ABOUT_V2_BODY,
      ...(data.about || {})
    },
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
  const raw = await getDomain("brand");
  if (!raw.about || !String(raw.about.body || "").trim() || (String(raw.about.body || "").startsWith("정참시는 정치인을 지지하거나 공격하기 위해 만든 곳이 아닙니다.") || String(raw.about.body || "").startsWith("작품이 없는 시간에는 발성과 호흡"))) raw.about = { ...(raw.about || {}), intro:ABOUT_V2_INTRO, body:ABOUT_V2_BODY };
  const data = defaults(raw);
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
