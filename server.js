require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { checkBlockedDevice } = require("./middlewares/checkBlockedDevice");

connectDB();

const app = express();
app.set("trust proxy", 1);
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",").map((o) => o.trim());

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { error: "طلبات كثيرة، حاول لاحقاً" } });
app.use("/api", globalLimiter);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: "محاولات كثيرة، حاول بعد 15 دقيقة" } });
app.use("/api/admin/login", loginLimiter);

app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Public track visit endpoint
const trackLimiter = rateLimit({ windowMs: 10 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.post("/api/track", trackLimiter, async (req, res) => {
  try {
    const { getRealIP } = require("./utils/ipHelper");
    const { upsertDeviceLog } = require("./services/deviceService");
    const fp = typeof req.body.fingerprint === "string" ? req.body.fingerprint.slice(0, 64) : null;
    const ip = getRealIP(req);
    const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 512) : null;
    const path = typeof req.body.path === "string" ? req.body.path.slice(0, 100) : "/cart";
    const country = typeof req.headers["cf-ipcountry"] === "string" ? req.headers["cf-ipcountry"].slice(0, 2) : null;
    await upsertDeviceLog(fp, ip, ua, path, country);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// Public device check endpoint (called from Next.js middleware)
const deviceCheckLimiter = rateLimit({ windowMs: 10 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
app.get("/api/devices/check", deviceCheckLimiter, async (req, res) => {
  try {
    const fp = typeof req.query.fp === "string" ? req.query.fp.slice(0, 64) : null;
    const ip = typeof req.query.ip === "string" ? req.query.ip.slice(0, 45) : null;
    const { findBlockedDevice } = require("./services/deviceService");
    const blocked = await findBlockedDevice(fp, ip);
    return res.json({ blocked: !!blocked });
  } catch {
    res.json({ blocked: false });
  }
});

// Cache middleware for product listing
app.use("/api/products", checkBlockedDevice, (req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
  }
  next();
}, productRoutes);

app.use("/api/checkout", checkBlockedDevice, checkoutRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
