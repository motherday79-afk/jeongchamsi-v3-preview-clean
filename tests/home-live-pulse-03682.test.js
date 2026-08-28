const fs = require('fs');
const assert = require('assert');

const home = fs.readFileSync('src/views/home.js', 'utf8');
const css = fs.readFileSync('css/pages.css', 'utf8');

const pulseUses = (home.match(/class="main-live-pulse"/g) || []).length;
assert.strictEqual(pulseUses, 3, '메인 LIVE PULSE는 NOW RANK/정치키워드/급상승 정치인 정확히 3곳이어야 합니다');
assert.match(home, /NOW RANK[\s\S]{0,180}main-live-pulse/, 'NOW RANK에 LIVE PULSE가 있어야 합니다');
assert.match(home, /실시간 정치키워드[\s\S]{0,180}main-live-pulse/, '실시간 정치키워드에 LIVE PULSE가 있어야 합니다');
assert.match(home, /실시간 급상승 정치인[\s\S]{0,180}main-live-pulse/, '실시간 급상승 정치인에 LIVE PULSE가 있어야 합니다');
assert.match(css, /\.main-live-pulse\{/, 'LIVE PULSE CSS가 있어야 합니다');
assert.match(css, /@keyframes main-live-ring/, 'LIVE PULSE ring animation이 있어야 합니다');
assert.match(css, /prefers-reduced-motion[\s\S]*main-live-pulse/, 'reduced-motion 대응이 있어야 합니다');
assert.ok(!/main-live-pulse[^\n]*(?:url\(|\.gif|lottie)/i.test(css), 'LIVE PULSE는 이미지/GIF/Lottie를 사용하면 안 됩니다');
console.log('home live pulse tests passed');

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('src/app.js', 'utf8');
assert.match(index, /03686-data-intensity-axis/, 'index cache marker가 03683로 갱신되어야 합니다');
assert.match(app, /\.\/views\/home\.js\?v=03683/, '동적 home.js import도 03683로 cache-bust 해야 합니다');
