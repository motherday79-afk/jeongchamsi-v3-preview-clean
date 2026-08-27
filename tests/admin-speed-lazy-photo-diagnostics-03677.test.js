const fs=require('fs');
const assert=require('assert');

const admin=fs.readFileSync('src/views/admin.js','utf8');
const app=fs.readFileSync('src/app.js','utf8');
const css=fs.readFileSync('css/pages.css','utf8');

const peopleStart=admin.indexOf('async function peoplePanel()');
const peopleEnd=admin.indexOf('\nasync function boardPanel(', peopleStart);
assert(peopleStart >= 0 && peopleEnd > peopleStart, 'peoplePanel 범위를 찾을 수 있어야 합니다');
const peoplePanel=admin.slice(peopleStart, peopleEnd);

assert(!peoplePanel.includes('fetchPoliticianPhotoCoverageStatus("assembly")'), '인물관리 첫 진입에서 국회의원 외부 진단을 자동 실행하면 안 됩니다');
assert(!peoplePanel.includes('fetchPoliticianPhotoCoverageStatus("metropolitan")'), '인물관리 첫 진입에서 광역 외부 진단을 자동 실행하면 안 됩니다');
assert(!peoplePanel.includes('fetchPoliticianPhotoCoverageStatus("basic")'), '인물관리 첫 진입에서 기초 외부 진단을 자동 실행하면 안 됩니다');
assert(admin.includes('POLITICIAN_PHOTO_COVERAGE_CACHE_TTL'), '외부 사진 진단 결과의 짧은 클라이언트 캐시가 필요합니다');
assert(admin.includes('export async function loadPoliticianPhotoCoverageDiagnostic'), '사용자 클릭 시 진단을 불러오는 함수가 필요합니다');
assert(app.includes('[data-politician-photo-coverage-load]'), '진단 클릭을 처리하는 이벤트가 필요합니다');
assert(admin.includes('외부 fallback 진단'), '외부 fallback은 클릭해서 진단할 수 있어야 합니다');

const hero='Leveraging the Collective Intelligence of Three Leading LLMs and the JEONGCHAMSI Intelligent Data Analysis System, We Deliver Optimized Solutions.';
assert(admin.includes(hero), '관리자 히어로 문구가 새 문구로 교체되어야 합니다');
assert(!admin.includes('회원·콘텐츠·참여기능을 동일한 서버 Source of Truth에서 관리합니다'), '기존 관리자 히어로 문구는 제거되어야 합니다');

const triggerTop=(css.match(/^\.detail-photo-admin-trigger\{/gm)||[]).length;
const stateTop=(css.match(/^\.detail-photo-admin-state\{/gm)||[]).length;
assert.strictEqual(triggerTop,1,'detail-photo-admin-trigger 최상위 규칙은 덮어쓰기 없이 하나여야 합니다');
assert.strictEqual(stateTop,1,'detail-photo-admin-state 최상위 규칙은 덮어쓰기 없이 하나여야 합니다');

console.log('admin lazy photo diagnostics and speed cleanup tests passed');
