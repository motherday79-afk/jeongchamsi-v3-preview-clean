/*
 * 0.36.72 — VERIFIED PHOTO ASSETS
 * Every real politician ID uses one versioned photo path. Verified Wikimedia photos may be
 * assetized into Jeongchamsi Blob storage; admin manual assets remain highest priority.
 */

const VARIANTS = Object.freeze({
  tiny: Object.freeze({ width: 64, quality: 55 }),
  mini: Object.freeze({ width: 96, quality: 55 }),
  sidebar: Object.freeze({ width: 64, quality: 55 }),
  card: Object.freeze({ width: 160, quality: 55 }),
  profile: Object.freeze({ width: 384, quality: 65 })
});

const PHOTO_COUNTS = Object.freeze({ assembly:300, metropolitan:16, basic:227 });
const NON_PERSON_IDS = new Set(["assembly-300"]);
const COMMONS_SOURCE_PAGE = "https://commons.wikimedia.org/";

function validPoliticianId(id = "") {
  if (NON_PERSON_IDS.has(String(id || ""))) return false;
  const match = String(id || "").match(/^(assembly|metropolitan|basic)-(\d{3})$/);
  if (!match) return false;
  const slot = Number(match[2]);
  return slot >= 1 && slot <= Number(PHOTO_COUNTS[match[1]] || 0);
}

export function politicianPhotoMeta(id = "") {
  const key=String(id || "");
  if (!validPoliticianId(key)) return null;
  return Object.freeze({
    id:key,
    name:"",
    focus:"50% 28%",
    sourceUrl:"",
    sourcePage:COMMONS_SOURCE_PAGE,
    attribution:"정참시 사진 자산 / Wikimedia Commons",
    license:"원본 출처 페이지 기준",
    licenseUrl:COMMONS_SOURCE_PAGE,
    verification:["정참시 서버: 이름 + 정당 + 직책 + 지역 문맥 교차검증","검증 완료 자동사진은 정참시 Blob 자산화 · 수기등록은 관리자 우선"]
  });
}

export function politicianPhoto(id = "", variant = "card") {
  const key=String(id || "");
  const meta=politicianPhotoMeta(key);
  if (!meta) return null;
  const spec=VARIANTS[variant] || VARIANTS.card;
  return Object.freeze({
    ...meta,
    variant,
    width:spec.width,
    quality:spec.quality,
    url:`/api/v3/politician-photo?id=${encodeURIComponent(key)}&w=${spec.width}&v=03672`,
    modifiedNote:"검증 사진 · 정참시 자산 우선 · v0.36.72 캐시 키",
    verified:true,
    resolver:"verified-asset-first"
  });
}

export function politicianPhotoUrl(id = "", variant = "card") {
  return politicianPhoto(id,variant)?.url || "";
}
export function hasPoliticianPhoto(id = "") { return validPoliticianId(id); }
function allPoliticianPhotoIds() {
  const ids=[];
  for (const [type,count] of Object.entries(PHOTO_COUNTS)) {
    for (let slot=1; slot<=count; slot += 1) {
      const id=`${type}-${String(slot).padStart(3,"0")}`;
      if (!NON_PERSON_IDS.has(id)) ids.push(id);
    }
  }
  return ids;
}
export const POLITICIAN_PHOTO_IDS = Object.freeze(allPoliticianPhotoIds());
export const POLITICIAN_PHOTO_VARIANTS = VARIANTS;
export const POLITICIAN_PHOTO_COUNTS = PHOTO_COUNTS;
