function absoluteShareUrl(path = "") {
  try {
    const base = window.location?.origin || window.location?.href || "";
    return new URL(String(path || window.location?.pathname || "/"), base).href;
  } catch {
    return String(window.location?.href || path || "");
  }
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  area.remove();
  return ok;
}

async function nativeShare({ title, url }) {
  if (typeof navigator.share !== "function") return { supported:false, shared:false, cancelled:false };
  try {
    await navigator.share({ title: title || "정참시", text: title ? `정참시 · ${title}` : "정참시", url });
    return { supported:true, shared:true, cancelled:false };
  } catch (error) {
    if (error?.name === "AbortError") return { supported:true, shared:false, cancelled:true };
    return { supported:true, shared:false, cancelled:false };
  }
}

async function copyFallback(url, message) {
  const copied = await copyToClipboard(url);
  return copied
    ? { ok:true, message }
    : { ok:false, message:"URL을 복사하지 못했습니다. 주소창의 링크를 복사해 주세요." };
}

export async function shareContent({ platform = "copy", title = "", path = "" } = {}) {
  const url = absoluteShareUrl(path);

  if (platform === "facebook") {
    const target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    const popup = window.open(target, "_blank", "width=720,height=640");
    if (popup) {
      try { popup.opener = null; } catch {}
      return { ok:true, message:"Facebook 공유창을 열었습니다." };
    }
    return copyFallback(url, "Facebook 공유용 URL을 복사했습니다.");
  }

  if (platform === "kakao" || platform === "instagram") {
    const native = await nativeShare({ title, url });
    if (native.cancelled) return { ok:false, cancelled:true, message:"" };
    if (native.shared) return { ok:true, message:"공유 작업을 완료했습니다." };
    const label = platform === "kakao" ? "카카오톡" : "Instagram";
    return copyFallback(url, `${label} 공유용 URL을 복사했습니다.`);
  }

  return copyFallback(url, "게시물 URL을 복사했습니다.");
}

export const _internals = { absoluteShareUrl, copyToClipboard, nativeShare };
