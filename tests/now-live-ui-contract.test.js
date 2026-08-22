const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('home sidebar consumes derived published NOW signals',()=>{
  const home=fs.readFileSync(path.join(root,'src/views/home.js'),'utf8');
  assert.match(home,/data\.nowSignals/);
  assert.match(home,/trendLabel/);
  assert.match(home,/실시간 정치키워드/);
  assert.match(home,/실시간 급상승 정치인/);
});

test('public NOW API route is wired in gateway',()=>{
  const gateway=fs.readFileSync(path.join(root,'api/gateway.js'),'utf8');
  assert.match(gateway,/"now-data"/);
  assert.ok(fs.existsSync(path.join(root,'server/v3/routes/now-data.js')));
});

test('politician detail renders live NOW, search and news sections',()=>{
  const people=fs.readFileSync(path.join(root,'src/views/people.js'),'utf8');
  assert.match(people,/getNowPerson/);
  assert.match(people,/지금 이 인물/);
  assert.match(people,/PC 검색량/);
  assert.match(people,/모바일 검색량/);
  assert.match(people,/최근 뉴스/);
  assert.match(people,/왜 지금 주목받나요/);
});
