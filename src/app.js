import { startRouter, subscribe, currentRoute, route, syncCurrentScroll } from "./core/router.js";
import { performAction, clearDomainCache, getDomain, saveDomain, submitPoliticianRequest, updatePoliticianRequest, submitPartnerApplication, updatePartnerApplication } from "./core/repository.js";
import {
  initializeUserState, loginUser, registerUser, logoutUser, toggleFavoritePerson,
  togglePostLike, applyAcademy, getUserSession, applyServerActivity, updateMyProfile, setRepresentativeBadge, toggleShowcaseBadge
} from "./core/user.js";

const app = document.querySelector("#app");
let renderEpoch = 0;
let liveBarRotationTimer = 0;
let liveBarCelebrationTimer = 0;
let nowRankRotationTimer = 0;
const viewPrefetchCache = new Map();
const VIEW_PREFETCH_TTL = 20_000;

async function refreshDecisionAdminPerson(personId="") {
  try {
    const view = await import("./views/people.js?v=03686-history-v2-observation-count-jcs-political-intelligence-source-layer-v2-strategic-solution-v1-validity-perf-v1-signal-confidence-v1-age-gender-v2-ui-visible-admin-premium-intelligence-v2-v3-jcs-premium-final-experience-v1-clarity-v1-decision-v1-freedom-detail-v2");
    if (typeof view.refreshAdminDecisionSlot === "function") return view.refreshAdminDecisionSlot(personId);
  } catch {}
  return render(currentRoute(), { resetScroll:false });
}
function stopNowRankRotation(){
  if(nowRankRotationTimer){ clearInterval(nowRankRotationTimer); nowRankRotationTimer=0; }
}
function hydrateHomeNowRank(){
  stopNowRankRotation();
  const carousel=app.querySelector('[data-now-rank-carousel]');
  if(!carousel)return;
  const pages=[...carousel.querySelectorAll('[data-now-rank-page]')];
  if(pages.length<1)return;
  let index=Math.max(0,Math.min(pages.length-1,Number(carousel.dataset.page||0)));
  const status=carousel.querySelector('[data-now-rank-status]');
  const show=next=>{
    index=(next+pages.length)%pages.length;
    carousel.dataset.page=String(index);
    pages.forEach((page,i)=>{page.hidden=i!==index;page.classList.toggle('is-active',i===index);});
    if(status)status.textContent=`${index+1} / ${pages.length}`;
  };
  carousel.querySelector('[data-now-rank-prev]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();show(index-1);});
  carousel.querySelector('[data-now-rank-next]')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();show(index+1);});
  show(index);
  if(pages.length>1)nowRankRotationTimer=setInterval(()=>show(index+1),4000);
}

function prefetchStateFromPath(path="") {
  try { const url=new URL(path,window.location.origin); return { pathname:url.pathname, search:url.search }; } catch { return null; }
}
function viewPrefetchKey(state={}) { return `${state.pathname||"/"}${state.search||""}`; }
function prefetchResolvedView(path="") {
  const state=prefetchStateFromPath(path);if(!state)return Promise.resolve(null);
  const key=viewPrefetchKey(state),now=Date.now(),hit=viewPrefetchCache.get(key);
  if(hit&&now-hit.at<VIEW_PREFETCH_TTL)return hit.promise;
  const promise=Promise.resolve().then(()=>resolveView(state)).catch(error=>{viewPrefetchCache.delete(key);throw error;});
  viewPrefetchCache.set(key,{at:now,promise});
  return promise;
}

function parse(pathname) { return pathname.split("/").filter(Boolean).map(decodeURIComponent); }
function nowFailureText(label, r) {
  const code = String(r?.error || "").trim();
  const detail = String(r?.detail || "").trim();
  return `${label}${code ? ` · ${code}` : ""}${detail && detail !== code ? `\n${detail}` : ""}`;
}
async function resolveView(state) {
  const p = parse(state.pathname);
  if (!p.length) return (await import("./views/home.js?v=03683-history-v2-main-perf-app-return-jcs-clean-rebuild-r1-jcs-plan-a-r1")).renderHome();
  if (["login", "join", "mypage"].includes(p[0])) {
    const view = await import("./views/user.js");
    if (p[0] === "login") return view.renderLogin();
    if (p[0] === "join") return view.renderJoin();
    if (p[1] === "activity") return view.renderMyActivity(state.search);
    if (p[1] === "recent") return view.renderMyRecent();
    if (p[1] === "profile") return view.renderMyProfile();
    if (p[1] === "posts") return view.renderMyPosts(state.search);
    return view.renderMyPage();
  }
  if (p[0] === "person") return (await import("./views/people.js?v=03686-history-v2-observation-count-jcs-political-intelligence-source-layer-v2-strategic-solution-v1-validity-perf-v1-signal-confidence-v1-age-gender-v2-ui-visible-admin-premium-intelligence-v2-v3-jcs-premium-final-experience-v1-clarity-v1-decision-v1-freedom-detail-v2")).renderPersonDetail(p[1] || "");
  if (["column", "community", "news"].includes(p[0])) {
    const view = await import("./views/boards.js?v=jcs-share-v1");
    const domain = p[0] === "column" ? "columns" : p[0];
    if (p[1] === "write") return view.renderBoardWriter(domain, state.search);
    return p[1] ? view.renderBoardDetail(domain, p[1]) : view.renderBoard(domain, state.search);
  }
  if (p[0] === "admin") return (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).renderAdmin();
  if (p[0] === "request-politician") return (await import("./views/participation.js")).renderPoliticianRequest();
  if (p[0] === "partners") return (await import("./views/participation.js")).renderPartners();
  if (p[0] === "about") return (await import("./views/brand.js")).renderAbout();
  if (p[0] === "support") return (await import("./views/brand.js")).renderSupport();
  if (["guide","privacy","policy"].includes(p[0])) return (await import("./views/legal.js")).renderLegal(p[0]);
  const view = await import("./views/features.js?v=03686-jcs-share-v1-admin-multi-compare-inforeghini-jcs-clean-rebuild-r1-admin-premium-intelligence-v2-v3-jcs-premium-final-experience-v1-clarity-v1-decision-v1-freedom-detail-v2");
  if (p[0] === "president") return view.renderPresident();
  if (p[0] === "now") return view.renderNow(state.search);
  if (p[0] === "poll") return view.renderPolls(state.search);
  if (p[0] === "keywords") return view.renderKeywords();
  if (p[0] === "trending") return view.renderTrending();
  if (p[0] === "academy") return view.renderAcademy();
  if (p[0] === "itsme" && p[1] === "write") return view.renderItsmeWrite(state.search);
  if (p[0] === "itsme") return p[1] ? view.renderItsmeDetail(p[1]) : view.renderItsme(state.search);
  if (p[0] === "compare") return view.renderCompare(state.search);
  if (p[0] === "generation-president") return view.renderGeneration(state.search);
  if (p[0] === "national-evaluation") return view.renderNationalEvaluation();
  if (p[0] === "search") return view.renderSearch(new URLSearchParams(state.search).get("q") || "");
  return (await import("./views/home.js?v=03683-history-v2-main-perf-app-return-jcs-clean-rebuild-r1-jcs-plan-a-r1")).renderHome();
}

