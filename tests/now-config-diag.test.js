const fs=require('fs');
const assert=require('assert');
const admin=fs.readFileSync('src/views/admin.js','utf8');
const app=fs.readFileSync('src/app.js','utf8');
assert(admin.includes('missingGroups:b.missingGroups'),'nowApi must preserve logical provider groups from failed server responses');
assert(app.includes('r.missingGroups || []'),'alert must display logical provider groups returned by server');
assert(!app.includes('없는 환경변수'),'raw environment variable names must not be shown to admin users');
console.log('now-config-diag tests passed');
