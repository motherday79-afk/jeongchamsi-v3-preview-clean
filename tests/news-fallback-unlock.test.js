const assert=require('assert');
const news=require('../server/v3/lib/naver-news');

assert.equal(news.availability().available,true,'news fallback must always be available');
const sample=`<?xml version="1.0"?><rss><channel><item><title>홍길동 국회의원 정책 발표 - 테스트신문</title><link>https://news.google.com/rss/articles/x</link><pubDate>Sat, 22 Aug 2026 15:00:00 GMT</pubDate><description>홍길동 국회의원 국회 정책 발표</description><source url="https://example.com">테스트신문</source></item></channel></rss>`;
const rows=news.parseGoogleRss(sample);
assert.equal(rows.length,1);
assert.equal(rows[0].provider,'google-news-rss-fallback');
assert(rows[0].title.includes('홍길동'));
console.log('news fallback unlock test passed');
