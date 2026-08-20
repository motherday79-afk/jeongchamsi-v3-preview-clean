import { startPerformanceMonitor } from "./performance.js";
import { startRouter, subscribe, currentRoute, route } from "./core/router.js";
import { renderHome } from "./views/home.js";
import { renderPeopleList, renderPersonDetail } from "./views/people.js";
import { renderBoard, renderBoardDetail } from "./views/boards.js";
import { renderNow, renderPresident, renderPolls, renderAcademy, renderItsme, renderCompare, renderGeneration, renderNationalEvaluation, renderSearch } from "./views/features.js";
import { renderAdmin, handleAdminAction, handleAdminSubmit } from "./views/admin.js";

const app = document.querySelector("#app");
let adminTab = "dashboard";

function parse(pathname){ return pathname.split("/").filter(Boolean).map(decodeURIComponent); }

async function render(routeState=currentRoute()){
  const parts=parse(routeState.pathname);
  let html;
  if(parts.length===0) html=await renderHome();
  else if(parts[0]==="assembly") html=await renderPeopleList("assembly");
  else if(parts[0]==="local-leaders") html=await renderPeopleList("local");
  else if(parts[0]==="person") html=await renderPersonDetail(parts[1]||"");
  else if(parts[0]==="now") html=await renderNow();
  else if(parts[0]==="president") html=await renderPresident();
  else if(parts[0]==="column") html=parts[1]?await renderBoardDetail("columns",parts[1]):await renderBoard("columns");
  else if(parts[0]==="community") html=parts[1]?await renderBoardDetail("community",parts[1]):await renderBoard("community");
  else if(parts[0]==="news") html=parts[1]?await renderBoardDetail("news",parts[1]):await renderBoard("news");
  else if(parts[0]==="poll") html=await renderPolls();
  else if(parts[0]==="academy") html=await renderAcademy();
  else if(parts[0]==="itsme") html=await renderItsme();
  else if(parts[0]==="compare") html=await renderCompare();
  else if(parts[0]==="generation-president") html=await renderGeneration();
  else if(parts[0]==="national-evaluation") html=await renderNationalEvaluation();
  else if(parts[0]==="search") html=await renderSearch(new URLSearchParams(routeState.search).get("q")||"");
  else if(parts[0]==="admin") html=await renderAdmin(adminTab);
  else html=await renderHome();
  app.innerHTML=html;
  scrollTo({top:0,left:0,behavior:"instant"});
}

function toggleDrawer(open){
  const drawer=document.querySelector('[data-drawer]'); const backdrop=document.querySelector('.drawer-backdrop');
  if(!drawer||!backdrop) return; drawer.hidden=!open; backdrop.hidden=!open; document.body.classList.toggle('drawer-open',open);
}

document.addEventListener("click", async (event)=>{
  if(event.target.closest('[data-drawer-open]')) { toggleDrawer(true); return; }
  if(event.target.closest('[data-drawer-close]')) { toggleDrawer(false); return; }
  if(currentRoute().pathname==="/admin"){
    const handled=await handleAdminAction(event.target,(tab)=>{adminTab=tab;render();});
    if(handled) return;
  }
});

document.addEventListener("submit", async (event)=>{
  const search=event.target.closest('[data-search-form]');
  if(search){ event.preventDefault(); const fd=new FormData(search); route(`/search?q=${encodeURIComponent(String(fd.get('q')||''))}`); return; }
  const adminForm=event.target.closest('[data-admin-form]');
  if(adminForm){ event.preventDefault(); await handleAdminSubmit(adminForm,(tab)=>{adminTab=tab;render();}); }
});

addEventListener("keydown", e=>{ if(e.key==="Escape") toggleDrawer(false); });
startRouter(); subscribe(render);
addEventListener("jcv3:home-updated", ()=>{ if(currentRoute().pathname==="/") render(); });
await render(); startPerformanceMonitor();
