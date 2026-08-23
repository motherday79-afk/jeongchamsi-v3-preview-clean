const { getJSON, setJSON } = require('./redis');

const CONFIG_DOMAIN = 'badgeCelebrationsConfig';
const FEED_DOMAIN = 'badgeCelebrationsFeed';

const BADGE_NAMES = Object.freeze({
  'first-penguin':'퍼스트팽귄',
  'influencer':'인플루언서',
  'policy-proposer':'정책 제안자',
  'opinion-leader':'의견 리더',
  'issue-maker':'이슈 메이커',
  'influence-leader':'영향력 리더',
  'participation-driver':'참여 견인자',
  'public-discussion-expander':'공론 확장자',
  'debate-axis':'토론 중심축',
  'reaction-catalyst':'반응 촉진자',
  'community-hub':'커뮤니티 허브',
  'attention-driver':'주목 견인자',
  'trust-leader':'신뢰 리더',
  'content-driver':'콘텐츠 드라이버',
  'top-community':'TOP 1% · 정뮤니티',
  'top-itsme':'TOP 1% · IT’S ME',
  'jungchamsi-partner':'정참시 PARTNER',
  'signature-influencer':'시그니처 인플루언서',
  'agenda-leader':'아젠다 리더',
  'public-icon':'퍼블릭 아이콘',
  'grand-connector':'그랜드 커넥터',
  'elite-strategist':'엘리트 스트래티지스트',
  'jeongcham-mayor':'정참시장',
  'michael':'미카엘'
});

const CELEBRATION_ELIGIBLE_BADGE_KEYS = new Set(Object.keys(BADGE_NAMES));
const DEFAULT_CELEBRATION_BADGE_KEYS = Object.freeze([
  'issue-maker','influence-leader','public-discussion-expander','debate-axis','community-hub','trust-leader','content-driver',
  'signature-influencer','agenda-leader','public-icon','grand-connector','elite-strategist','jeongcham-mayor','michael'
]);

function uniqueEligible(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(key => CELEBRATION_ELIGIBLE_BADGE_KEYS.has(key)))];
}

function normalizeCelebrationConfig(input = {}) {
  const hasExplicit = Array.isArray(input?.enabledBadgeKeys);
  return {
    enabledBadgeKeys: uniqueEligible(hasExplicit ? input.enabledBadgeKeys : DEFAULT_CELEBRATION_BADGE_KEYS),
    updatedAt: String(input?.updatedAt || '').slice(0, 40)
  };
}

function normalizeRecognition(input = {}) {
  return {
    initialized: input?.initialized === true,
    knownBadgeKeys: [...new Set((Array.isArray(input?.knownBadgeKeys) ? input.knownBadgeKeys : []).map(String))],
    updatedAt: String(input?.updatedAt || '').slice(0, 40)
  };
}

function reconcileBadgeRecognition(previous = {}, earnedBadges = [], at = new Date().toISOString()) {
  const prior = normalizeRecognition(previous);
  const earned = [...new Set((Array.isArray(earnedBadges) ? earnedBadges : []).map(String))];
  if (!prior.initialized) {
    return {
      initialized: true,
      newBadgeKeys: [],
      recognition: { initialized:true, knownBadgeKeys:earned, updatedAt:String(at).slice(0,40) }
    };
  }
  const known = new Set(prior.knownBadgeKeys);
  const newBadgeKeys = earned.filter(key => !known.has(key));
  const merged = [...new Set([...prior.knownBadgeKeys, ...earned])];
  return {
    initialized: true,
    newBadgeKeys,
    recognition: { initialized:true, knownBadgeKeys:merged, updatedAt:String(at).slice(0,40) }
  };
}