function currentScrollPoint() {
  return {
    x: Math.max(0, Math.round(window.scrollX || window.pageXOffset || 0)),
    y: Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0))
  };
}

function clampScrollPoint(point = { x:0, y:0 }) {
  const maxX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return {
    x: Math.min(Math.max(0, Number(point.x) || 0), maxX),
    y: Math.min(Math.max(0, Number(point.y) || 0), maxY)
  };
}

function restoreScrollInstant(point) {
  const target = clampScrollPoint(point);
  window.scrollTo(target.x, target.y);
}

function renderLiveBarCelebrations(container, items = []) {
  if (!container) return;
  const rows=(Array.isArray(items)?items:[]).slice(0,6);
  container.replaceChildren(...rows.map((item,index)=>{
    const row=document.createElement("span");
    row.className=`live-community-celebration${index===0?" is-active":""}`;
    row.dataset.livebarCelebration="";
    const who=document.createElement("b"); who.textContent=`${String(item?.nickname||"정참시민")}님께서`;
    const badge=document.createElement("strong"); badge.textContent=String(item?.badgeName||"배지");
    const tail=document.createElement("em"); tail.textContent="배지를 획득하셨습니다.";
    row.append(who,badge,tail);
    return row;
  }));
  container.hidden=!rows.length;
}

async function hydrateLiveCommunityBar() {
  const bar = document.querySelector("[data-livebar]");
  if (!bar) return;
  let data = null;
  if (bar.dataset.memberCount === "") {
    try {
      const response = await fetch("/api/v3/livebar", { credentials:"same-origin" });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body?.data) data = body.data;
    } catch {}
  }
  if (data) {
    const config = { useActualCount:true, overrideCount:0, ...(data.liveBar || {}) };
    const actual = Math.max(0, Number(data.memberCount || 0));
    const count = config.useActualCount !== false ? actual : Math.max(0, Number(config.overrideCount || 0));
    const countEl = bar.querySelector("[data-livebar-count]");
    if (countEl) countEl.textContent = count.toLocaleString("ko-KR");
    bar.dataset.memberCount = String(count);
    const form = bar.querySelector("[data-livebar-admin-form]");
    if (form) {
      const useActual = form.querySelector('[name="useActualCount"]');
      const override = form.querySelector('[name="overrideCount"]');
      if (useActual) useActual.checked = config.useActualCount !== false;
      if (override) override.value = String(Math.max(0, Number(config.overrideCount || 0)));
    }
    if (bar.dataset.celebrationsEnabled === "1") renderLiveBarCelebrations(bar.querySelector("[data-livebar-celebrations]"), data.badgeCelebrations || []);
  }
  if (liveBarRotationTimer) window.clearInterval(liveBarRotationTimer);
  const ctas = Array.from(bar.querySelectorAll("[data-livebar-cta]"));
  if (ctas.length > 1) {
    let activeIndex = Math.max(0, ctas.findIndex(x => x.classList.contains("is-active")));
    liveBarRotationTimer = window.setInterval(() => {
      ctas[activeIndex]?.classList.remove("is-active");
      activeIndex = (activeIndex + 1) % ctas.length;
      ctas[activeIndex]?.classList.add("is-active");
    }, 4200);
  }
  if (liveBarCelebrationTimer) window.clearInterval(liveBarCelebrationTimer);
  const celebrations=Array.from(bar.querySelectorAll("[data-livebar-celebration]"));
  if (celebrations.length > 1) {
    let celebrationIndex=Math.max(0,celebrations.findIndex(x=>x.classList.contains("is-active")));
    liveBarCelebrationTimer=window.setInterval(()=>{
      celebrations[celebrationIndex]?.classList.remove("is-active");
      celebrationIndex=(celebrationIndex+1)%celebrations.length;
      celebrations[celebrationIndex]?.classList.add("is-active");
    },5200);
  }
}

async function render(state = currentRoute(), { resetScroll = true, scrollTarget = null } = {}) {
  const epoch = ++renderEpoch;
  const preserved = scrollTarget || (resetScroll ? { x:0, y:0 } : currentScrollPoint());
  const cacheKey=viewPrefetchKey(state),cached=viewPrefetchCache.get(cacheKey);
  const html = cached && Date.now()-cached.at<VIEW_PREFETCH_TTL ? await cached.promise : await resolveView(state);
  viewPrefetchCache.delete(cacheKey);
  if (epoch !== renderEpoch) return;

  document.documentElement.classList.add("jcv3-route-swapping");
  stopNowRankRotation();
  app.innerHTML = html;
  document.body.classList.remove("drawer-open");

  // Commit DOM + scroll restoration in the same frame so the user never watches
  // the browser travel from the old position to the new one.
  restoreScrollInstant(preserved);

  if (app.querySelector("[data-region-province]")) {
    (await import("./data/regions.js")).hydrateRegionSelectors(app);
    restoreScrollInstant(preserved);
  }

  syncCurrentScroll();
  hydrateLiveCommunityBar();
  if (app.querySelector("[data-now-rank-carousel]")) requestAnimationFrame(hydrateHomeNowRank);
  if (app.querySelector("[data-person-admin-intelligence-slot]")) {
    requestAnimationFrame(() => {
      import("./views/people.js?v=03686-history-v2-observation-count-jcs-political-intelligence-source-layer-v2-strategic-solution-v1-validity-perf-v1-signal-confidence-v1-age-gender-v2-admin-premium-intelligence-v2-v3-jcs-premium-final-experience-v1-clarity-v1-decision-v1-freedom-detail-v2")
        .then(mod => mod.hydratePersonAdminIntelligence?.())
        .catch(() => {});
    });
  }
  requestAnimationFrame(() => document.documentElement.classList.remove("jcv3-route-swapping"));
}
function toggleDrawer(open) {
  const drawer = document.querySelector("[data-drawer]");
  const backdrop = document.querySelector(".drawer-backdrop");
  if (!drawer || !backdrop) return;
  if (open) {
    drawer.hidden = false;
    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      backdrop.classList.add("is-open");
    });
    return;
  }
  drawer.classList.remove("is-open");
  backdrop.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  window.setTimeout(() => {
    if (!drawer.classList.contains("is-open")) drawer.hidden = true;
    if (!backdrop.classList.contains("is-open")) backdrop.hidden = true;
  }, 190);
}

function closeServiceMore() {
  document.querySelectorAll(".service-more[open]").forEach(details => details.removeAttribute("open"));
}
async function rerenderNoScroll(nextActivity = null) { clearDomainCache(); if (nextActivity) applyServerActivity(nextActivity); await render(currentRoute(), { resetScroll: false }); }

document.addEventListener("error", event => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !target.matches("img[data-politician-photo]")) return;
  const shell = target.parentElement;
  target.remove();
  shell?.classList.remove("has-photo");
}, true);

