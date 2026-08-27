const fs = require('fs');
const assert = require('assert');

const admin = fs.readFileSync('src/views/admin.js', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
const css = fs.readFileSync('css/pages.css', 'utf8');
const meta = fs.readFileSync('src/data/person-meta.js', 'utf8');

assert(meta.includes('export const PHOTO_PROVIDER_STATUS = "JCS_ASSET";'), '사진 공급자 표기는 JCS_ASSET이어야 함');
assert(!admin.includes('Wikimedia + 공식기관 + 정참시 Blob'), '사진 공급자 보조문구는 제거되어야 함');
assert(!admin.includes('사진 수집 3단계'), '3단계 사진 수집 UI는 제거되어야 함');
assert(!admin.includes('후보 검수함'), '후보 검수함 UI는 제거되어야 함');
assert(!admin.includes('data-politician-photo-harvest'), '수집 실행 UI는 제거되어야 함');
assert(!admin.includes('data-politician-photo-candidate-apply'), '후보 적용 UI는 제거되어야 함');
assert(!admin.includes('data-politician-photo-select'), '중앙 정치인 선택 UI는 제거되어야 함');
assert(!admin.includes('class="politician-photo-workspace"'), '중앙 수기등록 workspace는 제거되어야 함');
assert(!admin.includes('action:"review-status"'), '인물관리 진입 시 후보 검수 fetch 코드가 남아 있으면 안 됨');
assert(!admin.includes('action:"direct-discover-batch"'), '3단계 직접 수집 클라이언트 코드는 제거되어야 함');
assert(!admin.includes('action:"discover-batch"'), '2단계 수집 클라이언트 코드는 제거되어야 함');
assert(!admin.includes('action:"approve-candidate"'), '후보 승인 클라이언트 코드는 제거되어야 함');
assert(!app.includes('data-politician-photo-harvest'), '수집 클릭 이벤트는 제거되어야 함');
assert(!app.includes('data-politician-photo-candidate-apply'), '후보 적용 클릭 이벤트는 제거되어야 함');
assert(!app.includes('data-politician-photo-reset'), '중앙 사진 삭제 클릭 이벤트는 제거되어야 함');
assert(!app.includes('data-politician-photo-select'), '중앙 정치인 선택 change 이벤트는 제거되어야 함');
assert(admin.includes('정참시 자산'), '3카테고리 사진 진단은 유지되어야 함');
assert(admin.includes('data-politician-photo-coverage-load'), '사진 노출 진단 lazy-load는 유지되어야 함');
assert(app.includes('data-detail-politician-photo-trigger'), '상세페이지 관리자 사진 선택 기능은 유지되어야 함');
assert(app.includes('form.matches("[data-politician-photo-form]")'), '상세페이지 사진 저장 submit은 유지되어야 함');
assert(!css.includes('.politician-photo-harvest{'), '삭제된 수집 UI CSS도 제거되어야 함');
assert(!css.includes('.politician-photo-review{'), '삭제된 후보검수 UI CSS도 제거되어야 함');
assert(!css.includes('.politician-photo-picker{'), '삭제된 중앙 선택 UI CSS도 제거되어야 함');
assert(!css.includes('.politician-photo-workspace{'), '삭제된 중앙 workspace CSS도 제거되어야 함');

console.log('admin photo management consolidation tests passed');
