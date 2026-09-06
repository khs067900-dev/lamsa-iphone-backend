function isValidIP(ip) {
  if (!ip || typeof ip !== "string") return false;
  return /^[0-9a-fA-F.:]+$/.test(ip) && ip.length <= 45;
}

function getRealIP(req) {
  const cf = req.headers["cf-connecting-ip"];
  if (cf && isValidIP(cf.trim())) return cf.trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (isValidIP(first)) return first;
  }

  const remote = req.socket?.remoteAddress || "";
  return remote.replace(/^::ffff:/, "") || "unknown";
}

module.exports = { getRealIP };
