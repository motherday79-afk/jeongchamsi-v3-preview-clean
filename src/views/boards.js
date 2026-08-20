import { pageShell } from "./layout.js";
import { getDomain } from "../core/repository.js";

const esc = (v="") => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const labels = { columns:"COLUMN", community:"정뮤니티", news:"정참시 NEWS" };
const routes = { columns:"column", community:"community", news:"news" };

export async function renderBoard(domain){
  const data = await getDomain(domain);
  const items = (data.items||[]).filter(x=>x.published!==false);
  const label = labels[domain] || domain;
  const base = routes[domain] || domain;
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CONTENT</span><h1>${label}</h1><p>관리자에서 등록한 콘텐츠가 이곳에 표시됩니다.</p></section><section class="content-card">${items.length?`<div class="board-list">${items.map(x=>`<article data-route="/${base}/${encodeURIComponent(x.id)}"><div><span>${esc(x.category||label)}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary||"")}</p></div><small>${esc(x.author||"정참시")}</small></article>`).join("")}</div>`:`<div class="empty-state"><h2>등록된 콘텐츠가 없습니다.</h2><p>가짜 데이터를 넣지 않았습니다. 관리자에서 직접 등록하면 즉시 목록에 표시됩니다.</p></div>`}</section></main>`);
}

export async function renderBoardDetail(domain,id){
  const data = await getDomain(domain);
  const item = (data.items||[]).find(x=>String(x.id)===String(id));
  const label = labels[domain] || domain;
  if(!item) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h1>콘텐츠를 찾을 수 없습니다.</h1><p>삭제되었거나 아직 등록되지 않은 콘텐츠입니다.</p><button class="primary-btn" data-route="/${routes[domain]}">목록으로</button></section></main>`);
  return pageShell(`<main class="subpage"><article class="article-detail content-card"><span class="eyebrow">${esc(item.category||label)}</span><h1>${esc(item.title)}</h1><div class="article-meta">${esc(item.author||"정참시")} · 조회 ${item.views||0} · 좋아요 ${item.likes||0}</div>${item.summary?`<p class="article-lead">${esc(item.summary)}</p>`:""}<div class="article-body">${esc(item.body||"").replace(/\n/g,"<br>")}</div><div class="article-actions"><button>♡ 좋아요</button><button data-route="/${routes[domain]}">목록으로</button></div></article></main>`);
}
