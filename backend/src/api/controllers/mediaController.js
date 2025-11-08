// src/api/controllers/mediaController.js
const pool = require("../../config/database");
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;


const upload = multer({ storage: multer.memoryStorage() });

const uploadMediaGuest = async (req, res) => {
  try {
    const { event_id } = req.body;

    if (!event_id || !req.file) {
      return res.status(400).json({ message: "Missing file or event_id" });
    }
    
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const eventQuery = `SELECT event_name FROM events WHERE event_id = $1`;
    const eventResult = await pool.query(eventQuery, [event_id]);

    if (eventResult.rows.length === 0) {
        return res.status(404).json({ message: "Event not found" });
    }

    const event_name = eventResult.rows[0].event_name;

    // Clean event name (no spaces or special characters)
    const safeEventName = event_name.replace(/[^a-zA-Z0-9-_]/g, "_");

    // Now use event name as folder
    const fileKey = `${safeEventName}/${timestamp}${fileExt}`;

    // Upload to S3
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype, // so images/videos can be displayed publicly
      })
      .promise();

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    // Insert metadata into photos table (no user_id)
    const query = `
      INSERT INTO photos (event_id, uploaded_by_user_id, file_path, created_at, updated_at)
      VALUES ($1, NULL, $2, $3, $4)
      RETURNING *;
    `;
    const values = [event_id, fileUrl, created_at, updated_at];
    const { rows } = await pool.query(query, values);

    res.status(201).json({
      message: "Guest upload successful",
      photo: rows[0],
    });
  } catch (error) {
    console.error("Error uploading guest media:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { upload, uploadMediaGuest };
