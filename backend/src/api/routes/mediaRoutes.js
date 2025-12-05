const express = require("express");
const router = express.Router();
const { getMediaByEventHandler, upload, uploadMediaGuest, deleteMediaHandler, downloadMediaZipHandler } = require('../controllers/mediaController');



// POST /api/media/upload
router.post("/upload", upload.single("file"), uploadMediaGuest);
router.get("/:event_id", getMediaByEventHandler);
router.get("/:event_id/zip", downloadMediaZipHandler);
router.delete("/:photo_id", deleteMediaHandler);



module.exports = router;

