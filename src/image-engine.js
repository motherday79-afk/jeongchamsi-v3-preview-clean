/**
 * Jeongchamsi v3 Image Engine
 *
 * Core contract:
 * - The URL itself is versioned when image bytes change.
 * - /media/* is immutable at the CDN.
 * - Above-the-fold images may be eager/high priority.
 * - Everything else is loaded near the viewport.
 * - Width/height are always reserved before download.
 */

export function imageMarkup({
  src,
  alt = "",
  width,
  height,
  className = "",
  priority = false,
  fit = "cover"
}) {
  if (!src || !width || !height) {
    throw new Error("Managed images require src, width and height.");
  }

  const attrs = [
    `class="${escapeAttr(className)} managed-image"`,
    `alt="${escapeAttr(alt)}"`,
    `width="${Number(width)}"`,
    `height="${Number(height)}"`,
    `data-image-src="${escapeAttr(src)}"`,
    `data-image-priority="${priority ? "1" : "0"}"`,
    `decoding="async"`,
    `style="object-fit:${fit};aspect-ratio:${Number(width)}/${Number(height)}"`
  ];

  // We intentionally do not put src on lazy images.
  // IntersectionObserver controls when the network request starts.
  if (priority) {
    attrs.push(`src="${escapeAttr(src)}"`);
    attrs.push(`loading="eager"`);
    attrs.push(`fetchpriority="high"`);
  } else {
    attrs.push(`loading="lazy"`);
    attrs.push(`fetchpriority="low"`);
  }

  return `<img ${attrs.join(" ")}>`;
}

export function hydrateManagedImages(root = document) {
  const images = [...root.querySelectorAll("img[data-image-src]")];
  const lazyImages = images.filter(
    (img) => img.dataset.imagePriority !== "1" && !img.getAttribute("src")
  );

  if (!lazyImages.length) return;

  const load = (img) => {
    if (img.getAttribute("src")) return;
    img.src = img.dataset.imageSrc;
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    img.addEventListener("error", () => img.classList.add("is-error"), { once: true });
  };

  if (!("IntersectionObserver" in window)) {
    lazyImages.forEach(load);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        load(entry.target);
        observer.unobserve(entry.target);
      }
    },
    {
      // Start just before the user reaches the image.
      rootMargin: "320px 0px",
      threshold: 0.01
    }
  );

  lazyImages.forEach((img) => observer.observe(img));
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
