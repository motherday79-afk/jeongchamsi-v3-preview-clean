const { normalize, compactRegionTokens, identityEvidence } = require('./politician-photo-resolver');
const {
  officialHostAllowed,
  publicHttpsUrl,
  extractOfficialImageCandidates,
  naverCredentials,
  fetchWithTimeout,
  licenseHint
} = require('./politician-photo-official');

const NAVER_WEB_API = 'https://naverapihub.apigw.ntruss.com/search/v1/webkr';
const NAVER_IMAGE_API = 'https://naverapihub.apigw.ntruss.com/search/v1/image';
const USER_AGENT = 'JCV3-Direct-Politician-Photo/0.36.68';
const MAX_PAGE_BYTES = 1_600_000;
const MAX_PROFILE_LINKS = 6;
const MAX_PAGES_PER_PERSON = 6;
const DISCOVERY_BUDGET_MS = 16_000;

function cleanHtml(value = '') {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function exactNameHit(text = '', name = '') {
  if (!name) return false;
  const clean = cleanHtml(text);
  return clean.includes(name) || normalize(clean).includes(normalize(name));
}

function exactOffice(person = {}) {
  const region = String(person.jurisdiction || '');
  if (person.type === 'assembly') return '국회의원';
  if (person.type === 'metropolitan') return /도$|특별자치도$/.test(region) ? '도지사' : '시장';
  if (/군(?:\s|$)/.test(region) || /군$/.test(region)) return '군수';
  if (/구(?:\s|$)/.test(region) || /구$/.test(region)) return '구청장';
  return '시장';
}

function officeAliases(person = {}) {
  const office = exactOffice(person);
  if (office === '국회의원') return ['국회의원', '국회 의원', 'national assembly'];
  if (office === '도지사') return ['도지사', '특별자치도지사', 'governor'];
  if (office === '군수') return ['군수', 'county mayor', 'county head'];
  if (office === '구청장') return ['구청장', 'district mayor', 'district head'];
  return ['시장', 'mayor'];
}

function directQueries(person = {}) {
  const name = String(person.name || '').trim();
  const region = String(person.jurisdiction || '').trim();
  const party = String(person.party || '').trim();
  const office = exactOffice(person);
  if (person.type === 'assembly') {
    return {
      web: [
        `\"${name}\" ${office} \"${region}\" site:assembly.go.kr`,
        `\"${name}\" ${office} ${party} ${region} 의원소개`,
        `\"${name}\" ${region} 약력 프로필 국회`
      ],
      image: `${name} ${office} ${region} 프로필 사진`
    };
  }
  const room = office === '도지사' ? '도지사실' : office === '군수' ? '열린군수실' : office === '구청장' ? '열린구청장실' : '열린시장실';
  return {
    web: [
      `\"${name}\" ${region} ${office} 프로필 site:go.kr`,
      `\"${name}\" ${region} ${room} 프로필`,
      `\"${name}\" ${region} ${office} 약력 인사말`
    ],
    image: `${name} ${region} ${office} 프로필 사진`
  };
}

function directOfficialIdentityEvidence(person = {}, value = '') {
  if (person.type === 'assembly') return identityEvidence(person, cleanHtml(value));
  const text = cleanHtml(value);
  const lower = text.toLowerCase();
  const nameHit = exactNameHit(text, person.name);
  const regionHits = compactRegionTokens(person.jurisdiction).filter(token => token && normalize(text).includes(token));
  const officeHit = officeAliases(person).some(word => lower.includes(String(word).toLowerCase()));
  return { strong:Boolean(nameHit && officeHit && regionHits.length), nameHit, regionHits, officeHit, partyHit:false };
}

function attrValue(tag = '', name = '') {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = String(tag).match(re);
  return m ? (m[1] || m[2] || m[3] || '') : '';
}

function officialSiteKey(value = '') {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'assembly.go.kr' || host.endsWith('.assembly.go.kr')) return 'assembly.go.kr';
    if (host === 'korea.kr' || host.endsWith('.korea.kr')) return 'korea.kr';
    if (host.endsWith('.go.kr')) {
      const parts = host.split('.');
      return parts.slice(-3).join('.');
    }
    return '';
  } catch { return ''; }
}

function normalizeOfficialHttps(value = '') {
  try {
    const u = new URL(String(value || '').trim());
    if (!officialHostAllowed(u.href)) return '';
    if (u.protocol === 'http:') u.protocol = 'https:';
    if (u.protocol !== 'https:') return '';
    return publicHttpsUrl(u.href) ? u.href : '';
  } catch { return ''; }
}

function absoluteOfficialUrl(value = '', pageUrl = '') {
  const raw = String(value || '').trim().replace(/&amp;/g, '&');
  if (!raw || /^(?:javascript|data|mailto|tel):/i.test(raw)) return '';
  try {
    const url = new URL(raw, pageUrl).href;
    return publicHttpsUrl(url) && officialHostAllowed(url) ? url : '';
  } catch { return ''; }
}

