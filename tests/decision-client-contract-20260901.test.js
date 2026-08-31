const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const repo=()=>fs.readFileSync(path.join(__dirname,'../src/core/decision-repository.js'),'utf8');
const app=()=>fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');

test('decision repository exposes admin read and write actions through one endpoint',()=>{
  const text=repo();
  for(const fn of ['getAdminDecisionPerson','createAdminDecisionCase','closeAdminDecisionCase','addAdminDecisionAction','updateAdminDecisionActionNote','getAdminDecisionPeople'])assert.match(text,new RegExp(`export async function ${fn}\\b`));
  assert.match(text,/\/api\/v3\/admin\/decision/);
  assert.match(text,/credentials:\s*["']same-origin["']/);
  for(const action of ['case-create','case-close','action-add','action-note-update'])assert.match(text,new RegExp(action));
});

test('app wires case create close and action form data attributes',()=>{
  const text=app();
  for(const attr of ['data-decision-case-create','data-decision-case-close','data-decision-action-form','data-decision-action-note-form'])assert.match(text,new RegExp(attr));
  assert.match(text,/decision-repository\.js/);
  assert.match(text,/refreshAdminDecisionSlot/);
});

test('decision UI modules and shell assets are cache-busted for deployment',()=>{
  const text=app();const index=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
  assert.match(text,/views\/people\.js\?v=[^"']*decision-v1/);
  assert.match(text,/views\/features\.js\?v=[^"']*decision-v1/);
  assert.match(index,/pages\.css\?v=[^"']*decision-v1/);
  assert.match(index,/src\/app\.js\?v=[^"']*decision-v1/);
});
