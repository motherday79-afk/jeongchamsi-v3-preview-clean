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

test('politician detail renders live NOW intelligence and evidence sections without raw search counts',()=>{
  const people=fs.readFileSync(path.join(root,'src/views/people.js'),'utf8');
  assert.match(people,/getNowPerson/);
  assert.match(people,/정참시 SIGNAL/);
  assert.match(people,/종합 관심/);
  assert.match(people,/심층 관심/);
  assert.match(people,/대중 확산/);
  assert.match(people,/최근 뉴스/);
  assert.match(people,/정참시 종합진단/);
  assert.doesNotMatch(people,/PC 검색량/);
  assert.doesNotMatch(people,/모바일 검색량/);
});
