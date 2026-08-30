const assert=require('assert');
const fs=require('fs');
const path=require('path');

const helperPath=path.join(__dirname,'../server/v3/lib/now-publish-payload.js');
const routePath=path.join(__dirname,'../server/v3/routes/admin/now-data.js');

function hugeHeadline(i){
  return {
    title:`headline ${i}`,
    link:`https://news.example.com/article/${i}?utm_source=`+'x'.repeat(400),
    source:'Example News',
    ts:Date.now()-i*1000,
    description:'D'.repeat(24000),
    rawHtml:'H'.repeat(8000),
    providerPayload:{blob:'P'.repeat(6000)}
  };
}
function personView(i){
  const headlines=Array.from({length:12},(_,j)=>hugeHeadline(i*100+j));
  return {
    row:{
      rank:i+1,score:72.4,state:'READY',searchScore:60,newsScore:80,
      person:{id:`p${i}`,name:`Person ${i}`,type:'assembly',roleLabel:'국회의원',party:'P',jurisdiction:'서울',office:'국회의원'},
      search:{state:'READY',monthlyPcQcCnt:1000,monthlyMobileQcCnt:2000,monthlyTotalQcCnt:3000,ambiguousName:false,rawResponse:'S'.repeat(12000)},
      news:{state:'READY',count6:3,count24:12,count7d:45,sources24:8,latest:headlines[0],headlines,rawItems:Array(10).fill('R'.repeat(6000))},
      providers:['naver-search-ads','naver-news'],
      debug:{trace:'T'.repeat(12000)}
    },
    draftId:'draft-x',rankDelta:2,previousRank:i+3,categoryRank:i+1,categoryLabel:'국회의원',
    rankHistory:[{draftId:'old',publishedAt:'2026-08-30T00:00:00.000Z',globalRank:i+3}],
    trendLabel:'▲ 2',whyNow:'현재 이슈 흐름',
    related:[{rank:2,score:50,person:{id:'p2',name:'Other',party:'P',jurisdiction:'서울'}}],
    publishedAt:'2026-08-31T00:00:00.000Z',
    analysis:{scores:{overallInterest:71,issueHeat:66},grades:{overallInterest:'높음'},audience:{position:55,label:'균형'},mediaPublic:{direction:'balanced'},signal:{label:'관심확대형',diagnosis:'진단'},model:'JCS'},
    trend:{schemaVersion:1,points:[{draftId:'old',publishedAt:'2026-08-30T00:00:00.000Z',scores:{overallInterest:65}}]}
  };
}

(function run(){
  const helper=require(helperPath);
  assert.strictEqual(typeof helper.fitPersonPublishEntries,'function','fitPersonPublishEntries must exist');
  assert.strictEqual(typeof helper.compactPersonPublicView,'function','compactPersonPublicView must exist');

  const entries=Array.from({length:40},(_,i)=>[`nowDataPersonPublic:p${i}`,personView(i)]);
  const before=helper.requestBytes(entries);
  assert(before>10_485_760,`fixture must exceed Upstash 10MB, got ${before}`);
  const fitted=helper.fitPersonPublishEntries(entries,9_500_000);
  assert(fitted.bytes<=9_500_000,`person MSET must be <= 9.5MB, got ${fitted.bytes}`);
  assert(fitted.savedBytes>0,'compaction must save bytes');

  const view=fitted.entries[0][1];
  assert.strictEqual(view.row.person.id,'p0');
  assert.strictEqual(view.row.search.monthlyTotalQcCnt,3000);
  assert.strictEqual(view.row.news.count24,12);
  assert.strictEqual(view.row.news.headlines.length,12,'needed recent-news rows must remain');
  assert(view.row.news.headlines[0].link.startsWith('https://news.example.com/article/0'),'news link must remain');
  assert.strictEqual(view.row.news.headlines[0].title,'headline 0');
  assert.strictEqual(view.analysis.scores.overallInterest,71,'analysis must remain');
  assert.strictEqual(view.trend.points.length,1,'trend must remain');
  assert.strictEqual(view.whyNow,'현재 이슈 흐름','whyNow must remain');
  assert(!('description' in view.row.news.headlines[0]),'redundant description must be removed');
  assert(!('rawHtml' in view.row.news.headlines[0]),'raw provider html must be removed');
  assert(!('rawResponse' in view.row.search),'raw search payload must be removed');
  assert(!('debug' in view.row),'debug payload must be removed');

  const small=[[entries[0][0],helper.compactPersonPublicView(entries[0][1])]];
  const unchanged=helper.fitPersonPublishEntries(small,9_500_000);
  assert.strictEqual(unchanged.phase,'unchanged','already-small payload must not be rewritten');

  const route=fs.readFileSync(routePath,'utf8');
  assert(/fitPersonPublishEntries/.test(route),'publish route must use person payload fitter');
  assert(/const \{\s*fitNowPublishEntries\s*,\s*fitPersonPublishEntries\s*\}\s*=\s*require\('\.\.\/\.\.\/lib\/now-publish-payload'\)/.test(route),'publish route must import person payload fitter');
  assert(/writePersonEntries[\s\S]{0,1000}fitPersonPublishEntries/.test(route),'writePersonEntries must fit every person chunk before msetJSON');

  console.log('plan-a-person-entry-payload: PASS');
})();
