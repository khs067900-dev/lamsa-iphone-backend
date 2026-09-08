const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, default: null },
    path: { type: String, required: true },
  },
  { timestamps: true }
);

// Auto-delete visits older than 90 days
visitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model("Visit", visitSchema);
