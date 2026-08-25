const { identityEvidence, normalize } = require('./politician-photo-resolver');

const NAVER_WEB_API = 'https://naverapihub.apigw.ntruss.com/search/v1/webkr';
const ASSEMBLY_API = 'https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER';
const TIMEOUT_MS = 9000;
const USER_AGENT = 'JCV3-Official-Politician-Photo/0.36.67';

function cleanHtml(value = '') {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function officialHostAllowed(value = '') {
  try {
    const host = new URL(String(value || '')).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'assembly.go.kr' || host.endsWith('.assembly.go.kr') || host.endsWith('.go.kr') || host === 'korea.kr' || host.endsWith('.korea.kr');
  } catch { return false; }
}

function publicHttpsUrl(value = '') {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (!host || host === 'localhost' || host === '::1' || host.endsWith('.local')) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
    const m = host.match(/^172\.(\d+)\./);
    if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
    return true;
  } catch { return false; }
}

function officeWords(person = {}) {
  if (person.type === 'assembly') return ['국회의원', '국회', '의원'];
  if (person.type === 'metropolitan') return ['시장', '도지사', '광역단체장'];
  const region = String(person.jurisdiction || '');
  if (/군(?:\s|$)/.test(region) || /군$/.test(region)) return ['군수', '기초단체장'];
  if (/구(?:\s|$)/.test(region) || /구$/.test(region)) return ['구청장', '기초단체장'];
  return ['시장', '기초단체장'];
}

function officialIdentityEvidence(person, value = '') {
  return identityEvidence(person, cleanHtml(value));
}

function absoluteUrl(value = '', pageUrl = '') {
  const raw = String(value || '').trim().replace(/&amp;/g, '&');
  if (!raw || /^(?:data|javascript):/i.test(raw)) return '';
  try {
    const u = new URL(raw, pageUrl);
    return publicHttpsUrl(u.href) ? u.href : '';
  } catch { return ''; }
}

function attrValue(tag = '', name = '') {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = String(tag).match(re);
  return m ? (m[1] || m[2] || m[3] || '') : '';
}

function candidateScore(url, label, person, index = 0, isOg = false) {
  const text = `${url} ${label}`.toLowerCase();
  let score = 120 - index * 3 + (isOg ? 35 : 0);
  if (String(label || '').includes(person.name)) score += 180;
  if (/(profile|portrait|headshot|프로필|인물|member|mayor|governor|photo)/i.test(text)) score += 90;
  if (/(logo|symbol|emblem|banner|icon|map|header|footer|qr)/i.test(text)) score -= 350;
  if (/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)) score += 25;
  return score;
}

function extractOfficialImageCandidates(html = '', pageUrl = '', person = {}) {
  if (!officialHostAllowed(pageUrl)) return [];
  const raw = String(html || '');
  const rows = [];
  const seen = new Set();
  const add = (src, label = '', index = 0, isOg = false) => {
    const url = absoluteUrl(src, pageUrl);
    if (!url || seen.has(url)) return;
    const score = candidateScore(url, label, person, index, isOg);
    if (score < 90) return;
    seen.add(url);
    rows.push({ url, score, label:cleanHtml(label).slice(0,160) });
  };

  const metaRe = /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:image|twitter:image)["'][^>]*>/gi;
  let m; let idx = 0;
  while ((m = metaRe.exec(raw))) add(attrValue(m[0], 'content'), '대표 이미지', idx++, true);

  const imgRe = /<img\b[^>]*>/gi;
  idx = 0;
  while ((m = imgRe.exec(raw))) {
    const tag = m[0];
    const src = attrValue(tag, 'src') || attrValue(tag, 'data-src') || attrValue(tag, 'data-original');
    const label = [attrValue(tag, 'alt'), attrValue(tag, 'title'), attrValue(tag, 'class'), attrValue(tag, 'id')].filter(Boolean).join(' ');
    add(src, label, idx++, false);
  }
  return rows.sort((a,b)=>b.score-a.score).slice(0,3);
}

