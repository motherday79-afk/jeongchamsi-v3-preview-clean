const fs = require('fs');
const assert = require('assert');

const admin = fs.readFileSync('src/views/admin.js','utf8');

assert.match(admin, /fetchPoliticianPhotoCoverageStatus\("assembly"\)/, '국회의원 진단 조회가 필요합니다');
assert.match(admin, /fetchPoliticianPhotoCoverageStatus\("metropolitan"\)/, '광역단체장 진단 조회가 필요합니다');
assert.match(admin, /fetchPoliticianPhotoCoverageStatus\("basic"\)/, '기초단체장 진단 조회가 필요합니다');
assert.match(admin, /국회의원 사진 노출 진단/, '국회의원 진단 섹션이 필요합니다');
assert.match(admin, /광역단체장 사진 노출 진단/, '광역단체장 진단 섹션이 필요합니다');
assert.match(admin, /기초단체장 사진 노출 진단/, '기초단체장 진단 섹션이 필요합니다');
assert.match(admin, /<details[^>]*class="politician-photo-coverage-list"/, '진단 인물 목록은 접이식 details여야 합니다');
assert.match(admin, /외부 fallback/, '외부 fallback 항목이 필요합니다');
assert.match(admin, /사진 미노출/, '사진 미노출 항목이 필요합니다');
assert.match(admin, /\/person\/\$\{esc\(encodeURIComponent\(item\.id\)\)\}/, '진단 목록에서 정치인 상세로 이동할 수 있어야 합니다');

console.log('politician photo admin three-category diagnostics: ok');