function profileLinkScore(url = '', label = '', person = {}) {
  const text = `${cleanHtml(label)} ${url}`.toLowerCase();
  let score = 0;
  if (exactNameHit(text, person.name)) score += 80;
  if (/(프로필|약력|인사말|소개|열린시장실|열린군수실|열린구청장실|도지사실|시장실|군수실|구청장실|profile|mayor|governor|history|greeting)/i.test(text)) score += 70;
  if (/(보도자료|뉴스|공지|채용|의회|관광|지도|민원|조직도|오시는길|행사|gallery|news|notice)/i.test(text)) score -= 90;
  return score;
}

function extractProfileLinks(html = '', pageUrl = '', person = {}) {
  if (!officialHostAllowed(pageUrl)) return [];
  const baseKey = officialSiteKey(pageUrl);
  const raw = String(html || '');
  const rows = [];
  const seen = new Set();
  const re = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let m;
  while ((m = re.exec(raw))) {
    const tag = m[0];
    const href = attrValue(tag, 'href');
    const url = absoluteOfficialUrl(href, pageUrl);
    if (!url || seen.has(url) || officialSiteKey(url) !== baseKey) continue;
    const label = cleanHtml(tag);
    const score = profileLinkScore(url, label, person);
    if (score < 50) continue;
    seen.add(url);
    rows.push({ url, label:label.slice(0,140), score });
  }
  return rows.sort((a,b)=>b.score-a.score).slice(0, MAX_PROFILE_LINKS);
}

function imageSearchCandidates(rows = [], person = {}, query = '') {
  const out = [];
  const seen = new Set();
  const regionTokens = compactRegionTokens(person.jurisdiction);
  const offices = officeAliases(person);
  for (const row of rows || []) {
    const url = normalizeOfficialHttps(row?.link || '');
    if (!url || seen.has(url)) continue;
    const title = cleanHtml(row?.title || '');
    if (!exactNameHit(title, person.name)) continue;
    const normalizedTitle = normalize(title);
    const officeHit = offices.some(word => title.toLowerCase().includes(String(word).toLowerCase()));
    const regionHit = regionTokens.some(token => normalizedTitle.includes(token));
    if (!officeHit && !regionHit) continue;
    const width = Number(row?.sizewidth || 0);
    const height = Number(row?.sizeheight || 0);
    if (width && height && (width < 220 || height < 220)) continue;
    let score = 360;
    if (officeHit) score += 90;
    if (regionHit) score += 70;
    if (width >= 500 && height >= 500) score += 30;
    if (width && height) {
      const ratio = width / height;
      if (ratio >= 0.5 && ratio <= 1.2) score += 25;
      if (ratio > 1.8) score -= 45;
    }
    seen.add(url);
    out.push({
      url,
      sourcePage:url,
      provider:'NAVER 이미지 · 공식기관 호스트',
      sourceKind:'naver-image-official-host',
      confidence:'visual-review',
      score,
      licenseHint:'공식기관 호스트의 이미지 검색 후보 · 적용 전 기관 페이지의 이용조건을 반드시 확인',
      verification:[`NAVER 이미지 검색: ${query}`,`공식기관 이미지 호스트: ${new URL(url).hostname}`,officeHit ? '직위 문맥 일치' : '지역 문맥 일치','관리자 육안 신원확인 필수']
    });
  }
  return out.sort((a,b)=>b.score-a.score).slice(0,3);
}

