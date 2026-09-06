const DeviceRateLimit = require("../models/DeviceRateLimit");
const { getRealIP } = require("../utils/ipHelper");

const MAX_DAILY = 20;

async function orderRateLimit(req, res, next) {
  const fp = typeof req.headers["x-device-id"] === "string"
    ? req.headers["x-device-id"].slice(0, 128)
    : null;

  const ip = getRealIP(req);
  const deviceId = fp || (ip && ip !== "unknown" ? `ip:${ip}` : null);

  if (!deviceId) return next();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const state = await DeviceRateLimit.findOne({ deviceId });

  // إذا يوم جديد → صفّر العداد
  const isNewDay = !state?.dayStart || state.dayStart < startOfDay;
  const currentCount = isNewDay ? 0 : (state?.dailyCount ?? 0);

  if (currentCount >= MAX_DAILY) {
    const tomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const retryAfter = Math.ceil((tomorrow - now) / 1000);
    return res.status(429).json({
      success: false,
      code: "DEVICE_BLOCKED",
      message: "لقد تجاوزت الحد اليومي للطلبات.",
      retryAfter,
    });
  }

  await DeviceRateLimit.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        dailyCount: isNewDay ? 1 : currentCount + 1,
        dayStart: isNewDay ? startOfDay : state.dayStart,
      },
    },
    { upsert: true }
  );

  next();
}

module.exports = { orderRateLimit };
