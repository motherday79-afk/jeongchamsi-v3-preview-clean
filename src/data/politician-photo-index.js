/*
 * PHOTO FOUNDATION 1
 * High-confidence photo trial for the politicians currently visible at the top of HOME NOW.
 * Each source is cross-checked against a politician-specific Commons category/structured "depicts"
 * plus the original source context. The browser never receives the large source asset directly:
 * Vercel's native image optimizer resizes/transcodes it on demand and caches the result.
 */

const VARIANTS = Object.freeze({
  tiny: Object.freeze({ width: 72, quality: 55 }),
  mini: Object.freeze({ width: 96, quality: 55 }),
  sidebar: Object.freeze({ width: 80, quality: 55 }),
  card: Object.freeze({ width: 160, quality: 55 }),
  profile: Object.freeze({ width: 384, quality: 65 })
});

const PHOTO_INDEX = Object.freeze({
  "assembly-001": Object.freeze({
    id:"assembly-001", name:"김민석", focus:"50% 27%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/7/7e/Kim_Min-seok_20250807.jpg",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Kim_Min-seok_20250807.jpg",
    attribution:"경기도청 언론협력담당관", license:"KOGL Type 1",
    licenseUrl:"https://www.kogl.or.kr/info/licenseType1.do",
    verification:["파일 설명: 김민석 국무총리", "Commons: Kim Min-seok (politician)", "원출처: 경기도청"]
  }),
  "assembly-002": Object.freeze({
    id:"assembly-002", name:"정청래", focus:"50% 24%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/3/3b/Jung_Chung-rae%27s_Portrait_%282026.6%29.png",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Jung_Chung-rae%27s_Portrait_(2026.6).png",
    attribution:"델리민주 [더불어민주당]", license:"CC BY 4.0",
    licenseUrl:"https://creativecommons.org/licenses/by/4.0/",
    verification:["파일명/설명: Jung Chung-rae", "Commons: Jung Chung-rae 정치인 카테고리", "원출처: 더불어민주당 채널"]
  }),
  "assembly-003": Object.freeze({
    id:"assembly-003", name:"장동혁", focus:"50% 27%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/1/1a/Jang_Dong-hyeok%27s_Portrait_%282026.5%29.png",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Jang_Dong-hyeok%27s_Portrait_(2026.5).png",
    attribution:"국민의힘TV", license:"CC BY 4.0",
    licenseUrl:"https://creativecommons.org/licenses/by/4.0/",
    verification:["파일명/설명: Jang Dong-hyeok", "Commons: Jang Dong-hyeok 정치인 카테고리", "원출처: 국민의힘TV"]
  }),
  "assembly-004": Object.freeze({
    id:"assembly-004", name:"송영길", focus:"50% 25%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/d/d0/Song_Young-gil.jpg",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Song_Young-gil.jpg",
    attribution:"인천광역시청", license:"KOGL Type 1",
    licenseUrl:"https://www.kogl.or.kr/info/licenseType1.do",
    verification:["파일 설명: 송영길 인천광역시장", "structured depicts: Song Young-gil", "원출처: 인천광역시청"]
  }),
  "assembly-005": Object.freeze({
    id:"assembly-005", name:"한동훈", focus:"50% 23%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/c/c3/Han_Dong-hoon%27s_Portrait_%282025%29.png",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Han_Dong-hoon%27s_Portrait_(2025).png",
    attribution:"국민의힘TV", license:"CC BY 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by/3.0/",
    verification:["structured depicts: Han Dong-hoon", "Commons: Han Dong-hoon", "원출처: 국민의힘TV"]
  }),
  "assembly-006": Object.freeze({
    id:"assembly-006", name:"나경원", focus:"50% 27%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/9/9c/Na_Kyung-won_2019.jpg",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Na_Kyung-won_2019.jpg",
    attribution:"Office of U.S. National Security Advisor", license:"Public Domain (U.S. federal work)",
    licenseUrl:"https://creativecommons.org/publicdomain/mark/1.0/",
    verification:["파일 설명: Rep. Na Kyung-won", "structured depicts / Commons: Na Kyung-won", "원출처: U.S. National Security Advisor"]
  }),
  "assembly-007": Object.freeze({
    id:"assembly-007", name:"박주민", focus:"50% 28%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/9/9b/Park_Ju-Min_%EB%B2%99%EC%BB%A41_%ED%8A%B9%EA%B0%95_%EB%8B%88%EA%B0%80_%EA%B0%80%EB%9D%BC_%EC%97%AC%EC%9D%98%EB%8F%84_01.png",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Park_Ju-Min_%EB%B2%99%EC%BB%A41_%ED%8A%B9%EA%B0%95_%EB%8B%88%EA%B0%80_%EA%B0%80%EB%9D%BC_%EC%97%AC%EC%9D%98%EB%8F%84_01.png",
    attribution:"BUNKER 1", license:"CC BY 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by/3.0/",
    verification:["파일 설명: 강연하는 박주민", "Commons: Park Joo-min · 국회의원", "원본 라이선스 검수 완료 자료"]
  }),
  "assembly-008": Object.freeze({
    id:"assembly-008", name:"안철수", focus:"50% 23%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/c/c9/Ahn_Cheol-Soo%27s_Portrait_%282025%29.png",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Ahn_Cheol-Soo%27s_Portrait_(2025).png",
    attribution:"국민의힘TV", license:"CC BY 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by/3.0/",
    verification:["structured depicts: Ahn Cheol-soo", "Commons: Ahn Cheol-soo", "원출처: 국민의힘TV"]
  }),
  "assembly-009": Object.freeze({
    id:"assembly-009", name:"전현희", focus:"50% 24%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/9/9c/%EC%A0%84%ED%98%84%ED%9D%AC5%2A7.jpg",
    sourcePage:"https://commons.wikimedia.org/wiki/File:%EC%A0%84%ED%98%84%ED%9D%AC5%2A7.jpg",
    attribution:"Elysiaj315", license:"CC BY-SA 4.0",
    licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
    verification:["파일 설명: 국회의원 전현희", "Commons: Jeon Hyun-hee · South Korean politician", "원저작자 직접 업로드"]
  }),
  "assembly-010": Object.freeze({
    id:"assembly-010", name:"김병주", focus:"50% 22%",
    sourceUrl:"https://upload.wikimedia.org/wikipedia/commons/4/47/Army_%28ROKA%29_General_Kim_Byung-joo_%EC%9C%A1%EA%B5%B0%EB%8C%80%EC%9E%A5_%EA%B9%80%EB%B3%91%EC%A3%BC_%28USFK_photo_170811-A-PI620-204_Combined_Forces_Command_change_of_responsibility%29.jpg",
    sourcePage:"https://commons.wikimedia.org/wiki/File:Army_(ROKA)_General_Kim_Byung-joo_%EC%9C%A1%EA%B5%B0%EB%8C%80%EC%9E%A5_%EA%B9%80%EB%B3%91%EC%A3%BC_(USFK_photo_170811-A-PI620-204_Combined_Forces_Command_change_of_responsibility).jpg",
    attribution:"Cpl. Byeongwook Jo · U.S. Forces Korea", license:"Public Domain (U.S. federal work)",
    licenseUrl:"https://creativecommons.org/publicdomain/mark/1.0/",
    verification:["파일 설명: 김병주 한미연합사 부사령관", "Commons: Kim Byung-joo · 국회의원/정치인", "원출처: U.S. Forces Korea / DVIDS"]
  })
});

