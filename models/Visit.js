const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, default: null },
    path: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Visit", visitSchema);
