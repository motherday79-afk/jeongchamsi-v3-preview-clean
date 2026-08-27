const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const directPath = path.join(root, 'server/v3/lib/politician-photo-direct.js');

function direct() {
  assert.equal(fs.existsSync(directPath), true, 'stage3 direct-source discovery module must exist');
  delete require.cache[require.resolve(directPath)];
  return require(directPath);
}

const park = { id:'assembly-131', type:'assembly', name:'박성민', party:'국민의힘', jurisdiction:'울산 중구' };
const gangnam = { id:'basic-001', type:'basic', name:'조성명', party:'국민의힘', jurisdiction:'서울 강남구' };
const seoul = { id:'metropolitan-001', type:'metropolitan', name:'오세훈', party:'국민의힘', jurisdiction:'서울특별시' };

test('stage3 generates source-specific direct queries for assembly, metropolitan and basic politicians', () => {
  const { directQueries } = direct();
  const assembly = directQueries(park);
  const metro = directQueries(seoul);
  const basic = directQueries(gangnam);
  assert.ok(assembly.web.length >= 3);
  assert.ok(assembly.web.some(q => /assembly\.go\.kr/.test(q)));
  assert.ok(assembly.web.some(q => /울산 중구/.test(q)));
  assert.match(assembly.image, /박성민/);
  assert.ok(metro.web.some(q => /열린시장실|시장 프로필/.test(q)));
  assert.ok(basic.web.some(q => /열린구청장실|구청장 프로필/.test(q)));
});

test('stage3 keeps Assembly identity strict but allows party omission on verified local-government profile pages', () => {
  const { directOfficialIdentityEvidence } = direct();
  assert.equal(directOfficialIdentityEvidence(park, '국민의힘 울산 중구 국회의원 박성민 프로필').strong, true);
  assert.equal(directOfficialIdentityEvidence(park, '더불어민주당 울산 중구 국회의원 박성민 프로필').strong, false);
  assert.equal(directOfficialIdentityEvidence(gangnam, '강남구청 열린구청장실 구청장 조성명 프로필 서울 강남구').strong, true);
  assert.equal(directOfficialIdentityEvidence(gangnam, '서울 강남구 시의원 조성명').strong, false);
});

test('stage3 extracts only profile-like internal official links for one-hop crawling', () => {
  const { extractProfileLinks } = direct();
  const html = `<nav>
    <a href="/mayor/profile.do">구청장 프로필</a>
    <a href="/board/profile">구청장 프로필 상세</a>
    <a href="/mayor/history.do">약력</a>
    <a href="https://www.gangnam.go.kr/news/list.do">보도자료</a>
    <a href="https://example.com/profile">외부 프로필</a>
    <a href="/tour/map.do">관광지도</a>
  </nav>`;
  const links = extractProfileLinks(html, 'https://www.gangnam.go.kr/mayor/main.do', gangnam);
  assert.ok(links.some(x => /profile\.do/.test(x.url)));
  assert.ok(links.some(x => /board\/profile/.test(x.url)));
  assert.ok(links.some(x => /history\.do/.test(x.url)));
  assert.equal(links.some(x => /example\.com/.test(x.url)), false);
  assert.equal(links.some(x => /tour\/map/.test(x.url)), false);
  assert.ok(links.length <= 6);
});

test('stage3 NAVER image fallback keeps only official-host images and labels them for visual review', () => {
  const { imageSearchCandidates } = direct();
  const rows = [
    { title:'박성민 국회의원 프로필', link:'https://www.assembly.go.kr/static/member/parksungmin.jpg', sizewidth:'800', sizeheight:'1067' },
    { title:'박성민 정치인', link:'https://news.example.com/photo.jpg', sizewidth:'900', sizeheight:'1200' },
    { title:'동명이인 박성민', link:'https://www.gangnam.go.kr/upload/other.jpg', sizewidth:'500', sizeheight:'700' }
  ];
  const items = imageSearchCandidates(rows, park, '박성민 국회의원 울산 중구 프로필');
  assert.equal(items.length, 1);
  assert.match(items[0].url, /assembly\.go\.kr/);
  assert.equal(items[0].confidence, 'visual-review');
  assert.equal(items[0].sourceKind, 'naver-image-official-host');
});

