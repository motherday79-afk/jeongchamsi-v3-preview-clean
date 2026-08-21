function blobToken() {
  const direct = [process.env.BLOB_READ_WRITE_TOKEN, process.env.JCV3_BLOB_READ_WRITE_TOKEN]
    .map(v => String(v || "").trim())
    .find(Boolean);
  if (direct) return direct;
  for (const [key, value] of Object.entries(process.env)) {
    if (/(^|_)BLOB_READ_WRITE_TOKEN$/.test(key) && String(value || "").trim()) return String(value).trim();
  }
  return "";
}

function blobConfigured() { return !!blobToken(); }

module.exports = { blobToken, blobConfigured };
