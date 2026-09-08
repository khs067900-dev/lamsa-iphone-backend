const express = require("express");
const Checkout = require("../../models/Checkout");
const { authMiddleware } = require("./middleware");

const router = express.Router();

// GET /api/admin/orders
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const orders = await Checkout.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Checkout.countDocuments();
    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ ok: false, error: "خطأ في الخادم" });
  }
});

// DELETE /api/admin/orders/:id
router.delete("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Checkout.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "خطأ في الخادم" });
  }
});

// PUT /api/admin/orders/:id/status
router.put("/orders/:id/status", authMiddleware, async (req, res) => {
  try {
    const VALID_STATUSES = ["pending", "confirmed", "cancelled"];
    if (!VALID_STATUSES.includes(req.body.status))
      return res.status(400).json({ ok: false, error: "حالة غير صحيحة" });
    const order = await Checkout.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ ok: false, error: "not found" });
    res.json(order);
  } catch {
    res.status(500).json({ ok: false, error: "خطأ في الخادم" });
  }
});

module.exports = router;
