const express = require("express");
const router = express.Router();
const { loginUser, getMe, logoutUser, refreshToken } = require("../controllers/user.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");

router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/refresh", refreshToken);
router.get("/me", protect, allowRoles("admin"), getMe)


module.exports = router;