const { getJSON, setJSON } = require('./redis');

const PUBLIC_ORIGIN = 'https://jeongchamsi-v3-preview-clean.vercel.app';
const MAX_DEVICES = 5000;
const MAX_HISTORY = 100;

function firebaseConfig() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
  if (!raw || !projectId) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    return { projectId, serviceAccount: parsed };
  } catch {
    return null;
  }
}

function configured() { return !!firebaseConfig(); }

async function registerDevice(input = {}) {
  const token = String(input.token || '').trim();
  if (token.length < 40 || token.length > 4096) return { ok:false, error:'INVALID_PUSH_TOKEN' };
  const platform = String(input.platform || 'android').slice(0, 20);
  const appVersion = String(input.appVersion || '').slice(0, 40);
  const now = new Date().toISOString();
  const current = (await getJSON('pushDevices')) || { items:[] };
  const items = Array.isArray(current.items) ? current.items : [];
  const previous = items.find(x => String(x.token) === token);
  const record = { token, platform, appVersion, createdAt: previous?.createdAt || now, lastSeenAt: now };
  current.items = [record, ...items.filter(x => String(x.token) !== token)].slice(0, MAX_DEVICES);
  await setJSON('pushDevices', current);
  return { ok:true, registered:true };
}

async function status() {
  const current = (await getJSON('pushDevices')) || { items:[] };
  const history = (await getJSON('pushHistory')) || { items:[] };
  const items = Array.isArray(current.items) ? current.items : [];
  return {
    ok:true,
    configured:configured(),
    devices:items.length,
    latest:items.slice(0,5).map(x => ({ platform:x.platform, appVersion:x.appVersion, lastSeenAt:x.lastSeenAt })),
    history:(history.items || []).slice(0,10)
  };
}

function normalizeTarget(raw = '') {
  const value = String(raw || '').trim();
  if (!value) return PUBLIC_ORIGIN + '/';
  if (value.startsWith('/')) return PUBLIC_ORIGIN + value;
  try {
    const url = new URL(value);
    if (url.origin !== PUBLIC_ORIGIN) return PUBLIC_ORIGIN + '/';
    return url.toString();
  } catch { return PUBLIC_ORIGIN + '/'; }
}

async function messaging() {
  const cfg = firebaseConfig();
  if (!cfg) { const e = new Error('FIREBASE_NOT_CONFIGURED'); e.code = 'FIREBASE_NOT_CONFIGURED'; throw e; }
  const { getApps, initializeApp, cert } = require('firebase-admin/app');
  const { getMessaging } = require('firebase-admin/messaging');
  const app = getApps()[0] || initializeApp({ credential:cert(cfg.serviceAccount), projectId:cfg.projectId });
  return getMessaging(app);
}

async function sendPush(input = {}, operatorId = '') {
  const title = String(input.title || '').trim().slice(0, 80);
  const body = String(input.body || '').trim().slice(0, 240);
  const image = /^https:\/\//i.test(String(input.image || '').trim()) ? String(input.image).trim().slice(0, 1200) : '';
  const targetUrl = normalizeTarget(input.targetUrl);
  const scope = input.scope === 'test' ? 'test' : 'all';
  if (!title || !body) return { ok:false, error:'PUSH_TITLE_BODY_REQUIRED' };

  const current = (await getJSON('pushDevices')) || { items:[] };
  let devices = Array.isArray(current.items) ? current.items.filter(x => x.token) : [];
  if (scope === 'test') devices = devices.slice(0, 1);
  if (!devices.length) return { ok:false, error:'NO_PUSH_DEVICES' };

  const fcm = await messaging();
  const failedTokens = [];
  let successCount = 0;
  let failureCount = 0;
  for (let i = 0; i < devices.length; i += 500) {
    const batch = devices.slice(i, i + 500);
    const messages = batch.map(device => ({
      token:device.token,
      data:{ title, body, image, targetUrl },
      android:{ priority:'high' }
    }));
    const result = await fcm.sendEach(messages);
    successCount += Number(result.successCount || 0);
    failureCount += Number(result.failureCount || 0);
    result.responses.forEach((r, index) => { if (!r.success) failedTokens.push(batch[index].token); });
  }
  if (failedTokens.length) {
    current.items = (current.items || []).filter(x => !failedTokens.includes(x.token));
    await setJSON('pushDevices', current);
  }
  const now = new Date().toISOString();
  const history = (await getJSON('pushHistory')) || { items:[] };
  const record = { id:`push-${Date.now().toString(36)}`, title, body, image, targetUrl, scope, requested:devices.length, success:successCount, failed:failureCount, operatorId:String(operatorId || ''), createdAt:now };
  history.items = [record, ...(history.items || [])].slice(0, MAX_HISTORY);
  await setJSON('pushHistory', history);
  return { ok:true, ...record };
}

module.exports = { configured, registerDevice, status, sendPush, normalizeTarget };
