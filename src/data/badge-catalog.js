export const BADGE_CATALOG = Object.freeze([
  { key:"noon-signal", tier:"BRONZE", name:"도시락알리미", mission:"정오(12시) 시간대에 정참시 방문", kind:"시간 미션" },
  { key:"midnight", tier:"BRONZE", name:"신데렐라", mission:"자정(00시) 시간대에 정참시 방문", kind:"시간 미션" },
  { key:"weekman", tier:"SILVER", name:"위크맨", mission:"7일 연속 출석", kind:"연속 출석" },
  { key:"superhero", tier:"SILVER", name:"슈퍼히어로", mission:"한 달 개근", kind:"월간 출석" },
  { key:"first-participation", tier:"BRONZE", name:"첫 참여", mission:"설문·댓글·글쓰기 중 첫 참여", kind:"참여" },
  { key:"citizen-choice", tier:"BRONZE", name:"시민 선택", mission:"시민들의 선택 설문에 참여", kind:"투표" },
  { key:"first-penguin", tier:"GOLD", name:"퍼스트팽귄", mission:"초기 COLUMN 작가·선도 참여자에게 운영진 부여", kind:"역할형" },
  { key:"influencer", tier:"GOLD", name:"인플루언서", mission:"팔로워·영향력 기준을 충족한 회원에게 부여", kind:"역할형" },
  { key:"policy-proposer", tier:"GOLD", name:"정책 제안자", mission:"IT’S ME 정책 제안 작성", kind:"IT’S ME" },
  { key:"opinion-leader", tier:"GOLD", name:"의견 리더", mission:"정뮤니티·댓글 활동 상위 참여", kind:"COMMUNITY" },
  { key:"top-community", tier:"PLATINUM", name:"TOP 1% · 정뮤니티", mission:"정뮤니티 활동 상위 1% 시즌 배지", kind:"시즌" },
  { key:"top-itsme", tier:"PLATINUM", name:"TOP 1% · IT’S ME", mission:"IT’S ME 활동 상위 1% 시즌 배지", kind:"시즌" },
  { key:"jungchamsi-partner", tier:"PLATINUM", name:"정참시 PARTNER", mission:"정참시 공식 파트너스 승인 회원에게 부여", kind:"공식 파트너" }
]);

const ICON_PATHS = Object.freeze({
  "noon-signal":`<circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4"/>`,
  midnight:`<path d="M17.5 16.5A7 7 0 1 1 9 5.2a6 6 0 0 0 8.5 11.3Z"/>`,
  weekman:`<path d="M7 4v3M17 4v3M5 8h14v11H5z"/><path d="m9 14 2 2 4-5"/>`,
  superhero:`<path d="M12 3 6 6v5c0 4 2.4 7 6 9 3.6-2 6-5 6-9V6z"/><path d="m12 7 1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/>`,
  "first-participation":`<path d="M6 12h12M12 6v12"/><circle cx="12" cy="12" r="7"/>`,
  "citizen-choice":`<path d="M6 10h12l1 9H5l1-9Z"/><path d="m9 14 2 2 4-5M9 10V7h6v3"/>`,
  "first-penguin":`<path d="M12 4c-3 0-5 3-5 7s2 8 5 9c3-1 5-5 5-9s-2-7-5-7Z"/><path d="M9 9h6M10 15h4"/>`,
  influencer:`<circle cx="12" cy="10" r="3"/><path d="M7 20c.5-4 2.2-6 5-6s4.5 2 5 6M4 8l2 1M20 8l-2 1M5 14l2-1M19 14l-2-1"/>`,
  "policy-proposer":`<path d="M5 5h14v10H9l-4 3V5Z"/><path d="m10 12 5-5 2 2-5 5h-2z"/>`,
  "opinion-leader":`<path d="M5 6h9v7H8l-3 2V6Z"/><path d="M13 10h6v6h-3l-3 2v-8Z"/>`,
  "top-community":`<path d="m12 4 2 4 4.5.7-3.2 3.1.8 4.5-4.1-2.1-4.1 2.1.8-4.5-3.2-3.1L10 8z"/><path d="M8 20h8"/>`,
  "top-itsme":`<path d="M7 5h10l2 5-7 10-7-10z"/><path d="M7 10h10M10 5l2 5 2-5"/>`,
  "jungchamsi-partner":`<path d="M6 7.5 12 4l6 3.5v7L12 20l-6-5.5z"/><path d="M8.8 12.2 11 14.4l4.4-5M4 10l-2 2 2 2M20 10l2 2-2 2"/>`
});

export function badgeByKey(key = "") { return BADGE_CATALOG.find(x => x.key === String(key || "")) || null; }
export function badgeKeys() { return BADGE_CATALOG.map(x => x.key); }
export function badgeGemSvg(key = "", extraClass = "") {
  const item = badgeByKey(key);
  const tier = String(item?.tier || "BRONZE").toLowerCase();
  const icon = ICON_PATHS[item?.key] || ICON_PATHS["first-participation"];
  return `<span class="badge-gem badge-gem-${tier} ${extraClass}" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="badge-gem-shell" d="M12 1.8 19.6 6v9.1L12 22.2 4.4 15.1V6Z"/><path class="badge-gem-ring" d="M12 3.7 17.9 7v7.1L12 19.7 6.1 14.1V7Z"/><path class="badge-gem-facet badge-gem-facet-a" d="m12 1.8 2.8 7.1L12 12 9.2 8.9Z"/><path class="badge-gem-facet badge-gem-facet-b" d="m4.4 6 4.8 2.9L12 12l-7.6 3.1Z"/><path class="badge-gem-facet badge-gem-facet-c" d="m19.6 6-4.8 2.9L12 12l7.6 3.1Z"/><g class="badge-gem-icon">${icon}</g></svg></span>`;
}
