const express = require("express");
const router = express.Router();
const { loginUser, getMe, logoutUser, refreshToken, changePassword, updateProfileInfo } = require("../controllers/user.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");

// Auth routes that do NOT require access token
router.post("/login", loginUser);
router.post("/refresh", refreshToken);

// Logout may or may not require token
router.post("/logout", protect, logoutUser);

// Protected routes
router.put("/change-password", protect, changePassword);
router.get("/me", protect, allowRoles("admin"), getMe);
router.put("/update-profile", protect, allowRoles("admin"), updateProfileInfo);

module.exports = router;