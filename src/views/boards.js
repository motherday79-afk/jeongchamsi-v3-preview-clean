import { getDomain, getAuthorProfiles } from "../core/repository.js";
import { pageShell, esc } from "./layout.js?v=alpha6.0.36.23-copy-scroll-hotfix";
import { getUserSession, isPostLiked } from "../core/user.js";
import { authorIdentity, authorOwnerIds } from "./author-identity.js?v=alpha6.0.36.23-copy-scroll-hotfix";
import { renderContentShare } from "./content-share.js?v=jcs-share-v1";

const CONFIG = Object.freeze({
  columns: { title: "COLUMN", eyebrow: "COLUMN", route: "column", description: "정치를 조금 더 깊게 읽는 정참시의 칼럼 공간입니다", image: true, memberWrite: false },
  community: { title: "정뮤니티", eyebrow: "COMMUNITY", route: "community", description: "시민들이 정치 이야기를 직접 작성하고 나누는 정참시 커뮤니티입니다", image: false, memberWrite: true },
  news: { title: "정참시 NEWS", eyebrow: "JEONGCHAMSI NEWS", route: "news", description: "정참시가 모아보는 정치 뉴스와 이슈입니다", image: true, memberWrite: false }
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
  return String(body || "").split(/\n{2,}|\r?\n/).map(x => x.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("") || `<p>본문이 없습니다</p>`;
}

export async function renderBoard(domain, search = "") {
  const config = CONFIG[domain] || CONFIG.community;
  const data = await getDomain(domain);
  const q = String(new URLSearchParams(search || "").get("q") || "").trim();
  const norm = v => String(v || "").toLowerCase().replace(/\s+/g,"");
  const items = published(data.items || []).filter(item => !q || norm(`${item.title||""} ${item.summary||""} ${item.body||""} ${item.category||""} ${item.author||""}`).includes(norm(q)));
  const session = getUserSession();
  const isAdmin = session.authenticated && session.user?.role === "admin";
  const isPartner = session.authenticated && session.user?.role === "partner";
  const canWrite = config.memberWrite ? session.authenticated : (isAdmin || isPartner);
  const authorProfiles = await getAuthorProfiles(authorOwnerIds(items));
  const writeButton = canWrite
    ? `<button class="primary-btn" type="button" data-go="/${config.route}/write">${isAdmin && !config.memberWrite ? "관리자 글 등록" : "글쓰기"}</button>`
    : (config.memberWrite ? `<button class="primary-btn" type="button" data-go="/login">로그인 후 글쓰기</button>` : "");

  return pageShell(`<main class="subpage">
    <section class="page-hero"><span class="eyebrow">${config.eyebrow}</span><h1>${config.title}</h1><p>${config.description}</p></section>
    <section class="content-card">
      <div class="board-toolbar"><p>${isAdmin ? "관리자 권한으로 이 게시판에서 바로 등록·수정·삭제할 수 있습니다" : (isPartner && !config.memberWrite ? "정참시 PARTNER 권한으로 직접 작성하고 내 글을 수정할 수 있습니다" : (config.memberWrite ? "회원이 직접 글을 작성하고 댓글·좋아요로 참여할 수 있습니다" : "관리자가 등록한 게시물을 확인할 수 있습니다"))}</p><div class="inline-actions"><span class="status-pill"><b>${q ? `SEARCH · ${esc(q)}` : "POSTS"}</b>${items.length}개</span>${writeButton}</div></div>
      ${items.length ? `<div class="board-list">${items.map(item => {
        const cover = safeImage(item.coverImage);
        const noThumb = !config.image;
        return `<article class="${noThumb ? "no-thumb" : ""}">${!noThumb ? `<a class="board-thumb" href="/${config.route}/${esc(item.id)}" data-route ${cover ? `style="background-image:url('${cover}')"` : ""}></a>` : ""}<a href="/${config.route}/${esc(item.id)}" data-route><span class="type">${esc(item.category || config.title)}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary || item.body || "")}</p></a><small>${authorIdentity(item.author || "정참시", item.ownerId, authorProfiles)} · ${formatDate(item.createdAt)} · 좋아요 ${Number(item.likes || 0)}</small></article>`;
      }).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">＋</div><h2>아직 등록된 글이 없습니다</h2><p>${isAdmin ? "이 게시판에서 바로 첫 글을 등록할 수 있습니다" : (config.memberWrite ? "로그인 후 첫 게시물을 작성할 수 있습니다" : "아직 등록된 게시물이 없습니다")}</p>${writeButton}</div>`}
    </section>
  </main>`);
}

export async function renderBoardWriter(domain, search = "") {
  const config = CONFIG[domain] || CONFIG.community;
  const session = getUserSession();
  const isAdmin = session.authenticated && session.user?.role === "admin";
  const isPartner = session.authenticated && session.user?.role === "partner";
  const canWrite = config.memberWrite ? session.authenticated : (isAdmin || isPartner);
  if (!canWrite) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>${session.authenticated ? "관리자 권한이 필요합니다" : "로그인이 필요합니다"}</h2><p>${config.memberWrite ? `${config.title} 글쓰기는 회원 기능입니다` : `${config.title} 등록은 관리자 기능입니다`}</p><button class="primary-btn" type="button" data-go="${session.authenticated ? `/${config.route}` : "/login"}">${session.authenticated ? "목록으로" : "로그인"}</button></section></main>`);

  const data = await getDomain(domain);
  const id = new URLSearchParams(search || "").get("id") || "";
  const old = id ? (data.items || []).find(x => String(x.id) === String(id)) : null;
  const owns = old && String(old.ownerId || "") === String(session.user.id);
  if (old && !owns && !isAdmin) return pageShell(`<main class="subpage"><section class="content-card empty-state"><h2>수정 권한이 없습니다</h2><button class="primary-btn" type="button" data-go="/${config.route}">목록으로</button></section></main>`);

  const cover = safeImage(old?.coverImage);
  const communityFields = domain === "community"
    ? `<label>제목<input name="title" maxlength="120" required value="${esc(old?.title || "")}"></label><label>내용<textarea name="body" rows="14" maxlength="50000" required>${esc(old?.body || "")}</textarea></label>`
    : `<label>제목<input name="title" maxlength="120" required value="${esc(old?.title || "")}"></label><label>한 줄 요약<input name="summary" maxlength="240" value="${esc(old?.summary || "")}"></label>${(isAdmin || isPartner) && config.image ? `<label>대표사진<input type="file" accept="image/*" data-cover-input></label><div class="image-uploader"><div class="image-preview" data-cover-preview data-cover-data="${esc(cover)}" ${cover ? `style="background-image:url('${cover}')"` : ""}>${cover ? "" : "대표사진 미리보기"}</div><div class="image-help"><b>권장 1200×675px · 16:9</b><span>PARTNER·관리자가 게시판에서 직접 작성할 때 대표사진을 업로드할 수 있습니다</span></div></div>` : ""}<label>내용<textarea name="body" rows="14" maxlength="50000" required>${esc(old?.body || "")}</textarea></label>`;

  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">WRITE · ${config.eyebrow}</span><h1>${old ? `${config.title} 글 수정` : `${config.title} 글쓰기`}</h1><p>${isAdmin ? "관리자 권한으로 게시판에서 직접 등록·수정합니다" : (isPartner && !config.memberWrite ? "정참시 PARTNER 권한으로 작성하며 본인이 작성한 글만 수정할 수 있습니다" : "제목과 내용만 작성하면 바로 게시됩니다")}</p></section><section class="content-card"><form class="member-post-form" data-user-post-form="${domain}" data-item-id="${esc(old?.id || "")}">${communityFields}<div class="auth-error" data-user-post-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">${old ? "수정 저장" : "등록"}</button><button class="ghost-btn" type="button" data-go="${old ? `/${config.route}/${esc(old.id)}` : `/${config.route}`}">취소</button></div></form></section></main>`);
}

export async function renderBoardDetail(domain, id) {
  const config = CONFIG[domain] || CONFIG.community;
  let data = await getDomain(domain);
  let item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  if (!item) {
    data = await getDomain(domain, { fresh:true });
    item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  }
  if (!item) {
    return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>게시물을 찾을 수 없습니다</h2><p>삭제되었거나 아직 공개되지 않은 게시물입니다</p><button class="primary-btn" type="button" data-go="/${config.route}">${config.title} 목록으로</button></section></main>`);
  }

  const cover = safeImage(item.coverImage);
  const session = getUserSession();
  const liked = session.authenticated && isPostLiked(domain, id);
  const isAdmin = session.authenticated && session.user?.role === "admin";
  const mine = session.authenticated && String(item.ownerId || "") === String(session.user.id);
  const canManage = isAdmin || mine;
  const commentData = await getDomain("comments");
  const comments = (commentData.items || []).filter(c => c.published !== false && c.domain === domain && String(c.postId) === String(id)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const authorProfiles = await getAuthorProfiles(authorOwnerIds([item, ...comments]));

  return pageShell(`<main class="subpage">
    <article class="content-card article-detail article-${esc(domain)}">
      <span class="eyebrow">${config.eyebrow}${item.category ? ` · ${esc(item.category)}` : ""}</span>
      <h1>${esc(item.title)}</h1>
      <div class="article-meta"><span>${authorIdentity(item.author || "정참시", item.ownerId, authorProfiles)}</span><span>${formatDate(item.createdAt)}</span><span>조회 ${Number(item.views || 0)}</span><span>좋아요 ${Number(item.likes || 0)}</span></div>
      ${cover ? `<div class="article-cover" style="background-image:url('${cover}')"></div>` : ""}
      ${item.summary ? `<div class="article-lead">${esc(item.summary)}</div>` : ""}
      <div class="article-body">${bodyHtml(item.body)}</div>
      ${renderContentShare({ title:item.title, path:`/${config.route}/${id}` })}
      <div class="article-actions"><button type="button" class="ghost-btn ${liked ? "active" : ""}" data-post-like="${esc(domain)}" data-post-id="${esc(id)}">${liked ? "♥ 좋아요 취소" : "♡ 좋아요"}</button>${canManage ? `<button type="button" class="ghost-btn" data-go="/${config.route}/write?id=${encodeURIComponent(id)}">수정</button><button type="button" class="danger-btn" data-user-post-delete="${esc(domain)}" data-id="${esc(id)}">삭제</button>` : ""}<button type="button" class="primary-btn" data-go="/${config.route}">${config.title} 목록으로</button></div>
    </article>
    <section class="content-card comment-section"><div class="section-title"><h2>댓글</h2><span>${comments.length}개</span></div>${session.authenticated ? `<form class="comment-form" data-comment-form="${esc(domain)}" data-post-id="${esc(id)}"><textarea name="comment" rows="3" maxlength="1000" placeholder="정치에 대한 의견을 남겨보세요" required></textarea><div class="admin-form-actions"><button class="primary-btn" type="submit">댓글 등록</button><span class="save-state" data-comment-state></span></div></form>` : `<div class="member-login-prompt"><span>댓글과 좋아요는 로그인 후 사용할 수 있습니다</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}${comments.length ? `<div class="comment-list">${comments.map(c => `<article><div><b>${authorIdentity(c.author, c.ownerId, authorProfiles)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p></article>`).join("")}</div>` : `<div class="empty-inline" style="margin-top:12px">아직 작성한 댓글이 없습니다</div>`}</section>
  </main>`);
}

export const BOARD_CONFIG = CONFIG;
