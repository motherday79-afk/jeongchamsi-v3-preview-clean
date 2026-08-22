const assert=require('assert');
const path=require('path');

const modPath=path.resolve(__dirname,'../server/v3/lib/naver-searchad.js');
const saved={
  a:process.env.NAVER_AD_ACCESS_LICENSE,
  s:process.env.NAVER_AD_SECRET_KEY,
  c:process.env.NAVER_AD_CUSTOMER_ID,
};
delete process.env.NAVER_AD_ACCESS_LICENSE;
delete process.env.NAVER_AD_SECRET_KEY;
delete process.env.NAVER_AD_CUSTOMER_ID;
delete require.cache[modPath];
const {credentials}=require(modPath);
const got=credentials();
assert.equal(got.configured,true,'bundled v2 Search Ads credentials should allow refresh when Vercel env is absent');
assert.ok(got.accessLicense&&got.secretKey&&got.customerId,'all three Search Ads credential fields should be present');

if(saved.a===undefined) delete process.env.NAVER_AD_ACCESS_LICENSE; else process.env.NAVER_AD_ACCESS_LICENSE=saved.a;
if(saved.s===undefined) delete process.env.NAVER_AD_SECRET_KEY; else process.env.NAVER_AD_SECRET_KEY=saved.s;
if(saved.c===undefined) delete process.env.NAVER_AD_CUSTOMER_ID; else process.env.NAVER_AD_CUSTOMER_ID=saved.c;
console.log('searchad bundled fallback test passed');
