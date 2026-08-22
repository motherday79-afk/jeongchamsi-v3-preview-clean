const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
const admin=read('src/views/admin.js');
const route=read('server/v3/routes/admin/now-data.js');
const app=read('src/app.js');
function assert(v,msg){if(!v)throw new Error(msg)}
assert(/data-now-refresh[^>]*>전체 데이터 새로고침<\/button>/.test(admin),'refresh button must render');
assert(!/data-now-refresh\s+\$\{ready\s*\?\s*""\s*:\s*"disabled"\}/.test(admin),'refresh button must not be disabled by provider readiness');
assert(route.includes("NAVER_CONFIG_REQUIRED"),'start must return explicit config error');
assert(route.includes('missingGroups'),'route must expose logical provider groups');
assert(app.includes('missingGroups'),'client must preserve logical provider groups');
console.log('now refresh activation contract ok');