let prefetchIntentTimer=0;
function warmNavigationIntent(target){
  const go=target?.closest?.("[data-go]");
  const to=go?.dataset?.go;if(!to||to==="#")return;
  window.clearTimeout(prefetchIntentTimer);
  prefetchIntentTimer=window.setTimeout(()=>{
    prefetchResolvedView(to).catch(()=>{});
    import("./core/instant-prefetch.js?v=admin-multi-compare-inforeghini").then(({prefetchRoute})=>prefetchRoute(to)).catch(()=>{});
  },24);
}
document.addEventListener("pointerover",event=>warmNavigationIntent(event.target),{passive:true});
document.addEventListener("pointerdown",event=>warmNavigationIntent(event.target),{passive:true});
document.addEventListener("focusin",event=>warmNavigationIntent(event.target));

document.addEventListener("click", async event => {
  const insideMore = event.target.closest(".service-more");
  if (!insideMore) closeServiceMore();


  const decisionCaseCreate = event.target.closest("[data-decision-case-create]");
  if (decisionCaseCreate) {
    const personId=String(decisionCaseCreate.dataset.personId||"");
    const shell=decisionCaseCreate.closest("[data-decision-war-room]");
    const note=shell?.querySelector("[data-decision-case-note]")?.value||"";
    const state=shell?.querySelector("[data-decision-write-state]");
    decisionCaseCreate.disabled=true;if(state)state.textContent="CASE 저장 중";
    const repo=await import("./core/decision-repository.js?v=decision-v1");
    const r=await repo.createAdminDecisionCase(personId,note);
    if(!r.ok){decisionCaseCreate.disabled=false;if(state)state.textContent=`CASE 저장 실패 · ${r.error||""}`;return;}
    if(state)state.textContent="현재 판단을 CASE로 저장했습니다.";
    await refreshDecisionAdminPerson(personId);return;
  }
  const decisionCaseClose = event.target.closest("[data-decision-case-close]");
  if (decisionCaseClose) {
    const personId=String(decisionCaseClose.dataset.personId||"");
    decisionCaseClose.disabled=true;
    const repo=await import("./core/decision-repository.js?v=decision-v1");
    const r=await repo.closeAdminDecisionCase(decisionCaseClose.dataset.decisionCaseClose||"");
    if(!r.ok){decisionCaseClose.disabled=false;alert(`CASE 종료 실패 · ${r.error||""}`);return;}
    await refreshDecisionAdminPerson(personId);return;
  }

  const detailPhotoTrigger = event.target.closest("[data-detail-politician-photo-trigger]");
  if (detailPhotoTrigger) {
    const form = detailPhotoTrigger.closest("[data-detail-politician-photo-form]");
    const input = form?.querySelector("[data-politician-photo-input]");
    if (input) input.click();
    return;
  }

  const detailPhotoShell = event.target.closest("[data-detail-photo-shell].admin-photo-editable");
  if (detailPhotoShell && !event.target.closest("button,input,a")) {
    const input = detailPhotoShell.querySelector("[data-politician-photo-input]");
    if (input) input.click();
    return;
  }

  const adminCompareRemove = event.target.closest("[data-admin-compare-remove]");
  if (adminCompareRemove) {
    const state=currentRoute(),params=new URLSearchParams(state.search||"");
    const removeId=String(adminCompareRemove.dataset.adminCompareRemove||"");
    const ids=params.getAll("p").filter(id=>id&&id!==removeId).slice(0,5);
    const query=new URLSearchParams();ids.forEach(id=>query.append("p",id));
    return route(`/compare${query.toString()?`?${query}`:""}`);
  }

  const quickSelect = event.target.closest("[data-person-quick-option]");
  if (quickSelect) {
    const select = document.querySelector(quickSelect.dataset.selectTarget || "");
    const input = document.querySelector(quickSelect.dataset.inputTarget || "");
    const results = quickSelect.closest(".person-quick-results");
    if (select) { select.value = quickSelect.dataset.personQuickOption || ""; select.dispatchEvent(new Event("change", { bubbles:true })); }
    if (input) input.value = quickSelect.dataset.label || quickSelect.textContent.trim();
    if (results) results.hidden = true;
    return;
  }
  const generationAdd = event.target.closest("[data-generation-add-row]");
  if (generationAdd) {
    const section = generationAdd.closest("[data-generation-age]");
    const rows = section?.querySelector(".generation-admin-rows");
    const form = generationAdd.closest("[data-generation-admin-form]");
    const datalistId = form?.querySelector("datalist")?.id || "";
    if (rows) {
      const tools = await import("./views/generation-admin.js");
      rows.insertAdjacentHTML("beforeend", tools.newGenerationAdminRowHtml(datalistId));
    }
    return;
  }
  const generationRemove = event.target.closest("[data-generation-remove-row]");
  if (generationRemove) {
    const row = generationRemove.closest("[data-generation-admin-row]");
    const rows = row?.parentElement;
    if (row && rows) {
      if (rows.querySelectorAll("[data-generation-admin-row]").length === 1) {
        row.querySelector(".generation-admin-person").value = "";
        row.querySelector(".generation-admin-votes").value = "0";
        row.dataset.personId = "";
      } else row.remove();
    }
    return;
  }
  const generationLive = event.target.closest("[data-generation-live-mode]");
  if (generationLive) {
    generationLive.disabled = true;
    const tools = await import("./views/generation-admin.js");
    const r = await tools.useLiveGenerationResults();
    if (!r.ok) { generationLive.disabled = false; alert(`전환 실패 · ${r.error || "저장소 오류"}`); return; }
    clearDomainCache("generation");
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const nationalLive = event.target.closest("[data-national-live-mode]");
  if (nationalLive) {
    nationalLive.disabled = true;
    const tools = await import("./views/national-evaluation-admin.js");
    const r = await tools.useLiveNationalEvaluationResults();
    if (!r.ok) { nationalLive.disabled = false; alert(`전환 실패 · ${r.error || "저장소 오류"}`); return; }
    clearDomainCache("nationalEvaluation");
    await render(currentRoute(), { resetScroll:false });
    return;
  }

  const nationalClose = event.target.closest("[data-national-evaluation-close]");
  if (nationalClose) {
    const slotKey = String(nationalClose.dataset.slotKey || "");
    if (!confirm("이 평가를 종료할까요? 현재 결과는 지난 평가 이력에 보존됩니다.")) return;
    nationalClose.disabled = true;
    const tools = await import("./views/national-evaluation-admin.js");
    const r = await tools.closeNationalEvaluationSlot(slotKey);
    if (!r.ok) { nationalClose.disabled = false; alert(`평가 종료 실패 · ${r.error || "저장소 오류"}`); return; }
    clearDomainCache("nationalEvaluation");
    await render(currentRoute(), { resetScroll:false });
    return;
  }

  const nowMore = event.target.closest("[data-now-load-more]");
  if (nowMore) {
    if (nowMore.disabled) return;
    nowMore.disabled = true;
    const tools = await import("./views/features.js?v=03686-jcs-share-v1-admin-multi-compare-inforeghini-jcs-clean-rebuild-r1-admin-premium-intelligence-v2-v3-jcs-premium-final-experience-v1-clarity-v1-decision-v1-freedom-detail-v2");
    const r = await tools.appendNowRankMore(nowMore);
    if (!r?.ok) {
      nowMore.disabled = false;
      alert("정치인 목록을 더 불러오지 못했습니다");
    }
    return;
  }
  const shareButton = event.target.closest("[data-content-share]");
  if (shareButton) {
    const panel = shareButton.closest("[data-content-share-panel]");
    const state = panel?.querySelector("[data-content-share-state]");
    shareButton.disabled = true;
    if (state) state.textContent = "";
    try {
      const { shareContent } = await import("./core/content-share.js?v=jcs-share-v1");
      const result = await shareContent({
        platform: shareButton.dataset.contentShare || "copy",
        title: panel?.dataset.shareTitle || document.title || "정참시",
        path: panel?.dataset.sharePath || window.location.pathname
      });
      if (state && !result?.cancelled) state.textContent = result?.message || (result?.ok ? "공유 작업을 완료했습니다." : "공유하지 못했습니다.");
    } catch {
      if (state) state.textContent = "공유 기능을 실행하지 못했습니다.";
    } finally {
      shareButton.disabled = false;
    }
    return;
  }
  const go = event.target.closest("[data-go]");
  if (go) { const to = go.dataset.go; if (to && to !== "#") route(to); return; }
  if (event.target.closest("[data-drawer-open]")) return toggleDrawer(true);
  if (event.target.closest("[data-drawer-close]")) return toggleDrawer(false);
  if (event.target.closest("[data-user-logout]")) { await logoutUser(); route("/", { replace: true }); return render(currentRoute()); }

  const favorite = event.target.closest("[data-person-favorite]");
  if (favorite) { const r = await toggleFavoritePerson(favorite.dataset.personFavorite); if (r.requiresLogin) return route("/login"); if (!r.ok) alert("즐겨찾기 저장에 실패했습니다"); else await render(currentRoute(), { resetScroll: false }); return; }
  const like = event.target.closest("[data-post-like]");
  if (like) {
    if (!getUserSession().authenticated) return route("/login");
    const wasActive = like.classList.contains("active");
    like.classList.toggle("active", !wasActive);
    like.textContent = wasActive ? "♡ 좋아요" : "♥ 좋아요 취소";
    like.disabled = true;
    const r = await togglePostLike(like.dataset.postLike, like.dataset.postId);
    if (!r.ok) {
      like.classList.toggle("active", wasActive);
      like.textContent = wasActive ? "♥ 좋아요 취소" : "♡ 좋아요";
      like.disabled = false;
      alert("좋아요 저장에 실패했습니다");
    } else await rerenderNoScroll();
    return;
  }
  const academy = event.target.closest("[data-academy-apply]");
  if (academy) { if (!getUserSession().authenticated) return route("/login"); const r = await applyAcademy(academy.dataset.academyApply); if (!r.ok) alert("신청 저장에 실패했습니다"); else await render(currentRoute(), { resetScroll: false }); return; }
  const pollSelect = event.target.closest("[data-poll-select]");
  if (pollSelect) {
    const scope = pollSelect.closest("[data-poll-scope]");
    if (!scope || pollSelect.disabled) return;
    scope.dataset.selectedOption = pollSelect.dataset.optionId || "";
    scope.querySelectorAll("[data-poll-select]").forEach(button => {
      const selected = button === pollSelect;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const confirmButton = scope.querySelector("[data-poll-confirm]");
    const stateLabel = scope.querySelector("[data-poll-select-state]");
    if (confirmButton) confirmButton.disabled = false;
    if (stateLabel) stateLabel.textContent = "선택 완료 · 확인을 누르면 투표됩니다";
    return;
  }
  const pollConfirm = event.target.closest("[data-poll-confirm]");
  if (pollConfirm) {
    const scope = pollConfirm.closest("[data-poll-scope]");
    const optionId = scope?.dataset.selectedOption || "";
    const pollId = scope?.dataset.pollId || "";
    if (!optionId || !pollId) return;
    if (!getUserSession().authenticated) return route("/login");
    pollConfirm.disabled = true;
    const r = await performAction("poll-vote", { pollId, optionId });
    if (!r.ok) {
      pollConfirm.disabled = false;
      alert(r.error === "ALREADY_VOTED" ? "이미 참여한 설문입니다" : "투표 저장에 실패했습니다");
      return;
    }
    await rerenderNoScroll(r.activity);
    return;
  }
  const delUser = event.target.closest("[data-user-post-delete]");
  if (delUser) { if (!confirm("이 글을 삭제할까요?")) return; const domain = delUser.dataset.userPostDelete; const r = await performAction("user-post-delete", { domain, id: delUser.dataset.id }); if (!r.ok) return alert(`삭제하지 못했습니다. ${r.error || ""}`); clearDomainCache(); const target = { itsme:"/itsme", community:"/community", columns:"/column", news:"/news" }[domain] || "/"; route(target, { replace: true }); return; }

  const badgeRepresentative = event.target.closest("[data-badge-representative]");
  if (badgeRepresentative) {
    badgeRepresentative.disabled = true;
    const r = await setRepresentativeBadge(badgeRepresentative.dataset.badgeRepresentative || "");
    if (!r.ok) { badgeRepresentative.disabled = false; alert(r.error === "BADGE_LOCKED" ? "아직 획득하지 않은 배지입니다" : "대표 배지를 저장하지 못했습니다"); return; }
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const badgeShowcase = event.target.closest("[data-badge-showcase]");
  if (badgeShowcase) {
    badgeShowcase.disabled = true;
    const r = await toggleShowcaseBadge(badgeShowcase.dataset.badgeShowcase || "");
    if (!r.ok) {
      badgeShowcase.disabled = false;
      const messages = { BADGE_LOCKED:"아직 획득하지 않은 배지입니다", BADGE_IS_REPRESENTATIVE:"대표 배지는 첫 번째 칸에 이미 표시됩니다", BADGE_SHOWCASE_FULL:"사이드바 전시 배지는 3개까지 선택할 수 있습니다" };
      alert(messages[r.error] || "전시 배지를 저장하지 못했습니다");
      return;
    }
    await render(currentRoute(), { resetScroll:false });
    return;
  }

  const requestStatus = event.target.closest("[data-politician-request-status]");
  if (requestStatus) {
    requestStatus.disabled = true;
    const r = await updatePoliticianRequest(requestStatus.dataset.requestId || "", requestStatus.dataset.politicianRequestStatus || "requested");
    if (!r.ok) { requestStatus.disabled = false; alert(`상태 변경 실패 · ${r.error || ""}`); return; }
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const partnerStatus = event.target.closest("[data-partner-status]");
  if (partnerStatus) {
    partnerStatus.disabled = true;
    const id = partnerStatus.dataset.partnerId || "";
    const note = document.querySelector(`[data-partner-review-note="${CSS.escape(id)}"]`)?.value || "";
    const r = await updatePartnerApplication(id, partnerStatus.dataset.partnerStatus || "reviewing", note);
    if (!r.ok) { partnerStatus.disabled = false; alert(`처리 실패 · ${r.error || ""}`); return; }
    await initializeUserState();
    await render(currentRoute(), { resetScroll:false });
    return;
  }

  const nowRefresh = event.target.closest("[data-now-refresh]");
  if (nowRefresh) {
    nowRefresh.disabled = true;
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).runNowDataRefresh();
    if (!r.ok) {
      const groups = r.missingGroups || [];
      const need = [groups.includes('searchAds') ? '네이버 검색량' : '', groups.includes('news') ? '네이버 뉴스' : ''].filter(Boolean).join(' + ');
      alert(r.error === 'NAVER_CONFIG_REQUIRED' ? `NOW 새로고침 준비 필요 · ${need || '네이버 데이터 연결'} 연결이 필요합니다.` : nowFailureText("NOW 새로고침 실패", r));
    }
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const nowRetry = event.target.closest("[data-now-retry]");
  if (nowRetry) {
    nowRetry.disabled = true;
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).retryNowDataFailures();
    if (!r.ok) alert(`오류 재수집 실패 · ${r.error || ""}`);
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const nowFinalize = event.target.closest("[data-now-finalize]");
  if (nowFinalize) {
    nowFinalize.disabled = true;
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).finalizeNowData();
    if (!r.ok) alert(`순위 계산 실패 · ${r.error || ""}`);
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const nowPublish = event.target.closest("[data-now-publish]");
  if (nowPublish) {
    if (!confirm("현재 NOW 데이터 미리보기를 공개 스냅샷으로 게시할까요?")) return;
    nowPublish.disabled = true;
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).publishNowData();
    if (!r.ok) alert(nowFailureText("NOW 게시 실패", r));
    else clearDomainCache();
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const historyCaptureCurrent = event.target.closest("[data-history-capture-current]");
  if (historyCaptureCurrent) {
    if (!confirm("현재 공개 중인 542명 NOW 분석을 HISTORY V2의 첫 FULL SNAPSHOT으로 보존할까요? 외부 데이터 새로고침은 하지 않습니다.")) return;
    historyCaptureCurrent.disabled = true;
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).captureHistoryCurrent();
    if (!r.ok) alert(`현재 기준점 보존 실패 · ${r.error || ""}`);
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const historySearchPerson = event.target.closest("[data-history-search-person]");
  if (historySearchPerson) {
    const id = String(historySearchPerson.dataset.historySearchPerson || "").trim();
    if (!id) return;
    const range = new URLSearchParams(location.search).get("range") || "30";
    route(`/admin?tab=history&person=${encodeURIComponent(id)}&range=${encodeURIComponent(range)}`);
    return;
  }

  const historyBackfill = event.target.closest("[data-history-backfill]");
  if (historyBackfill) {
    if (!confirm("과거 NOW 데이터를 HISTORY에 백필할까요? 정식 immutable Snapshot과 중복되는 관측점은 자동 제외됩니다.")) return;
    historyBackfill.disabled = true;
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).runHistoryBackfill();
    if (!r.ok) alert(`HISTORY Backfill 실패 · ${r.error || ""}`);
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  const politicianPhotoCoverage = event.target.closest("[data-politician-photo-coverage-load]");
  if (politicianPhotoCoverage) {
    event.preventDefault();
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).loadPoliticianPhotoCoverageDiagnostic(politicianPhotoCoverage);
    if (!r?.ok) alert(`사진 노출 진단 실패 · ${r?.error || "오류"}`);
    return;
  }
  const add = event.target.closest("[data-admin-new]"); if (add) return route(`/admin?tab=${encodeURIComponent(add.dataset.adminNew)}&edit=new`);
  const edit = event.target.closest("[data-admin-edit]"); if (edit) return route(`/admin?tab=${encodeURIComponent(edit.dataset.adminEdit)}&edit=${encodeURIComponent(edit.dataset.id)}`);
  const cancel = event.target.closest("[data-admin-cancel]"); if (cancel) return route(`/admin?tab=${encodeURIComponent(cancel.dataset.domain)}`);
  const del = event.target.closest("[data-admin-delete]");
  if (del) { if (!confirm("이 항목을 삭제할까요?")) return; const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).deleteAdminItem(del.dataset.adminDelete, del.dataset.id); if (!r.ok) alert(`삭제 실패: ${r.error || "저장소 오류"}`); else { clearDomainCache(); await render(currentRoute(), { resetScroll: false }); } return; }
  const member = event.target.closest("[data-member-access]");
  if (member) {
    const id = member.dataset.memberAccess;
    const row = member.closest("[data-member-row]");
    const val = key => row?.querySelector(`[data-member-${key}="${CSS.escape(id)}"]`)?.value || "";
    const patch = {
      role: val("role") || "member",
      status: val("status") || "active",
      suspendDays: Number(val("days") || 0),
      suspensionReason: val("reason"),
      name: val("name"),
      nickname: val("nickname"),
      region: val("region"),
      preferredParty: val("party"),
      email: val("email"),
      phone: val("phone"),
      birthYear: val("birth"),
      password: val("password"),
      grantedBadges: Array.from(row?.querySelectorAll(`[data-member-badge="${CSS.escape(id)}"]:checked`) || []).map(input => input.value)
    };
    const st = row?.querySelector(`[data-member-save-state="${CSS.escape(id)}"]`);
    const messages = { WEAK_PASSWORD:"비밀번호는 8자 이상이어야 합니다", INVALID_BIRTH_YEAR:"출생연도를 확인해 주세요", LAST_ADMIN_PROTECTED:"마지막 활성 관리자는 정지하거나 일반회원으로 변경할 수 없습니다" };
    member.disabled = true;
    if (st) { st.textContent = "저장 중…"; st.classList.remove("is-success","is-error"); }
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).updateMemberAccess(id, patch);
    member.disabled = false;
    if (r.ok) {
      if (st) { st.textContent = "✓ 저장 완료"; st.classList.add("is-success"); }
      if (String(getUserSession().user?.id || "") === String(id)) await initializeUserState();
    } else if (st) {
      st.textContent = `저장 실패 · ${messages[r.error] || r.error || ""}`;
      st.classList.add("is-error");
    }
    return;
  }
});

document.addEventListener("input", async event => {
  const brandHeroForm = event.target.closest('[data-admin-form="brand-settings"]');
  if (brandHeroForm) (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).syncBrandHeroPreview(brandHeroForm);
  const search = event.target.closest("[data-member-search]");
  if (search) { const q = String(search.value || "").trim().toLowerCase(); document.querySelectorAll("[data-member-row]").forEach(row => row.hidden = !!q && !String(row.dataset.memberSearchText || "").includes(q)); }
  const historySearch = event.target.closest("[data-history-search-input]");
  if (historySearch) {
    const results = document.querySelector("[data-history-search-results]");
    const source = document.querySelector("[data-history-search-source]");
    if (results && source) {
      const normalize = value => String(value || "").trim().toLowerCase().replace(/\s+/g, "");
      const q = normalize(historySearch.value);
      const items = Array.from(source.querySelectorAll("[data-history-search-item]"));
      const matches = q ? items.filter(item => normalize(item.dataset.historySearchText).includes(q)).slice(0,8) : [];
      const buttons = matches.map(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.historySearchPerson = String(item.dataset.historySearchId || "");
        button.dataset.historySearchText = String(item.dataset.historySearchText || "");
        const copy = document.createElement("span");
        const name = document.createElement("b"); name.textContent = String(item.dataset.historySearchName || "정치인");
        const meta = document.createElement("small"); meta.textContent = String(item.dataset.historySearchMeta || "");
        const arrow = document.createElement("em"); arrow.textContent = "HISTORY →";
        copy.append(name, meta); button.append(copy, arrow); return button;
      });
      results.replaceChildren(...buttons);
      results.hidden = !buttons.length;
    }
  }
  const quickSearch = event.target.closest("[data-person-quick-search]");
  if (quickSearch) {
    const select = document.querySelector(quickSearch.dataset.personQuickSearch || "");
    const results = document.querySelector(quickSearch.dataset.personQuickResults || "");
    if (select && results) {
      const q = String(quickSearch.value || "").trim().toLowerCase().replace(/\s+/g,"");
      const options = Array.from(select.options).slice(1);
      const matches = q ? options.filter(opt => `${opt.textContent || ""} ${opt.value || ""}`.toLowerCase().replace(/\s+/g,"").includes(q)).slice(0,6) : [];
      results.innerHTML = matches.map(opt => `<button type="button" data-person-quick-option="${String(opt.value).replace(/"/g,"&quot;")}" data-label="${String(opt.textContent||"").replace(/"/g,"&quot;")}" data-select-target="${quickSearch.dataset.personQuickSearch}" data-input-target="#${quickSearch.id}"><b>${opt.textContent}</b><span>바로 선택</span></button>`).join("");
      results.hidden = !matches.length;
    }
  }
  const personFilter = event.target.closest("[data-person-select-filter]");
  if (personFilter) {
    const select = document.querySelector(personFilter.dataset.personSelectFilter || "");
    if (select) {
      const q = String(personFilter.value || "").trim().toLowerCase();
      Array.from(select.options).forEach((opt, i) => { if (i) opt.hidden = !!q && !String(opt.textContent || "").toLowerCase().includes(q) && !String(opt.value || "").toLowerCase().includes(q); });
      const first = Array.from(select.options).find((opt, i) => i && !opt.hidden);
      if (q && first && !select.value) first.scrollIntoView?.({ block: "nearest" });
    }
  }
  const pushForm = event.target.closest("[data-push-form]");
  if (pushForm) {
    const title = pushForm.querySelector('[name="title"]')?.value || "정참시";
    const body = pushForm.querySelector('[name="body"]')?.value || "";
    const preview = pushForm.querySelector("[data-push-preview]");
    if (preview) {
      const t = preview.querySelector("[data-push-preview-title]");
      const b = preview.querySelector("[data-push-preview-body]");
      if (t) t.textContent = title;
      if (b) b.textContent = body;
    }
  }
  const pushImage = event.target.closest("[data-push-image-input]");
  if (pushImage?.files?.[0]) {
    try {
      const form = pushImage.closest("[data-push-form]");
      const holder = form?.querySelector("[data-push-image-preview]");
      const url = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).preparePushImage(pushImage.files[0], holder);
      const visual = form?.querySelector("[data-push-preview-image]");
      if (visual) { visual.hidden = false; visual.style.backgroundImage = `url('${url}')`; }
    } catch (e) { alert(e.message || "푸시 이미지 처리 실패"); pushImage.value = ""; }
  }
  const cover = event.target.closest("[data-cover-input]");
  if (cover?.files?.[0]) { try { await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).prepareCoverPreview(cover.files[0], cover.closest("form")?.querySelector("[data-cover-preview]")); } catch (e) { alert(e.message || "이미지 처리 실패"); cover.value = ""; } }
  const profile = event.target.closest("[data-profile-input]");
  if (profile?.files?.[0]) { try { await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).prepareProfilePreview(profile.files[0], profile.closest("form")?.querySelector("[data-profile-preview]")); } catch (e) { alert(e.message || "이미지 처리 실패"); profile.value = ""; } }
});

