const metrics = {
  ttfb: null,
  fcp: null,
  lcp: null,
  cls: 0,
  requests: 0,
  transferKB: 0,
  imageRequests: 0,
  imageTransferKB: 0
};

const round = (n) => Math.round(n * 10) / 10;

function collectStaticMetrics() {
  const nav = performance.getEntriesByType("navigation")[0];
  if (nav) metrics.ttfb = round(nav.responseStart);

  const resources = performance.getEntriesByType("resource");
  metrics.requests = resources.length + 1;
  metrics.transferKB = round(
    resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024
  );

  const imageResources = resources.filter(
    (r) => r.initiatorType === "img" || /\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i.test(r.name)
  );
  metrics.imageRequests = imageResources.length;
  metrics.imageTransferKB = round(
    imageResources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024
  );

  const paints = performance.getEntriesByType("paint");
  const fcp = paints.find((p) => p.name === "first-contentful-paint");
  if (fcp) metrics.fcp = round(fcp.startTime);
}

function installObservers() {
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) metrics.lcp = round(last.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) metrics.cls += entry.value;
      }
      metrics.cls = Math.round(metrics.cls * 1000) / 1000;
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
}

function renderPanel() {
  if (!new URLSearchParams(location.search).has("perf")) return;

  let panel = document.getElementById("jcv3-perf");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "jcv3-perf";
    panel.style.cssText =
      "position:fixed;right:12px;bottom:12px;z-index:99999;background:#111;color:#fff;" +
      "font:12px/1.5 monospace;padding:10px 12px;border-radius:10px;box-shadow:0 4px 18px #0003";
    document.body.appendChild(panel);
  }

  const fmt = (v, unit="") => v == null ? "…" : `${v}${unit}`;
  panel.innerHTML =
    `<b>JCV3 PERF</b><br>` +
    `TTFB ${fmt(metrics.ttfb,"ms")}<br>` +
    `FCP ${fmt(metrics.fcp,"ms")}<br>` +
    `LCP ${fmt(metrics.lcp,"ms")}<br>` +
    `CLS ${fmt(metrics.cls)}<br>` +
    `REQ ${metrics.requests}<br>` +
    `TRANSFER ${metrics.transferKB}KB<br>` +
    `IMG REQ ${metrics.imageRequests}<br>` +
    `IMG ${metrics.imageTransferKB}KB`;
}

export function startPerformanceMonitor() {
  installObservers();

  const update = () => {
    collectStaticMetrics();
    renderPanel();
    window.__JCV3_PERF__ = { ...metrics };
  };

  if (document.readyState === "complete") update();
  else addEventListener("load", update, { once: true });

  setTimeout(update, 1500);
  setTimeout(update, 3000);
}
