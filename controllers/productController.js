const Product = require("../models/Product");

// Shared cache (per worker, but TTL prevents stale data)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const SEARCH_TTL = 2 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  // Limit cache size to prevent memory bloat
  if (cache.size > 100) cache.clear();
  cache.set(key, { data, ts: Date.now() });
}

exports.invalidateCache = () => cache.clear();

function normalizeArabic(str) {
  return str
    .replace(/[أإآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

exports.getProducts = async (req, res) => {
  try {
    const { q, fields, page, limit, brand, category } = req.query;
    const selectFields = fields ? fields.replace(/,/g, " ") : "";
    const filter = {};
    if (brand) filter.brand = { $regex: new RegExp(`^${brand}$`, "i") };
    if (category) filter.category = { $regex: new RegExp(category, "i") };

    // Search — with short cache
    if (q) {
      const normalized = normalizeArabic(q);
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(50, parseInt(limit) || 20);
      const searchCacheKey = `search:${normalized}:${pageNum}:${limitNum}`;
      const cachedSearch = getCached(searchCacheKey);
      if (cachedSearch) return res.json(cachedSearch);
      const searchRegex = { $regex: normalized, $options: "i" };
      const products = await Product.find({
        ...filter,
        $or: [
          { name: searchRegex },
          { category: searchRegex },
          { subCategory: searchRegex },
          { brand: searchRegex },
        ],
      }).select(selectFields).limit(limitNum).skip((pageNum - 1) * limitNum).lean();
      cache.set(searchCacheKey, { data: products, ts: Date.now() - (CACHE_TTL - SEARCH_TTL) });
      return res.json(products);
    }

    // Paginated listing with cache
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, parseInt(limit) || 20);
    const cacheKey = `products:${brand || ""}:${category || ""}:${selectFields}:${pageNum}:${limitNum}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const query = Product.find(filter).select(selectFields).skip((pageNum - 1) * limitNum).limit(limitNum).lean();
    const [products, total] = await Promise.all([query, Product.countDocuments(filter)]);
    const result = { products, total, page: pageNum, pages: Math.ceil(total / limitNum) };
    setCached(cacheKey, result);
    return res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    setCached(cacheKey, product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    exports.invalidateCache();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    exports.invalidateCache();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    exports.invalidateCache();
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
