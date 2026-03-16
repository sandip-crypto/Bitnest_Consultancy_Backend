const express = require("express");
const {
    createStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
} = require("../controllers/student.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, allowRoles("admin", "counselor"), getStudents);
router.get("/:id", protect, allowRoles("admin", "counselor"), getStudentById);
router.post("/", protect, allowRoles("admin", "counselor"), createStudent);
router.put("/:id", protect, allowRoles("admin", "counselor"), updateStudent);
router.delete("/:id", protect, allowRoles("admin"), deleteStudent);

module.exports = router;