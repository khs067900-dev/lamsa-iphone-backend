const express = require("express");
const router = express.Router();
const Visit = require("../models/Visit");
const BlockedFp = require("../models/BlockedFp");
const { requireAdmin } = require("./adminRoutes/middleware");

// POST /api/track-visit
router.post("/track-visit", async (req, res) => {
  try {
    const { fingerprint, path } = req.body;
    if (!path) return res.status(400).json({ error: "path required" });
    await Visit.create({ fingerprint: fingerprint || null, path });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/secret/check-block?fp=...
router.get("/secret/check-block", async (req, res) => {
  try {
    const { fp } = req.query;
    if (!fp) return res.json({ blocked: false });
    const found = await BlockedFp.exists({ fingerprint: fp });
    res.json({ blocked: !!found });
  } catch {
    res.json({ blocked: false });
  }
});

// Admin: block a fingerprint — POST /api/admin/block-fp
router.post("/admin/block-fp", requireAdmin, async (req, res) => {
  try {
    const { fingerprint, reason } = req.body;
    if (!fingerprint) return res.status(400).json({ error: "fingerprint required" });
    await BlockedFp.findOneAndUpdate(
      { fingerprint },
      { fingerprint, reason: reason || "" },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "server error" });
  }
});

// Admin: unblock — DELETE /api/admin/block-fp/:fp
router.delete("/admin/block-fp/:fp", requireAdmin, async (req, res) => {
  try {
    await BlockedFp.deleteOne({ fingerprint: req.params.fp });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "server error" });
  }
});

module.exports = router;
