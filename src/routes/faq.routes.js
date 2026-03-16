const express = require("express");
const {
    getPublicFaqs,
    getPublicFaqCategories,
    getAdminFaqs,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq,
    reorderFaqs,
} = require("../controllers/faq.controller");

const { protect, allowRoles } = require("../middleware/auth.middleware");

const router = express.Router();

// Public
router.get("/public/categories", getPublicFaqCategories);
router.get("/public", getPublicFaqs);

// Admin
router.get("/", protect, allowRoles("admin"), getAdminFaqs);
router.patch("/reorder", protect, allowRoles("admin"), reorderFaqs);
router.get("/:id", protect, allowRoles("admin"), getFaqById);
router.post("/", protect, allowRoles("admin"), createFaq);
router.put("/:id", protect, allowRoles("admin"), updateFaq);
router.delete("/:id", protect, allowRoles("admin"), deleteFaq);

module.exports = router;