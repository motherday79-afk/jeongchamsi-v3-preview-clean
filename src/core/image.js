function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasData(img, maxWidth, maxHeight, quality) {
  const ratio = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(img, 0, 0, width, height);
  let data = "";
  try { data = canvas.toDataURL("image/webp", quality); } catch {}
  if (!data || data === "data:,") data = canvas.toDataURL("image/jpeg", quality);
  return data;
}

async function compress(file, maxWidth, maxHeight, fallbackWidth, fallbackHeight) {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다");
  if (file.size > 12 * 1024 * 1024) throw new Error("원본 이미지는 12MB 이하만 사용할 수 있습니다");

  const src = await readAsDataURL(file);
  const img = await loadImage(src);
  let data = canvasData(img, maxWidth, maxHeight, 0.78);
  if (data.length > 360000) data = canvasData(img, fallbackWidth, fallbackHeight, 0.68);
  if (data.length > 760000) throw new Error("이미지 용량을 줄인 뒤 다시 업로드해 주세요");
  return data;
}

async function uploadCompressed(dataUrl, prefix) {
  const response = await fetch("/api/v3/upload", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ dataUrl, prefix })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) {
    const map = {
      BLOB_STORAGE_NOT_CONFIGURED: "Vercel Blob 연결이 필요합니다. 관리자 > 시스템에서 이미지 저장 상태를 확인해 주세요",
      ADMIN_REQUIRED: "관리자 권한이 필요합니다",
      UPLOAD_PERMISSION_REQUIRED: "COLUMN·NEWS 이미지는 정참시 PARTNER 또는 관리자만 업로드할 수 있습니다",
      USER_LOGIN_REQUIRED: "로그인이 필요합니다",
      INVALID_IMAGE_PAYLOAD: "이미지 형식을 처리할 수 없습니다"
    };
    throw new Error(map[body.error] || body.error || "이미지 업로드에 실패했습니다");
  }
  return body.url;
}

export async function uploadCoverImage(file) {
  const data = await compress(file, 1200, 675, 960, 540);
  return uploadCompressed(data, "content-cover");
}

export async function uploadProfileImage(file) {
  const data = await compress(file, 900, 1200, 720, 960);
  return uploadCompressed(data, "president-profile");
}


const POLITICIAN_PHOTO_VARIANTS = Object.freeze({
  mini: Object.freeze({ maxWidth: 96, maxHeight: 128, targetBytes: 12 * 1024, quality: 0.68 }),
  card: Object.freeze({ maxWidth: 192, maxHeight: 256, targetBytes: 24 * 1024, quality: 0.72 }),
  profile: Object.freeze({ maxWidth: 480, maxHeight: 640, targetBytes: 64 * 1024, quality: 0.76 })
});

function dataUrlBytes(value = "") {
  const base64 = String(value || "").split(",")[1] || "";
  if (!base64) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(base64.length * 3 / 4) - padding);
}

function politicianVariantData(img, spec) {
  let best = "";
  let bestBytes = Number.POSITIVE_INFINITY;
  for (const scale of [1, 0.9, 0.8, 0.7]) {
    for (const q of [spec.quality, 0.66, 0.58, 0.5]) {
      const data = canvasData(img, Math.max(1, Math.round(spec.maxWidth * scale)), Math.max(1, Math.round(spec.maxHeight * scale)), q);
      const bytes = dataUrlBytes(data);
      if (bytes && bytes < bestBytes) { best = data; bestBytes = bytes; }
      if (bytes && bytes <= spec.targetBytes) return { dataUrl:data, bytes };
    }
  }
  return { dataUrl:best, bytes:Number.isFinite(bestBytes) ? bestBytes : 0 };
}

function validPoliticianUploadId(id = "") {
  const value = String(id || "").trim();
  return value !== "assembly-300" && /^(assembly|metropolitan|basic)-\d{3}$/.test(value);
}

export async function deletePoliticianPhotoBlobs(urls = []) {
  const clean = [...new Set((Array.isArray(urls) ? urls : []).map(value => String(value || "").trim()).filter(Boolean))].slice(0, 6);
  if (!clean.length) return { ok:true, deleted:0 };
  try {
    const response = await fetch("/api/v3/upload", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type":"application/json", "Accept":"application/json" },
      body: JSON.stringify({ urls:clean })
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok:true, deleted:Number(body.deleted || 0) } : { ok:false, error:body.error || "BLOB_DELETE_FAILED" };
  } catch { return { ok:false, error:"BLOB_DELETE_FAILED" }; }
}

export async function uploadPoliticianPhotoSet(file, politicianId) {
  if (!file) throw new Error("정치인 사진을 선택해 주세요");
  if (!validPoliticianUploadId(politicianId)) throw new Error("정치인 ID를 확인해 주세요");
  if (!["image/jpeg","image/png","image/webp"].includes(String(file.type || "").toLowerCase())) throw new Error("정치인 사진은 JPG · PNG · WebP만 사용할 수 있습니다");
  if (file.size > 5 * 1024 * 1024) throw new Error("정치인 사진 원본은 5MB 이하만 업로드할 수 있습니다");

  const src = await readAsDataURL(file);
  const img = await loadImage(src);
  if (img.naturalWidth < 320 || img.naturalHeight < 400) throw new Error("사진 해상도가 너무 작습니다. 세로 800×1067 이상을 권장합니다");

  const prepared = Object.fromEntries(Object.entries(POLITICIAN_PHOTO_VARIANTS).map(([key, spec]) => [key, politicianVariantData(img, spec)]));
  const optimizedTotal = Object.values(prepared).reduce((sum, item) => sum + Number(item?.bytes || 0), 0);
  if (!optimizedTotal || optimizedTotal > 128 * 1024) throw new Error("자동 최적화 후 용량이 큽니다. 배경이 단순한 인물 사진으로 다시 선택해 주세요");
  const variantKeys = ["mini", "card", "profile"];
  const results = await Promise.allSettled(variantKeys.map(key => uploadCompressed(prepared[key].dataUrl, `politician/${politicianId}/${key}`)));
  const uploadedUrls = results.filter(result => result.status === "fulfilled").map(result => result.value).filter(Boolean);
  const failed = results.find(result => result.status === "rejected");
  if (failed) {
    await deletePoliticianPhotoBlobs(uploadedUrls);
    throw failed.reason instanceof Error ? failed.reason : new Error("정치인 사진 업로드에 실패했습니다");
  }
  const [mini, card, profile] = results.map(result => result.value);
  const bytes = { mini:prepared.mini.bytes, card:prepared.card.bytes, profile:prepared.profile.bytes };
  bytes.total = bytes.mini + bytes.card + bytes.profile;
  return {
    variants:{ mini, card, profile },
    bytes,
    original:{ width:img.naturalWidth, height:img.naturalHeight, size:Number(file.size || 0) },
    focus:"50% 28%"
  };
}

export { POLITICIAN_PHOTO_VARIANTS };