function optimizerUrl(sourceUrl, width, quality) {
  if (!sourceUrl) return "";
  return `/_vercel/image?url=${encodeURIComponent(sourceUrl)}&w=${width}&q=${quality}`;
}

export function politicianPhotoMeta(id = "") {
  return PHOTO_INDEX[String(id || "")] || null;
}

export function politicianPhoto(id = "", variant = "card") {
  const meta = politicianPhotoMeta(id);
  if (!meta) return null;
  const spec = VARIANTS[variant] || VARIANTS.card;
  return Object.freeze({
    ...meta,
    variant,
    width:spec.width,
    quality:spec.quality,
    url:optimizerUrl(meta.sourceUrl, spec.width, spec.quality),
    modifiedNote:"정참시: 얼굴 중심 포커스 · 리사이즈 · WebP 저용량 최적화",
    verified:true
  });
}

export function politicianPhotoUrl(id = "", variant = "card") {
  return politicianPhoto(id, variant)?.url || "";
}

export function hasPoliticianPhoto(id = "") {
  return Boolean(politicianPhotoMeta(id));
}

export const POLITICIAN_PHOTO_IDS = Object.freeze(Object.keys(PHOTO_INDEX));
export const POLITICIAN_PHOTO_VARIANTS = VARIANTS;
