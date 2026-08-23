export const BADGE_CATALOG = Object.freeze([
  { key:"noon-signal", tier:"BRONZE", name:"도시락알리미", mission:"정오 시간대에 정참시를 찾아 활동 기록을 남기면 획득합니다.", kind:"시간 미션" },
  { key:"midnight", tier:"BRONZE", name:"신데렐라", mission:"자정 시간대에 정참시를 찾아 활동 기록을 남기면 획득합니다.", kind:"시간 미션" },
  { key:"weekman", tier:"SILVER", name:"위크맨", mission:"7일 연속으로 정참시 활동 기록을 이어가면 획득합니다.", kind:"연속 출석" },
  { key:"superhero", tier:"SILVER", name:"슈퍼히어로", mission:"30일 연속으로 정참시 활동 기록을 이어가면 획득합니다.", kind:"월간 출석" },
  { key:"first-participation", tier:"BRONZE", name:"첫 참여", mission:"설문·댓글·글쓰기 등 첫 참여를 완료하면 획득합니다.", kind:"참여" },
  { key:"citizen-choice", tier:"BRONZE", name:"시민 선택", mission:"시민들의 선택 설문에 처음 참여하면 획득합니다.", kind:"투표" },
  { key:"first-penguin", tier:"GOLD", name:"퍼스트팽귄", mission:"초기 COLUMN 작가·선도 참여자에게 운영진이 부여합니다.", kind:"역할형" },
  { key:"influencer", tier:"GOLD", name:"인플루언서", mission:"플랫폼 안팎의 영향력과 활동을 확인해 운영진이 부여합니다.", kind:"역할형" },
  { key:"policy-proposer", tier:"GOLD", name:"정책 제안자", mission:"IT’S ME에서 정책·공약 제안을 작성하면 획득합니다.", kind:"IT’S ME" },
  { key:"opinion-leader", tier:"GOLD", name:"의견 리더", mission:"정뮤니티와 댓글에서 꾸준한 토론 기여가 확인되면 획득합니다.", kind:"COMMUNITY" },
  { key:"top-community", tier:"PLATINUM", name:"TOP 1% · 정뮤니티", mission:"시즌별 정뮤니티 활동 상위 1%에게 운영진이 부여합니다.", kind:"시즌" },
  { key:"top-itsme", tier:"PLATINUM", name:"TOP 1% · IT’S ME", mission:"시즌별 IT’S ME 활동 상위 1%에게 운영진이 부여합니다.", kind:"시즌" },
  { key:"jungchamsi-partner", tier:"PLATINUM", name:"정참시 PARTNER", mission:"정참시 공식 파트너스 승인 회원에게 부여합니다.", kind:"공식 파트너" },

  { key:"first-step", tier:"BRONZE", name:"퍼스트 스텝", mission:"정참시에서 첫 번째 능동적 활동을 완료하면 획득합니다.", kind:"시작", series:"EXPANSION_2026", icon:"steps" },
  { key:"first-voice", tier:"BRONZE", name:"첫 목소리", mission:"처음으로 댓글이나 의견을 남겨 자신의 목소리를 표현하면 획득합니다.", kind:"표현", series:"EXPANSION_2026", icon:"voice" },
  { key:"participation-sprout", tier:"BRONZE", name:"참여 새싹", mission:"설문·평가·세대별 투표 등 참여형 활동을 3회 이상 완료하면 획득합니다.", kind:"참여", series:"EXPANSION_2026", icon:"sprout" },
  { key:"connection-start", tier:"BRONZE", name:"연결 시작점", mission:"여러 글에 반응하거나 대화를 이어가며 첫 연결 흐름을 만들면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"link" },
  { key:"attention-start", tier:"BRONZE", name:"주목 개시", mission:"내가 만든 콘텐츠가 처음으로 다른 이용자의 반응이나 조회를 얻으면 획득합니다.", kind:"주목", series:"EXPANSION_2026", icon:"spark" },

  { key:"steady-walker", tier:"SILVER", name:"꾸준한 발걸음", mission:"서로 다른 7일 이상 정참시에서 활동 기록을 남기면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"footsteps" },
  { key:"diligent-participant", tier:"SILVER", name:"성실 참여자", mission:"글·댓글·투표·좋아요 등 누적 참여가 20회 이상 쌓이면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"check" },
  { key:"field-responder", tier:"SILVER", name:"현장 반응자", mission:"설문·평가·세대별 투표 등 직접 선택 활동을 5회 이상 완료하면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"pulse" },
  { key:"debate-participant", tier:"SILVER", name:"토론 참여자", mission:"댓글과 의견을 10회 이상 남기며 토론에 지속적으로 참여하면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"debate" },
  { key:"execution-maker", tier:"SILVER", name:"실행 메이커", mission:"직접 작성한 콘텐츠와 참여 활동을 함께 쌓아 행동으로 기여하면 획득합니다.", kind:"활동", series:"EXPANSION_2026", icon:"bolt" },

  { key:"growth-signal", tier:"SILVER", name:"성장 신호", mission:"내 콘텐츠에 누적 반응이 10회 이상 모이며 성장 흐름이 시작되면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"growth" },
  { key:"rising-current", tier:"SILVER", name:"상승 기류", mission:"내 콘텐츠 누적 조회가 300회를 넘어 주목 흐름이 커지면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"rise" },
  { key:"potential-spotted", tier:"SILVER", name:"잠재력 포착", mission:"반응이나 조회가 눈에 띄는 콘텐츠를 3개 이상 만들면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"diamond" },
  { key:"rising-prospect", tier:"SILVER", name:"주목 유망주", mission:"서로 다른 이용자 5명 이상이 내 콘텐츠에 반응하면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"star" },
  { key:"growth-acceleration", tier:"SILVER", name:"성장 가속", mission:"반응과 조회가 함께 누적되며 성장 속도가 한 단계 높아지면 획득합니다.", kind:"성장", series:"EXPANSION_2026", icon:"rocket" },

  { key:"communication-connector", tier:"SILVER", name:"소통 연결자", mission:"서로 다른 이용자 8명 이상과 콘텐츠 반응을 통해 연결되면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"network" },
  { key:"empathy-maker", tier:"SILVER", name:"공감 메이커", mission:"내 콘텐츠에 누적 공감과 반응이 25회 이상 모이면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"heart" },
  { key:"conversation-catalyst", tier:"SILVER", name:"대화 촉진자", mission:"내가 만든 글에서 다른 이용자의 댓글 반응이 20회 이상 이어지면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"chat" },
  { key:"community-bridge", tier:"SILVER", name:"커뮤니티 브릿지", mission:"여러 토론에 참여하고 정뮤니티 글도 작성해 연결의 폭을 넓히면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"bridge" },
  { key:"participation-inducer", tier:"SILVER", name:"참여 유도자", mission:"내 콘텐츠에서 다른 이용자의 후속 참여가 30회 이상 발생하면 획득합니다.", kind:"소통", series:"EXPANSION_2026", icon:"magnet" },

  { key:"stable-contributor", tier:"SILVER", name:"안정 기여자", mission:"14일 이상 꾸준히 활동하며 글과 댓글 기여를 함께 쌓으면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"shield" },
  { key:"honest-voice", tier:"SILVER", name:"정직한 목소리", mission:"20회 이상의 의견 활동과 직접 작성 콘텐츠를 함께 꾸준히 남기면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"truth" },
  { key:"quality-participant", tier:"SILVER", name:"품격 참여자", mission:"여러 콘텐츠를 작성하고 반복적으로 긍정적 반응을 얻으면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"laurel" },
  { key:"trust-builder", tier:"SILVER", name:"신뢰 축적자", mission:"21일 이상 활동하며 다양한 이용자와 안정적인 반응 관계를 쌓으면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"trust" },
  { key:"faithful-contributor", tier:"SILVER", name:"성실 기여자", mission:"30일 이상의 활동 기록 또는 80회 이상의 누적 참여를 달성하면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"anchor" },

  { key:"issue-maker", tier:"GOLD", name:"이슈 메이커", mission:"강한 반응이나 조회를 만든 콘텐츠를 5개 이상 기록하면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"flame" },
  { key:"influence-leader", tier:"GOLD", name:"영향력 리더", mission:"높은 누적 반응과 폭넓은 이용자 반응을 동시에 만들어내면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"crown" },
  { key:"participation-driver", tier:"GOLD", name:"참여 견인자", mission:"내 콘텐츠에서 다른 이용자의 후속 참여를 50회 이상 이끌어내면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"megaphone" },
  { key:"public-discussion-expander", tier:"GOLD", name:"공론 확장자", mission:"IT’S ME 제안과 후속 토론을 함께 성장시켜 공론의 범위를 넓히면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"forum" },
  { key:"debate-axis", tier:"GOLD", name:"토론 중심축", mission:"100회 이상의 의견 활동과 20개 이상의 서로 다른 토론 참여를 달성하면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"compass" },
  { key:"reaction-catalyst", tier:"GOLD", name:"반응 촉진자", mission:"내 콘텐츠에 누적 반응이 150회 이상 모이면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"radar" },
  { key:"community-hub", tier:"GOLD", name:"커뮤니티 허브", mission:"30명 이상의 이용자와 연결되고 50회 이상의 의견 활동을 이어가면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"hub" },
  { key:"attention-driver", tier:"GOLD", name:"주목 견인자", mission:"내 콘텐츠 누적 조회가 5,000회를 넘어 지속적인 주목을 만들면 획득합니다.", kind:"영향력", series:"EXPANSION_2026", icon:"eye" },
  { key:"trust-leader", tier:"GOLD", name:"신뢰 리더", mission:"60일 이상의 꾸준한 활동과 높은 누적 반응을 함께 달성하면 획득합니다.", kind:"신뢰", series:"EXPANSION_2026", icon:"medal" },
  { key:"content-driver", tier:"GOLD", name:"콘텐츠 드라이버", mission:"40개 이상의 콘텐츠와 4,000회 이상의 누적 조회를 달성하면 획득합니다.", kind:"콘텐츠", series:"EXPANSION_2026", icon:"pen" },

  { key:"signature-influencer", tier:"PLATINUM", name:"시그니처 인플루언서", mission:"매우 높은 반응·조회·이용자 확산을 동시에 달성한 상징적 멤버에게 주어집니다.", kind:"상징", series:"EXPANSION_2026", icon:"signature" },
  { key:"agenda-leader", tier:"PLATINUM", name:"아젠다 리더", mission:"IT’S ME 제안을 지속적으로 만들고 강한 후속 토론을 이끌어낸 멤버에게 주어집니다.", kind:"의제", series:"EXPANSION_2026", icon:"agenda" },
  { key:"public-icon", tier:"PLATINUM", name:"퍼블릭 아이콘", mission:"압도적인 조회와 반응을 함께 기록해 대중적 존재감을 만든 멤버에게 주어집니다.", kind:"상징", series:"EXPANSION_2026", icon:"public" },
  { key:"grand-connector", tier:"PLATINUM", name:"그랜드 커넥터", mission:"매우 넓은 이용자 연결과 토론 참여를 통해 커뮤니티의 큰 흐름을 만든 멤버에게 주어집니다.", kind:"연결", series:"EXPANSION_2026", icon:"connect" },
  { key:"elite-strategist", tier:"PLATINUM", name:"엘리트 스트래티지스트", mission:"장기 활동·콘텐츠·반응·다양한 참여영역을 모두 높은 수준으로 달성하면 획득합니다.", kind:"종합", series:"EXPANSION_2026", icon:"strategy" },

  { key:"operator", tier:"BLACK", name:"운영자", mission:"정참시 운영 권한을 가진 관리자에게만 부여되는 최고 권위 배지입니다.", kind:"운영 권위", series:"EXPANSION_2026", icon:"operator" }
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

const ICON_LIBRARY = Object.freeze({
  steps:`<path d="M7 16c2.5-1.5 4-4.2 4-8M13 18c2.8-1.6 4.2-4.8 4-8"/><circle cx="8" cy="17" r="2"/><circle cx="17" cy="8" r="2"/>`,
  voice:`<path d="M6 10h3l4-3v10l-4-3H6zM15 9c1 1 1 5 0 6M17 7c2 2 2 8 0 10"/>`,
  sprout:`<path d="M12 19v-8M12 12C8 12 6 10 6 7c4 0 6 2 6 5ZM12 10c0-4 2-6 6-6 0 4-2 6-6 6Z"/>`,
  link:`<path d="M9 15 7.5 16.5a3 3 0 1 1-4.2-4.2L7 8.6M15 9l1.5-1.5a3 3 0 1 1 4.2 4.2L17 15.4M8.5 12h7"/>`,
  spark:`<path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6Z"/><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z"/>`,
  footsteps:`<path d="M7 6c2 0 3 1.5 3 3s-1 3-3 3-3-1.5-3-3 1-3 3-3ZM16 12c2 0 3 1.5 3 3s-1 3-3 3-3-1.5-3-3 1-3 3-3Z"/>`,
  check:`<path d="M5 12.5 10 17l9-10"/><path d="M5 5h10"/>`, pulse:`<path d="M3 12h4l2-5 4 10 2-5h6"/>`,
  debate:`<path d="M4 6h10v7H8l-4 3zM12 10h8v7h-4l-4 3z"/>`, bolt:`<path d="m13 3-7 10h5l-1 8 8-12h-5z"/>`,
  growth:`<path d="M5 18V9M10 18V6M15 18v-8M20 18V4"/>`, rise:`<path d="M5 17 10 12l3 3 6-8M15 7h4v4"/>`,
  diamond:`<path d="M7 5h10l3 5-8 9-8-9zM7 10h10M10 5l2 5 2-5"/>`, star:`<path d="m12 4 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.3-4.5 2.3.9-5L4.8 9.2l5-.7Z"/>`,
  rocket:`<path d="M14 5c3-2 5-1 5-1s1 2-1 5l-5 5-4-4zM8 11l-3 1-1 4 4-1M13 16l-1 4 4-1 1-3"/>`,
  network:`<circle cx="12" cy="6" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="m11 8-4 7M13 8l4 7M8 17h8"/>`,
  heart:`<path d="M12 20 5 13c-4-4 2-9 7-4 5-5 11 0 7 4z"/>`, chat:`<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>`,
  bridge:`<path d="M4 18h16M6 18v-5c0-5 12-5 12 0v5M8 13h8M12 8v10"/>`, magnet:`<path d="M6 5v7a6 6 0 0 0 12 0V5h-4v7a2 2 0 0 1-4 0V5z"/>`,
  shield:`<path d="M12 3 6 6v5c0 4 2.4 7 6 9 3.6-2 6-5 6-9V6z"/>`, truth:`<path d="M5 12h4l2 3 8-8"/><circle cx="12" cy="12" r="8"/>`,
  laurel:`<path d="M8 18c-3-2-4-5-3-9M16 18c3-2 4-5 3-9M7 9 4 7M7 13l-3 1M17 9l3-2M17 13l3 1"/><path d="M9 18h6"/>`,
  trust:`<path d="M12 4 18 7v5c0 4-2.2 6-6 8-3.8-2-6-4-6-8V7z"/><path d="m9 12 2 2 4-5"/>`, anchor:`<circle cx="12" cy="6" r="2"/><path d="M12 8v10M7 12H4c0 4 3 7 8 7s8-3 8-7h-3M8 18l-2 2M16 18l2 2"/>`,
  flame:`<path d="M12 21c5-2 7-6 4-10-1 2-2 3-4 4 1-5-2-8-2-8-1 4-5 5-5 9 0 3 2 5 7 5Z"/>`, crown:`<path d="m4 8 4 3 4-6 4 6 4-3-2 10H6zM7 18h10"/>`,
  megaphone:`<path d="M4 10h4l9-4v12l-9-4H4zM8 14l2 6h3l-1-5"/>`, forum:`<path d="M4 5h12v8H8l-4 3zM11 10h9v7h-4l-3 3"/>`,
  compass:`<circle cx="12" cy="12" r="8"/><path d="m15 9-2 5-5 2 2-5z"/>`, radar:`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 18 7"/>`,
  hub:`<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m10 10-4-3M14 10l4-3M10 14l-4 3M14 14l4 3"/>`,
  eye:`<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="3"/>`, medal:`<circle cx="12" cy="9" r="5"/><path d="m9 14-2 7 5-3 5 3-2-7"/>`,
  pen:`<path d="m5 19 3-1 10-10-3-3L5 15zM13 7l3 3M5 19h6"/>`, signature:`<path d="M4 16c4-8 7-10 6-3-1 5 2 5 4 1 2-4 4-3 6 0M5 19h14"/>`,
  agenda:`<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/><path d="m15 4 2 2"/>`, public:`<circle cx="12" cy="8" r="3"/><path d="M6 20c.5-5 2.5-8 6-8s5.5 3 6 8M4 7h2M18 7h2M5 12l2-1M19 12l-2-1"/>`,
  connect:`<circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M10 10 6 6M14 10l4-4M10 14l-4 4M14 14l4 4"/>`,
  strategy:`<path d="M5 19 19 5M6 7h5v5M13 13h5v5"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/>`,
  operator:`<path d="m4 9 4 3 4-7 4 7 4-3-2 9H6z"/><path d="M7 18h10M9 8l3 2 3-2"/>`
});

export function badgeByKey(key = "") { return BADGE_CATALOG.find(x => x.key === String(key || "")) || null; }
export function badgeKeys() { return BADGE_CATALOG.map(x => x.key); }
export function badgeGemSvg(key = "", extraClass = "") {
  const item = badgeByKey(key);
  const tier = String(item?.tier || "BRONZE").toLowerCase();
  const icon = ICON_LIBRARY[item?.icon] || ICON_PATHS[item?.key] || ICON_PATHS["first-participation"];
  const premium = tier === "platinum" ? `<circle class="badge-gem-halo" cx="12" cy="12" r="10.2"/><path class="badge-gem-spark" d="M12 1.2v2M12 20.8v2M1.2 12h2M20.8 12h2"/>` : "";
  const black = tier === "black" ? `<circle class="badge-gem-halo" cx="12" cy="12" r="10.4"/><path class="badge-gem-crownline" d="m7 5 2 1.7L12 3l3 3.7L17 5l-1 4H8z"/><circle class="badge-gem-core" cx="12" cy="12" r="2.2"/>` : "";
  return `<span class="badge-gem badge-gem-${tier} ${extraClass}" aria-hidden="true"><svg viewBox="0 0 24 24">${premium}${black}<path class="badge-gem-shell" d="M12 1.8 19.6 6v9.1L12 22.2 4.4 15.1V6Z"/><path class="badge-gem-ring" d="M12 3.7 17.9 7v7.1L12 19.7 6.1 14.1V7Z"/><path class="badge-gem-facet badge-gem-facet-a" d="m12 1.8 2.8 7.1L12 12 9.2 8.9Z"/><path class="badge-gem-facet badge-gem-facet-b" d="m4.4 6 4.8 2.9L12 12l-7.6 3.1Z"/><path class="badge-gem-facet badge-gem-facet-c" d="m19.6 6-4.8 2.9L12 12l7.6 3.1Z"/><g class="badge-gem-icon">${icon}</g></svg></span>`;
}