function compact(value = '') { return normalize(value).replace(/[갑을병정무]$/,''); }
function matchAssemblyRow(person = {}, row = {}) {
  if (person.type !== 'assembly') return false;
  if (compact(row.HG_NM) !== compact(person.name)) return false;
  const party = compact(person.party);
  const rowParty = compact(row.POLY_NM);
  if (party && party !== '무소속' && rowParty !== party) return false;
  const region = compact(person.jurisdiction);
  const rowRegion = compact(row.ORIG_NM);
  if (!region || !rowRegion || !(region.includes(rowRegion) || rowRegion.includes(region))) return false;
  return publicHttpsUrl(row.NAAS_PIC || '');
}

function naverCredentials() {
  const id = String(process.env.NAVER_API_HUB_CLIENT_ID || '').trim();
  const secret = String(process.env.NAVER_API_HUB_CLIENT_SECRET || '').trim();
  return { configured:Boolean(id && secret), id, secret };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const ctl = new AbortController();
  const timer = setTimeout(()=>ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal:ctl.signal, headers:{ 'user-agent':USER_AGENT, 'accept-language':'ko,en;q=0.8', ...(options.headers || {}) } });
  } finally { clearTimeout(timer); }
}

function assemblyRows(payload) {
  const blocks = payload?.ALLNAMEMBER;
  if (!Array.isArray(blocks)) return [];
  for (const block of blocks) if (Array.isArray(block?.row)) return block.row;
  return [];
}

async function assemblyApiCandidates(person) {
  if (person.type !== 'assembly') return { candidates:[], attempted:false, reason:'not-assembly' };
  const key = String(process.env.ASSEMBLY_OPENAPI_KEY || '').trim();
  if (!key) return { candidates:[], attempted:false, reason:'assembly-key-missing' };
  const u = new URL(ASSEMBLY_API);
  Object.entries({KEY:key,Type:'json',pIndex:'1',pSize:'30',AGE:'22',HG_NM:person.name}).forEach(([k,v])=>u.searchParams.set(k,v));
  try {
    const r = await fetchWithTimeout(u.href, { headers:{accept:'application/json'} });
    if (!r.ok) return { candidates:[], attempted:true, reason:'source-fetch-failed' };
    const json = await r.json();
    const rows = assemblyRows(json);
    const matches = rows.filter(row => matchAssemblyRow(person,row));
    const candidates = matches.slice(0,3).map((row,i)=>({
      url:String(row.NAAS_PIC), sourcePage:'https://open.assembly.go.kr/', provider:'assembly-openapi', score:980-i,
      licenseHint:'국회사무처 Open API · 이용조건/출처표시 확인', verification:[`열린국회정보: ${row.HG_NM}`,`정당 ${row.POLY_NM}`,`선거구 ${row.ORIG_NM}`]
    }));
    return { candidates, attempted:true, reason:candidates.length ? '' : (rows.some(row=>compact(row.HG_NM)===compact(person.name)) ? 'identity-rejected' : 'no-candidate') };
  } catch { return { candidates:[], attempted:true, reason:'source-fetch-failed' }; }
}

function webQueries(person = {}) {
  const office = officeWords(person)[0];
  const region = String(person.jurisdiction || '').trim();
  if (person.type === 'assembly') return [
    `${person.name} ${office} ${region} 프로필 site:assembly.go.kr`,
    `${person.name} ${office} ${person.party || ''} 공식 프로필`
  ];
  return [
    `${person.name} ${office} ${region} 프로필 site:go.kr`,
    `${person.name} ${office} ${region} 열린${office}실`
  ];
}

