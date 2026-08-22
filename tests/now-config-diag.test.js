const fs=require('fs');
const assert=require('assert');
const admin=fs.readFileSync('src/views/admin.js','utf8');
const app=fs.readFileSync('src/app.js','utf8');
assert(admin.includes('missingEnv:b.missingEnv'),'nowApi must preserve missingEnv from failed server responses');
assert(app.includes('r.missingEnv || r.missingConfig'),'alert must display missingEnv returned by server');
console.log('now-config-diag tests passed');
