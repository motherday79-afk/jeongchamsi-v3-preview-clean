/**
 * JCV3 Static Photo Library
 *
 * Runtime rule:
 * - NEVER search for photos.
 * - NEVER ask Redis for photos.
 * - NEVER proxy photos through an API.
 * - Always return a static immutable CDN asset.
 *
 * Current v1 files are generated fallback portraits.
 * When a verified real photo is prepared offline, replace the manifest entry
 * with a new versioned asset such as kim-minseok.v2.webp.
 */

const BY_NAME = new Map([
  ["김민석", "/media/people/kim-minseok.v1.webp"],
  ["정청래", "/media/people/jeong-cheongrae.v1.webp"],
  ["한동훈", "/media/people/han-donghoon.v1.webp"],
  ["이준석", "/media/people/lee-junseok.v1.webp"],
  ["조국", "/media/people/cho-kuk.v1.webp"]
]);

const DEFAULT_PHOTO = "/media/people/default.v1.webp";

export function resolvePersonPhoto(person = {}) {
  return BY_NAME.get(String(person.name || "").trim()) || DEFAULT_PHOTO;
}

export const PHOTO_LIBRARY_POLICY = Object.freeze({
  nowWidth: 96,
  nowHeight: 96,
  format: "webp",
  immutable: true,
  runtimeLookup: false,
  guaranteedFallback: true
});