async function naverWebRows(query) {
  const c = naverCredentials();
  if (!c.configured) return { rows:[], configured:false };
  const u = new URL(NAVER_WEB_API);
  Object.entries({query,display:'15',start:'1',format:'json'}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r = await fetchWithTimeout(u.href, { headers:{'X-NCP-APIGW-API-KEY-ID':c.id,'X-NCP-APIGW-API-KEY':c.secret,accept:'application/json'} }, 7000);
  if (!r.ok) throw new Error(`NAVER_WEB_${r.status}`);
  const json = await r.json();
  return { rows:Array.isArray(json?.items) ? json.items : [], configured:true };
}

function licenseHint(text = '') {
  const clean = cleanHtml(text);
  if (/공공누리\s*(?:제)?\s*1\s*유형|출처표시\s*제?1유형/i.test(clean)) return '공공누리 제1유형 표기 감지';
  if (/공공누리\s*(?:제)?\s*2\s*유형|상업적\s*이용금지/i.test(clean)) return '공공누리 제2유형/상업이용 제한 표기 감지';
  if (/공공누리/i.test(clean)) return '공공누리 표기 감지 · 유형 확인 필요';
  return '공식기관 페이지 · 이미지 이용조건 수동 확인';
}

async function discoverOfficialCandidates(person = {}) {
  const assembly = await assemblyApiCandidates(person);
  if (assembly.candidates.length) return { candidates:assembly.candidates.slice(0,3), reason:'candidate-review', provider:'assembly-openapi' };

  const c = naverCredentials();
  if (!c.configured) return { candidates:[], reason:assembly.reason === 'source-fetch-failed' ? 'source-fetch-failed' : 'no-candidate', detail:'NAVER_API_HUB_MISSING' };

  let sourceFailures = 0;
  let identityRejected = 0;
  const candidates = [];
  const seenPages = new Set();
  for (const query of webQueries(person)) {
    let rows=[];
    try { rows = (await naverWebRows(query)).rows; }
    catch { sourceFailures += 1; continue; }
    for (const row of rows) {
      const pageUrl = String(row?.link || '').trim();
      if (!officialHostAllowed(pageUrl) || seenPages.has(pageUrl)) continue;
      seenPages.add(pageUrl);
      let html='';
      try {
        const response = await fetchWithTimeout(pageUrl, { headers:{accept:'text/html,application/xhtml+xml'} }, 8500);
        const type = String(response.headers.get('content-type') || '').toLowerCase();
        if (!response.ok || !type.includes('text/html')) { sourceFailures += 1; continue; }
        html = (await response.text()).slice(0, 1_500_000);
      } catch { sourceFailures += 1; continue; }
      const context = `${row.title || ''} ${row.description || ''} ${cleanHtml(html).slice(0,120000)}`;
      const evidence = officialIdentityEvidence(person, context);
      if (!evidence.strong) { identityRejected += 1; continue; }
      const images = extractOfficialImageCandidates(html,pageUrl,person);
      const hint = licenseHint(html);
      for (const img of images) {
        if (candidates.some(x=>x.url===img.url)) continue;
        candidates.push({
          url:img.url, sourcePage:pageUrl, provider:'official-web', score:img.score + 400,
          licenseHint:hint,
          verification:[`공식기관 페이지: ${new URL(pageUrl).hostname}`,`이름·정당·직위·지역 문맥 확인`,img.label ? `이미지 문맥: ${img.label}` : '페이지 대표 이미지']
        });
        if (candidates.length >= 3) break;
      }
      if (candidates.length >= 3) break;
    }
    if (candidates.length >= 3) break;
  }
  if (candidates.length) return { candidates:candidates.sort((a,b)=>b.score-a.score).slice(0,3), reason:'candidate-review', provider:'official-web' };
  if (identityRejected) return { candidates:[], reason:'identity-rejected', identityRejected, sourceFailures };
  if (sourceFailures) return { candidates:[], reason:'source-fetch-failed', sourceFailures };
  return { candidates:[], reason:'no-candidate' };
}

module.exports = {
  NAVER_WEB_API, ASSEMBLY_API, officialHostAllowed, publicHttpsUrl, officialIdentityEvidence,
  extractOfficialImageCandidates, matchAssemblyRow, naverCredentials, assemblyRows, licenseHint,
  discoverOfficialCandidates, fetchWithTimeout
};
