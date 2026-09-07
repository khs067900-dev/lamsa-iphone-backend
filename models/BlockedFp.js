const mongoose = require("mongoose");

const blockedFpSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true, unique: true },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlockedFp", blockedFpSchema);
