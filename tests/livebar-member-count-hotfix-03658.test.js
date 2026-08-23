const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadSiteHeader() {
  let source = fs.readFileSync(require.resolve('../src/views/layout.js'), 'utf8');
  source = source
    .replace(/^import .*;\s*$/gm, '')
    .replace(/\bexport\s+(?=(?:const|function)\b)/g, '');
  const context = {
    module: { exports: {} },
    exports: {},
    APP_VERSION: 'test',
    BUILD_NAME: 'test',
    SERVICE_CATALOG: [],
    serviceIconSvg: () => '',
    getUserSession: () => ({ authenticated: false, user: null }),
  };
  vm.runInNewContext(`${source}\nmodule.exports = { siteHeader };`, context);
  return context.module.exports.siteHeader;
}

test('non-home page header leaves unknown member count unresolved so livebar hydration fetches the real count', () => {
  const siteHeader = loadSiteHeader();
  const html = siteHeader();
  assert.match(html, /data-member-count=""/);
  assert.match(html, /data-livebar-count>…<\/b>/);
  assert.doesNotMatch(html, /data-livebar-count>0<\/b>/);
});

test('home page header still renders an already-known member count immediately', () => {
  const siteHeader = loadSiteHeader();
  const html = siteHeader({ memberCount: 6 });
  assert.match(html, /data-member-count="6"/);
  assert.match(html, /data-livebar-count>6<\/b>/);
});
