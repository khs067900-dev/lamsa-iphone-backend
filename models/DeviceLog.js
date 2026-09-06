const mongoose = require("mongoose");

const deviceLogSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    path: { type: String, default: null },
    country: { type: String, default: null },
    label: { type: String, default: null },
    buyerName: { type: String, default: null },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    requestsCount: { type: Number, default: 1 },
  },
  { timestamps: false }
);

deviceLogSchema.index({ fingerprint: 1 });
deviceLogSchema.index({ ip: 1 });
deviceLogSchema.index({ lastSeen: -1 });

module.exports = mongoose.model("DeviceLog", deviceLogSchema);
