const LOCAL_SEED = require("../data/politician-photo-local-seed.json");

function localPoliticianPhotoAssets() {
  return Array.isArray(LOCAL_SEED?.items) ? LOCAL_SEED.items : [];
}

function mergePoliticianPhotoAssets(stored = null) {
  const merged = new Map();
  for (const item of localPoliticianPhotoAssets()) {
    const id = String(item?.id || "").trim();
    if (id) merged.set(id, item);
  }
  for (const item of (Array.isArray(stored?.items) ? stored.items : [])) {
    const id = String(item?.id || "").trim();
    if (id) merged.set(id, item); // Redis/Blob admin asset wins over packaged seed.
  }
  return { items:[...merged.values()] };
}

module.exports = { localPoliticianPhotoAssets, mergePoliticianPhotoAssets };
