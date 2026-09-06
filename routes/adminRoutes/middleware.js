const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  // Allow internal token from secret panel (Next.js server-side)
  const internalToken = req.headers["x-internal-token"];
  if (internalToken && internalToken === process.env.ADMIN_INTERNAL_TOKEN) {
    req.admin = { email: "internal" };
    return next();
  }

  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: "غير مصرح" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "غير مصرح" });
  }
}

module.exports = { authMiddleware };