function buildCelebrationEntries(user = {}, newBadgeKeys = [], config = {}, at = new Date().toISOString()) {
  const selected = new Set(normalizeCelebrationConfig(config).enabledBadgeKeys);
  const nickname = String(user?.nickname || user?.name || user?.id || '정참시민').trim().slice(0, 40) || '정참시민';
  const userId = String(user?.id || '').slice(0, 24);
  return uniqueEligible(newBadgeKeys)
    .filter(key => selected.has(key))
    .map(key => ({
      id:`badge-${userId}-${key}-${Date.parse(at) || Date.now()}`,
      userId,
      nickname,
      badgeKey:key,
      badgeName:BADGE_NAMES[key],
      at:String(at || new Date().toISOString()).slice(0, 40)
    }));
}

function normalizeFeed(input = {}, { limit = 30, maxAgeDays = 30 } = {}) {
  const now = Date.now();
  const cutoff = now - Math.max(1, Number(maxAgeDays || 30)) * 86400000;
  const items = Array.isArray(input?.items) ? input.items : [];
  return items.filter(item => {
    if (!item || !CELEBRATION_ELIGIBLE_BADGE_KEYS.has(String(item.badgeKey || ''))) return false;
    const time = Date.parse(item.at || '');
    return Number.isFinite(time) && time >= cutoff;
  }).map(item => ({
    id:String(item.id || '').slice(0, 160),
    userId:String(item.userId || '').slice(0, 24),
    nickname:String(item.nickname || '정참시민').slice(0, 40),
    badgeKey:String(item.badgeKey || ''),
    badgeName:String(item.badgeName || BADGE_NAMES[item.badgeKey] || '배지').slice(0, 60),
    at:String(item.at || '').slice(0, 40)
  })).slice(0, Math.max(1, Math.min(30, Number(limit || 30))));
}


function publicCelebrationFeed(input = {}, limit = 6) {
  return normalizeFeed(input, { limit, maxAgeDays:30 }).map(item => ({
    nickname:item.nickname,
    badgeKey:item.badgeKey,
    badgeName:item.badgeName,
    at:item.at
  }));
}

async function getCelebrationConfig() {
  const stored = await getJSON(CONFIG_DOMAIN);
  return normalizeCelebrationConfig(stored || {});
}

async function setCelebrationConfig(enabledBadgeKeys = []) {
  const config = normalizeCelebrationConfig({ enabledBadgeKeys, updatedAt:new Date().toISOString() });
  await setJSON(CONFIG_DOMAIN, config);
  return config;
}

async function getRecentBadgeCelebrations(limit = 6) {
  const feed = await getJSON(FEED_DOMAIN);
  return publicCelebrationFeed(feed || {}, limit);
}

async function recordBadgeCelebrations(user = {}, newBadgeKeys = [], at = new Date().toISOString()) {
  if (!Array.isArray(newBadgeKeys) || !newBadgeKeys.length) return [];
  const config = await getCelebrationConfig();
  const entries = buildCelebrationEntries(user, newBadgeKeys, config, at);
  if (!entries.length) return [];
  const current = normalizeFeed((await getJSON(FEED_DOMAIN)) || {}, { limit:30, maxAgeDays:30 });
  const existing = new Set(current.map(item => `${item.userId}:${item.badgeKey}`));
  const fresh = entries.filter(item => !existing.has(`${item.userId}:${item.badgeKey}`));
  if (!fresh.length) return [];
  await setJSON(FEED_DOMAIN, { items:[...fresh, ...current].slice(0, 30), updatedAt:new Date().toISOString() });
  return fresh;
}

module.exports = {
  CONFIG_DOMAIN,
  FEED_DOMAIN,
  BADGE_NAMES,
  CELEBRATION_ELIGIBLE_BADGE_KEYS,
  DEFAULT_CELEBRATION_BADGE_KEYS,
  normalizeCelebrationConfig,
  reconcileBadgeRecognition,
  buildCelebrationEntries,
  normalizeFeed,
  publicCelebrationFeed,
  getCelebrationConfig,
  setCelebrationConfig,
  getRecentBadgeCelebrations,
  recordBadgeCelebrations
};
