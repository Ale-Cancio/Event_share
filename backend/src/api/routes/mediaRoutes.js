const express = require("express");
const { upload, uploadMediaGuest } = require("../controllers/mediaController");

const router = express.Router();

// POST /api/media/upload
router.post("/upload", upload.single("file"), uploadMediaGuest);


module.exports = router;

