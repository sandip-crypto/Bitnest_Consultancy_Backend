const express = require("express");
const {
    submitContactInquiry,
    getContactInquiries,
    getContactInquiryById,
    updateContactInquiry,
    convertContactInquiryToLead,
} = require("../controllers/contactInquiry.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");

const router = express.Router();

// Public route
router.post("/public", submitContactInquiry);

// Admin routes
router.get("/", protect, allowRoles("admin", "counselor"), getContactInquiries);
router.get("/:id", protect, allowRoles("admin", "counselor"), getContactInquiryById);
router.put("/:id", protect, allowRoles("admin", "counselor"), updateContactInquiry);
router.post("/:id/convert-to-lead", protect, allowRoles("admin", "counselor"), convertContactInquiryToLead);

module.exports = router;