const mongoose = require("mongoose");

const deviceRateLimitSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  dailyCount: { type: Number, default: 0 },
  dayStart: { type: Date, default: null },
});

module.exports = mongoose.model("DeviceRateLimit", deviceRateLimitSchema);
