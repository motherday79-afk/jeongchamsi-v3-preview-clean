const fs = require('fs');
const assert = require('assert');

const admin = fs.readFileSync('src/views/admin.js', 'utf8');
const meta = fs.readFileSync('src/data/person-meta.js', 'utf8');

const expectedCopy = 'Leveraging the Collective Intelligence of Three Leading LLMs and the JEONGCHAMSI Intelligent Data Analysis System, We Deliver Optimized Solutions.';
assert(admin.includes(expectedCopy), '관리자 상단 문구가 전체 영어 문장이어야 함');
assert(!admin.includes('3대 LLM의 집단사고와 JEONGCHAMSI'), '한영 혼합 기존 문구가 남아 있으면 안 됨');
assert(meta.includes('export const PHOTO_PROVIDER_STATUS = "JCS_ASSET";'), '사진 공급자는 JCS_ASSET이어야 함');
assert(!meta.includes('PHOTO_ASSET_542_COMMONS'), 'PHOTO_ASSET_542_COMMONS 계열 문구는 완전 삭제되어야 함');
console.log('admin copy/provider hotfix tests passed');
