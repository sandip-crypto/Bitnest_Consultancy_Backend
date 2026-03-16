const express = require("express");
const {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
} = require("../controllers/lead.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, allowRoles("admin", "counselor"), getLeads);
router.get("/:id", protect, allowRoles("admin", "counselor"), getLeadById);
router.post("/", protect, allowRoles("admin", "counselor"), createLead);
router.put("/:id", protect, allowRoles("admin", "counselor"), updateLead);
router.delete("/:id", protect, allowRoles("admin"), deleteLead);

module.exports = router;