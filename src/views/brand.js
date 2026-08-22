import { pageShell, esc } from "./layout.js?v=alpha6.0.36.18-livebar-auth-generation";
import { getDomain } from "../core/repository.js?v=alpha6.0.36.18-livebar-auth-generation";

function paragraphs(text = "") {
  return String(text || "").split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
}

function defaults(data = {}) {
  return {
    about: {
      title: "왜 정참시인가",
      intro: "정치는 선거일 하루에만 존재하지 않습니다. 우리의 일상과 선택, 지역과 미래를 매일 움직입니다.",
      body: "정참시는 정치인을 지지하거나 공격하기 위해 만든 곳이 아닙니다. 더 알고, 비교하고, 질문하고, 선택하고, 평가하기 위해 만들었습니다.\n\n정치인을 알아보는 것도 참여입니다. 정책과 기록을 비교하는 것도 참여입니다. 시민의 생각을 표현하고, 선출된 이후에도 계속 지켜보며 평가하는 것도 참여입니다.\n\n정치는 정치인만의 것이 아닙니다. 정치의 결과를 살아가는 사람이 시민이라면, 정치의 과정에도 시민의 자리가 있어야 합니다.\n\n한 사람의 관심은 작을 수 있습니다. 하지만 수많은 한 사람이 알고, 묻고, 비교하고, 선택하기 시작하면 정치의 방향은 달라질 수 있습니다.\n\n그래서 우리는 정참시를 만들었습니다. 바라볼 때가 아닌, 행동할 때 정치가 시작되니까요.",
      ...(data.about || {})
    },
    support: {
      title: "정참시 후원하기",
      intro: "정치에 참여할 수 있는 더 나은 공간을 함께 만들어 주세요.",
      body: "정참시는 시민이 정치 정보를 더 쉽게 이해하고, 비교하고, 선택하고, 평가할 수 있는 공간을 만들고 있습니다.\n\n후원은 정참시의 서비스 운영, 데이터 정비, 콘텐츠 제작, 시민 참여 기능 개선에 사용됩니다.\n\n후원 방법과 세부 운영 원칙은 준비되는 대로 투명하게 공개하겠습니다.",
      note: "현재 후원 방법은 준비 중입니다.",
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
      <div class="brand-story-lead">정치는 정치인만의 것이 아닙니다.</div>
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
