const express = require("express");
const router = express.Router();

const {
    getSecurityInfo,
    logoutAllDevices,
} = require("../controllers/security.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");

router.get("/security-info", protect, allowRoles("admin"), getSecurityInfo);
router.post("/logout-all", protect, allowRoles("admin"), logoutAllDevices);

module.exports = router;