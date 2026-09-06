const mongoose = require("mongoose");

const blockedDeviceSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    reason: { type: String, default: "—", trim: true },
    blockedBy: { type: String, default: "admin" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

blockedDeviceSchema.index({ fingerprint: 1 });
blockedDeviceSchema.index({ ip: 1 });
blockedDeviceSchema.index({ isActive: 1 });

module.exports = mongoose.model("BlockedDevice", blockedDeviceSchema);
