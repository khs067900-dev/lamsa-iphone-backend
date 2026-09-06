const express = require("express");
const Checkout = require("../../models/Checkout");
const { authMiddleware } = require("./middleware");

const router = express.Router();

// GET /api/admin/orders
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Checkout.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/admin/orders/:id
router.delete("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const order = await Checkout.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/admin/orders/:id/status
router.put("/orders/:id/status", authMiddleware, async (req, res) => {
  try {
    const order = await Checkout.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ ok: false, error: "not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
