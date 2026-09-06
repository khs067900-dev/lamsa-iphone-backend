const express = require("express");
const Company = require("../../models/Company");
const { authMiddleware } = require("./middleware");
const { makeImageUpload, makeFileUpload, uploadToCloudinary, deleteFromCloudinary } = require("../../config/cloudinary");

const upload = makeImageUpload();
const uploadFooterImg = makeImageUpload();
const uploadDoc = makeFileUpload();

const router = express.Router();

// POST /api/admin/company/upload/:field
router.post("/company/upload/:field", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { field } = req.params;
    const allowed = ["logo", "header", "footer", "stamp", "cancelStamp"];
    if (!allowed.includes(field)) return res.status(400).json({ error: "حقل غير مسموح" });
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع صورة" });
    const result = await uploadToCloudinary(req.file.buffer, "company");
    const url = result.secure_url;
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    await deleteFromCloudinary(company[field]);
    company[field] = url;
    await company.save();
    res.json({ url });
  } catch (err) {
    console.error("company upload error:", err);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE /api/admin/company/image/:field
router.delete("/company/image/:field", authMiddleware, async (req, res) => {
  try {
    const { field } = req.params;
    const allowed = ["logo", "header", "footer", "stamp", "cancelStamp"];
    if (!allowed.includes(field)) return res.status(400).json({ error: "حقل غير مسموح" });
    const company = await Company.findOne();
    if (!company) return res.json({ success: true });
    await deleteFromCloudinary(company[field]);
    company[field] = "";
    await company.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// GET /api/admin/company
router.get("/company", async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    if (company.footerItems.length === 0) {
      company.footerItems = [
        { image: "", linkType: "link", link: "", file: "" },
        { image: "", linkType: "link", link: "", file: "" },
        { image: "", linkType: "link", link: "", file: "" },
      ];
      await company.save();
    }
    res.json(company);
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PUT /api/admin/company
router.put("/company", authMiddleware, async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    Object.assign(company, req.body);
    await company.save();
    res.json(company);
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/admin/company/footer-image/:key
router.post("/company/footer-image/:key", authMiddleware, uploadFooterImg.single("image"), async (req, res) => {
  try {
    const { key } = req.params;
    if (!["qrImage", "img1", "img2"].includes(key)) return res.status(400).json({ error: "حقل غير مسموح" });
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع صورة" });
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    await deleteFromCloudinary(company[key]);
    const result = await uploadToCloudinary(req.file.buffer, "company");
    company[key] = result.secure_url;
    await company.save();
    res.json({ url: company[key] });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/admin/company/footer-file/:key
router.post("/company/footer-file/:key", authMiddleware, uploadDoc.single("file"), async (req, res) => {
  try {
    const { key } = req.params;
    if (!["file1", "file2", "qrFile"].includes(key)) return res.status(400).json({ error: "حقل غير مسموح" });
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع ملف" });
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    await deleteFromCloudinary(company[key], "raw");
    const result = await uploadToCloudinary(req.file.buffer, "docs", { resource_type: "raw" });
    company[key] = result.secure_url;
    await company.save();
    res.json({ url: company[key] });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/admin/company/footer-items/image/:index
router.post("/company/footer-items/image/:index", authMiddleware, uploadFooterImg.single("image"), async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع صورة" });
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    if (isNaN(index) || index < 0 || index >= company.footerItems.length)
      return res.status(400).json({ error: "رقم غير صحيح" });
    const old = company.footerItems[index]?.image;
    await deleteFromCloudinary(old);
    const result = await uploadToCloudinary(req.file.buffer, "company");
    company.footerItems[index].image = result.secure_url;
    company.markModified("footerItems");
    await company.save();
    res.json({ url: company.footerItems[index].image });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/admin/company/footer-items/file/:index
router.post("/company/footer-items/file/:index", authMiddleware, uploadDoc.single("file"), async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع ملف" });
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    if (isNaN(index) || index < 0 || index >= company.footerItems.length)
      return res.status(400).json({ error: "رقم غير صحيح" });
    const old = company.footerItems[index]?.file;
    await deleteFromCloudinary(old, "raw");
    const result = await uploadToCloudinary(req.file.buffer, "docs", { resource_type: "raw" });
    company.footerItems[index].file = result.secure_url;
    company.markModified("footerItems");
    await company.save();
    res.json({ url: company.footerItems[index].file });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/admin/company/footer-items/add
router.post("/company/footer-items/add", authMiddleware, async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    company.footerItems.push({ image: "", linkType: "link", link: "", file: "" });
    await company.save();
    res.json({ index: company.footerItems.length - 1 });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE /api/admin/company/footer-items/:index
router.delete("/company/footer-items/:index", authMiddleware, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    let company = await Company.findOne();
    if (!company) return res.json({ success: true });
    if (isNaN(index) || index < 0 || index >= company.footerItems.length)
      return res.status(400).json({ error: "رقم غير صحيح" });
    const item = company.footerItems[index];
    await deleteFromCloudinary(item.image);
    await deleteFromCloudinary(item.file);
    company.footerItems.splice(index, 1);
    company.markModified("footerItems");
    await company.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

module.exports = router;
