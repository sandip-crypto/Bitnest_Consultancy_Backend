const express = require("express");
const {
    createFreeConsultationLead,
    createBookConsultationLead,
} = require("../controllers/publicLead.controller");

const router = express.Router();

router.post("/free-consultation", createFreeConsultationLead);
router.post("/book-consultation", createBookConsultationLead);

module.exports = router;