test('stage3 route exposes direct-source batch discovery and preserves/migrates review state', () => {
  const route = read('server/v3/routes/politician-photo.js');
  assert.match(route, /politician-photo-direct/);
  assert.match(route, /direct-discover-batch/);
  assert.match(route, /discoverDirectCandidates/);
  assert.match(route, /politicianPhotoReview03668/);
  assert.match(route, /politicianPhotoReview03667/);
  assert.match(route, /sourceKind/);
  assert.match(route, /confidence/);
  assert.match(route, /if \(existing\.has\(person\.id\)\)/);
});

test('stage3 review status reports NAVER connectivity and strong vs visual-review candidate counts', () => {
  const route = read('server/v3/routes/politician-photo.js');
  assert.match(route, /naverConfigured/);
  assert.match(route, /strongCandidates/);
  assert.match(route, /visualReviewCandidates/);
  assert.match(route, /directNoCandidate/);
});

test('stage3 collection backend remains available while its retired admin launcher and review workflow stay absent', () => {
  const route = read('server/v3/routes/politician-photo.js');
  const admin = read('src/views/admin.js');
  const app = read('src/app.js');
  assert.match(route, /direct-discover-batch/);
  assert.doesNotMatch(admin, /3단계 직접소스 수집 시작/);
  assert.doesNotMatch(admin, /discoverPoliticianPhotosStage3/);
  assert.doesNotMatch(admin, /후보 검수함/);
  assert.doesNotMatch(app, /discoverPoliticianPhotosStage3/);
  assert.doesNotMatch(app, /data-politician-photo-candidate-apply/);
});

test('stage3 build markers identify 0.36.68 direct-source photo collection build', () => {
  const pkg = JSON.parse(read('package.json'));
  const version = read('src/version.js');
  const index = read('index.html');
  assert.equal(pkg.version, '3.0.0-alpha6.0.36.68');
  assert.match(version, /v3\.0\.0-alpha6\.0\.36\.68/);
  assert.match(version, /POLITICIAN PHOTO COLLECTION STAGE 3/);
  assert.match(index, /alpha6\.0\.36\.68-photo-stage3/);
});

test('stage3 status remains server-side only after admin collection UI retirement', () => {
  const route = read('server/v3/routes/politician-photo.js');
  const admin = read('src/views/admin.js');
  assert.match(route, /stage3Processed/);
  assert.match(route, /stage3Unchecked/);
  assert.doesNotMatch(admin, /stage3Unchecked/);
});

test('stage3 upgrades official http search results to https instead of dropping them', () => {
  const { normalizeOfficialHttps } = direct();
  assert.equal(normalizeOfficialHttps('http://www.gangnam.go.kr/mayor/profile.do'), 'https://www.gangnam.go.kr/mayor/profile.do');
  assert.equal(normalizeOfficialHttps('http://example.com/profile'), '');
  assert.equal(normalizeOfficialHttps('https://www.assembly.go.kr/member'), 'https://www.assembly.go.kr/member');
});

test('stage3 bounds official crawling per politician so one Vercel request cannot fan out without limit', () => {
  const direct = read('server/v3/lib/politician-photo-direct.js');
  assert.match(direct, /MAX_PAGES_PER_PERSON\s*=\s*[0-9]+/);
  assert.match(direct, /DISCOVERY_BUDGET_MS\s*=\s*[0-9_]+/);
  assert.match(direct, /pagesChecked\s*>=\s*MAX_PAGES_PER_PERSON/);
  assert.match(direct, /Date\.now\(\)\s*-\s*startedAt\s*>=\s*DISCOVERY_BUDGET_MS/);
});
