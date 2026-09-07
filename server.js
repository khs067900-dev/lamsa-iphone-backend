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

// Keep-alive ping — prevents Vercel cold start
app.get("/ping", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/products", (req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
  }
  next();
}, productRoutes);

app.use("/api/checkout", checkoutRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
