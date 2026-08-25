const { put, del } = require('@vercel/blob');
const { fetchPoliticianPhoto } = require('./politician-photo-resolver');
const { discoverDirectCandidates, directQueries, imageSearchCandidates, naverSearchRows, NAVER_IMAGE_API } = require('./politician-photo-direct');
const { discoverOfficialCandidates, fetchWithTimeout, publicHttpsUrl } = require('./politician-photo-official');
const { getJSON, setJSON } = require('../../../lib/v3/redis');
const { sanitize } = require('../../../lib/v3/schema');

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const inFlight = globalThis.__JCV3_ASSEMBLY_PHOTO_ASSETIZE_INFLIGHT__ || new Map();
globalThis.__JCV3_ASSEMBLY_PHOTO_ASSETIZE_INFLIGHT__ = inFlight;

function contentExt(contentType = '') {
  const type = String(contentType || '').toLowerCase();
  return type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
}

async function storedAsset(id = '') {
  const data = await getJSON('politicianPhotos').catch(()=>null);
  return (data?.items || []).find(item => String(item?.id || '') === String(id || '')) || null;
}

async function fetchCandidateImage(candidate = {}) {
  const url = String(candidate?.url || '').trim();
  if (!publicHttpsUrl(url)) return null;
  const headers = { accept:'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' };
  if (candidate?.sourcePage && candidate.sourcePage !== url) headers.referer = candidate.sourcePage;
  const response = await fetchWithTimeout(url,{headers},12000);
  const contentType = String(response.headers.get('content-type') || '').toLowerCase().split(';')[0];
  const declared = Number(response.headers.get('content-length') || 0);
  if (!response.ok || !contentType.startsWith('image/') || !publicHttpsUrl(response.url || url)) return null;
  if (declared > MAX_SOURCE_BYTES) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 512 || buffer.length > MAX_SOURCE_BYTES) return null;
  return { buffer, contentType, matched:{
    source:'official-direct',
    sourcePage:String(candidate.sourcePage || url),
    sourceUrl:String(response.url || url),
    score:Number(candidate.score || 0),
    verification:Array.isArray(candidate.verification) ? candidate.verification : [],
    confidence:String(candidate.confidence || '')
  }};
}

async function resolveAssemblyImage(person = {}) {
  try {
    const query = directQueries(person).image;
    const rows = (await naverSearchRows(NAVER_IMAGE_API,{query,display:50,start:1,sort:'sim',filter:'large',format:'json'},4500)).rows;
    const fastCandidates = imageSearchCandidates(rows,person,query);
    for (const candidate of fastCandidates) {
      const image = await fetchCandidateImage(candidate).catch(()=>null);
      if (image) return { ...image, sourceType:'auto-official-review' };
    }
  } catch {}

  const wikimedia = await fetchPoliticianPhoto(person,384).catch(()=>null);
  if (wikimedia?.buffer?.length) {
    return {
      buffer:wikimedia.buffer,
      contentType:wikimedia.contentType || 'image/jpeg',
      sourceType:'auto-wikimedia',
      matched:wikimedia.matched || {}
    };
  }

  const direct = await discoverDirectCandidates(person).catch(()=>({candidates:[]}));
  const directCandidates = Array.isArray(direct?.candidates) ? direct.candidates : [];
  const ordered = [...directCandidates].sort((a,b)=>{
    const ca = a?.confidence === 'strong' ? 1 : 0;
    const cb = b?.confidence === 'strong' ? 1 : 0;
    return cb-ca || Number(b?.score || 0)-Number(a?.score || 0);
  });
  for (const candidate of ordered) {
    const image = await fetchCandidateImage(candidate).catch(()=>null);
    if (image) return { ...image, sourceType:'auto-official-review' };
  }

  const official = await discoverOfficialCandidates(person).catch(()=>({candidates:[]}));
  for (const candidate of (Array.isArray(official?.candidates) ? official.candidates : [])) {
    const image = await fetchCandidateImage(candidate).catch(()=>null);
    if (image) return { ...image, sourceType:'auto-official-review' };
  }
  return null;
}

async function persistAssemblyImage(person, image, token) {
  const before = await storedAsset(person.id);
  if (before) return { status:'existing', record:before };

  const now = new Date().toISOString();
  const ext = contentExt(image.contentType);
  const blob = await put(`jcv3/politician/assembly/${person.id}/${Date.now().toString(36)}.${ext}`,image.buffer,{
    access:'public', contentType:image.contentType || 'image/jpeg', addRandomSuffix:true, token
  });
  const source = image.matched || {};
  const bytes = image.buffer.length;
  const record = {
    id:person.id,
    variants:{mini:blob.url,card:blob.url,profile:blob.url},
    bytes:{mini:bytes,card:bytes,profile:bytes,total:bytes},
    original:{width:0,height:0,size:bytes},
    focus:'50% 28%',
    sourceType:image.sourceType === 'auto-wikimedia' ? 'auto-wikimedia' : 'auto-official-review',
    verified:true,
    sourcePage:String(source.sourcePage || ''),
    sourceUrl:String(source.sourceUrl || ''),
    matchScore:Number(source.score || 0),
    verification:Array.isArray(source.verification) ? source.verification : [],
    assetizedAt:now,
    updatedAt:now
  };

  const latest = await getJSON('politicianPhotos').catch(()=>({items:[]}));
  const items = Array.isArray(latest?.items) ? latest.items : [];
  if (items.some(item => String(item?.id || '') === person.id)) {
    await del(blob.url,{token}).catch(()=>{});
    return { status:'existing', record:items.find(item => String(item?.id || '') === person.id) };
  }
  const next = sanitize('politicianPhotos',{items:[record,...items]});
  const persisted = next.items.find(item => item.id === person.id);
  if (!persisted) {
    await del(blob.url,{token}).catch(()=>{});
    throw new Error('ASSEMBLY_PHOTO_SCHEMA_REJECTED');
  }
  await setJSON('politicianPhotos',next);
  return { status:'assetized', record:persisted };
}

async function assetizeAssemblyPerson(person = {}, token = '') {
  if (!person?.id || person.type !== 'assembly' || person.id === 'assembly-300') return {status:'skipped'};
  if (!token) throw new Error('BLOB_STORAGE_NOT_CONFIGURED');
  const existing = await storedAsset(person.id);
  if (existing) return {status:'existing',record:existing};
  if (inFlight.has(person.id)) return inFlight.get(person.id);
  const promise = (async()=>{
    const image = await resolveAssemblyImage(person);
    if (!image?.buffer?.length) return {status:'unresolved'};
    return persistAssemblyImage(person,image,token);
  })().finally(()=>inFlight.delete(person.id));
  inFlight.set(person.id,promise);
  return promise;
}

module.exports = { assetizeAssemblyPerson, resolveAssemblyImage, fetchCandidateImage };
