const BlockedDevice = require("../models/BlockedDevice");
const DeviceLog = require("../models/DeviceLog");

async function findBlockedDevice(fingerprint, ip) {
  const conditions = [];
  if (fingerprint) conditions.push({ fingerprint, isActive: true });
  if (ip && ip !== "unknown") conditions.push({ ip, isActive: true });
  if (!conditions.length) return null;
  return BlockedDevice.findOne({ $or: conditions }).lean();
}

async function upsertDeviceLog(fingerprint, ip, userAgent, path, country) {
  const filter = fingerprint ? { fingerprint } : ip ? { ip } : null;
  if (!filter) return;

  // ابحث عن label موجود لنفس الـ fingerprint أو IP
  let existingLabel = null;
  const existing = await DeviceLog.findOne(filter, { label: 1 }).lean();
  if (existing?.label) {
    existingLabel = existing.label;
  } else if (fingerprint && ip) {
    const byIp = await DeviceLog.findOne({ ip }, { label: 1 }).lean();
    if (byIp?.label) existingLabel = byIp.label;
  }

  await DeviceLog.findOneAndUpdate(
    filter,
    {
      $set: { ip, userAgent, path, lastSeen: new Date(), ...(country && { country }), ...(existingLabel && { label: existingLabel }) },
      $setOnInsert: { fingerprint, firstSeen: new Date() },
      $inc: { requestsCount: 1 },
    },
    { upsert: true, new: true }
  );
}

async function blockDevice({ fingerprint, ip, userAgent, reason, blockedBy }) {
  const docs = [];
  if (ip) docs.push({ ip, fingerprint: null, userAgent, reason, blockedBy, isActive: true });
  if (fingerprint) docs.push({ fingerprint, ip: null, userAgent, reason, blockedBy, isActive: true });
  if (docs.length > 1) return BlockedDevice.insertMany(docs);
  return BlockedDevice.create(docs[0]);
}

async function unblockDevice(id) {
  return BlockedDevice.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

async function listDeviceLogs({ page = 1, limit = 20, search = "" }) {
  const skip = (page - 1) * limit;
  const filter = search
    ? {
        $or: [
          { fingerprint: { $regex: search, $options: "i" } },
          { ip: { $regex: search, $options: "i" } },
          { userAgent: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [logs, total] = await Promise.all([
    DeviceLog.find(filter).sort({ lastSeen: -1 }).skip(skip).limit(limit).lean(),
    DeviceLog.countDocuments(filter),
  ]);

  return { logs, total, pages: Math.ceil(total / limit) };
}

async function listBlockedDevices({ page = 1, limit = 20, search = "" }) {
  const skip = (page - 1) * limit;
  const filter = search
    ? {
        $or: [
          { fingerprint: { $regex: search, $options: "i" } },
          { ip: { $regex: search, $options: "i" } },
        ],
      }
    : { isActive: true };

  const [devices, total] = await Promise.all([
    BlockedDevice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    BlockedDevice.countDocuments(filter),
  ]);
  return { devices, total, pages: Math.ceil(total / limit) };
}

module.exports = {
  findBlockedDevice,
  upsertDeviceLog,
  blockDevice,
  unblockDevice,
  listDeviceLogs,
  listBlockedDevices,
};