async function naverSearchRows(endpoint, params = {}, timeoutMs = 5000) {
  const c = naverCredentials();
  if (!c.configured) return { rows:[], configured:false };
  const u = new URL(endpoint);
  for (const [key,value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') u.searchParams.set(key,String(value));
  const response = await fetchWithTimeout(u.href, {
    headers:{
      'user-agent':USER_AGENT,
      'X-NCP-APIGW-API-KEY-ID':c.id,
      'X-NCP-APIGW-API-KEY':c.secret,
      accept:'application/json'
    }
  }, timeoutMs);
  if (!response.ok) throw new Error(`NAVER_DIRECT_${response.status}`);
  const json = await response.json();
  return { rows:Array.isArray(json?.items) ? json.items : [], configured:true };
}

async function fetchOfficialHtml(url = '', timeoutMs = 5000) {
  if (!officialHostAllowed(url) || !publicHttpsUrl(url)) return null;
  const response = await fetchWithTimeout(url, {headers:{accept:'text/html,application/xhtml+xml'}}, timeoutMs);
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok || !type.includes('text/html') || !officialHostAllowed(response.url || url)) return null;
  const html = (await response.text()).slice(0, MAX_PAGE_BYTES);
  return { html, url:response.url || url };
}

function strongPageCandidates(person, html, pageUrl, rowContext = '') {
  const context = `${rowContext} ${cleanHtml(html).slice(0,140000)}`;
  const evidence = directOfficialIdentityEvidence(person, context);
  if (!evidence.strong) return [];
  const images = extractOfficialImageCandidates(html, pageUrl, person);
  const hint = licenseHint(html);
  return images.map(img => ({
    url:img.url,
    sourcePage:pageUrl,
    provider:'공식기관 직접페이지',
    sourceKind:'official-profile-page',
    confidence:'strong',
    score:img.score + 620,
    licenseHint:hint,
    verification:[`공식기관 페이지: ${new URL(pageUrl).hostname}`,'이름·직위·지역 문맥 확인',person.type === 'assembly' ? '국회의원은 정당 문맥까지 확인' : '지자체 공식페이지는 정당 표기 없이도 허용',img.label ? `이미지 문맥: ${img.label}` : '페이지 대표 이미지']
  }));
}

function dedupeCandidates(rows = []) {
  const byUrl = new Map();
  for (const row of rows) {
    if (!row?.url) continue;
    const prior = byUrl.get(row.url);
    if (!prior || Number(row.score || 0) > Number(prior.score || 0)) byUrl.set(row.url,row);
  }
  return [...byUrl.values()].sort((a,b)=>b.score-a.score).slice(0,3);
}

async function discoverDirectCandidates(person = {}) {
  const credentials = naverCredentials();
  if (!credentials.configured) return { candidates:[], reason:'source-not-configured', detail:'NAVER_API_HUB_MISSING', configured:false };
  const queries = directQueries(person);
  const candidatePool = [];
  const visitedPages = new Set();
  const startedAt = Date.now();
  const budgetExceeded = () => Date.now() - startedAt >= DISCOVERY_BUDGET_MS;
  let sourceFailures = 0;
  let pagesChecked = 0;
  let pageAttempts = 0;
  let identityRejected = 0;

  for (const query of queries.web) {
    if (candidatePool.length >= 3 || pagesChecked >= MAX_PAGES_PER_PERSON || pageAttempts >= MAX_PAGES_PER_PERSON || budgetExceeded()) break;
    let rows=[];
    try { rows = (await naverSearchRows(NAVER_WEB_API,{query,display:20,start:1,format:'json'},4500)).rows; }
    catch { sourceFailures += 1; continue; }
    for (const row of rows) {
      if (candidatePool.length >= 3 || pagesChecked >= MAX_PAGES_PER_PERSON || pageAttempts >= MAX_PAGES_PER_PERSON || budgetExceeded()) break;
      const pageUrl = normalizeOfficialHttps(row?.link || '');
      if (!pageUrl || visitedPages.has(pageUrl)) continue;
      visitedPages.add(pageUrl);
      pageAttempts += 1;
      let page;
      try { page = await fetchOfficialHtml(pageUrl,4500); }
      catch { sourceFailures += 1; continue; }
      if (!page) { sourceFailures += 1; continue; }
      pagesChecked += 1;
      const context = `${row?.title || ''} ${row?.description || ''}`;
      const strong = strongPageCandidates(person,page.html,page.url,context);
      if (strong.length) candidatePool.push(...strong);
      else identityRejected += 1;
      if (candidatePool.length >= 3) break;

      const links = extractProfileLinks(page.html,page.url,person);
      for (const link of links) {
        if (candidatePool.length >= 3 || pagesChecked >= MAX_PAGES_PER_PERSON || pageAttempts >= MAX_PAGES_PER_PERSON || budgetExceeded()) break;
        if (visitedPages.has(link.url)) continue;
        visitedPages.add(link.url);
        pageAttempts += 1;
        let child;
        try { child = await fetchOfficialHtml(link.url,4500); }
        catch { sourceFailures += 1; continue; }
        if (!child) { sourceFailures += 1; continue; }
        pagesChecked += 1;
        const childRows = strongPageCandidates(person,child.html,child.url,link.label);
        if (childRows.length) candidatePool.push(...childRows);
        else identityRejected += 1;
      }
    }
  }

  if (!candidatePool.length) {
    try {
      const imageRows = (await naverSearchRows(NAVER_IMAGE_API,{query:queries.image,display:50,start:1,sort:'sim',filter:'large',format:'json'},4500)).rows;
      candidatePool.push(...imageSearchCandidates(imageRows,person,queries.image));
    } catch { sourceFailures += 1; }
  }

  const candidates = dedupeCandidates(candidatePool);
  if (candidates.length) {
    const strong = candidates.filter(x=>x.confidence === 'strong').length;
    return { candidates, reason:'candidate-review', configured:true, pagesChecked, pageAttempts, sourceFailures, identityRejected, strong, visualReview:candidates.length-strong };
  }
  if (sourceFailures && !pagesChecked) return { candidates:[], reason:'source-fetch-failed', configured:true, pagesChecked, pageAttempts, sourceFailures, identityRejected };
  return { candidates:[], reason:'direct-no-candidate', configured:true, pagesChecked, pageAttempts, sourceFailures, identityRejected };
}

module.exports = {
  NAVER_WEB_API,
  NAVER_IMAGE_API,
  directQueries,
  directOfficialIdentityEvidence,
  exactOffice,
  extractProfileLinks,
  imageSearchCandidates,
  naverSearchRows,
  discoverDirectCandidates,
  officialSiteKey,
  normalizeOfficialHttps,
  strongPageCandidates
};
