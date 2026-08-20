import { getDomain } from "../core/repository.js";
import { pageShell, esc } from "./layout.js";

const CONFIG = Object.freeze({
  columns: { title: "COLUMN", eyebrow: "COLUMN", route: "column", description: "정치를 조금 더 깊게 읽는 정참시의 칼럼 공간입니다.", image: true },
  community: { title: "정뮤니티", eyebrow: "COMMUNITY", route: "community", description: "시민들이 정치 이야기를 나누는 정참시 커뮤니티입니다.", image: false },
  news: { title: "정참시 NEWS", eyebrow: "JEONGCHAMSI NEWS", route: "news", description: "정참시가 모아보는 정치 뉴스와 이슈입니다.", image: true }
});

function safeImage(v = "") {
  const s = String(v || "");
  return s.startsWith("data:image/") || s.startsWith("https://") ? s : "";
}

function formatDate(v) {
  if (!v) return "";
  try { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)); }
  catch { return ""; }
}

function published(items = []) {
  return items.filter(x => x && x.published !== false).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function bodyHtml(body = "") {
  return String(body || "").split(/\n{2,}|\r?\n/).map(x => x.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("") || `<p>본문이 없습니다.</p>`;
}

export async function renderBoard(domain) {
  const config = CONFIG[domain] || CONFIG.community;
  const data = await getDomain(domain);
  const items = published(data.items || []);
  return pageShell(`<main class="subpage">
    <section class="page-hero"><span class="eyebrow">${config.eyebrow}</span><h1>${config.title}</h1><p>${config.description}</p></section>
    <section class="content-card">
      <div class="board-toolbar"><p>관리자에서 작성·수정·삭제한 게시물이 이 목록에 바로 연결됩니다.</p><span class="status-pill"><b>POSTS</b>${items.length}개</span></div>
      ${items.length ? `<div class="board-list">${items.map(item => {
        const cover = safeImage(item.coverImage);
        const noThumb = !config.image;
        return `<article class="${noThumb ? "no-thumb" : ""}">${!noThumb ? `<a class="board-thumb" href="/${config.route}/${esc(item.id)}" data-route ${cover ? `style="background-image:url('${cover}')"` : ""}></a>` : ""}<a href="/${config.route}/${esc(item.id)}" data-route><span class="type">${config.title}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary || item.body || "")}</p></a><small>${esc(item.author || "정참시")} · ${formatDate(item.createdAt)}</small></article>`;
      }).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">＋</div><h2>아직 등록된 글이 없습니다.</h2><p>관리자에서 첫 글을 작성하면 이곳에 목록이 생성됩니다.</p></div>`}
    </section>
  </main>`);
}

export async function renderBoardDetail(domain, id) {
  const config = CONFIG[domain] || CONFIG.community;
  const data = await getDomain(domain);
  const item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  if (!item) {
    return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>게시물을 찾을 수 없습니다.</h2><p>삭제되었거나 아직 공개되지 않은 게시물입니다.</p><div class="inline-actions" style="justify-content:center;margin-top:18px"><button class="primary-btn" type="button" data-go="/${config.route}">${config.title} 목록으로</button></div></section></main>`);
  }
  const cover = safeImage(item.coverImage);
  return pageShell(`<main class="subpage">
    <article class="content-card article-detail">
      <span class="eyebrow">${config.eyebrow}</span>
      <h1>${esc(item.title)}</h1>
      <div class="article-meta"><span>${esc(item.author || "정참시")}</span><span>${formatDate(item.createdAt)}</span><span>조회 ${Number(item.views || 0)}</span><span>좋아요 ${Number(item.likes || 0)}</span></div>
      ${cover ? `<div class="article-cover" style="background-image:url('${cover}')"></div>` : ""}
      ${item.summary ? `<div class="article-lead">${esc(item.summary)}</div>` : ""}
      <div class="article-body">${bodyHtml(item.body)}</div>
      <div class="article-actions"><button type="button" class="ghost-btn" disabled>♡ 좋아요</button><button type="button" class="primary-btn" data-go="/${config.route}">${config.title} 목록으로</button></div>
    </article>
  </main>`);
}

export const BOARD_CONFIG = CONFIG;