document.addEventListener("change", async event => {
  const brandHeroForm = event.target.closest('[data-admin-form="brand-settings"]');
  if (brandHeroForm) (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).syncBrandHeroPreview(brandHeroForm);
  const politicianPhoto = event.target.closest("[data-politician-photo-input]");
  if (politicianPhoto?.files?.[0]) {
    try {
      const form = politicianPhoto.closest("[data-politician-photo-form]");
      const tools = await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1");
      tools.preparePoliticianPhotoPreview(politicianPhoto.files[0], form?.querySelector("[data-politician-photo-preview]"), form?.querySelector("[data-politician-photo-state]"));
      const saveButton = form?.querySelector("[data-politician-photo-save]");
      if (saveButton) saveButton.disabled = false;
    } catch (e) {
      alert(e.message || "이미지 처리 실패");
      politicianPhoto.value = "";
      const form = politicianPhoto.closest("[data-politician-photo-form]");
      const saveButton = form?.querySelector("[data-politician-photo-save]");
      if (saveButton) saveButton.disabled = true;
      return;
    }
  }
  const adminCompareAdd = event.target.closest('[data-admin-compare-add]');
  if (adminCompareAdd && adminCompareAdd.value) {
    const state=currentRoute(),params=new URLSearchParams(state.search||"");
    const existing=params.getAll('p').filter(Boolean);
    if(!existing.length)existing.push(params.get('a'),params.get('b'));
    const ids=[...new Set([...existing,String(adminCompareAdd.value)].filter(Boolean))].slice(0,5);
    const query=new URLSearchParams();ids.forEach(id=>query.append('p',id));
    import("./core/instant-prefetch.js?v=admin-multi-compare-inforeghini-admin-premium-intelligence-v2-v3-jcs-premium-final-experience-v1-clarity-v1-decision-v1").then(({prefetchCompareSelection})=>prefetchCompareSelection(ids)).catch(()=>{});
    return route(`/compare?${query.toString()}`);
  }
  const compareSelect = event.target.closest('[data-compare-form] select');
  if (compareSelect) {
    const form=compareSelect.closest('[data-compare-form]');
    const fd=new FormData(form);
    const ids=[...new Set([...fd.getAll('p'),fd.get('a'),fd.get('b')].map(x=>String(x||'').trim()).filter(Boolean))].slice(0,5);
    import("./core/instant-prefetch.js?v=admin-multi-compare-inforeghini").then(({prefetchCompareSelection})=>prefetchCompareSelection(ids)).catch(()=>{});
  }
  const region = event.target.closest("[data-region-province],[data-region-city]");
  if (region) (await import("./data/regions.js")).handleRegionChange(region);
});

