const { getRealIP } = require("../utils/ipHelper");
const { findBlockedDevice, upsertDeviceLog } = require("../services/deviceService");

async function checkBlockedDevice(req, res, next) {
  const fingerprint =
    typeof req.headers["x-device-fingerprint"] === "string"
      ? req.headers["x-device-fingerprint"].slice(0, 64)
      : null;

  const ip = getRealIP(req);

  const userAgent =
    typeof req.headers["user-agent"] === "string"
      ? req.headers["user-agent"].slice(0, 512)
      : null;

  const blocked = await findBlockedDevice(fingerprint, ip);
  if (blocked) {
    return res.status(403).json({
      success: false,
      code: "DEVICE_BLOCKED",
      message: "تم حظر هذا الجهاز. للاستفسار تواصل مع الدعم.",
    });
  }

  // fire-and-forget — never delays the request
  upsertDeviceLog(fingerprint, ip, userAgent, req.path).catch(() => {});

  next();
}

module.exports = { checkBlockedDevice };
