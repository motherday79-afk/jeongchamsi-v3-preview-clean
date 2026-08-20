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
  if (!String(file.type || "").startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  if (file.size > 12 * 1024 * 1024) throw new Error("원본 이미지는 12MB 이하만 사용할 수 있습니다.");

  const src = await readAsDataURL(file);
  const img = await loadImage(src);
  let data = canvasData(img, maxWidth, maxHeight, 0.78);
  if (data.length > 360000) data = canvasData(img, fallbackWidth, fallbackHeight, 0.68);
  if (data.length > 760000) throw new Error("이미지 용량을 줄인 뒤 다시 업로드해 주세요.");
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
      BLOB_STORAGE_NOT_CONFIGURED: "이미지 저장소가 아직 연결되지 않았습니다. Vercel Blob을 연결해 주세요.",
      ADMIN_REQUIRED: "관리자 권한이 필요합니다.",
      INVALID_IMAGE_PAYLOAD: "이미지 형식을 처리할 수 없습니다."
    };
    throw new Error(map[body.error] || body.error || "이미지 업로드에 실패했습니다.");
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
