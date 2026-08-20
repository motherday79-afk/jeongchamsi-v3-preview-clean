const CACHE_KEY = "jcv3_now_rank_snapshot_v1";
const REQUEST_TIMEOUT_MS = 2500;

function finite(v) {
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
}

function snapshotStamp(snapshot) {
  return String(
    snapshot?.publicationId ||
    snapshot?.publishedAt ||
    snapshot?.timestamp ||
    snapshot?.version ||
    ""
  );
}

export function rowsFromSnapshot(snapshot, limit = 10) {
  if (!snapshot || !Array.isArray(snapshot.members)) return [];

  return snapshot.members
    .filter((m) => m && Number(m.id) !== 300 && String(m.party || "") !== "공석")
    .map((m) => {
      const overallRank = finite(m.overallRank) ? Number(m.overallRank) : null;
      const categoryRank = finite(m.rank)
        ? Number(m.rank)
        : finite(m.categoryRank)
          ? Number(m.categoryRank)
          : null;

      return {
        id: m.id ?? null,
        rank: overallRank ?? categoryRank,
        overallRank,
        categoryRank,
        name: String(m.name || ""),
        party: String(m.party || "무소속"),
        region: String(m.region || ""),
        constituency: String(m.constituency || m.jurisdiction || ""),
        previousRank: finite(m.previousOverallRank)
          ? Number(m.previousOverallRank)
          : finite(m.previousRank)
            ? Number(m.previousRank)
            : null,
        change: finite(m.changeOverallRefresh)
          ? Number(m.changeOverallRefresh)
          : finite(m.changeRefresh)
            ? Number(m.changeRefresh)
            : null
      };
    })
    .filter((m) => finite(m.rank) && m.name)
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .slice(0, limit);
}

export function readCachedRankSnapshot() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!value?.snapshot || !rowsFromSnapshot(value.snapshot, 1).length) return null;
    return value;
  } catch {
    return null;
  }
}

function writeCachedRankSnapshot(snapshot) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        stamp: snapshotStamp(snapshot),
        snapshot
      })
    );
  } catch {}
}

async function fetchCurrentSnapshot() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/rank/home", {
      cache: "default",
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`NOW_HOME_${response.status}`);

    const snapshot = await response.json();
    if (!rowsFromSnapshot(snapshot, 1).length) {
      throw new Error("NOW_HOME_EMPTY");
    }
    return snapshot;
  } finally {
    clearTimeout(timeout);
  }
}

function runWhenIdle(fn) {
  const start = () => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(fn, { timeout: 900 });
    } else {
      setTimeout(fn, 180);
    }
  };

  if (document.readyState === "complete") start();
  else addEventListener("load", start, { once: true });
}

export function startNowRankSync({ onSnapshot, onStatus } = {}) {
  const cached = readCachedRankSnapshot();

  if (cached?.snapshot) {
    onSnapshot?.(cached.snapshot, {
      source: "cache",
      stamp: cached.stamp,
      savedAt: cached.savedAt
    });
  }

  runWhenIdle(async () => {
    onStatus?.({ state: "checking" });

    try {
      const snapshot = await fetchCurrentSnapshot();
      const stamp = snapshotStamp(snapshot);
      const previousStamp = cached?.stamp || "";

      writeCachedRankSnapshot(snapshot);

      if (!cached?.snapshot || stamp !== previousStamp) {
        onSnapshot?.(snapshot, {
          source: "live",
          stamp,
          savedAt: Date.now()
        });
      }

      onStatus?.({
        state: "ready",
        source: "live",
        stamp
      });
    } catch (error) {
      console.warn("[JCV3 NOW Rank] live revalidation unavailable:", error);
      onStatus?.({
        state: cached?.snapshot ? "cached" : "bootstrap",
        error: String(error?.message || error)
      });
    }
  });
}