document.addEventListener("submit", async event => {
  const form = event.target;
  if (form.matches("[data-decision-action-form]")) {
    event.preventDefault();const fd=new FormData(form);const state=form.querySelector("[data-decision-action-state]");
    const repo=await import("./core/decision-repository.js?v=decision-v1");
    const r=await repo.addAdminDecisionAction({caseId:fd.get("caseId"),occurredAt:fd.get("occurredAt"),type:fd.get("type"),title:fd.get("title"),note:fd.get("note"),linkedPriorityRank:fd.get("linkedPriorityRank")});
    if(!r.ok){if(state)state.textContent=`행동 기록 실패 · ${r.error||""}`;return;}
    if(state)state.textContent="행동 기록 저장 완료";await refreshDecisionAdminPerson(form.dataset.personId||"");return;
  }
  if (form.matches("[data-decision-action-note-form]")) {
    event.preventDefault();const fd=new FormData(form);const state=form.querySelector("[data-decision-action-note-state]");
    const repo=await import("./core/decision-repository.js?v=decision-v1");
    const r=await repo.updateAdminDecisionActionNote(form.dataset.actionId||"",fd.get("note")||"");
    if(!r.ok){if(state)state.textContent=`메모 저장 실패 · ${r.error||""}`;return;}
    if(state)state.textContent="메모 저장 완료";await refreshDecisionAdminPerson(form.dataset.personId||"");return;
  }
  if (form.matches("[data-search-form]")) { event.preventDefault(); const fd = new FormData(form); return route(`/search?q=${encodeURIComponent(String(fd.get("q") || ""))}`); }
  if (form.matches("[data-user-login]")) { event.preventDefault(); const fd = new FormData(form); const r = await loginUser(fd.get("id"), fd.get("password")); const e = form.querySelector("[data-user-auth-error]"); if (!r.ok) { if (e) e.textContent = r.error || "로그인 실패"; return; } await initializeUserState(); if (!getUserSession().authenticated) { if (e) e.textContent = "로그인 세션을 저장하지 못했습니다. 다시 시도해 주세요"; return; } route("/mypage", { replace: true }); return; }
  if (form.matches("[data-user-join]")) { event.preventDefault(); const fd = new FormData(form); if (fd.get("password") !== fd.get("passwordConfirm")) { const e=form.querySelector("[data-user-auth-error]"); if(e)e.textContent="비밀번호 확인이 일치하지 않습니다"; return; } const r = await registerUser(Object.fromEntries(fd.entries())); const e=form.querySelector("[data-user-auth-error]"); if(!r.ok){if(e)e.textContent=r.error||"회원가입 실패";return;} route("/mypage",{replace:true}); return; }
  if (form.matches("[data-user-profile-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await updateMyProfile(Object.fromEntries(fd.entries())); const st=form.querySelector("[data-user-profile-state]"); if(!r.ok){if(st)st.textContent=`저장 실패 · ${r.error||""}`;return;} if(st)st.textContent="저장 완료"; await render(currentRoute(), { resetScroll:false }); return; }
  if (form.matches("[data-first-admin-setup]")) { event.preventDefault(); const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).submitFirstAdmin(form); const e = form.querySelector("[data-admin-setup-error]"); if (!r.ok) { if (e) e.textContent = r.error || "관리자 생성 실패"; return; } route("/admin", { replace: true }); await render(currentRoute()); return; }
  if (form.matches("[data-politician-request-form]")) { event.preventDefault(); const fd=new FormData(form); const r=await submitPoliticianRequest(fd.get("name")); const st=form.querySelector("[data-politician-request-state]"); if(!r.ok){if(st)st.textContent=r.error==="USER_LOGIN_REQUIRED"?"로그인이 필요합니다":"등록하지 못했습니다";return;} form.reset(); if(st)st.textContent="등록 요청 완료"; await render(currentRoute(),{resetScroll:false}); return; }
  if (form.matches("[data-partner-application-form]")) { event.preventDefault(); const fd=new FormData(form); const r=await submitPartnerApplication({contact:fd.get("contact"),message:fd.get("message")}); const st=form.querySelector("[data-partner-application-state]"); if(!r.ok){const msg={APPLICATION_PENDING:"이미 검토 중인 신청이 있습니다",APPLICATION_TOO_SHORT:"신청 내용을 조금 더 자세히 적어주세요"};if(st)st.textContent=msg[r.error]||`신청 실패 · ${r.error||""}`;return;} if(st)st.textContent="비밀 신청이 접수되었습니다"; await render(currentRoute(),{resetScroll:false}); return; }
    if (form.matches("[data-user-post-form]")) { event.preventDefault(); const fd = new FormData(form); const domain = form.dataset.userPostForm; const coverImage = form.querySelector("[data-cover-preview]")?.dataset.coverData || ""; const r = await performAction("user-post-save", { domain, id: form.dataset.itemId || "", title: fd.get("title"), summary: fd.get("summary"), category: fd.get("category"), body: fd.get("body"), coverImage }); const e=form.querySelector("[data-user-post-error]"); if(!r.ok){ const messages={ ITSME_TITLE_TOO_LONG:"IT’S ME 제목은 30자까지 입력할 수 있습니다", ITSME_SUMMARY_TOO_LONG:"IT’S ME 요약은 15자까지 입력할 수 있습니다", ITSME_BODY_TOO_LONG:"IT’S ME 내용은 3,000자까지 입력할 수 있습니다" }; if(e)e.textContent=messages[r.error]||`저장 실패 · ${r.error||""}`;return;} clearDomainCache(); const base = { itsme:"itsme", community:"community", columns:"column", news:"news" }[domain] || "community"; route(`/${base}/${r.item.id}`, { replace: true }); return; }
  if (form.matches("[data-comment-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("comment-add", { domain: form.dataset.commentForm, postId: form.dataset.postId, text: fd.get("comment") }); const st=form.querySelector("[data-comment-state]"); if(!r.ok){if(st)st.textContent=`등록 실패 · ${r.error||""}`;return;} clearDomainCache("comments"); form.reset(); await render(currentRoute(), { resetScroll: false }); return; }
  if (form.matches("[data-compare-form]")) {
    event.preventDefault();
    const fd = new FormData(form);
    if (form.dataset.compareMode === "admin") {
      const ids=[...new Set(fd.getAll("p").map(x=>String(x||"").trim()).filter(Boolean))].slice(0,5);
      if(ids.length<2){ alert("최소 2명의 정치인을 선택해주세요."); return; }
      const query=new URLSearchParams();ids.forEach(id=>query.append("p",id));
      import("./core/instant-prefetch.js?v=admin-multi-compare-inforeghini").then(({prefetchCompareSelection})=>prefetchCompareSelection(ids)).catch(()=>{});
      return route(`/compare?${query.toString()}`);
    }
    return route(`/compare?a=${encodeURIComponent(fd.get("a"))}&b=${encodeURIComponent(fd.get("b"))}`);
  }
  if (form.matches("[data-generation-admin-form]")) {
    event.preventDefault();
    const tools = await import("./views/generation-admin.js");
    const r = await tools.saveGenerationAdminForm(form);
    const st = form.querySelector("[data-generation-admin-state]");
    if (!r.ok) { if (st) st.textContent = `저장 실패 · ${r.error || "저장소 오류"}`; return; }
    if (st) st.textContent = "저장 완료 · 시연 수치 적용됨";
    clearDomainCache("generation");
    setTimeout(() => render(currentRoute(), { resetScroll:false }), 120);
    return;
  }
  if (form.matches("[data-generation-vote-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("generation-vote", { ageGroup: fd.get("ageGroup"), personId: fd.get("personId") }); const st=form.querySelector("[data-generation-vote-state]"); if(!r.ok){if(st)st.textContent=r.error==="ALREADY_VOTED"?"이 세대 투표에 이미 참여했습니다":`투표 실패 · ${r.error||""}`;return;} await rerenderNoScroll(r.activity); return; }
  if (form.matches("[data-national-admin-form]")) {
    event.preventDefault();
    const tools = await import("./views/national-evaluation-admin.js");
    const r = await tools.saveNationalEvaluationAdminForm(form);
    const st = form.querySelector("[data-national-admin-state]");
    if (!r.ok) { if (st) st.textContent = `저장 실패 · ${r.error || "저장소 오류"}`; return; }
    if (st) st.textContent = "저장 완료 · 관리 수치 적용됨";
    clearDomainCache("nationalEvaluation");
    setTimeout(() => render(currentRoute(), { resetScroll:false }), 120);
    return;
  }
  if (form.matches("[data-national-evaluation-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("national-evaluation-vote", { evaluationId:form.dataset.evaluationId, personId:form.dataset.personId, rating:fd.get("rating") }); const st=form.querySelector("[data-national-evaluation-state]"); if(!r.ok){if(st)st.textContent=r.error==="ALREADY_VOTED"?"이미 이 평가에 참여했습니다":r.error==="EVALUATION_CLOSED"?"이 평가는 종료되었거나 현재 참여할 수 없습니다":`평가 저장 실패 · ${r.error||""}`;return;} await rerenderNoScroll(r.activity); return; }
  if (form.matches("[data-badge-celebration-form]")) {
    event.preventDefault();
    const r=await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).saveBadgeCelebrationConfig(form);
    const st=form.querySelector("[data-badge-celebration-state]");
    if(!r.ok){if(st)st.textContent=`저장 실패 · ${r.error||""}`;return;}
    if(st)st.textContent="저장 완료";
    return;
  }
  if (form.matches("[data-livebar-admin-form]")) {
    event.preventDefault();
    const current = await getDomain("brand", { fresh:true });
    const fd = new FormData(form);
    const next = { ...current, liveBar:{ useActualCount: fd.get("useActualCount") === "on", overrideCount:Math.max(0,Math.round(Number(fd.get("overrideCount") || 0))) }, updatedAt:new Date().toISOString() };
    const r = await saveDomain("brand", next);
    const st = form.querySelector("[data-livebar-admin-state]");
    if (!r.ok) { if (st) st.textContent = `저장 실패 · ${r.error || "저장소 오류"}`; return; }
    if (st) st.textContent = "저장 완료";
    clearDomainCache("brand");
    setTimeout(() => render(currentRoute(), { resetScroll:false }), 120);
    return;
  }
  if (form.matches("[data-push-form]")) {
    event.preventDefault();
    const scope = event.submitter?.value === "all" ? "all" : "test";
    if (scope === "all" && !confirm("등록된 테스트 기기 전체에 이 푸시를 발송할까요?")) return;
    const st = form.querySelector("[data-push-state]");
    if (st) st.textContent = scope === "all" ? "전체 발송 중" : "테스트 발송 중";
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).sendPushNotification(form, scope);
    if (!r.ok) { if (st) st.textContent = `발송 실패 · ${r.error || ""}`; return; }
    if (st) st.textContent = `발송 완료 · ${Number(r.success || 0)}대 성공${Number(r.failed || 0) ? ` · ${Number(r.failed)}대 실패` : ""}`;
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  if (form.matches("[data-politician-photo-form]")) {
    event.preventDefault();
    const st = form.querySelector("[data-politician-photo-state]");
    if (st) st.textContent = "사진 최적화 · 업로드 중";
    const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).savePoliticianPhotoForm(form);
    if (!r.ok) { if (st) st.textContent = `저장 실패 · ${r.error || ""}`; return; }
    if (st) st.textContent = r.message || "사진 저장 완료";
    clearDomainCache("politicianPhotos");
    await render(currentRoute(), { resetScroll:false });
    return;
  }
  if (form.matches("[data-admin-form]")) { event.preventDefault(); const r = await (await import("./views/admin.js?v=history-v1-v2-search-daily-storage-budget-hotfix-jcs-intelligence-refresh-v1-official-age-gender-baseline-v1-jcs-aggressive-r1-now-diag-r1")).saveAdminForm(form); const st=form.querySelector("[data-save-state]"); if (!r.ok) { if(st) st.textContent=`저장 실패 · ${r.error || "서버 저장소 오류"}`; return; } if(st)st.textContent="저장 완료"; clearDomainCache(); const rawTab=form.dataset.adminForm.replace(/-(settings|list)$/,''); const targetTab=rawTab==="nationalEvaluation"?"national":rawTab==="academy"?"academy":rawTab; setTimeout(()=>route(`/admin?tab=${encodeURIComponent(targetTab)}`,{replace:true}),150); return; }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeServiceMore();
    toggleDrawer(false);
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[role="button"][data-go]')) { event.preventDefault(); route(event.target.dataset.go); }
});

function requiresUserBeforeFirstPaint(state) {
  const p = parse(state.pathname);
  if (["login","join","mypage","admin","compare"].includes(p[0])) return true;
  if (["column","community","news"].includes(p[0]) && p[1] === "write") return true;
  if (p[0] === "itsme" && p[1] === "write") return true;
  return false;
}

if (new URLSearchParams(location.search).has("perf")) {
  import("./performance.js").then(mod => mod.startPerformanceMonitor()).catch(() => {});
}
startRouter();
subscribe((state, meta = {}) => {
  const scrollTarget = meta.type === "pop" ? (meta.scroll || { x:0, y:0 }) : { x:0, y:0 };
  render(state, { resetScroll: false, scrollTarget });
});

const initialState = currentRoute();
document.documentElement.classList.add("jcv3-user-pending");
if (requiresUserBeforeFirstPaint(initialState)) {
  await initializeUserState();
  document.documentElement.classList.remove("jcv3-user-pending");
  await render(initialState, { resetScroll: false });
} else {
  const userInit = initializeUserState();
  await render(initialState, { resetScroll: false });
  await userInit;
  document.documentElement.classList.remove("jcv3-user-pending");
  await render(currentRoute(), { resetScroll: false });
}
