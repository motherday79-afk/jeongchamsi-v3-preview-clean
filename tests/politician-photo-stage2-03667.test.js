const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const officialPath = path.join(root, 'server/v3/lib/politician-photo-official.js');

function official() {
  assert.equal(fs.existsSync(officialPath), true, 'official photo discovery module must exist');
  delete require.cache[require.resolve(officialPath)];
  return require(officialPath);
}

const park = { id:'assembly-131', type:'assembly', name:'박성민', party:'국민의힘', jurisdiction:'울산 중구' };

test('stage2 official discovery only accepts government and National Assembly hosts', () => {
  const { officialHostAllowed } = official();
  assert.equal(officialHostAllowed('https://www.assembly.go.kr/portal/assm/assmMemb/member.do'), true);
  assert.equal(officialHostAllowed('https://www.gangnam.go.kr/board/profile'), true);
  assert.equal(officialHostAllowed('https://mayor.seoul.go.kr/profile'), true);
  assert.equal(officialHostAllowed('https://example.com/profile'), false);
  assert.equal(officialHostAllowed('https://news.example.co.kr/person'), false);
});

test('stage2 page identity rejects same-name wrong party and accepts exact office context', () => {
  const { officialIdentityEvidence } = official();
  assert.equal(officialIdentityEvidence(park, '더불어민주당 청년 정치인 박성민').strong, false);
  assert.equal(officialIdentityEvidence(park, '국민의힘 울산 중구 국회의원 박성민 프로필').strong, true);
});

test('stage2 extracts and ranks at most three profile-like images from a verified official page', () => {
  const { extractOfficialImageCandidates } = official();
  const html = `<!doctype html><html><head><meta property="og:image" content="/img/park-main.jpg"></head><body>
    <img src="/assets/logo.png" alt="기관 로고">
    <img src="/upload/profile_park.jpg" alt="박성민 국회의원 프로필 사진" width="800" height="1067">
    <img src="/upload/event.jpg" alt="행사 사진">
    <img src="/upload/headshot.jpg" title="박성민 의원 사진">
  </body></html>`;
  const rows = extractOfficialImageCandidates(html, 'https://www.assembly.go.kr/member/park', park);
  assert.ok(rows.length >= 1 && rows.length <= 3);
  assert.match(rows[0].url, /^https:\/\/www\.assembly\.go\.kr\//);
  assert.ok(rows.some(x => /profile_park|headshot|park-main/.test(x.url)));
  assert.equal(rows.some(x => /logo\.png/.test(x.url)), false);
});

test('stage2 National Assembly API row match requires name, party and district evidence', () => {
  const { matchAssemblyRow } = official();
  const good = { HG_NM:'박성민', POLY_NM:'국민의힘', ORIG_NM:'울산 중구', NAAS_PIC:'https://www.assembly.go.kr/static/park.jpg' };
  const wrong = { HG_NM:'박성민', POLY_NM:'더불어민주당', ORIG_NM:'비례대표', NAAS_PIC:'https://www.assembly.go.kr/static/other.jpg' };
  assert.equal(matchAssemblyRow(park, good), true);
  assert.equal(matchAssemblyRow(park, wrong), false);
});

test('photo route exposes stage2 discovery, review status and candidate approval without replacing existing assets', () => {
  const route = read('server/v3/routes/politician-photo.js');
  assert.match(route, /discover-batch/);
  assert.match(route, /review-status/);
  assert.match(route, /approve-candidate/);
  assert.match(route, /politicianPhotoReview03667/);
  assert.match(route, /candidate-review/);
  assert.match(route, /if \(existing\.has\(person\.id\)\)/);
});

test('admin exposes stage2 failure buckets and a candidate review inbox with apply buttons', () => {
  const admin = read('src/views/admin.js');
  const app = read('src/app.js');
  assert.match(admin, /2단계 자동수집 시작/);
  assert.match(admin, /후보발견/);
  assert.match(admin, /신원불일치/);
  assert.match(admin, /후보 검수함/);
  assert.match(admin, /data-politician-photo-candidate-apply/);
  assert.match(admin, /discoverPoliticianPhotosStage2/);
  assert.match(app, /data-politician-photo-candidate-apply/);
  assert.match(app, /applyPoliticianPhotoCandidate/);
});

test('stage2 keeps candidate review available while recording image/blob failure causes', () => {
  const route = read('server/v3/routes/politician-photo.js');
  const admin = read('src/views/admin.js');
  assert.match(route, /report-candidate-failure/);
  assert.match(route, /lastFailure/);
  assert.match(admin, /reportPoliticianPhotoCandidateFailure/);
});

test('stage2 official-review assets survive politician photo schema sanitization', () => {
  const schema = read('lib/v3/schema.js');
  assert.match(schema, /auto-official-review/);
});

test('stage2 build markers identify 0.36.67 photo collection build', () => {
  const pkg = JSON.parse(read('package.json'));
  const version = read('src/version.js');
  const index = read('index.html');
  assert.equal(pkg.version, '3.0.0-alpha6.0.36.67');
  assert.match(version, /v3\.0\.0-alpha6\.0\.36\.67/);
  assert.match(version, /POLITICIAN PHOTO COLLECTION STAGE 2/);
  assert.match(index, /alpha6\.0\.36\.67-photo-stage2/);
});
