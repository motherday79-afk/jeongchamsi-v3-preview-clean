import { esc } from "./layout.js?v=alpha6.0.36.23-copy-scroll-hotfix";

export function renderContentShare({ title = "", path = "" } = {}) {
  return `<section class="content-share-panel" data-content-share-panel data-share-title="${esc(title)}" data-share-path="${esc(path)}" aria-label="게시물 공유">
    <div class="content-share-head"><div><span>SHARE THIS CONTENT</span><small>정참시 콘텐츠 외부 공유</small></div><p>모바일에서는 기기의 공유 기능을 이용합니다.</p></div>
    <div class="content-share-buttons">
      <button type="button" class="content-share-button" data-content-share="kakao" aria-label="카카오톡으로 공유">카카오톡</button>
      <button type="button" class="content-share-button" data-content-share="facebook" aria-label="Facebook으로 공유">Facebook</button>
      <button type="button" class="content-share-button" data-content-share="instagram" aria-label="Instagram으로 공유">Instagram</button>
      <button type="button" class="content-share-button" data-content-share="copy" aria-label="게시물 URL 복사">URL 복사</button>
    </div>
    <div class="content-share-state" data-content-share-state aria-live="polite"></div>
  </section>`;
}
