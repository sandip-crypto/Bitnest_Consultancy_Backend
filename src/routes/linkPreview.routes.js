const express = require("express");
const { getPreview } = require("../controllers/linkPreview.controller");

const router = express.Router();

router.get("/", getPreview);

module.exports = router;