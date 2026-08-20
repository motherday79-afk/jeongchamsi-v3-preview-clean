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

export async function compressCoverImage(file) {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  if (file.size > 12 * 1024 * 1024) throw new Error("원본 이미지는 12MB 이하만 사용할 수 있습니다.");

  const src = await readAsDataURL(file);
  const img = await loadImage(src);
  let data = canvasData(img, 1200, 800, 0.78);
  if (data.length > 360000) data = canvasData(img, 960, 640, 0.68);
  if (data.length > 520000) throw new Error("이미지 용량을 줄인 뒤 다시 업로드해 주세요.");
  return data;
}
